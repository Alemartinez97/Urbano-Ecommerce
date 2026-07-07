import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityController } from './inventory.controller';
import { AvailabilityService } from '../../application/services/inventory.service';

describe('AvailabilityController (RabbitMQ Event Listeners TDD)', () => {
  let controller: AvailabilityController;
  let service: jest.Mocked<AvailabilityService>;

  const mockAvailabilityService = () => ({
    bookSlot: jest.fn(),
    releaseSlot: jest.fn(),
    isAvailable: jest.fn(),
    getProviderSchedule: jest.fn(),
    blockSlot: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        {
          provide: AvailabilityService,
          useFactory: mockAvailabilityService,
        },
      ],
    }).compile();

    controller = module.get<AvailabilityController>(AvailabilityController);
    service = module.get(AvailabilityService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('handleBookingConfirmed (@EventPattern booking_confirmed)', () => {
    const payload = {
      providerId: 'prov-123',
      serviceId: 'srv-456',
      bookingId: 'booking-789',
      startTime: '2026-07-15T20:00:00Z',
      endTime: '2026-07-16T00:00:00Z',
    };

    it('debe procesar el evento booking_confirmed y reservar el slot', async () => {
      service.bookSlot.mockResolvedValue({} as any);

      await controller.handleBookingConfirmed(payload);

      expect(service.bookSlot).toHaveBeenCalledWith({
        providerId: payload.providerId,
        serviceId: payload.serviceId,
        bookingId: payload.bookingId,
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
      });
    });

    it('debe capturar y loguear cualquier error sin propagarlo al event-bus', async () => {
      service.bookSlot.mockRejectedValue(new Error('Conflicto de slot'));
      
      const spyError = jest.spyOn(controller['logger'], 'error');

      // No debe lanzar excepción para evitar bucles infinitos en RabbitMQ
      await expect(controller.handleBookingConfirmed(payload)).resolves.not.toThrow();
      expect(spyError).toHaveBeenCalled();
    });
  });

  describe('handleBookingCancelled (@EventPattern booking_cancelled)', () => {
    const payload = {
      bookingId: 'booking-789',
    };

    it('debe procesar el evento booking_cancelled y liberar el slot', async () => {
      service.releaseSlot.mockResolvedValue(undefined);

      await controller.handleBookingCancelled(payload);

      expect(service.releaseSlot).toHaveBeenCalledWith(payload.bookingId);
    });

    it('debe capturar y loguear el error de liberación sin propagarlo', async () => {
      service.releaseSlot.mockRejectedValue(new Error('Slot no encontrado'));
      
      const spyError = jest.spyOn(controller['logger'], 'error');

      await expect(controller.handleBookingCancelled(payload)).resolves.not.toThrow();
      expect(spyError).toHaveBeenCalled();
    });
  });
});
