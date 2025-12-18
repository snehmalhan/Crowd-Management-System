import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  constructor() {
    const token = localStorage.getItem('token');
    this.socket = io('https://hiring-dev.internal.kloudspot.com', {
      transports: ['websocket'],
      auth: {
        token: token || ''
      }
    });
    this.socket.on('alert', (data) => {
    });
    this.socket.on('live_occupancy', (data) => {
    });
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  listen<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      const handler = (data: T) => {
        observer.next(data);
      };
      this.socket.on(event, handler);
      return () => this.socket.off(event, handler);
    });
  }
}

