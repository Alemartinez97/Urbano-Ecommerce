import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingEntity, BookingStatus } from '../../infrastructure/adapters/persistence/booking.entity';
import { CreateBookingDto } from '../dtos/create-booking.dto';

describe('BookingService (TDD Unit Tests)', () => {
  let service: BookingService;
  let repository: jest.Mocked<Repository<BookingEntity>>;
  let eventBus: jest.Mocked<ClientProxy>;
  let httpService: jest.Mocked<HttpService>;

  const mockBookingRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockEventBus = () => ({
    emit: jest.fn(),
  });

  const mockHttpService = () => ({
    get: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(BookingEntity),
          useFactory: mockBookingRepository,
        },
        {
          provide: 'ORDER_EVENT_BUS',
          useFactory: mockEventBus,
        },
        {
          provide: HttpService,
          useFactory: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    repository = module.get(getRepositoryToken(BookingEntity));
    eventBus = module.get('ORDER_EVENT_BUS');
    httpService = module.get(HttpService);
  });

  describe('createBooking (Caso de uso: Organizador crea reserva)', () => {
    const customerId = 'cust-123';
    const createDto: CreateBookingDto = {
      providerId: 'prov-456',
      serviceId: 'srv-789',
      startTime: '2026-07-15T20:00:00Z',
      endTime: '2026-07-16T00:00:00Z',
      totalAmount: 18000,
      location: 'Palermo, CABA',
      specialInstructions: 'Llegar 15 min antes',
    };

    it('debe crear exitosamente una reserva en estado PENDING si el proveedor está disponible', async () => {
      // Mock HTTP response for availability check (available: true)
      httpService.get.mockReturnValue(of({ data: { available: true } } as any));

      const expectedBooking = {
        id: 'booking-abc',
        customerId,
        ...createDto,
        status: BookingStatus.PENDING,
        startTime: new Date(createDto.startTime),
        endTime: new Date(createDto.endTime),
      } as any;

      repository.create.mockReturnValue(expectedBooking);
      repository.save.mockResolvedValue(expectedBooking);

      const result = await service.createBooking(customerId, createDto);

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/availability/check'),
        expect.objectContaining({
          params: {
            providerId: createDto.providerId,
            startTime: createDto.startTime,
            endTime: createDto.endTime,
          },
        }),
      );
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.id).toBe('booking-abc');
    });

    it('debe lanzar ConflictException si el proveedor no está disponible', async () => {
      // Mock HTTP response for availability check (available: false)
      httpService.get.mockReturnValue(of({ data: { available: false } } as any));

      await expect(service.createBooking(customerId, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si la tarifa enviada por el cliente difiere de la calculada por el servidor (evita hackeo)', async () => {
      // Mock repository find to return 8 active bookings (high demand)
      const mockActiveBookings = Array(8).fill(null).map((_, i) => ({
        id: `b-${i}`,
        status: BookingStatus.PENDING,
        latitude: -34.6037,
        longitude: -58.3816,
        serviceId: 'srv-789',
      }));
      repository.find.mockResolvedValue(mockActiveBookings as any);

      // Mock HTTP: disponible = true
      // Mock HTTP para count-providers = 2, count-orders = 8 (recargo del 30%)
      // Si el precio base es 10000 y el cliente envía 10000 en lugar de 13000, debe fallar.
      httpService.get.mockImplementation((url: string) => {
        if (url.includes('/api/v1/availability/check')) {
          return of({ data: { available: true } } as any);
        }
        if (url.includes('/api/v1/providers/active-count')) {
          return of({ data: { count: 2 } } as any);
        }
        if (url.includes('/api/v1/orders/active-count')) {
          return of({ data: { count: 8 } } as any);
        }
        // Mock catalog service to return basePrice = 10000 for srv-789
        if (url.includes('/api/v1/services/')) {
          return of({ data: { basePrice: 10000, category: 'STAFF' } } as any);
        }
        return of({ data: {} } as any);
      });

      const hackedDto = {
        ...createDto,
        latitude: -34.6037,
        longitude: -58.3816,
        totalAmount: 10000, // Precio base sin recargo dinámico del 30%
      };

      await expect(service.createBooking(customerId, hackedDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('getActiveBookingsCount (Caso de uso: Calcular demanda geocercana)', () => {
    it('debe devolver el conteo de reservas activas (PENDING/CONFIRMED) dentro del radio', async () => {
      const centerLat = -34.6037;
      const centerLon = -58.3816;
      const radiusKm = 5.0;
      const category = 'STAFF';

      const mockBookings = [
        { id: 'b1', status: BookingStatus.PENDING, latitude: -34.6042, longitude: -58.3850, serviceId: 'srv-1' }, // dentro
        { id: 'b2', status: BookingStatus.CONFIRMED, latitude: -34.5889, longitude: -58.4301, serviceId: 'srv-1' }, // dentro
        { id: 'b3', status: BookingStatus.CANCELLED, latitude: -34.6037, longitude: -58.3816, serviceId: 'srv-1' }, // cancelado (excluido)
        { id: 'b4', status: BookingStatus.CONFIRMED, latitude: -34.7242, longitude: -58.2612, serviceId: 'srv-1' }, // fuera de radio (excluido)
      ] as any[];

      repository.find.mockImplementation((opts: any) => {
        // Filtrar solo PENDING/CONFIRMED para simular el filtro WHERE de base de datos
        return Promise.resolve(
          mockBookings.filter(b => b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED)
        );
      });

      // Mock catalog service to return category 'STAFF' for srv-1
      httpService.get.mockReturnValue(of({ data: { category: 'STAFF' } } as any));

      const count = await service.getActiveBookingsCount(category, centerLat, centerLon, radiusKm);

      expect(repository.find).toHaveBeenCalled();
      expect(count).toBe(2);
    });
  });

  describe('confirmBooking (Caso de uso: Proveedor acepta reserva)', () => {
    const bookingId = 'booking-abc';

    it('debe actualizar el estado a CONFIRMED y emitir el evento booking_confirmed', async () => {
      const pendingBooking = {
        id: bookingId,
        providerId: 'prov-456',
        serviceId: 'srv-789',
        startTime: new Date(),
        endTime: new Date(),
        status: BookingStatus.PENDING,
      } as any;

      const confirmedBooking = {
        ...pendingBooking,
        status: BookingStatus.CONFIRMED,
      };

      repository.findOne.mockResolvedValue(pendingBooking);
      repository.save.mockResolvedValue(confirmedBooking);

      const result = await service.confirmBooking(bookingId);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: bookingId } });
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.CONFIRMED }));
      expect(eventBus.emit).toHaveBeenCalledWith('booking_confirmed', expect.objectContaining({
        bookingId,
        providerId: pendingBooking.providerId,
        serviceId: pendingBooking.serviceId,
      }));
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.confirmBooking(bookingId)).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('cancelBooking (Caso de uso: Cancelación de reserva)', () => {
    const bookingId = 'booking-abc';
    const customerId = 'cust-123';
    const providerId = 'prov-456';

    it('debe cancelar la reserva si el que cancela es el organizador', async () => {
      const booking = {
        id: bookingId,
        customerId,
        providerId,
        status: BookingStatus.CONFIRMED,
      } as any;

      repository.findOne.mockResolvedValue(booking);
      repository.save.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });

      const result = await service.cancelBooking(bookingId, customerId);

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.CANCELLED }));
      expect(eventBus.emit).toHaveBeenCalledWith('booking_cancelled', { bookingId });
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('debe cancelar la reserva si el que cancela es el proveedor', async () => {
      const booking = {
        id: bookingId,
        customerId,
        providerId,
        status: BookingStatus.CONFIRMED,
      } as any;

      repository.findOne.mockResolvedValue(booking);
      repository.save.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });

      const result = await service.cancelBooking(bookingId, providerId);

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.CANCELLED }));
      expect(eventBus.emit).toHaveBeenCalledWith('booking_cancelled', { bookingId });
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('debe lanzar ConflictException si el usuario no tiene relación con el evento', async () => {
      const booking = {
        id: bookingId,
        customerId,
        providerId,
        status: BookingStatus.CONFIRMED,
      } as any;

      repository.findOne.mockResolvedValue(booking);

      await expect(service.cancelBooking(bookingId, 'random-user')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});
