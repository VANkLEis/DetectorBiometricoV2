import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import SimplePeer from 'simple-peer';
import socketService from '../services/socket';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Phone, Users, MessageSquare, Camera, Fingerprint, UserPlus, Copy, Check } from 'lucide-react';
import RoleSelector from '../components/RoleSelector';

const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
  ],
};

const VideoCall: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCalling, setIsCalling] = useState(true);
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const [peers, setPeers] = useState<{ [key: string]: SimplePeer.Instance }>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp: Date }[]>([]);
  const [showRoleSelector, setShowRoleSelector] = useState(true);
  const [participantCount, setParticipantCount] = useState(1);
  const [verifyingBiometrics, setVerifyingBiometrics] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<{
    face: boolean;
    fingerprint: boolean;
  }>({ face: false, fingerprint: false });
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!role || !roomId || !user) return;
    
    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Connect to signaling server
        socketService.connect(user.id.toString());
        socketService.joinRoom(roomId);

        // Handle peer joining
        socketService.onPeerJoined((peerId) => {
          const peer = new SimplePeer({
            initiator: role === 'interviewer',
            stream: stream,
            trickle: true,
            config: ICE_SERVERS
          });

          peer.on('signal', (signal) => {
            socketService.sendSignal(peerId, signal);
          });

          peer.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnectionEstablished(true);
            setIsCalling(false);
            setParticipantCount(2);
          });

          peer.on('error', (err) => {
            console.error('Peer error:', err);
            // Try to reconnect
            peer.destroy();
            initializeCall();
          });

          setPeers(prev => ({ ...prev, [peerId]: peer }));
        });

        // Handle incoming signals
        socketService.onSignal(({ peerId, signal }) => {
          if (peers[peerId]) {
            peers[peerId].signal(signal);
          }
        });

        // Handle peer disconnection
        socketService.onPeerLeft((peerId) => {
          if (peers[peerId]) {
            peers[peerId].destroy();
            const newPeers = { ...peers };
            delete newPeers[peerId];
            setPeers(newPeers);
            setConnectionEstablished(false);
            setParticipantCount(1);
          }
        });

      } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Could not access camera or microphone');
        navigate('/dashboard');
      }
    };

    initializeCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peers).forEach(peer => peer.destroy());
      socketService.disconnect();
    };
  }, [role, roomId, user]);

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    Object.values(peers).forEach(peer => peer.destroy());
    socketService.disconnect();
    navigate('/dashboard');
  };

  const verifyBiometric = async (type: 'face' | 'fingerprint') => {
    if (role !== 'interviewer') return;
    
    setVerifyingBiometrics(true);
    setBiometricType(type);
    setScanProgress(0);
    
    // Capture remote video frame
    if (remoteVideoRef.current) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = remoteVideoRef.current.videoWidth;
        canvas.height = remoteVideoRef.current.videoHeight;
        context.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Simulate scanning progress
        const interval = setInterval(() => {
          setScanProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              return 100;
            }
            return prev + 2;
          });
        }, 50);
        
        // Simulate verification process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        clearInterval(interval);
        setScanProgress(100);
        
        setTimeout(() => {
          setBiometricStatus(prev => ({
            ...prev,
            [type]: true
          }));
          setVerifyingBiometrics(false);
          setBiometricType(null);
        }, 500);
      }
    }
  };

  const handleRoleSelected = () => {
    setShowRoleSelector(false);
  };

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/video-call/${roomId}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = {
        sender: user?.username || 'You',
        text: message,
        timestamp: new Date()
      };
      
      setMessages([...messages, newMessage]);
      setMessage('');
      
      // Send message through peer connection
      Object.values(peers).forEach(peer => {
        peer.send(JSON.stringify(newMessage));
      });
    }
  };

  if (showRoleSelector) {
    return <RoleSelector onSelect={handleRoleSelected} />;
  }

  if (participantCount > 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <h2 className="text-2xl font-semibold mb-4">Room is Full</h2>
          <p>This interview room is limited to 2 participants.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Call Status */}
      {isCalling && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
          <div className="text-center text-white">
            <div className="animate-ping inline-flex h-24 w-24 rounded-full bg-blue-400 opacity-75 mb-4"></div>
            <h2 className="text-2xl font-semibold mb-2">Connecting to call...</h2>
            <p className="text-gray-300">Room ID: {roomId}</p>
          </div>
        </div>
      )}

      {/* Biometric Verification Animation */}
      {verifyingBiometrics && biometricType && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
          <div className="text-center text-white">
            <div className="relative mb-8">
              {biometricType === 'face' ? (
                <div className="w-64 h-64 border-4 border-blue-500 rounded-full flex items-center justify-center">
                  <div className="absolute w-full h-full">
                    <div 
                      className="h-1 bg-blue-500 transition-transform duration-50"
                      style={{ 
                        transform: `translateY(${(scanProgress / 100) * 256}px)`,
                        opacity: 0.5
                      }}
                    />
                  </div>
                  <Camera className="h-24 w-24 text-blue-500" />
                </div>
              ) : (
                <div className="w-48 h-64 border-4 border-blue-500 rounded-lg flex items-center justify-center">
                  <div className="absolute w-full h-full">
                    <div 
                      className="w-1 bg-blue-500 transition-transform duration-50"
                      style={{ 
                        transform: `translateX(${(scanProgress / 100) * 192}px)`,
                        opacity: 0.5,
                        height: '100%'
                      }}
                    />
                  </div>
                  <Fingerprint className="h-24 w-24 text-blue-500" />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              Scanning {biometricType === 'face' ? 'Face' : 'Fingerprint'}...
            </h2>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-50"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="mt-2 text-gray-400">{scanProgress}%</p>
          </div>
        </div>
      )}
      
      {/* Main call interface */}
      <div className="flex flex-1 overflow-hidden">
        {/* Remote video (full screen) */}
        <div className="relative flex-1 bg-black">
          {connectionEstablished ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="h-24 w-24 text-gray-500 opacity-50" />
            </div>
          )}
          
          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 overflow-hidden rounded-lg shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : ''}`}
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>

          {/* Biometric verification status (for interviewer) */}
          {role === 'interviewer' && connectionEstablished && (
            <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg p-4">
              <h3 className="text-white text-sm font-semibold mb-2">Verification Status</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${biometricStatus.face ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                  <span className="text-white text-sm">Facial Verification</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${biometricStatus.fingerprint ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                  <span className="text-white text-sm">Fingerprint Verification</span>
                </div>
              </div>
            </div>
          )}

          {/* Invite overlay */}
          {showInvite && (
            <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-4 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold">Invite Participant</h3>
                <button 
                  onClick={() => setShowInvite(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="bg-gray-900 rounded p-2 flex items-center mb-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/video-call/${roomId}`}
                  className="bg-transparent text-white flex-1 outline-none text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="ml-2 p-1 rounded hover:bg-gray-700"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-gray-400 text-sm">
                Share this link with the participant you want to invite.
              </p>
            </div>
          )}
        </div>
        
        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col ${msg.sender === user?.username || msg.sender === 'You' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`rounded-lg px-3 py-2 max-w-xs ${
                    msg.sender === user?.username || msg.sender === 'You' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {msg.sender} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <form onSubmit={sendMessage} className="flex">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      
      {/* Call controls */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${isAudioMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isAudioMuted ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isVideoOff ? (
            <VideoOff className="h-6 w-6 text-white" />
          ) : (
            <VideoIcon className="h-6 w-6 text-white" />
          )}
        </button>
        
        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
        >
          <Phone className="h-6 w-6 text-white transform rotate-135" />
        </button>
        
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`p-3 rounded-full ${chatOpen ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </button>

        <button
          onClick={() => setShowInvite(!showInvite)}
          className={`p-3 rounded-full ${showInvite ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          <UserPlus className="h-6 w-6 text-white" />
        </button>

        {/* Biometric verification controls (only for interviewer) */}
        {role === 'interviewer' && connectionEstablished && (
          <>
            <button
              onClick={() => verifyBiometric('face')}
              disabled={verifyingBiometrics || biometricStatus.face}
              className={`p-3 rounded-full ${
                biometricStatus.face 
                  ? 'bg-green-500 cursor-not-allowed' 
                  : verifyingBiometrics 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            
            <button
              onClick={() => verifyBiometric('fingerprint')}
              disabled={verifyingBiometrics || biometricStatus.fingerprint}
              className={`p-3 rounded-full ${
                biometricStatus.fingerprint 
                  ? 'bg-green-500 cursor-not-allowed' 
                  : verifyingBiometrics 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Fingerprint className="h-6 w-6 text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;