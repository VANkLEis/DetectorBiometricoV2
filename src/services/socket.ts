import { io, Socket } from 'socket.io-client';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  
  private constructor() {}
  
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string) {
    // Connect to free Render.com deployment
    this.socket = io('https://securecall-signaling.onrender.com', {
      query: { userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });
  }

  joinRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('join-room', { roomId });
    }
  }

  onPeerJoined(callback: (peerId: string) => void) {
    if (this.socket) {
      this.socket.on('peer-joined', callback);
    }
  }

  onPeerLeft(callback: (peerId: string) => void) {
    if (this.socket) {
      this.socket.on('peer-left', callback);
    }
  }

  sendSignal(peerId: string, signal: any) {
    if (this.socket) {
      this.socket.emit('signal', { peerId, signal });
    }
  }

  onSignal(callback: (data: { peerId: string; signal: any }) => void) {
    if (this.socket) {
      this.socket.on('signal', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketService.getInstance();