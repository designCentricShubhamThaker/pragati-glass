import express from 'express';
import { createOrder, getOrders,filterOrders, updateOrderStatus } from '../controllers/orderController.js';

const router = express.Router();

router.post('/', createOrder); 
router.get('/', getOrders); 
router.get('/:orderType' , filterOrders)
router.post('/updateOrderStatus', updateOrderStatus);



export default router;
