import { Peer, MediaConnection } from 'peerjs';
import { peerConfig, getPeerServerUrl } from '../config/peer.config';

class WebRTCService {
  private static instance: WebRTCService;
  private peer: Peer | null = null;
  private mediaStream: MediaStream | null = null;
  private currentCall: MediaConnection | null = null;
  private deviceId: string | null = null;
  private devices: MediaDeviceInfo[] = [];

  private constructor() {}

  static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  async initializeDevices(): Promise<void> {
    try {
      // First request permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, // Default to front camera
        audio: true 
      });
      
      // Keep the stream active until we switch devices
      this.mediaStream = stream;

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.filter(device => device.kind === 'videoinput');
      
      if (this.devices.length > 0) {
        // Try to find DroidCam if available
        const droidcam = this.devices.find(d => d.label.toLowerCase().includes('droidcam'));
        this.deviceId = droidcam?.deviceId || this.devices[0].deviceId;
      }
    } catch (err) {
      console.error('Error initializing devices:', err);
      throw new Error('Could not access camera or microphone. Please check your permissions.');
    }
  }

  async initialize(userId: string): Promise<void> {
    if (!this.devices.length) {
      await this.initializeDevices();
    }

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
          reject(err);
        }
      });
    });
  }

  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    if (!this.devices.length) {
      await this.initializeDevices();
    }
    return this.devices;
  }

  async setVideoDevice(deviceId: string): Promise<void> {
    try {
      // Stop current tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }

      // Get new stream with selected device
      this.deviceId = deviceId;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: true
      });

      // If in a call, replace tracks
      if (this.currentCall) {
        const videoTrack = this.mediaStream.getVideoTracks()[0];
        const sender = this.currentCall.peerConnection?.getSenders()
          .find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
    } catch (err) {
      console.error('Error switching device:', err);
      throw new Error('Failed to switch camera device');
    }
  }

  async getLocalStream(): Promise<MediaStream> {
    if (!this.mediaStream) {
      const constraints: MediaStreamConstraints = {
        video: this.deviceId ? { deviceId: { exact: this.deviceId } } : true,
        audio: true
      };

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        throw new Error('Could not access camera or microphone');
      }
    }
    return this.mediaStream;
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