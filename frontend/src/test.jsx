// optimised way to cache data 

// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import axios from 'axios';
// import { Loader2, CheckCircle, Clock, AlertCircle, XCircle, Edit, Search, RefreshCw, FileText } from 'lucide-react';
// import { useAuth } from '../context/auth';
// import { useWebSocket } from '../context/websocket';
// import EditOrderModal from './EditOrderModal';

// // Create a custom axios instance with caching capability
// const api = axios.create({
//   baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
// });

// // Add request caching to reduce API calls
// const cache = new Map();
// const cacheTimeout = 5 * 60 * 1000; // 5 minutes

// api.interceptors.request.use(config => {
//   const cacheKey = `${config.url}?${new URLSearchParams(config.params || {}).toString()}`;
//   const cachedResponse = cache.get(cacheKey);
  
//   if (cachedResponse && (Date.now() - cachedResponse.timestamp < cacheTimeout)) {
//     return {
//       ...config,
//       adapter: () => Promise.resolve(cachedResponse.response),
//       cached: true
//     };
//   }
  
//   return {
//     ...config,
//     cacheKey
//   };
// });

// api.interceptors.response.use(response => {
//   if (!response.config.cached && response.config.cacheKey) {
//     cache.set(response.config.cacheKey, {
//       response,
//       timestamp: Date.now()
//     });
//   }
//   return response;
// });

// const OrdersList = ({ orderType }) => {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const { user } = useAuth();
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [showModal, setShowModal] = useState(false);
//   const [lastFetched, setLastFetched] = useState(null);
//   const [isPolling, setIsPolling] = useState(false);
//   const { lastMessage, isConnected } = useWebSocket();

//   // Determine team type once and memoize result
//   const teamType = useMemo(() => {
//     const teamNameLower = user.team.toLowerCase();
//     if (teamNameLower.includes('glass')) return 'glass';
//     if (teamNameLower.includes('cap')) return 'caps';
//     if (teamNameLower.includes('box') || teamNameLower.includes('packaging')) return 'boxes';
//     if (teamNameLower.includes('pump')) return 'pumps';
//     return 'unknown';
//   }, [user.team]);

//   // Order update tracking to prevent duplicate UI updates
//   const processedUpdates = useRef(new Set());

//   // Process WebSocket messages
//   useEffect(() => {
//     if (!lastMessage || !orders.length) return;
    
//     try {
//       const data = JSON.parse(lastMessage.data);
      
//       // Handle order item updates
//       if (data.type === 'orderItemUpdated') {
//         // Create unique update ID to prevent duplicate processing
//         const updateId = `${data.orderId}-${data.itemId}-${Date.now()}`;
        
//         // Skip if already processed this update
//         if (processedUpdates.current.has(updateId)) return;
//         processedUpdates.current.add(updateId);
        
//         // Limit the size of processed updates set
//         if (processedUpdates.current.size > 100) {
//           const toRemove = Array.from(processedUpdates.current).slice(0, 50);
//           toRemove.forEach(id => processedUpdates.current.delete(id));
//         }
        
//         // Update the specific order item in state
//         setOrders(prevOrders => {
//           return prevOrders.map(order => {
//             if (order._id === data.orderId) {
//               // Deep clone to avoid mutation
//               const updatedOrder = JSON.parse(JSON.stringify(order));
              
//               // Find the correct items array based on team
//               let itemsArray;
//               if (data.team === 'glass') {
//                 itemsArray = updatedOrder.order_details?.glass;
//               } else if (data.team === 'caps') {
//                 itemsArray = updatedOrder.order_details?.caps;
//               } else if (data.team === 'boxes') {
//                 itemsArray = updatedOrder.order_details?.boxes;
//               } else if (data.team === 'pumps') {
//                 itemsArray = updatedOrder.order_details?.pumps;
//               }
              
//               // If items array exists, update the specific item
//               if (itemsArray) {
//                 const itemIndex = itemsArray.findIndex(item => item._id === data.itemId);
//                 if (itemIndex !== -1) {
//                   itemsArray[itemIndex] = { 
//                     ...itemsArray[itemIndex],
//                     ...data.updates
//                   };
//                 }
//               }
              
//               return updatedOrder;
//             }
//             return order;
//           });
//         });
//       }
//     } catch (error) {
//       console.error("WebSocket message parsing error:", error);
//     }
//   }, [lastMessage, orders]);

//   // Clear cache when connection is established
//   useEffect(() => {
//     if (isConnected) {
//       // Clear client-side cache when WebSocket connects to ensure fresh data
//       cache.clear();
//     }
//   }, [isConnected]);

//   // Efficient fetch with debouncing and caching
//   const fetchOrders = useCallback(async (force = false) => {
//     try {
//       // Skip fetch if data is recent (less than 30 seconds ago) and not forced refresh
//       if (!force && lastFetched && (Date.now() - lastFetched < 30000)) {
//         return;
//       }

//       setLoading(prev => !prev ? true : prev);
//       const response = await api.get(`/orders/${orderType}`, {
//         params: { team: user.team }
//       });
      
//       setOrders(response.data.orders);
//       setLastFetched(Date.now());
//     } catch (error) {
//       console.error("Error fetching orders:", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [orderType, user.team, lastFetched]);

//   // Initial data fetch
//   useEffect(() => {
//     fetchOrders(true);
//   }, [fetchOrders]);

//   // Implement polling with optimized interval for live orders only when WebSocket not available
//   useEffect(() => {
//     if (orderType === 'liveOrders' && !isConnected) {
//       setIsPolling(true);
//       const interval = setInterval(() => {
//         fetchOrders();
//       }, 60000); // 1 minute polling for live orders
      
//       return () => {
//         clearInterval(interval);
//         setIsPolling(false);
//       };
//     }
//   }, [fetchOrders, orderType, isConnected]);

//   // Modal handlers
//   const handleEditOrder = useCallback((order) => {
//     setSelectedOrder(order);
//     setShowModal(true);
//   }, []);

//   const closeModal = useCallback(() => {
//     setShowModal(false);
//     setSelectedOrder(null);
//   }, []);

//   const handleUpdateSuccess = useCallback(() => {
//     // Refresh orders after successful update
//     fetchOrders(true);
//   }, [fetchOrders]);

//   // Memoize filtered orders to prevent unnecessary re-renders
//   const filteredOrders = useMemo(() => {
//     if (!searchTerm) return orders;
    
//     const lowerSearchTerm = searchTerm.toLowerCase();
//     return orders.filter(order =>
//       order.order_number.toLowerCase().includes(lowerSearchTerm) ||
//       order.customer_name.toLowerCase().includes(lowerSearchTerm) ||
//       order.dispatcher_name.toLowerCase().includes(lowerSearchTerm)
//     );
//   }, [orders, searchTerm]);

//   // Status icon generator
//   const getStatusIcon = useCallback((status) => {
//     switch (status) {
//       case 'Completed': return <CheckCircle className="w-4 h-4" />;
//       case 'Pending': return <AlertCircle className="w-4 h-4" />;
//       default: return null;
//     }
//   }, []);

//   // Memoize team-specific data extraction functions
//   const getOrderItems = useCallback((order) => {
//     switch (teamType) {
//       case 'glass': return order.order_details?.glass || [];
//       case 'caps': return order.order_details?.caps || [];
//       case 'boxes': return order.order_details.boxes || [];
//       case 'pumps': return order.order_details?.pumps || [];
//       default: return [];
//     }
//   }, [teamType]);

//   const getItemName = useCallback((item) => {
//     switch (teamType) {
//       case 'glass': return item.glass_name;
//       case 'caps': return item.cap_name;
//       case 'boxes': return item.box_name;
//       case 'pumps': return item.pump_name;
//       default: return 'Unknown Item';
//     }
//   }, [teamType]);

//   // Memoize team-specific columns
//   const getTeamTypeSpecificColumns = useMemo(() => {
//     switch (teamType) {
//       case 'glass': return [
//         { key: 'neck_size', label: 'Neck Size' },
//         { key: 'decoration', label: 'Decoration' }
//       ];
//       case 'caps': return [
//         { key: 'neck_size', label: 'Neck Size' },
//         { key: 'material', label: 'Material' }
//       ];
//       case 'boxes': return [
//         { key: 'approval_code', label: 'Approval Code' }
//       ];
//       case 'pumps': return [
//         { key: 'neck_type', label: 'Neck Type' }
//       ];
//       default: return [];
//     }
//   }, [teamType]);

//   const getCellValue = useCallback((item, column) => item[column.key] || 'N/A', []);

//   // Use React.memo for row rendering to prevent unnecessary re-renders
//   const OrderRow = React.memo(({ order, orderItems, itemIndex, orderIndex, isFirstItemInOrder }) => {
//     const item = orderItems[itemIndex];
    
//     return (
//       <tr
//         className={`hover:bg-orange-50 transition-colors duration-150 ${
//           orderIndex % 2 === 0 ? 'bg-white' : 'bg-amber-50'
//         }`}
//       >
//         {isFirstItemInOrder && (
//           <td
//             className="px-3 py-2 bg-amber-50 border-r border-gray-200"
//             rowSpan={orderItems.length}
//           >
//             <div className="flex flex-col">
//               <div className="text-sm font-bold text-orange-700 mb-1">
//                 <span className="font-bold">Order No: {order.order_number}</span>
//               </div>
//               <div className="text-sm text-gray-700 mb-1">
//                 <span className="font-bold">Customer: {order.customer_name}</span>
//               </div>
//               <div className="text-sm text-gray-700 mb-1">
//                 <span className="font-bold">Created: {new Date(order.createdAt).toLocaleDateString()}</span>
//               </div>
//               <div className="text-sm text-gray-700">
//                 <span className="font-bold">Dispatcher: {order.dispatcher_name}</span>
//               </div>
//             </div>
//           </td>
//         )}
//         <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
//           {getItemName(item)}
//         </td>
//         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
//           {item.quantity || 'N/A'}
//         </td>
//         {getTeamTypeSpecificColumns.map((column) => (
//           <td key={column.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
//             {getCellValue(item, column)}
//           </td>
//         ))}
//         <td className="px-3 py-2 whitespace-nowrap">
//           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
//             item.status === 'Completed' ? 'bg-green-100 text-green-800' :
//             item.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
//             'bg-gray-100 text-gray-800'
//           }`}>
//             {getStatusIcon(item.status)}
//             <span className="ml-1">{item.status}</span>
//           </span>
//         </td>
//         <td className="px-3 py-2 whitespace-nowrap">
//           <button
//             onClick={() => handleEditOrder(order)}
//             className="text-orange-600 hover:text-orange-800 focus:outline-none bg-orange-50 hover:bg-orange-100 p-1 rounded-full transition-colors"
//             aria-label="Edit order"
//           >
//             <Edit size={16} />
//           </button>
//         </td>
//       </tr>
//     );
//   });

//   // Loading state
//   if (loading && orders.length === 0) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
//           <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
//         </div>
//       </div>
//     );
//   }

//   // Empty state
//   if (orders.length === 0) {
//     return (
//       <div className="bg-white p-8 rounded-lg shadow-md text-center border border-gray-200">
//         <div className="py-8">
//           <FileText className="w-16 h-16 text-orange-300 mx-auto mb-4" />
//           <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
//           <p className="text-gray-600">No {orderType === 'liveOrders' ? 'live' : 'past'} orders found for your team.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4 h-full flex flex-col">
//       <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
//         <h2 className="text-md font-bold text-gray-800 flex items-center">
//           {orderType === 'liveOrders' ? 'Active Orders' : 'Past Orders'}
//           <span className="ml-3 text-sm font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
//             {filteredOrders.length}
//           </span>
//           {isPolling && orderType === 'liveOrders' && (
//             <span className="ml-2 text-xs text-gray-500 flex items-center">
//               <Clock className="w-3 h-3 mr-1" /> Auto-updating
//             </span>
//           )}
//           {loading && orders.length > 0 && (
//             <span className="ml-2">
//               <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
//             </span>
//           )}
//         </h2>

//         <div className="flex flex-col sm:flex-row gap-3">
//           <div className="relative">
//             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//               <Search className="h-4 w-4 text-gray-400" />
//             </div>
//             <input
//               type="text"
//               className="pl-10 pr-4 py-1 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm"
//               placeholder="Search orders..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           <button
//             className="inline-flex items-center px-3 py-1 border border-orange-300 shadow-sm text-sm font-medium rounded-lg text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
//             onClick={() => fetchOrders(true)}
//             disabled={loading}
//           >
//             <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
//             Refresh
//           </button>
//         </div>
//       </div>

//       <div className="flex-1 min-h-0 relative bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
//         <div className="absolute inset-0 overflow-auto">
//           <table className="min-w-full divide-y divide-gray-200 table-fixed">
//             <thead className="bg-gradient-to-r from-orange-500 to-orange-600 font-semibold sticky top-0 z-10">
//               <tr>
//                 {[
//                   "Order Details",
//                   "Item",
//                   "Quantity",
//                   ...getTeamTypeSpecificColumns.map(col => col.label),
//                   "Status",
//                   "Actions"
//                 ].map((header, index) => (
//                   <th
//                     key={index}
//                     scope="col"
//                     className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-white"
//                   >
//                     {header}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredOrders.map((order, orderIndex) => {
//                 const orderItems = getOrderItems(order);

//                 return (
//                   <React.Fragment key={order._id}>
//                     {orderItems.map((item, itemIndex) => (
//                       <OrderRow
//                         key={`${order._id}-${itemIndex}`}
//                         order={order}
//                         orderItems={orderItems}
//                         itemIndex={itemIndex}
//                         orderIndex={orderIndex}
//                         isFirstItemInOrder={itemIndex === 0}
//                       />
//                     ))}
//                     {orderIndex < filteredOrders.length - 1 && (
//                       <tr className="border-b-2 border-amber-50">
//                         <td colSpan={6 + getTeamTypeSpecificColumns.length} className="p-0"></td>
//                       </tr>
//                     )}
//                   </React.Fragment>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {showModal && selectedOrder && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 mx-4">
//             <div className="flex justify-between items-center mb-6 border-b pb-4">
//               <h3 className="text-xl font-bold text-gray-800">Edit Order {selectedOrder.order_number}</h3>
//               <button
//                 onClick={closeModal}
//                 className="text-gray-500 hover:text-gray-700 focus:outline-none"
//                 aria-label="Close modal"
//               >
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//               </button>
//             </div>
//             <div className="p-4 bg-amber-50 rounded-lg">
//               <p className="text-gray-700">Edit form placeholder for {selectedOrder.order_number}</p>
//             </div>
//             <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
//               <button
//                 onClick={closeModal}
//                 className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm transition-colors"
//               >
//                 Save Changes
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default React.memo(OrdersList);


// // Optimized backend API with caching and pagination
// const express = require('express');
// const router = express.Router();
// const Order = require('../models/Order');
// const redis = require('redis');
// const { promisify } = require('util');

// // Redis client setup (for production environment)
// let redisClient;
// let getAsync;
// let setAsync;

// if (process.env.NODE_ENV === 'production') {
//   redisClient = redis.createClient({
//     url: process.env.REDIS_URL,
//     // Ensure proper handling of AWS ElastiCache or other Redis services
//     retry_strategy: function(options) {
//       if (options.error && options.error.code === 'ECONNREFUSED') {
//         return new Error('Redis server refused connection');
//       }
//       if (options.total_retry_time > 1000 * 60 * 60) {
//         return new Error('Retry time exhausted');
//       }
//       return Math.min(options.attempt * 100, 3000);
//     }
//   });

//   getAsync = promisify(redisClient.get).bind(redisClient);
//   setAsync = promisify(redisClient.set).bind(redisClient);
  
//   redisClient.on('error', (err) => {
//     console.log('Redis error: ', err);
//   });
// }

// // Determine cache TTL based on order type (live orders cache for less time)
// const getCacheTTL = (orderType) => {
//   return orderType === 'liveOrders' ? 60 : 300; // 1 minute for live, 5 minutes for past
// };

// // Helper function to get team query field
// const getTeamQueryField = (team) => {
//   const teamNameLower = team.toLowerCase();
//   if (teamNameLower.includes('glass')) return 'order_details.glass';
//   if (teamNameLower.includes('cap')) return 'order_details.caps';
//   if (teamNameLower.includes('box') || teamNameLower.includes('packaging')) return 'order_details.boxes';
//   if (teamNameLower.includes('pump')) return 'order_details.pumps';
//   return null;
// };

// exports.filterOrders = async (req, res) => {
//   try {
//     const { orderType } = req.params;
//     const { team, page = 1, limit = 50, lastUpdated } = req.query;
    
//     // Validate required parameters
//     if (!team) {
//       return res.status(400).json({ error: 'Team parameter is required' });
//     }

//     // Generate cache key based on request params
//     const cacheKey = `orders:${orderType}:${team}:${page}:${limit}`;
    
//     // Check if we have Redis in production and try to get cached results
//     if (process.env.NODE_ENV === 'production' && redisClient) {
//       try {
//         const cachedData = await getAsync(cacheKey);
//         if (cachedData) {
//           const parsedData = JSON.parse(cachedData);
          
//           // If client sends lastUpdated header and data is newer, return cached data
//           if (!lastUpdated || new Date(parsedData.timestamp) > new Date(lastUpdated)) {
//             return res.json({
//               ...parsedData.data,
//               fromCache: true
//             });
//           }
//         }
//       } catch (cacheError) {
//         console.error('Cache retrieval error:', cacheError);
//         // Continue with database query if cache fails
//       }
//     }
    
//     // Get team field for query
//     const teamField = getTeamQueryField(team);
//     if (!teamField) {
//       return res.status(400).json({ error: 'Invalid team type' });
//     }

//     // Determine order status based on order type
//     const orderStatus = orderType === 'liveOrders' ? 'Pending' : 'Completed';
    
//     // Calculate pagination
//     const skip = (parseInt(page) - 1) * parseInt(limit);
    
//     // Query for count first (cheaper than getting all docs) to support pagination
//     const totalCount = await Order.countDocuments({
//       order_status: orderStatus,
//       [`${teamField}.0`]: { $exists: true }
//     });

//     // Only query if there are documents
//     if (totalCount === 0) {
//       const responseData = { 
//         orders: [],
//         pagination: {
//           total: 0,
//           page: parseInt(page),
//           limit: parseInt(limit),
//           pages: 0
//         }
//       };
      
//       // Cache empty results too
//       if (process.env.NODE_ENV === 'production' && redisClient) {
//         await setAsync(
//           cacheKey,
//           JSON.stringify({
//             data: responseData,
//             timestamp: new Date()
//           }),
//           'EX',
//           getCacheTTL(orderType)
//         );
//       }
      
//       return res.json(responseData);
//     }
    
//     // Get paginated results with optimized projection
//     const filteredOrders = await Order.find(
//       {
//         order_status: orderStatus,
//         [`${teamField}.0`]: { $exists: true }
//       },
//       {
//         order_number: 1,
//         dispatcher_name: 1,
//         customer_name: 1,
//         createdAt: 1,
//         order_status: 1,
//         [teamField]: 1
//       }
//     )
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(parseInt(limit))
//     .lean(); // Use lean for faster queries
    
//     // Prepare response
//     const responseData = {
//       orders: filteredOrders,
//       pagination: {
//         total: totalCount,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         pages: Math.ceil(totalCount / parseInt(limit))
//       },
//       timestamp: new Date()
//     };
    
//     // Cache results in production
//     if (process.env.NODE_ENV === 'production' && redisClient) {
//       try {
//         await setAsync(
//           cacheKey,
//           JSON.stringify({
//             data: responseData,
//             timestamp: new Date()
//           }),
//           'EX',
//           getCacheTTL(orderType)
//         );
//       } catch (cacheError) {
//         console.error('Cache storage error:', cacheError);
//         // Continue without caching if it fails
//       }
//     }
    
//     res.json(responseData);
//   } catch (error) {
//     console.error('Error filtering orders:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // Single order endpoint - useful for updates to avoid refetching everything
// exports.getOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { team } = req.query;
    
//     if (!team) {
//       return res.status(400).json({ error: 'Team parameter is required' });
//     }
    
//     const teamField = getTeamQueryField(team);
//     if (!teamField) {
//       return res.status(400).json({ error: 'Invalid team type' });
//     }
    
//     // Create projection to only return needed fields
//     const projection = {
//       order_number: 1,
//       dispatcher_name: 1,
//       customer_name: 1,
//       createdAt: 1,
//       order_status: 1,
//       [teamField]: 1
//     };
    
//     const order = await Order.findById(id, projection).lean();
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     res.json({ order });
//   } catch (error) {
//     console.error('Error getting order:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // Batch update endpoint to reduce multiple API calls
// exports.updateOrderItems = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { team, items } = req.body;
    
//     if (!team || !items || !Array.isArray(items)) {
//       return res.status(400).json({ error: 'Team and items array are required' });
//     }
    
//     const teamField = getTeamQueryField(team);
//     if (!teamField) {
//       return res.status(400).json({ error: 'Invalid team type' });
//     }
    
//     const order = await Order.findById(orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     // Get the correct array based on team type
//     const arrayPath = teamField.split('.');
//     const itemsArray = arrayPath.reduce((obj, path) => obj[path], order);
    
//     if (!itemsArray) {
//       return res.status(400).json({ error: 'No items found for this team' });
//     }
    
//     // Update only the items that have changed
//     items.forEach(updatedItem => {
//       const index = itemsArray.findIndex(item => item._id.toString() === updatedItem._id);
//       if (index !== -1) {
//         Object.assign(itemsArray[index], updatedItem);
//       }
//     });
    
//     // Save changes and clear cache if in production
//     await order.save();
    
//     if (process.env.NODE_ENV === 'production' && redisClient) {
//       // Clear related caches
//       const cachePattern = `orders:*:${team}:*`;
//       redisClient.keys(cachePattern, (err, keys) => {
//         if (err) {
//           console.error('Error getting cache keys:', err);
//         } else if (keys.length > 0) {
//           redisClient.del(...keys);
//         }
//       });
//     }
    
//     res.json({ success: true, message: 'Order items updated' });
//   } catch (error) {
//     console.error('Error updating order items:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // Setup routes
// module.exports = (app) => {
//   app.get('/orders/:orderType', exports.filterOrders);
//   app.get('/orders/id/:id', exports.getOrderById);
//   app.patch('/orders/:orderId/items', exports.updateOrderItems);
// };


// this is the code u gave earlier for caching which is fair enough 
// now suppose a dispatcher created order
// glass team received order

// the glass team has an edit order button for all orders 
// suppose glass team received order 1 which has 2 items 
// item a and item b 

// my front end logic is such way that a modal opens on button click of order 1  where the quantity he made today he has to put the order-List has a received qty how much he has to make then it minus from the orignak quanting once both becomes zero it it marked as completed

// now to update it to real time to dispatcher that glass team has completed the order we will need web sockets as  how will he know without refreshing the dispathcer dashboard that glass team has completed the order
// the same status needs to be updated to backend also 

// how will we implement this in optimised way and implement serverside and frront caching mechanism

// server/websocket.js
const WebSocket = require('ws');
const Order = require('../models/Order');
const redis = require('redis');
const { promisify } = require('util');

// Setup Redis client for production
let redisClient;
let getAsync;
let setAsync;

if (process.env.NODE_ENV === 'production') {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    retry_strategy: function(options) {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        return new Error('Redis server refused connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error('Retry time exhausted');
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });

  getAsync = promisify(redisClient.get).bind(redisClient);
  setAsync = promisify(redisClient.set).bind(redisClient);
  
  redisClient.on('error', (err) => {
    console.log('Redis error: ', err);
  });
}

// WebSocket server setup
const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });
  
  // Track connected clients by team
  const clients = {
    dispatchers: new Set(),
    glass: new Set(),
    caps: new Set(),
    boxes: new Set(),
    pumps: new Set()
  };

  wss.on('connection', (ws) => {
    let clientTeam = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle client registration by team
        if (data.type === 'register') {
          clientTeam = data.team;
          if (clients[clientTeam]) {
            clients[clientTeam].add(ws);
            console.log(`Client registered as ${clientTeam}`);
            ws.send(JSON.stringify({ type: 'registered', team: clientTeam }));
          }
        }
        
        // Handle order updates
        else if (data.type === 'updateOrderItem') {
          const { orderId, itemId, team, updates } = data;
          
          if (!orderId || !itemId || !team || !updates) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Missing required fields' 
            }));
            return;
          }
          
          // Save the update to database
          await updateOrderItem(orderId, itemId, team, updates);
          
          // Broadcast to relevant teams
          const updateMessage = JSON.stringify({
            type: 'orderItemUpdated',
            orderId,
            itemId,
            team,
            updates
          });
          
          // Always notify dispatchers
          clients.dispatchers.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(updateMessage);
            }
          });
          
          // Notify the team that made the update
          clients[team].forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(updateMessage);
            }
          });
          
          // Invalidate cache for this order
          if (process.env.NODE_ENV === 'production' && redisClient) {
            const cachePattern = `orders:*:${team}:*`;
            redisClient.keys(cachePattern, (err, keys) => {
              if (!err && keys.length > 0) {
                redisClient.del(...keys);
              }
            });
            
            // Also invalidate dispatcher cache
            const dispatcherCachePattern = `orders:*:dispatchers:*`;
            redisClient.keys(dispatcherCachePattern, (err, keys) => {
              if (!err && keys.length > 0) {
                redisClient.del(...keys);
              }
            });
          }
          
          // Confirm update to the sender
          ws.send(JSON.stringify({
            type: 'updateConfirmed',
            orderId,
            itemId
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      if (clientTeam && clients[clientTeam]) {
        clients[clientTeam].delete(ws);
        console.log(`Client disconnected from ${clientTeam}`);
      }
    });
  });

  // Helper function to update order item in database
  async function updateOrderItem(orderId, itemId, team, updates) {
    // Get team field path
    const teamField = getTeamQueryField(team);
    if (!teamField) {
      throw new Error('Invalid team');
    }
    
    // Build the update query with the correct path
    const updateQuery = {};
    Object.keys(updates).forEach(key => {
      updateQuery[`${teamField}.$[item].${key}`] = updates[key];
    });
    
    // Check if all items are completed and update order status if needed
    const order = await Order.findById(orderId);
    
    await Order.updateOne(
      { _id: orderId },
      { $set: updateQuery },
      { 
        arrayFilters: [{ "item._id": itemId }]
      }
    );
    
    // After updating the item, check if we need to update the order status
    if (updates.status === 'Completed') {
      const updatedOrder = await Order.findById(orderId);
      const teamItems = getTeamItems(updatedOrder, team);
      
      // If all items for this team are completed, update order status
      const allItemsCompleted = teamItems.every(item => item.status === 'Completed');
      
      if (allItemsCompleted) {
        // Check if all teams have completed their items
        const allTeamsCompleted = ['glass', 'caps', 'boxes', 'pumps']
          .every(teamType => {
            const items = getTeamItems(updatedOrder, teamType);
            return items.length === 0 || items.every(item => item.status === 'Completed');
          });
        
        if (allTeamsCompleted) {
          await Order.updateOne(
            { _id: orderId },
            { $set: { order_status: 'Completed' } }
          );
        }
      }
    }
    
    return true;
  }
  
  // Helper function to get team query field
  function getTeamQueryField(team) {
    const teamNameLower = team.toLowerCase();
    if (teamNameLower.includes('glass')) return 'order_details.glass';
    if (teamNameLower.includes('cap')) return 'order_details.caps';
    if (teamNameLower.includes('box') || teamNameLower.includes('packaging')) return 'order_details.boxes';
    if (teamNameLower.includes('pump')) return 'order_details.pumps';
    return null;
  }
  
  // Helper function to get team items from order
  function getTeamItems(order, team) {
    const teamField = getTeamQueryField(team);
    if (!teamField || !order) return [];
    
    const fieldParts = teamField.split('.');
    let items = order;
    for (const part of fieldParts) {
      items = items[part];
      if (!items) return [];
    }
    
    return items;
  }
};

module.exports = { setupWebSocketServer };

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Clock, Save, X } from 'lucide-react';
import { useAuth } from '../context/auth';
import { useWebSocket } from '../context/websocket';

const EditOrderModal = ({ order, closeModal, onUpdateSuccess }) => {
  const [items, setItems] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { user } = useAuth();
  const { sendMessage, lastMessage } = useWebSocket();
  const itemUpdatesQueue = useRef(new Map()).current;
  const teamType = user.team.toLowerCase();

  // Determine which items to show based on team type
  useEffect(() => {
    if (!order) return;
    
    let teamItems = [];
    if (teamType.includes('glass')) {
      teamItems = order.order_details?.glass || [];
    } else if (teamType.includes('cap')) {
      teamItems = order.order_details?.caps || [];
    } else if (teamType.includes('box') || teamType.includes('packaging')) {
      teamItems = order.order_details?.boxes || [];
    } else if (teamType.includes('pump')) {
      teamItems = order.order_details?.pumps || [];
    }
    
    // Add receivedQuantity field for tracking
    setItems(teamItems.map(item => ({
      ...item,
      receivedQuantity: item.receivedQuantity || 0,
      remainingQuantity: item.quantity - (item.receivedQuantity || 0)
    })));
  }, [order, teamType]);

  // Listen for websocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const data = JSON.parse(lastMessage.data);
      
      // Handle update confirmation
      if (data.type === 'updateConfirmed' && data.orderId === order._id) {
        // Remove from queue when confirmed
        itemUpdatesQueue.delete(data.itemId);
        
        if (itemUpdatesQueue.size === 0) {
          setIsUpdating(false);
          setUpdateSuccess(true);
          setTimeout(() => {
            setUpdateSuccess(false);
          }, 2000);
          
          // Notify parent component
          if (onUpdateSuccess) {
            onUpdateSuccess();
          }
        }
      }
      
      // Handle order item updates from other users
      if (data.type === 'orderItemUpdated' && 
          data.orderId === order._id && 
          data.team === teamType) {
        setItems(prev => prev.map(item => {
          if (item._id === data.itemId) {
            return {
              ...item,
              ...data.updates,
              receivedQuantity: data.updates.receivedQuantity || item.receivedQuantity || 0,
              remainingQuantity: item.quantity - (data.updates.receivedQuantity || item.receivedQuantity || 0)
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
    }
  }, [lastMessage, order, teamType, itemUpdatesQueue, onUpdateSuccess]);

  // Handle received quantity change
  const handleReceivedChange = useCallback((itemId, value) => {
    const numValue = parseInt(value) || 0;
    
    setItems(prev => prev.map(item => {
      if (item._id === itemId) {
        const receivedQuantity = Math.min(Math.max(0, numValue), item.quantity);
        return {
          ...item,
          receivedQuantity,
          remainingQuantity: item.quantity - receivedQuantity,
          status: receivedQuantity >= item.quantity ? 'Completed' : 'Pending'
        };
      }
      return item;
    }));
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    if (isUpdating) return;
    
    const updatedItems = items.filter(item => 
      item.receivedQuantity > 0 || 
      item.status === 'Completed'
    );
    
    if (updatedItems.length === 0) return;
    
    setIsUpdating(true);
    
    // Queue all updates
    updatedItems.forEach(item => {
      const updates = {
        receivedQuantity: item.receivedQuantity,
        status: item.status
      };
      
      // Add to queue
      itemUpdatesQueue.set(item._id, updates);
      
      // Send via WebSocket
      sendMessage(JSON.stringify({
        type: 'updateOrderItem',
        orderId: order._id,
        itemId: item._id,
        team: teamType,
        updates
      }));
    });
  }, [items, isUpdating, order, teamType, sendMessage, itemUpdatesQueue]);

  if (!order) return null;

  // Get item name based on team type
  const getItemName = (item) => {
    if (teamType.includes('glass')) return item.glass_name;
    if (teamType.includes('cap')) return item.cap_name;
    if (teamType.includes('box') || teamType.includes('packaging')) return item.box_name;
    if (teamType.includes('pump')) return item.pump_name;
    return 'Unknown Item';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 mx-4">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Update Quantities - Order {order.order_number}
          </h3>
          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item._id} className={item.status === 'Completed' ? 'bg-green-50' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getItemName(item)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={item.receivedQuantity}
                      onChange={(e) => handleReceivedChange(item._id, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      disabled={isUpdating || item.status === 'Completed'}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {item.remainingQuantity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status === 'Completed' ? 
                        <CheckCircle className="w-4 h-4 mr-1" /> : 
                        <Clock className="w-4 h-4 mr-1" />
                      }
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
          <button
            onClick={closeModal}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating || updateSuccess}
            className={`px-4 py-2 flex items-center rounded-lg shadow-sm transition-colors ${
              updateSuccess 
                ? 'bg-green-600 text-white' 
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {isUpdating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : updateSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Updated!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EditOrderModal);

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './auth';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const { user } = useAuth();

  // Setup WebSocket connection
  useEffect(() => {
    if (!user) return;

    // Determine WebSocket URL from environment or default
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.REACT_APP_WS_URL || 
      `${wsProtocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempt(0);
      
      // Register with team
      const teamType = determineTeamType(user.team);
      ws.send(JSON.stringify({
        type: 'register',
        team: teamType
      }));
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect with exponential backoff
      const timeout = Math.min(1000 * (2 ** reconnectAttempt), 30000);
      setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
      }, timeout);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (message) => {
      setLastMessage(message);
    };
    
    setSocket(ws);
    
    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [user, reconnectAttempt]);

  // Helper function to determine team type for WebSocket registration
  const determineTeamType = useCallback((team) => {
    if (!team) return 'unknown';
    
    const teamLower = team.toLowerCase();
    if (teamLower.includes('dispatch')) return 'dispatchers';
    if (teamLower.includes('glass')) return 'glass';
    if (teamLower.includes('cap')) return 'caps';
    if (teamLower.includes('box') || teamLower.includes('packaging')) return 'boxes';
    if (teamLower.includes('pump')) return 'pumps';
    return 'unknown';
  }, []);

  // Send message helper
  const sendMessage = useCallback((message) => {
    if (socket && isConnected) {
      socket.send(message);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  // Keep connection alive with ping/pong
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const pingInterval = setInterval(() => {
      sendMessage(JSON.stringify({ type: 'ping' }));
    }, 30000); // 30 seconds ping
    
    return () => clearInterval(pingInterval);
  }, [socket, isConnected, sendMessage]);

  return (
    <WebSocketContext.Provider value={{ 
      isConnected, 
      lastMessage, 
      sendMessage
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);