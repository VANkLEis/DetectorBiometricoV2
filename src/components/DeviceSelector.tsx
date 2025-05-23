import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import WebRTCService from '../services/webrtc';

interface DeviceSelectorProps {
  onDeviceSelect: (deviceId: string) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ onDeviceSelect }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const availableDevices = await WebRTCService.getAvailableDevices();
        setDevices(availableDevices);
        
        if (availableDevices.length > 0) {
          setSelectedDevice(availableDevices[0].deviceId);
          onDeviceSelect(availableDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error loading devices:', err);
      }
    };

    loadDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [onDeviceSelect]);

  const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    setSelectedDevice(deviceId);
    onDeviceSelect(deviceId);
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-md">
      <Camera className="h-5 w-5 text-gray-400" />
      <select
        value={selectedDevice}
        onChange={handleDeviceChange}
        className="bg-gray-700 text-white text-sm rounded-md border-gray-600 focus:ring-blue-500 focus:border-blue-500"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${devices.indexOf(device) + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DeviceSelector;