import React from 'react';
import { useRole } from '../contexts/RoleContext';
import { UserSquare2, Users } from 'lucide-react';

interface RoleSelectorProps {
  onSelect: () => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  const { setRole } = useRole();

  const handleRoleSelect = (selectedRole: 'interviewer' | 'interviewee') => {
    setRole(selectedRole);
    onSelect();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-center mb-6">Select Your Role</h2>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => handleRoleSelect('interviewer')}
            className="flex items-center justify-center p-6 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <UserSquare2 className="h-8 w-8 text-blue-600 mr-3" />
            <span className="text-lg font-medium">Interviewer</span>
          </button>
          <button
            onClick={() => handleRoleSelect('interviewee')}
            className="flex items-center justify-center p-6 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600 mr-3" />
            <span className="text-lg font-medium">Interviewee</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;