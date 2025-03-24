import React from 'react'
import { useState } from "react";
import { useSocket } from "../context/SocketContext";

// ConnectionStatus.jsx component
const ConnectionStatus = () => {
  const { socket, connected, roomJoined } = useSocket();
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={() => setShowDetails(!showDetails)}
        className={`px-3 py-1 rounded-full text-sm font-medium
          ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
      >
        <span className={`mr-1.5 h-2 w-2 inline-block rounded-full 
          ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {connected ? 'Connected' : 'Disconnected'}
      </button>
      
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-white shadow-lg rounded-lg border w-64">
          <p className="text-sm font-medium">Socket ID: {socket?.id || 'None'}</p>
          <p className="text-sm mt-1">Room joined: {roomJoined ? 'Yes' : 'No'}</p>
          <p className="text-sm mt-1">Last activity: {new Date().toLocaleTimeString()}</p>
          <button 
            onClick={() => socket?.emit('heartbeat', { timestamp: new Date().toISOString() })}
            className="mt-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
          >
            Send Heartbeat
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus