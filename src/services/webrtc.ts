import { Peer, MediaConnection } from 'peerjs';
import { peerConfig, getPeerServerUrl } from '../config/peer.config';

class WebRTCService {
  private static instance: WebRTCService;
  private peer: Peer | null = null;
  private mediaStream: MediaStream | null = null;
  private currentCall: MediaConnection | null = null;
  private deviceId: string | null = null;

  private constructor() {}

  static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  async initialize(userId: string): Promise<void> {
    const serverConfig = getPeerServerUrl();
    this.peer = new Peer(userId, {
      ...serverConfig,
      ...peerConfig.CONFIG
    });

    return new Promise((resolve, reject) => {
      this.peer!.on('open', () => {
        console.log('Connected to PeerJS server with ID:', this.peer!.id);
        resolve();
      });

      this.peer!.on('error', (err) => {
        console.error('PeerJS error:', err);
        reject(err);
      });

      this.peer!.on('call', async (call) => {
        try {
          const stream = await this.getLocalStream();
          call.answer(stream);
          this.handleCall(call);
        } catch (err) {
          console.error('Error answering call:', err);
        }
      });
    });
  }

  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  }

  async setVideoDevice(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    await this.getLocalStream();
  }

  async getLocalStream(): Promise<MediaStream> {
    if (this.mediaStream) {
      return this.mediaStream;
    }

    const constraints: MediaStreamConstraints = {
      video: this.deviceId ? { deviceId: { exact: this.deviceId } } : true,
      audio: true
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.mediaStream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      throw err;
    }
  }

  async makeCall(remotePeerId: string): Promise<void> {
    try {
      const stream = await this.getLocalStream();
      const call = this.peer!.call(remotePeerId, stream);
      this.handleCall(call);
    } catch (err) {
      console.error('Error making call:', err);
      throw err;
    }
  }

  private handleCall(call: MediaConnection) {
    this.currentCall = call;

    call.on('stream', (remoteStream: MediaStream) => {
      const event = new CustomEvent('remoteStream', { detail: remoteStream });
      window.dispatchEvent(event);
    });

    call.on('close', () => {
      this.currentCall = null;
      const event = new CustomEvent('callEnded');
      window.dispatchEvent(event);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      this.currentCall = null;
    });
  }

  disconnect() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.currentCall) {
      this.currentCall.close();
      this.currentCall = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  getPeerId(): string | null {
    return this.peer?.id || null;
  }
}

export default WebRTCService.getInstance();