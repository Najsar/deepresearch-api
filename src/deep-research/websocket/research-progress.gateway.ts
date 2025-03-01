import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export type ResearchProgressEvent = {
  type: 'info' | 'error' | 'success';
  message: string;
  data?: any;
  timestamp: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'research-progress'
})
export class ResearchProgressGateway {
  @WebSocketServer()
  server: Server;

  emitProgress(event: Omit<ResearchProgressEvent, 'timestamp'>) {
    this.server.emit('progress', {
      ...event,
      timestamp: new Date().toISOString()
    });
  }
} 