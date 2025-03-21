import Order from '../config/db.js';
import { emitEvent } from '../server/socket.mjs';


export const createOrder = async (req, res) => {
  try {
    if (!req.body.order_number || !req.body.dispatcher_name || !req.body.customer_name) {
      return res.status(400).json({ error: 'Missing required fields: order number, dispatcher name, and customer name are required' });
    }

    const orderDetails = req.body.order_details || {};
    const hasItems =
      (orderDetails.glass && orderDetails.glass.length > 0) ||
      (orderDetails.caps && orderDetails.caps.length > 0) ||
      (orderDetails.boxes && orderDetails.boxes.length > 0) ||
      (orderDetails.pumps && orderDetails.pumps.length > 0);

    if (!hasItems) {
      return res.status(400).json({ error: 'Order must contain at least one item (glass, caps, boxes, or pumps)' });
    }

    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: '✅ Order Created Successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Order creation error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Order number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};



export const filterOrders = async (req, res) => {
  try {
    const { orderType } = req.params;
    const { team } = req.query;

    if (!team) {
      return res.status(400).json({ error: 'Team parameter is required' });
    }

    const teamMapping = {
      glass: 'order_details.glass',
      cap: 'order_details.caps',
      box: 'order_details.boxes',
      pump: 'order_details.pumps'
    };

    const teamKey = Object.keys(teamMapping).find(key => team.toLowerCase().includes(key));
    if (!teamKey) {
      return res.status(400).json({ error: 'Invalid team type' });
    }

    const teamField = teamMapping[teamKey];

    const orderStatus = orderType === 'liveOrders' ? 'Pending' : 'Completed';

    const filteredOrders = await Order.find(
      {
        order_status: orderStatus,
        [`${teamField}.0`]: { $exists: true }
      },
      {
        order_number: 1,
        dispatcher_name: 1,
        customer_name: 1,
        createdAt: 1,
        order_status: 1,
        [teamField]: 1
      }
    );

    res.json({ orders: filteredOrders });
  } catch (error) {
    console.error('Error filtering orders:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, itemId, team, status, completedQuantity } = req.body;

    // Emit WebSocket event instead of updating DB directly
    emitEvent('updateOrderStatus', { orderId, itemId, team, status, completedQuantity });

    res.status(200).json({ message: 'Update request sent via WebSocket' });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    res.status(500).json({ error: error.message });
  }
};


export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};






