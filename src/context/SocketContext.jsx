import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState({ dispatchers: [], teamMembers: [] });
  const [lastPing, setLastPing] = useState(null);

  useEffect(() => {
    console.log('Complete user object:', user);
    
    if (!user || !user.role) {
      console.log('No user role available for socket connection');
      return;
    }
    console.log('Initializing socket connection with role:', user.role);

    const socketInstance = io('http://localhost:5000', {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

 
    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected with ID:', socketInstance.id);
      setIsConnected(true);

      
      socketInstance.emit('register', {
        userId: socketInstance.id,
        role: user.role,
        team: user.team || null,
        teamType: user.teamType || user.team || null
      });
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);

      socketInstance.emit('register', {
        userId: socketInstance.id,
        username: user.username || 'Unknown User',
        role: user.role,
        team: user.team || null,
        teamType: user.teamType || user.team || null
      });
    });

    socketInstance.on('registered', (response) => {
      console.log('✅ User registered with socket server:', response);
    });

    socketInstance.on('connected-users', (userLists) => {
      console.log('👥 Connected users updated:', userLists);
      setConnectedUsers(userLists);
    });

    socketInstance.on('order-updated', (data) => {
      const { order, teamType, timestamp } = data;
      console.log(`📦 Received order update from ${teamType} team:`, order);
      console.log('Update timestamp:', timestamp);
      
      const orderUpdateEvent = new CustomEvent('orderUpdated', { 
        detail: { 
          order,
          sourceTeam: teamType,
          timestamp
        } 
      });
      window.dispatchEvent(orderUpdateEvent);
    });

    setSocket(socketInstance);
    return () => {
      console.log('🧹 Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, [user]);

  const pingServer = useCallback(() => {
    if (socket && isConnected) {
      const startTime = Date.now();
      socket.emit('ping', (response) => {
        const latency = Date.now() - startTime;
        // console.log(`📡 Ping response: ${latency}ms`, response);
        setLastPing({ time: response.time, latency });
      });
    }
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    pingServer();
    const pingInterval = setInterval(pingServer, 30000);
    return () => clearInterval(pingInterval);
  }, [socket, isConnected, pingServer]);

  
  const notifyOrderUpdate = useCallback((updatedOrder) => {
    if (socket && isConnected) {
      const teamType = user.teamType || user.team || 'unknown';
      console.log(`📤 Sending order update via socket from ${teamType} team:`, updatedOrder);
      
      socket.emit('order-update', {
        order: updatedOrder,
        teamType: teamType,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('⚠️ Cannot send order update: Socket not connected');
    }
  }, [socket, isConnected, user]);


  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleLocalStorageUpdate = (event) => {
      console.log('🔄 Detected localStorageUpdated event:', event.detail);
 
      if (event.detail && event.detail.orders) {
  
        if (user.role !== 'admin' && user.role !== 'dispatcher') {

          const updatedOrders = event.detail.orders;
          const teamType = user.teamType || user.team || 'unknown';
          console.log(`📤 Sending orders update to dispatchers from ${teamType} team:`, updatedOrders);
          
          updatedOrders.forEach(order => {
            notifyOrderUpdate(order);
          });
        }
      }
    };

    // Listen for the custom event dispatched in your updateLocalStorageOrders function
    window.addEventListener('localStorageUpdated', handleLocalStorageUpdate);
    
    return () => {
      window.removeEventListener('localStorageUpdated', handleLocalStorageUpdate);
    };
  }, [socket, isConnected, user, notifyOrderUpdate]);

  const contextValue = { 
    socket, 
    isConnected, 
    connectedUsers, 
    lastPing,
    notifyOrderUpdate // Expose the function to allow manual notifications
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};


