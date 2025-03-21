import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import React, { useState, useMemo, useEffect } from 'react'
import { 
  determineTeamType, 
  getOrderItems, 
  getItemName 
} from '../utils/OrderUtils';
import { useSocket } from '../context/SocketContext';

const EditTodaysCompletedOrder = ({ onClose, selectedOrder, onOrderUpdated }) => {
  const teamType = useMemo(() => determineTeamType(selectedOrder), [selectedOrder]);
  const orderItems = useMemo(() => getOrderItems(selectedOrder, teamType), [teamType, selectedOrder]);
  const { socket } = useSocket();
  const [completedQuantities, setCompletedQuantities] = useState({});
  
  // Initialize with values from localStorage if they exist
  useEffect(() => {
    if (!selectedOrder) return;
    
    const storedCompletions = JSON.parse(localStorage.getItem('completedQuantities') || '{}');
    const initialValues = {};
    
    orderItems.forEach(item => {
      const itemKey = `${selectedOrder._id}-${item._id}`;
      initialValues[item._id] = (storedCompletions[itemKey]?.completed || 0);
    });
    
    setCompletedQuantities(initialValues);
  }, [selectedOrder, orderItems]);

  const handleCompletedChange = (id, value) => {
    // Ensure value is always a number
    const numValue = value === '' ? 0 : parseInt(value, 10) || 0;
    
    setCompletedQuantities({
      ...completedQuantities,
      [id]: numValue
    });
  };

  const handleSaveChanges = () => {
    const timestamp = new Date().toISOString();
    const existingCompletions = JSON.parse(localStorage.getItem('completedQuantities') || '{}');
    const updatedCompletions = { ...existingCompletions };
    const updatedItems = [];

    orderItems.forEach(item => {
      const completed = completedQuantities[item._id] || 0;
      const itemKey = `${selectedOrder._id}-${item._id}`;
      
      // Store in localStorage
      if (completed > 0) {
        updatedCompletions[itemKey] = {
          orderId: selectedOrder._id,
          orderNumber: selectedOrder.order_number,
          itemId: item._id,
          itemName: getItemName(item, teamType),
          originalQuantity: item.quantity,
          completed: completed,
          timestamp: timestamp
        };
      }
      
      // Check if item is completed (all quantity done)
      const isCompleted = completed >= item.quantity;
      
      // Add to items that will be sent via socket
      updatedItems.push({
        itemId: item._id,
        completed: completed,
        status: isCompleted ? "Done" : "Pending"
      });
    });

    // Save to localStorage
    localStorage.setItem('completedQuantities', JSON.stringify(updatedCompletions));
    
    // Emit socket event with update information
    if (socket) {
      socket.emit('updateOrderStatus', {
        orderId: selectedOrder._id,
        team: teamType,
        items: updatedItems,
        timestamp: timestamp
      });
    }

    if (onOrderUpdated) {
      onOrderUpdated();
    }
  
    onClose();
  };

  if (!selectedOrder) return null;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-10">
      <DialogBackdrop
        className="fixed inset-0 bg-gray-500/75 transition-opacity"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl"
          >
            {/* Rest of component remains the same */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
                    Edit Order
                  </DialogTitle>
                  
                  <div className="mt-4">
                    <div className="bg-amber-50 rounded border border-amber-100">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-amber-100">
                            <th className="py-2 px-4 text-left font-medium text-orange-800">Order No.</th>
                            <th className="py-2 px-4 text-left font-medium text-orange-800">Customer</th>
                            <th className="py-2 px-4 text-left font-medium text-orange-800">Item</th>
                            <th className="py-2 px-4 text-left font-medium text-orange-800">Total Quantity</th>
                            <th className="py-2 px-4 text-left font-medium text-orange-800">Completed Today</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item, index) => (
                            <tr key={item._id}>
                              {index === 0 && (
                                <td className="py-4 px-4" rowSpan={orderItems.length}>
                                  {selectedOrder.order_number}
                                </td>
                              )}
                              {index === 0 && (
                                <td className="py-4 px-4" rowSpan={orderItems.length}>
                                  {selectedOrder.customer_name}
                                </td>
                              )}
                              <td className="pt-2 pb-2 px-4">
                                <div className="bg-[#F05C1C]  text-white px-2 py-2 rounded">
                                  {getItemName(item, teamType)}
                                </div>
                              </td>
                              <td className="pt-2 pb-2 px-0">
                                <div className="bg-[#F05C1C] text-white px-2 py-2 rounded">
                                  {item.quantity}
                                </div>
                              </td>
                              <td className="py-2 px-4">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  className="border border-gray-300 rounded px-2 py-2 w-full"
                                  value={completedQuantities[item._id] || ''}
                                  onChange={(e) => handleCompletedChange(item._id, e.target.value)}
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-gray-700 bg-gray-200 rounded-md mr-4 hover:bg-gray-300 transition-colors shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="bg-[#A53107] text-white px-4 py-2 rounded"
                        onClick={handleSaveChanges}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default EditTodaysCompletedOrder;