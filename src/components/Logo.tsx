import React from 'react';
import { useLogo } from '../contexts/LogoContext';

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { logo } = useLogo();
  const uscisLogo = 'https://www.uscis.gov/sites/default/files/images/site/DHS_USCIS_HorizSeal_ENG_CMYK.png';

  return (
    <div className={`flex items-center ${className}`}>
      <img src={uscisLogo} alt="USCIS Logo" className="h-12 w-auto" />
    </div>
  );
};

export default Logo;