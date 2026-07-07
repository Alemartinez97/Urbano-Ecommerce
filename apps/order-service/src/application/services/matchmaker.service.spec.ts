import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { MatchmakerService } from './matchmaker.service';
import { BookingEntity, BookingStatus } from '../../infrastructure/adapters/persistence/booking.entity';

describe('MatchmakerService (TDD - Sequential Provider Matching Loop)', () => {
  let service: MatchmakerService;
  let bookingRepository: jest.Mocked<Repository<BookingEntity>>;
  let httpService: jest.Mocked<HttpService>;
  let eventBus: jest.Mocked<ClientProxy>;

  const mockBookingRepository = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
  });

  const mockHttpService = () => ({
    get: jest.fn(),
  });

  const mockEventBus = () => ({
    emit: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakerService,
        {
          provide: getRepositoryToken(BookingEntity),
          useFactory: mockBookingRepository,
        },
        {
          provide: HttpService,
          useFactory: mockHttpService,
        },
        {
          provide: 'ORDER_EVENT_BUS',
          useFactory: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<MatchmakerService>(MatchmakerService);
    bookingRepository = module.get(getRepositoryToken(BookingEntity));
    httpService = module.get(HttpService);
    eventBus = module.get('ORDER_EVENT_BUS');
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('startMatchmaking', () => {
    const bookingId = 'booking-111';
    const mockBooking = {
      id: bookingId,
      customerId: 'cust-123',
      providerId: null,
      serviceId: 'srv-456',
      latitude: -34.6037,
      longitude: -58.3816,
      status: BookingStatus.PENDING,
    } as any;

    it('debe cancelar la reserva si no hay proveedores conectados en la geocerca', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...mockBooking, status: BookingStatus.PENDING });
      
      // Catalog service returns category
      httpService.get.mockImplementation((url: string) => {
        if (url.includes('/api/v1/services/')) {
          return of({ data: { category: 'STAFF' } } as any);
        }
        // Users service returns 0 active providers list
        if (url.includes('/api/v1/providers/active-list')) {
          return of({ data: [] } as any);
        }
        return of({ data: {} } as any);
      });

      const updatedBooking = { ...mockBooking, status: BookingStatus.CANCELLED };
      bookingRepository.save.mockResolvedValue(updatedBooking);

      await service.startMatchmaking(bookingId);

      expect(bookingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.CANCELLED })
      );
      expect(eventBus.emit).toHaveBeenCalledWith('booking_match_failed', { bookingId });
    });

    it('debe emitir ping al primer proveedor y confirmar si este acepta inmediatamente', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...mockBooking, status: BookingStatus.PENDING });

      // Proveedores ordenados por distancia (p1 está a 0.5km, p2 a 2.3km)
      const mockProviders = [
        { userId: 'prov-p1', distanceKm: 0.5 },
        { userId: 'prov-p2', distanceKm: 2.3 },
      ];

      httpService.get.mockImplementation((url: string) => {
        if (url.includes('/api/v1/services/')) {
          return of({ data: { category: 'STAFF' } } as any);
        }
        if (url.includes('/api/v1/providers/active-list')) {
          return of({ data: mockProviders } as any);
        }
        return of({ data: {} } as any);
      });

      // Simulamos que el proveedor p1 acepta la oferta.
      let callCount = 0;
      bookingRepository.findOne.mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          return Promise.resolve({ ...mockBooking, providerId: 'prov-p1', status: BookingStatus.CONFIRMED } as any);
        }
        return Promise.resolve({ ...mockBooking, status: BookingStatus.PENDING });
      });

      await service.startMatchmaking(bookingId);

      // Debe haber enviado el ping a p1
      expect(eventBus.emit).toHaveBeenCalledWith('provider_ping', expect.objectContaining({
        providerId: 'prov-p1',
        bookingId,
      }));
      // No debe haber enviado el ping a p2 porque p1 aceptó
      expect(eventBus.emit).not.toHaveBeenCalledWith('provider_ping', expect.objectContaining({
        providerId: 'prov-p2',
      }));
    });

    it('debe intentar con el segundo proveedor si el primero rechaza la solicitud', async () => {
      bookingRepository.findOne.mockResolvedValue({ ...mockBooking, status: BookingStatus.PENDING });

      const mockProviders = [
        { userId: 'prov-p1', distanceKm: 0.5 },
        { userId: 'prov-p2', distanceKm: 2.3 },
      ];

      httpService.get.mockImplementation((url: string) => {
        if (url.includes('/api/v1/services/')) {
          return of({ data: { category: 'STAFF' } } as any);
        }
        if (url.includes('/api/v1/providers/active-list')) {
          return of({ data: mockProviders } as any);
        }
        return of({ data: {} } as any);
      });

      // Simulamos que p1 rechaza, pero p2 acepta la oferta.
      let getCallCount = 0;
      bookingRepository.findOne.mockImplementation(() => {
        getCallCount++;
        if (getCallCount > 3) {
          return Promise.resolve({ ...mockBooking, providerId: 'prov-p2', status: BookingStatus.CONFIRMED } as any);
        }
        return Promise.resolve({ ...mockBooking, status: BookingStatus.PENDING });
      });

      // Aceleramos los intervalos de verificación para que el test sea rápido
      await service.startMatchmaking(bookingId, 100); // 100ms de timeout por proveedor

      // Debe haber enviado pings a p1 y a p2
      expect(eventBus.emit).toHaveBeenCalledWith('provider_ping', expect.objectContaining({
        providerId: 'prov-p1',
        bookingId,
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('provider_ping', expect.objectContaining({
        providerId: 'prov-p2',
        bookingId,
      }));
    });
  });
});
