import React, { useState } from 'react';
import { WifiOff, Wifi, AlertCircle,  ChevronRight, ChevronLeft } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const ConnectionStatus = () => {
  const { isConnected, lastPing, connectedUsers } = useSocket();
  const [expanded, setExpanded] = useState(false);
  

  const getTeamsData = () => {
    if (connectedUsers?.teams) {
      return Object.entries(connectedUsers.teams)
        .filter(([_, users]) => users.length > 0)
        .map(([team, users]) => ({
          team,
          users,
          count: users.length
        }));
    } else if (connectedUsers?.teamMembers) {
      return [{
        team: 'Team',
        users: connectedUsers.teamMembers,
        count: connectedUsers.teamMembers.length
      }];
    }
    return [];
  };
  
  const dispatchers = connectedUsers?.dispatchers || [];
  const teamsData = getTeamsData();
  

  const totalConnectedUsers = dispatchers.length + 
    teamsData.reduce((acc, team) => acc + team.count, 0);

  const getStatusDetails = () => {
    if (!isConnected) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        icon: <WifiOff size={16} className="text-red-500" />,
        text: 'Disconnected'
      };
    }
    
    if (!lastPing || Date.now() - new Date(lastPing.time).getTime() > 60000) {
      return {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        icon: <AlertCircle size={16} className="text-yellow-500" />,
        text: 'Unstable'
      };
    }
    return {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      icon: <Wifi size={16} className="text-green-600" />,
   
    };
  };

  const { color, bgColor, borderColor, icon, text } = getStatusDetails();

  // Function to format latency display
  const formatLatency = () => {
    if (!lastPing || !lastPing.latency) return 'N/A';
    const latency = lastPing.latency;
    
    if (latency < 100) return `${latency}ms`;
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const formatTeamName = (team) => {
    return team.charAt(0).toUpperCase() + team.slice(1);
  };

  return (
    <div className="relative ">

      <div className={`flex items-center rounded-full ${bgColor} ${borderColor} border transition-all duration-300 ease-in-out ${expanded ? 'pr-3' : ''}`}>

        <div 
          className="flex items-center gap-2 px-3 py-1 cursor-pointer"
          onClick={() => isConnected && totalConnectedUsers > 0 && setExpanded(!expanded)}
        >
          {icon}
          <span className={`text-sm font-medium ${color}`}>{text}</span>
          
          {isConnected && lastPing && (
            <div className="flex items-center ml-1">
              <span className="text-xs text-gray-500 ml-1">
                {formatLatency()}
              </span>
              
              {totalConnectedUsers > 0 && (
                <span className="text-xs text-gray-500 ml-2 border-l border-gray-300 pl-2">
                  {totalConnectedUsers} online
                </span>
              )}
            </div>
          )}
          
          {totalConnectedUsers > 0 && (
            <div className="ml-1">
              {expanded ? 
                <ChevronLeft size={14} className="text-gray-500" /> : 
                <ChevronRight size={14} className="text-gray-500" />
              }
            </div>
          )}
        </div>
      
        {expanded && isConnected && (
          <div className="border-l border-gray-300 pl-3 flex items-center">
            <div className="flex flex-col">
              
              <div className="flex gap-4 m">
                {dispatchers.length > 0 && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">Dispatcher</span>
                  
                  </div>
                )}

                {teamsData.map(({ team, count }) => (
                  <div key={team} className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500">
                      {formatTeamName(team)}
                    </span>
                    
                  </div>
                ))}
                
                {totalConnectedUsers === 0 && (
                  <span className="text-xs text-gray-500">No users online</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;