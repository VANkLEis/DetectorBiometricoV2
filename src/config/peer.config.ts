// PeerJS server configuration
export const peerConfig = {
  // Use secure WebSocket connection to PeerJS server
  SERVER_URL: 'securecall-peer.onrender.com',
  SERVER_PORT: 443, // Standard HTTPS port
  SERVER_PATH: '/peerjs',
  
  // PeerJS configuration options
  CONFIG: {
    debug: 3, // Log level (0-3)
    secure: true, // Required for HTTPS connections
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