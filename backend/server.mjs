import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';
import './config/db.js'; 
import { initializeSocket } from './server/socket.mjs';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
})); 

const PORT = process.env.PORT || 5000;

app.use('/orders', orderRoutes);

app.get('/', (req, res) => {
  res.send('✅ Pragati Glass Order Management API is Running!');
});


app.get('/api/debug/connections', (req, res) => {
  const connections = Array.from(connectedClients.values());
  res.json({
    count: connections.length,
    connections: connections
  });
});

const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

initializeSocket(server);
