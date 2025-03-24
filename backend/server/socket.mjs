import { Server } from 'socket.io';

// Store connected clients and their roles/teams
const connectedClients = new Map();

// Store order data in memory for syncing across clients
const orderData = {
  quantities: {},  // Format: { orderId-itemId: { quantity, team } }
  history: {}      // Format: { orderId: [ history entries ] }
};

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
    
    // Check query parameters for client identification
    const { clientId, role, team } = socket.handshake.query;
    console.log(`Client connected with ID: ${clientId}, Role: ${role}, Team: ${team}`);

    // Handle joining room based on role (team or dispatcher)
    socket.on('joinRoom', (data) => {
      // Store client information
      connectedClients.set(socket.id, {
        id: socket.id,
        clientId: clientId || 'unknown',
        role: data.role,
        team: data.team,
        connectedAt: new Date()
      });

      console.log(`Active connections: ${connectedClients.size}`);
      console.log(`Client joined: ${socket.id} as ${data.role}${data.team ? ` (${data.team} team)` : ''}`);

      // If joining as a team, join team-specific room
      if (data.role === 'team' && data.team) {
        const roomName = `team-${data.team}`;
        socket.join(roomName);
        console.log(`${socket.id} joined ${roomName} room`);
        
        // Send confirmation to the client
        socket.emit('roomJoined', { room: roomName, success: true });
      }

      // If joining as dispatcher, join dispatcher room
      if (data.role === 'dispatcher') {
        socket.join('dispatchers');
        console.log(`${socket.id} joined dispatchers room`);
        
        // Send confirmation to the client
        socket.emit('roomJoined', { room: 'dispatchers', success: true });
        
        // Sync existing data to the newly connected dispatcher
        syncDataToClient(socket);
      }
    });

    // Handle order status updates from teams
    socket.on('updateOrderStatus', (data) => {
      try {
        console.log('Received order status update:', data);

        // Forward the update to ALL dispatchers
        io.to('dispatchers').emit('orderStatusUpdated', data);

        // Also broadcast to the specific team room (if applicable)
        if (data.team) {
          io.to(`team-${data.team}`).emit('teamOrderStatusUpdated', data);
        }

        // Send confirmation to the sender
        socket.emit('updateConfirmation', {
          success: true,
          message: 'Order status updated successfully',
          data: data
        });

        console.log(`Order status update broadcast to dispatchers and team-${data.team || 'unknown'}`);
      } catch (error) {
        console.error('Error handling order status update:', error);
        socket.emit('error', { message: 'Failed to update order status', details: error.message });
      }
    });

    // Handle quantity updates
    socket.on('updateOrderQuantity', (data) => {
      try {
        const { orderId, itemId, quantity, team } = data;
        console.log('Received quantity update:', data);
        
        if (!orderId || !itemId || quantity === undefined || !team) {
          throw new Error('Missing required fields in quantity update');
        }
        
        // Store the update in memory
        const itemKey = `${orderId}-${itemId}`;
        orderData.quantities[itemKey] = { 
          quantity, 
          team, 
          lastUpdated: new Date().toISOString() 
        };
        
        // Broadcast to all dispatchers
        io.to('dispatchers').emit('orderQuantityUpdate', data);
        
        // Broadcast to the specific team
        io.to(`team-${team}`).emit('orderQuantityUpdate', data);
        
        // Send confirmation to the sender
        socket.emit('updateConfirmation', {
          success: true,
          message: 'Order quantity updated successfully',
          data: data
        });
        
        console.log(`Order quantity update broadcast to dispatchers and team-${team}`);
      } catch (error) {
        console.error('Error handling quantity update:', error);
        socket.emit('error', { message: 'Failed to update quantity', details: error.message });
      }
    });
    
    // Handle history updates
    socket.on('updateOrderHistory', (data) => {
      try {
        const { orderId, history } = data;
        console.log('Received history update:', data);
        
        if (!orderId || !history) {
          throw new Error('Missing required fields in history update');
        }
        
        // Store the update in memory
        orderData.history[orderId] = history;
        
        // Broadcast to all dispatchers
        io.to('dispatchers').emit('orderHistoryUpdate', data);
        
        // Get the client info to determine which team to send to
        const clientInfo = connectedClients.get(socket.id);
        if (clientInfo && clientInfo.team) {
          io.to(`team-${clientInfo.team}`).emit('orderHistoryUpdate', data);
        }
        
        // Send confirmation to the sender
        socket.emit('updateConfirmation', {
          success: true,
          message: 'Order history updated successfully',
          data: data
        });
        
        console.log(`Order history update broadcast to dispatchers`);
      } catch (error) {
        console.error('Error handling history update:', error);
        socket.emit('error', { message: 'Failed to update history', details: error.message });
      }
    });

    // Handle heartbeat to keep connection alive
    socket.on('heartbeat', (data) => {
      socket.emit('heartbeatAck', { 
        received: true, 
        timestamp: new Date().toISOString(),
        clientCount: connectedClients.size
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      connectedClients.delete(socket.id);
      console.log(`Remaining connections: ${connectedClients.size}`);
    });
  });

  return io;
};

// Helper function to sync existing data to newly connected client
function syncDataToClient(socket) {
  // Sync quantities
  Object.entries(orderData.quantities).forEach(([itemKey, data]) => {
    const [orderId, itemId] = itemKey.split('-');
    socket.emit('orderQuantityUpdate', {
      orderId,
      itemId,
      quantity: data.quantity,
      team: data.team
    });
  });
  
  // Sync history
  Object.entries(orderData.history).forEach(([orderId, history]) => {
    socket.emit('orderHistoryUpdate', {
      orderId,
      history
    });
  });
  
  console.log(`Synced data to client ${socket.id}`);
}

export const emitEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default { initializeSocket, emitEvent };