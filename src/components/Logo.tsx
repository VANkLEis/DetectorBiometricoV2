import React from 'react';
import { useLogo } from '../contexts/LogoContext';
import { Video } from 'lucide-react';

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { logo } = useLogo();

  return (
    <div className={`flex items-center ${className}`}>
      {logo ? (
        <img src={logo} alt="Company Logo" className="h-8 w-auto" />
      ) : (
        <Video className="h-8 w-8 text-blue-600" />
      )}
      <span className="ml-2 text-xl font-bold text-gray-900">SecureCall</span>
    </div>
  );
};

export default Logo;