// PeerJS server configuration
export const peerConfig = {
  // Use 127.0.0.1 for WebContainer compatibility
  SERVER_URL: '127.0.0.1',
  SERVER_PORT: 9000,
  SERVER_PATH: '/peerjs',
  
  // PeerJS configuration options
  CONFIG: {
    debug: 3, // Log level (0-3)
    secure: false, // Set to true when using HTTPS
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
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