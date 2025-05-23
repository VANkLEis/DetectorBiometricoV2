// PeerJS server configuration
export const peerConfig = {
  // Use CloudFlare as STUN server for better reliability
  SERVER_URL: 'peer.webrtc.wtf', // More reliable PeerJS server
  SERVER_PORT: 443,
  SERVER_PATH: '/',
  
  // Enhanced PeerJS configuration options
  CONFIG: {
    debug: 3,
    secure: true,
    config: {
      iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ],
      iceCandidatePoolSize: 10
    },
    // Add reconnect options
    pingInterval: 3000,
    retryTimes: 3,
    reconnectTimer: 1000
  }
};

// Helper function to get full server URL
export const getPeerServerUrl = () => {
  const { SERVER_URL, SERVER_PORT, SERVER_PATH } = peerConfig;
  return {
    host: SERVER_URL,
    port: SERVER_PORT,
    path: SERVER_PATH
  };
};