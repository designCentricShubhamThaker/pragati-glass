import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  determineTeamType,
  getOrderItems,
  getItemName
} from '../utils/OrderUtils';
import { useSocket } from '../context/SocketContext';
import { trackOrderChanges } from '../utils/TimelineUtils';

const EditTodaysCompletedOrder = ({ onClose, selectedOrder, onOrderUpdated }) => {
  const teamType = useMemo(() => determineTeamType(selectedOrder), [selectedOrder]);
  const orderItems = useMemo(() => getOrderItems(selectedOrder, teamType), [teamType, selectedOrder]);
  const { socket, connected, roomJoined } = useSocket();
  const [completedQuantities, setCompletedQuantities] = useState({});
  const [todaysQuantities, setTodaysQuantities] = useState({});
  const [previouslyCompleted, setPreviouslyCompleted] = useState({});
  const [errors, setErrors] = useState({});
  const [updateStatus, setUpdateStatus] = useState(null);

  // Initialize with values from localStorage if they exist
  useEffect(() => {
    if (!selectedOrder) return;

    try {
      const storedCompletions = JSON.parse(localStorage.getItem('completedQuantities') || '{}');
      const initialPreviousValues = {};
      const initialTodayValues = {};
 
      orderItems.forEach(item => {
        const itemKey = `${selectedOrder._id}-${item._id}`;
        // Get previously completed quantities
        initialPreviousValues[item._id] = (storedCompletions[itemKey]?.completed || 0);
        // Initialize today's quantities to 0
        initialTodayValues[item._id] = 0;
      });

      setPreviouslyCompleted(initialPreviousValues);
      setTodaysQuantities(initialTodayValues);
      setCompletedQuantities(initialPreviousValues);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      // Handle corrupted localStorage
      setPreviouslyCompleted({});
      setTodaysQuantities({});
      setCompletedQuantities({});
    }
  }, [selectedOrder, orderItems]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for update confirmations
    const handleUpdateConfirmation = (data) => {
      console.log('Received update confirmation:', data);
      if (data.success) {
        setUpdateStatus({
          type: 'success',
          message: 'Progress updated successfully!'
        });
        
        // Auto close success message after 2 seconds
        setTimeout(() => {
          setUpdateStatus(null);
        }, 2000);
      }
    };

    // Listen for errors
    const handleError = (error) => {
      console.error('Received socket error:', error);
      setUpdateStatus({
        type: 'error',
        message: error.message || 'Failed to update order status'
      });
    };

    socket.on('updateConfirmation', handleUpdateConfirmation);
    socket.on('error', handleError);

    return () => {
      socket.off('updateConfirmation', handleUpdateConfirmation);
      socket.off('error', handleError);
    };
  }, [socket]);

  const handleCompletedChange = (id, value) => {
    let numValue = value === '' ? '' : parseInt(value, 10) || 0;
  
    const item = orderItems.find(item => item._id === id);
    const prevCompleted = previouslyCompleted[id] || 0;
    const maxAllowed = item.quantity - prevCompleted;
  
    if (numValue !== '' && numValue > maxAllowed) {
      setErrors(prev => ({
        ...prev,
        [id]: `Cannot exceed maximum of ${maxAllowed}`,
      }));
      return;
    }

    if (numValue === '') {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  
    setTodaysQuantities(prev => ({
      ...prev,
      [id]: numValue === '' ? 0 : numValue,
    }));
  
    setCompletedQuantities(prev => ({
      ...prev,
      [id]: prevCompleted + (numValue === '' ? 0 : numValue),
    }));
  };
  
  const getProgressPercentage = (completed, total) => {
    return Math.min(100, Math.round((completed / total) * 100));
  };

  const handleSaveChanges = useCallback(() => {
    // Check for any validation errors before saving
    if (Object.keys(errors).length > 0) {
      return; // Don't save if there are errors
    }

    // Check if socket is connected
    if (!socket || !connected) {
      setUpdateStatus({
        type: 'error',
        message: 'Not connected to server. Please check your connection and try again.'
      });
      return;
    }

    const timestamp = new Date().toISOString();
    
    try {
      const existingCompletions = JSON.parse(localStorage.getItem('completedQuantities') || '{}');
      const updatedCompletions = { ...existingCompletions };
      const updatedItems = [];

      orderItems.forEach(item => {
        const todaysCompleted = todaysQuantities[item._id] || 0;
        const totalCompleted = (previouslyCompleted[item._id] || 0) + todaysCompleted;
        const itemKey = `${selectedOrder._id}-${item._id}`;

        updatedCompletions[itemKey] = {
          orderId: selectedOrder._id,
          orderNumber: selectedOrder.order_number,
          itemId: item._id,
          itemName: getItemName(item, teamType),
          originalQuantity: item.quantity,
          completed: totalCompleted,
          timestamp: todaysCompleted > 0 ? timestamp : (existingCompletions[itemKey]?.timestamp || timestamp)
        };

        const isCompleted = totalCompleted >= item.quantity;

        updatedItems.push({
          itemId: item._id,
          completed: totalCompleted,
          status: isCompleted ? "Done" : "Pending"
        });
      });

      // Track changes for timeline before saving to localStorage
      trackOrderChanges(updatedCompletions, existingCompletions);
      
      // Save to localStorage
      localStorage.setItem('completedQuantities', JSON.stringify(updatedCompletions));

      // Set temporary status message
      setUpdateStatus({
        type: 'info',
        message: 'Sending update to server...'
      });

      // Emit the update event with clear team information
      socket.emit('updateOrderStatus', {
        orderId: selectedOrder._id,
        team: teamType,
        items: updatedItems,
        timestamp: timestamp
      });

      console.log('Emitted update for team:', teamType, 'with items:', updatedItems);

      // Callback after successful local update
      if (onOrderUpdated) {
        onOrderUpdated();
      }

    } catch (error) {
      console.error('Error saving order progress:', error);
      setUpdateStatus({
        type: 'error',
        message: 'Failed to save progress: ' + error.message
      });
    }
  }, [socket, connected, selectedOrder, orderItems, todaysQuantities, previouslyCompleted, errors, teamType, onOrderUpdated]);

  // Function to close with timeout
  const handleClose = () => {
    // If there's a success message, wait a moment before closing
    if (updateStatus && updateStatus.type === 'success') {
      setTimeout(onClose, 100);
    } else {
      onClose();
    }
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
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-[90vw]"
          >
            {/* Connection status indicator */}
            {!connected && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                <div className="flex items-center">
                  <div className="py-1">
                    <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold">Connection Lost</p>
                    <p className="text-sm">Updates can't be sent to the server. Check your internet connection.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Status message notification */}
            {updateStatus && (
              <div className={`p-4 ${
                updateStatus.type === 'success' ? 'bg-green-100 text-green-800' : 
                updateStatus.type === 'error' ? 'bg-red-100 text-red-800' : 
                'bg-blue-100 text-blue-800'
              } border-l-4 ${
                updateStatus.type === 'success' ? 'border-green-500' : 
                updateStatus.type === 'error' ? 'border-red-500' : 
                'border-blue-500'
              }`}>
                {updateStatus.message}
              </div>
            )}

            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 overflow-y-auto">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <DialogTitle as="h3" className="text-xl font-semibold text-gray-900">
                    Update Progress for Order #{selectedOrder.order_number} - {teamType.toUpperCase()} Team
                  </DialogTitle>

                  <div className="mt-4">
                    <div className="bg-amber-50 rounded-lg border border-amber-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-amber-200 bg-amber-100/50">
                            <th className="py-3 px-4 text-left font-medium text-[#8A2906]">Order</th>
                            <th className="py-3 px-4 text-left font-medium text-[#8A2906]">Item</th>
                            <th className="py-3 px-4 text-center font-medium text-[#8A2906]">Quantity</th>
                            <th className="py-3 px-4 text-left font-medium text-[#8A2906]">Progress</th>
                            <th className="py-3 px-4 text-center font-medium text-[#8A2906]">Today's Input</th>
                            <th className="py-3 px-4 text-center font-medium text-[#8A2906]">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-200">
                          {orderItems.map((item, index) => {
                            const prevCompleted = previouslyCompleted[item._id] || 0;
                            const todayCompleted = todaysQuantities[item._id] || 0;
                            const totalCompleted = prevCompleted + todayCompleted;
                            const remaining = item.quantity - totalCompleted;
                            const progressPercent = getProgressPercentage(prevCompleted, item.quantity);
                            const newProgressPercent = getProgressPercentage(totalCompleted, item.quantity);

                            return (
                              <tr key={item._id} className={index % 2 === 0 ? "bg-amber-50" : "bg-amber-100/20"}>
                                {index === 0 && (
                                  <td className="py-4 px-4" rowSpan={orderItems.length}>
                                    <div className="font-medium text-lg">{selectedOrder.order_number}</div>
                                    <div className="text-sm text-gray-600 mt-1">{selectedOrder.customer_name}</div>
                                  </td>
                                )}
                                <td className="py-4 px-4">
                                  <div className="bg-[#F05C1C] text-white px-3 py-2 rounded text-center font-medium">
                                    {getItemName(item, teamType)}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="text-center font-medium text-lg">{item.quantity}</div>
                                </td>
                                <td className="py-4 px-4 w-72">
                                  {/* Progress header */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium">
                                      {prevCompleted}/{item.quantity}
                                    </div>
                                    <div className="text-sm text-gray-600 font-medium">
                                      {progressPercent}% complete
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                                    {/* Previous progress */}
                                    {prevCompleted > 0 && (
                                      <div
                                        className="absolute top-0 left-0 h-full bg-green-600 transition-all"
                                        style={{ width: `${progressPercent}%` }}
                                      ></div>
                                    )}

                                    {/* Today's progress overlay */}
                                    {todayCompleted > 0 && (
                                      <div
                                        className="absolute top-0 h-full bg-orange-500 border-l border-white transition-all"
                                        style={{
                                          left: `${progressPercent}%`,
                                          width: `${(todayCompleted / item.quantity) * 100}%`
                                        }}
                                      ></div>
                                    )}

                                    {/* Progress indicator */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-bold text-white drop-shadow-sm">
                                        {prevCompleted > 0 || todayCompleted > 0
                                          ? `${totalCompleted}/${item.quantity}`
                                          : '0%'
                                        }
                                      </span>
                                    </div>
                                  </div>

                                  {/* Today's contribution summary */}
                                  {todayCompleted > 0 && (
                                    <div className="mt-2 flex items-center">
                                      <span className="text-sm font-medium text-green-700 mr-2">
                                        +{todayCompleted} today
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        → {newProgressPercent}% total
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col space-y-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.quantity - prevCompleted}
                                      className={`border rounded px-3 py-3 w-full text-center text- ${errors[item._id] ? "border-red-500 bg-red-50" : "border-gray-300"
                                        }`}
                                      value={todaysQuantities[item._id] || ''}
                                      onChange={(e) => handleCompletedChange(item._id, e.target.value)}
                                      placeholder="0"
                                    />
                                    {errors[item._id] && (
                                      <div className="text-xs text-red-600 font-medium">
                                        {errors[item._id]}
                                      </div>
                                    )}
                                    {!errors[item._id] && (
                                      <div className="text-xs text-gray-500">
                                        Max: {item.quantity - prevCompleted}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  {/* Remaining quantity column */}
                                  <div className={`px-4 py-2 rounded-full inline-block font-medium ${remaining === 0
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                    }`}>
                                    {remaining === 0
                                      ? 'Completed!'
                                      : `${remaining} remaining`
                                    }
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md mr-6 hover:bg-gray-300 transition-colors shadow-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`bg-[#A53107] text-white px-6 py-3 rounded hover:bg-[#8A2906] transition-colors font-medium shadow ${Object.keys(errors).length > 0 ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                        onClick={handleSaveChanges}
                        disabled={Object.keys(errors).length > 0}
                      >
                        Save Progress
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