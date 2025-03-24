import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, role, team }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const [clientId, setClientId] = useState('');
  const [orderHistory, setOrderHistory] = useState({});
  const [completedQuantities, setCompletedQuantities] = useState({});

  useEffect(() => {
    // Create socket connection
    const storedClientId = sessionStorage.getItem('socket_client_id');
    const newClientId = storedClientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!storedClientId) {
      sessionStorage.setItem('socket_client_id', newClientId);
    }
    
    setClientId(newClientId);

    // Load completed quantities from localStorage
    try {
      const storedCompletions = JSON.parse(localStorage.getItem('completedQuantities') || '{}');
      setCompletedQuantities(storedCompletions);
      
      const storedHistory = JSON.parse(localStorage.getItem('orderTimelineHistory') || '{}');
      setOrderHistory(storedHistory);
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      // Reset if corrupted
      localStorage.setItem('completedQuantities', '{}');
      localStorage.setItem('orderHistory', '{}');
    }

    const socketInstance = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      query: {
        clientId: newClientId,
        role: role || 'unknown',
        team: team || 'unknown'
      }
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully:', socketInstance.id);
      setConnected(true);
      
      // Join appropriate room when connected
      if (role) {
        console.log(`Attempting to join room as ${role}${team ? ` for team ${team}` : ''}`);
        socketInstance.emit('joinRoom', { role, team });
      }
    });

    socketInstance.on('roomJoined', (data) => {
      console.log('Room joined confirmation:', data);
      setRoomJoined(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
      setRoomJoined(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      setRoomJoined(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // New event listeners for order updates
    socketInstance.on('orderQuantityUpdate', (data) => {
      console.log('Received quantity update:', data);
      if (data.orderId && data.itemId && data.quantity !== undefined) {
        updateCompletedQuantity(data.orderId, data.itemId, data.quantity, data.team);
      }
    });

    socketInstance.on('orderHistoryUpdate', (data) => {
      console.log('Received history update:', data);
      if (data.orderId && data.history) {
        updateOrderHistory(data.orderId, data.history);
      }
    });

    // Set up heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('heartbeat', { timestamp: new Date().toISOString() });
      }
    }, 30000); // 30 seconds

    setSocket(socketInstance);

    return () => {
      console.log('Cleaning up socket connection');
      clearInterval(heartbeatInterval);
      socketInstance.disconnect();
    };
  }, [role, team]);

  // Re-join room if role or team changes
  useEffect(() => {
    if (socket && connected && role) {
      console.log(`Re-joining room as ${role}${team ? ` for team ${team}` : ''}`);
      socket.emit('joinRoom', { role, team });
    }
  }, [socket, connected, role, team]);

  // Helper function to update completed quantities
  const updateCompletedQuantity = (orderId, itemId, quantity, team) => {
    const itemKey = `${orderId}-${itemId}`;
    
    setCompletedQuantities(prev => {
      const updated = {
        ...prev,
        [itemKey]: {
          completed: quantity,
          team,
          lastUpdated: new Date().toISOString()
        }
      };
      
      // Save to localStorage
      localStorage.setItem('completedQuantities', JSON.stringify(updated));
      return updated;
    });
  };

  // Helper function to update order history
  const updateOrderHistory = (orderId, history) => {
    setOrderHistory(prev => {
      const updated = {
        ...prev,
        [orderId]: history
      };
      
      // Save to localStorage
      localStorage.setItem('orderHistory', JSON.stringify(updated));
      return updated;
    });
  };

  // Function to sync quantity updates across components
  const syncQuantityUpdate = (orderId, itemId, quantity, team) => {
    if (socket && connected) {
      socket.emit('updateOrderQuantity', { orderId, itemId, quantity, team });
      updateCompletedQuantity(orderId, itemId, quantity, team);
    }
  };

  // Function to sync history updates
  const syncHistoryUpdate = (orderId, historyEntry) => {
    if (socket && connected) {
      // Get existing history or initialize new array
      const currentHistory = orderHistory[orderId] || [];
      const updatedHistory = [...currentHistory, historyEntry];
      
      socket.emit('updateOrderHistory', { orderId, history: updatedHistory });
      updateOrderHistory(orderId, updatedHistory);
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      connected, 
      roomJoined, 
      completedQuantities,
      orderHistory,
      syncQuantityUpdate,
      syncHistoryUpdate
    }}>
      {children}
    </SocketContext.Provider>
  );
};