// server/socket.js
import { Server } from 'socket.io';
import Order from '../config/db.js';


let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173"], 
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Handle joining room based on role (team or dispatcher)
    socket.on('joinRoom', (data) => {
      // If joining as a team, join team-specific room
      if (data.role === 'team' && data.team) {
        socket.join(`team-${data.team}`);
        console.log(`${socket.id} joined team-${data.team} room`);
      }
      
      // If joining as dispatcher, join dispatcher room
      if (data.role === 'dispatcher') {
        socket.join('dispatchers');
        console.log(`${socket.id} joined dispatchers room`);
      }
    });
    
    // Handle order status updates from teams
    socket.on('updateOrderStatus', async (data) => {
      try {
        console.log('Received order status update:', data);
        
        // Forward the update to relevant rooms
        // 1. To all dispatchers
        socket.to('dispatchers').emit('orderStatusUpdated', data);
        
        // 2. To the team that sent the update (for confirmation)
        socket.emit('updateConfirmation', {
          success: true,
          message: 'Order status updated successfully',
          data: data
        });
        
        // 3. Optional: Update the database with the new status
        // Your database update logic here...
        
      } catch (error) {
        console.error('Error handling order status update:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

function checkAllTeamsComplete(order) {
  const orderDetails = order.order_details || {};
  

  if (orderDetails.glass && orderDetails.glass.length > 0) {
    if (!orderDetails.glass.every(item => item.status === 'Done')) {
      return false;
    }
  }

  if (orderDetails.caps && orderDetails.caps.length > 0) {
    if (!orderDetails.caps.every(item => item.status === 'Done')) {
      return false;
    }
  }
  
  if (orderDetails.boxes && orderDetails.boxes.length > 0) {
    if (!orderDetails.boxes.every(item => item.status === 'Done')) {
      return false;
    }
  }
  
  if (orderDetails.pumps && orderDetails.pumps.length > 0) {
    if (!orderDetails.pumps.every(item => item.status === 'Done')) {
      return false;
    }
  }
  
  return true;
}

export const emitEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default { initializeSocket, emitEvent };