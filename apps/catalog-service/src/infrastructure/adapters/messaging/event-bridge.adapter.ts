import { Injectable } from '@nestjs/common';

@Injectable()
export class EventBridgeAdapter {
  // En producción, aquí usaríamos el SDK de AWS para Amazon EventBridge [cite: 34]
  async publish(eventName: string, payload: any): Promise<void> {
    console.log(`[AWS EventBridge] Publicando evento: ${eventName}`, payload);
    // Lógica para enviar el evento al bus definido en docker-compose
  }
}