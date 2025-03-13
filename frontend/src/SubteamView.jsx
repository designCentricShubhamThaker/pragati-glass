import React from 'react'
import { useAuth } from './context/auth';

const SubteamView = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };
  return (
    <div>you are viewing sub team view
      <div className="flex items-center">
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Logout</button>
      </div>
    </div>
  )
}

export default SubteamView