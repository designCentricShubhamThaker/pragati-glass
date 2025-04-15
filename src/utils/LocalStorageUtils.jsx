import { determineTeamType } from "./OrderUtils";
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

export const generateLocalStorageKey = (user) => {
  if (!user) {
    console.warn('No user provided for localStorage key generation');
    return null;
  }

  if (user.role === 'admin') {
    return 'dispatcher_all_orders';
  }

  const teamType = determineTeamType(user.team);
  return `team_${teamType}_orders`;
};

export const saveOrdersToLocalStorage = (user, orders) => {
  try {
    const key = generateLocalStorageKey(user);
    if (!key) {
      console.warn('No valid localStorage key generated. Orders not saved.');
      return;
    }

    localStorage.setItem(key, JSON.stringify(orders));
  } catch (error) {
    console.error('Error saving orders to local storage:', error);
  }
};

export const getOrdersFromLocalStorage = (user) => {
  try {
    const key = generateLocalStorageKey(user);
    if (!key) {
      console.warn('No valid localStorage key found. Returning empty orders.');
      return [];
    }

    const storedOrders = localStorage.getItem(key);
    return storedOrders ? JSON.parse(storedOrders) : [];
  } catch (error) {
    console.error('Error retrieving orders from local storage:', error);
    return [];
  }
};

export const updateLocalStorageOrders = (user, newOrders) => {
  try {
    const key = generateLocalStorageKey(user);
    if (!key) {
      console.warn("No valid localStorage key for updating orders.");
      return newOrders;
    }

    const existingOrders = getOrdersFromLocalStorage(user);
    const mergedOrders = mergeOrders(existingOrders, newOrders);

    saveOrdersToLocalStorage(user, mergedOrders);
    return mergedOrders;
  } catch (error) {
    console.error("Error updating orders in local storage:", error);
    return newOrders;
  }
};

export const mergeOrders = (existingOrders, newOrders) => {
  const mergedOrderMap = new Map();

  existingOrders.forEach(order => {
    mergedOrderMap.set(order._id, order);
  });

  newOrders.forEach(newOrder => {
    const existingOrder = mergedOrderMap.get(newOrder._id);

    if (!existingOrder) {
      mergedOrderMap.set(newOrder._id, newOrder);
    } else {
      const mergedOrder = {
        ...existingOrder,
        ...newOrder,
        order_details: {
          ...existingOrder.order_details,
          ...newOrder.order_details
        },
        team_tracking: {
          ...existingOrder.team_tracking,
          ...newOrder.team_tracking
        }
      };
      mergedOrderMap.set(newOrder._id, mergedOrder);
    }
  });

  return Array.from(mergedOrderMap.values());
};

export const updateOrderItemForTeam = (order, teamType, itemId, updateData) => {
  console.log('Updating order item', {
    orderId: order._id,
    teamType,
    itemId,
    updateData
  });

  const itemArrayKey = determineTeamType(teamType);

  if (!order.order_details || !order.order_details[itemArrayKey]) {
    console.warn(`No ${itemArrayKey} found in order details`);
    return order;
  }

  const updatedItems = order.order_details[itemArrayKey].map(item => {
    if (item._id === itemId) {
      console.log(`Updating item with ID: ${itemId}`);

      const newTotalQty = (item.team_tracking?.total_completed_qty || 0) + (updateData.qty_completed || 0);

      const newItem = {
        ...item,
        team_tracking: {
          ...item.team_tracking,
          total_completed_qty: newTotalQty,
          completed_entries: [
            ...(item.team_tracking?.completed_entries || []),
            { qty_completed: updateData.qty_completed, timestamp: new Date().toISOString() }
          ],
          status: newTotalQty >= item.quantity ? 'Completed' : 'In Progress'
        }
      };

      console.log('Updated item:', newItem);
      return newItem;
    }
    return item;
  });

  const updatedOrder = {
    ...order,
    order_details: {
      ...order.order_details,
      [itemArrayKey]: updatedItems
    }
  };
  console.log('Final updated order:', updatedOrder);
  return updatedOrder;
};

export const setupLocalStorageSync = (user, updateOrdersCallback, notifyDispatcher) => {
  const key = generateLocalStorageKey(user);

  const handleStorageChange = (event) => {
    if (event.key === key) {
      try {
        console.log("🔄 Storage Change Detected for:", key);

        const oldOrders = JSON.parse(event.oldValue || '[]');
        const newOrders = JSON.parse(event.newValue || '[]');

        console.log("📜 Old Orders:", oldOrders);
        console.log("🆕 New Orders:", newOrders);

        updateOrdersCallback(newOrders);
        console.log("✅ UI Updated with new orders.");

        // Detect and send changes to dispatcher
        const changedOrders = detectOrderChanges(oldOrders, newOrders);
        if (changedOrders.length > 0) {
          console.log("🚨 Changes Detected! Sending to Dispatcher:", changedOrders);
          notifyDispatcher(changedOrders);
        } else {
          console.log("✅ No significant changes detected.");
        }
      } catch (error) {
        console.error("❌ Error parsing storage event:", error);
      }
    }
  };

  const handleLocalUpdate = (event) => {
    if (event.detail.key === key) {
      updateOrdersCallback(event.detail.orders);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('localStorageUpdated', handleLocalUpdate);
  console.log("👂 LocalStorage Listener Attached for:", key);

  return () => {
    console.log("🧹 Cleaning up LocalStorage listener...");
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('localStorageUpdated', handleLocalUpdate);
  };
};


const detectOrderChanges = (oldOrders, newOrders) => {
  const oldOrderMap = new Map(oldOrders.map(order => [order._id, order]));

  const changes = [];
  newOrders.forEach(newOrder => {
    const oldOrder = oldOrderMap.get(newOrder._id);
    if (!oldOrder || JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) {
      console.log(`🔍 Order Changed or Added: ${newOrder._id}`);
      changes.push(newOrder);
    }
  });

  return changes;
};



export const deleteOrderFromLocalStorage = (user, orderNumber) => {
  try {
    const key = generateLocalStorageKey(user);
    if (!key) {
      console.warn('No valid localStorage key for deleting order.');
      return false;
    }

    const existingOrders = getOrdersFromLocalStorage(user);
    // Change this line to filter by order_number instead of _id
    const filteredOrders = existingOrders.filter(order => order.order_number !== orderNumber);

    if (filteredOrders.length < existingOrders.length) {
      saveOrdersToLocalStorage(user, filteredOrders);

      const event = new CustomEvent('localStorageUpdated', {
        detail: { key, orders: filteredOrders }
      });
      window.dispatchEvent(event);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting order from local storage:', error);
    return false;
  }
};

export const deleteOrder = async (user, orderNumber) => {
  try {

    deleteOrderFromLocalStorage(user, orderNumber);


    const response = await fetch(`http://localhost:5000/orders/${orderNumber}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to delete order`);
    }

    console.log('Order deleted successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting order:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete order'
    };
  }
};


export const handleDeleteOrder = (user, orderNumber, onSuccess, onError) => {
  if (!orderNumber) {
    toast.error("Cannot process request", {
      position: "top-center",
      autoClose: 3000,
      className: "bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-md shadow-lg border-l-4 border-red-800",
      progressClassName: "bg-red-200",
      icon: () => <span className="text-lg">⚠️</span>,
      closeButton: ({ closeToast }) => (
        <button onClick={closeToast} className="p-1 rounded-full hover:bg-red-400 transition-colors duration-200">
          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )
    });
    return;
  }

  Swal.fire({
    title: '',
    html: `
<div class="w-full max-w-3xl mx-auto p-7">
  <!-- Header -->
  <div class="bg-gradient-to-r from-red-500 to-red-600 text-white p-5 rounded-t-lg flex items-center justify-center space-x-4">
    <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shadow-inner border border-white/30">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 
              0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </div>
    <div class="text-center">
      <h2 class=text-2xl font-semibold">Delete Order ${orderNumber}</h2>
      <p class="text-sm text-white/90">This action will permanently remove the order</p>
    </div>
  </div>

  <!-- Content -->
  <div class="bg-white p-8 rounded-b-lg border border-gray-200 space-y-6 text-center">
    <p class="text-gray-800 text-base leading-relaxed">
      You are about to delete this order and all associated data.
      <span class="text-red-600 font-semibold">This action cannot be reversed.</span>
    </p>

    <!-- Warning Section -->
    <div class="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-md flex items-start justify-center space-x-3 shadow-sm text-left max-w-2xl mx-auto">
      <svg class="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 
          3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 
          2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 
          13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 
          1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <div>
        <h4 class="font-bold text-md text-amber-700 mb-1">Heads up!</h4>
        <p class="text-sm text-amber-800">
          This operation is irreversible. Once deleted, the order and its related data will be permanently removed from the system.
        </p>
      </div>
    </div>

    <!-- Buttons -->
    <div class="flex justify-center space-x-4 pt-2">
      <button id="cancel-btn" class="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium border border-gray-300 flex items-center">
        <svg class="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        Cancel
      </button>
      <button id="confirm-btn" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center shadow-sm">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 
                0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 
                00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        Delete Order
      </button>
    </div>
  </div>
</div>


    `,
    showConfirmButton: false,
    showCancelButton: false,
    showCloseButton: true,
    width: '800px',
    padding: 0,
    customClass: {
      container: 'font-sans',
      popup: 'rounded-lg overflow-hidden shadow-xl border-0 p-0',
      closeButton: 'focus:outline-none focus:shadow-outline text-white hover:text-gray-200 absolute top-4 right-4 z-10'
    },
    buttonsStyling: false,
    background: '#ffffff',
    backdrop: `rgba(0,0,0,0.7)`,
    showClass: {
      popup: 'animate__animated animate__fadeIn animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOut animate__faster'
    },
    didOpen: () => {
      const cancelBtn = document.getElementById('cancel-btn');
      const confirmBtn = document.getElementById('confirm-btn');

      cancelBtn.addEventListener('click', () => {
        Swal.close();
      });

      confirmBtn.addEventListener('click', () => {
        // Show process animation
        Swal.fire({
          title: '',
          html: `
            <div class="w-full p-6 text-center">
              <!-- Header -->
              <h3 class="text-xl font-bold text-gray-800 mb-6">Deleting Order #${orderNumber}</h3>
              
              <!-- Circle Progress -->
              <div class="relative w-24 h-24 mx-auto mb-6">
                <div class="w-24 h-24 rounded-full border-4 border-red-100"></div>
                <div id="progress-circle" class="absolute top-0 left-0 w-24 h-24">
                  <svg viewBox="0 0 100 100" class="w-full h-full">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f8d7da" stroke-width="8" />
                    <circle id="progress-indicator" cx="50" cy="50" r="42" fill="none" stroke="#ef4444" stroke-width="8" stroke-dasharray="263.89378290154264" stroke-dashoffset="263.89378290154264" class="transition-all duration-700" transform="rotate(-90 50 50)" />
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center text-lg font-bold text-red-600" id="progress-percentage">0%</div>
                </div>
              </div>
              
              <!-- Status Text -->
              <div class="mb-8">
                <p id="deletion-status" class="text-lg font-medium text-gray-800 mb-1">Preparing to delete...</p>
                <p id="deletion-details" class="text-gray-500 text-sm">Connecting to server...</p>
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full max-w-md mx-auto">
                <div class="relative pt-1">
                  <div class="flex mb-2 items-center justify-between">
                    <div>
                      <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-100">
                        Progress
                      </span>
                    </div>
                    <div class="text-right">
                      <span id="progress-text" class="text-xs font-semibold inline-block text-red-600">
                        0%
                      </span>
                    </div>
                  </div>
                  <div class="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-red-100">
                    <div id="progress-bar" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-red-400 to-red-600 w-0 transition-all duration-300 ease-in-out rounded-full"></div>
                  </div>
                  <div class="text-xs text-gray-500 italic" id="progress-time">Estimated time remaining: calculating...</div>
                </div>
              </div>
            </div>
          `,
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          width: '500px',
          customClass: {
            popup: 'rounded-xl overflow-hidden shadow-xl border-0',
          },
          didOpen: () => {
            const progressBar = document.getElementById('progress-bar');
            const progressCircle = document.getElementById('progress-indicator');
            const progressPercentage = document.getElementById('progress-percentage');
            const progressText = document.getElementById('progress-text');
            const statusText = document.getElementById('deletion-status');
            const detailsText = document.getElementById('deletion-details');
            const timeText = document.getElementById('progress-time');

            // Circle animation constants
            const CIRCLE_CIRCUMFERENCE = 263.89378290154264; // 2 * Math.PI * 42

            // Define stages with more detailed information
            const stages = [
              {
                percent: 15,
                status: 'Validating credentials...',
                details: 'Checking user permissions and authorization',
                timeEst: 'Estimated time remaining: ~25 seconds'
              },
              {
                percent: 30,
                status: 'Loading order details...',
                details: 'Retrieving order #' + orderNumber + ' and associated data',
                timeEst: 'Estimated time remaining: ~20 seconds'
              },
              {
                percent: 45,
                status: 'Preparing to delete...',
                details: 'Creating backup snapshot for safety measures',
                timeEst: 'Estimated time remaining: ~15 seconds'
              },
              {
                percent: 60,
                status: 'Removing order data...',
                details: 'Deleting associated records, items and payment information',
                timeEst: 'Estimated time remaining: ~10 seconds'
              },
              {
                percent: 75,
                status: 'Updating database...',
                details: 'Committing changes and updating inventory records',
                timeEst: 'Estimated time remaining: ~7 seconds'
              },
              {
                percent: 90,
                status: 'Finalizing...',
                details: 'Verifying deletion and data integrity',
                timeEst: 'Estimated time remaining: ~3 seconds'
              },
              {
                percent: 100,
                status: 'Completed!',
                details: 'Order successfully removed from all systems',
                timeEst: 'Complete!'
              }
            ];

            let currentStage = 0;

            // Animated progress
            const interval = setInterval(() => {
              if (currentStage < stages.length) {
                const stage = stages[currentStage];
                const percent = stage.percent;

                // Update progress bar
                progressBar.style.width = `${percent}%`;

                // Update circle progress
                const dashoffset = CIRCLE_CIRCUMFERENCE - (percent / 100 * CIRCLE_CIRCUMFERENCE);
                progressCircle.style.strokeDashoffset = dashoffset;

                // Update text elements
                progressPercentage.textContent = `${percent}%`;
                progressText.textContent = `${percent}%`;
                statusText.textContent = stage.status;
                detailsText.textContent = stage.details;
                timeText.textContent = stage.timeEst;

                currentStage++;
              } else {
                clearInterval(interval);
              }
            }, 700);

            // Process the actual deletion
            deleteOrder(user, orderNumber)
              .then(result => {
                // Allow the animation to finish
                setTimeout(() => {
                  clearInterval(interval);

                  if (result.success) {
                    Swal.fire({
                      html: `
                        <div class="w-full py-8 px-6 text-center">
                          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
                            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 class="text-2xl font-bold text-gray-800 mb-2">Success!</h3>
                          <div class="mb-6">
                            <p class="text-gray-700 mb-1">Order #${orderNumber} has been deleted successfully.</p>
                            <p class="text-sm text-gray-500">All associated data has been removed from our system.</p>
                          </div>
                          <button id="success-done-btn" class="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200">
                            Done
                          </button>
                        </div>
                      `,
                      showConfirmButton: false,
                      width: '450px',
                      customClass: {
                        popup: 'rounded-xl overflow-hidden shadow-xl border-0',
                      },
                      showClass: {
                        popup: 'animate__animated animate__fadeIn animate__faster'
                      },
                      didOpen: () => {
                        document.getElementById('success-done-btn').addEventListener('click', () => {
                          Swal.close();
                          if (onSuccess) onSuccess(orderNumber);
                        });
                      }
                    });
                  } else {
                    Swal.fire({
                      html: `
                        <div class="w-full py-8 px-6 text-center">
                          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
                            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <h3 class="text-2xl font-bold text-gray-800 mb-2">Operation Failed</h3>
                          <div class="mb-6">
                            <p class="text-gray-700 mb-3">Unable to delete order #${orderNumber}</p>
                            <div class="bg-red-50 border-l-4 border-red-500 p-3 mb-4 mx-auto max-w-md text-left">
                              <p class="text-sm text-red-700">${result.error}</p>
                            </div>
                            <p class="text-sm text-gray-500">Please try again or contact support for assistance.</p>
                          </div>
                          <div class="flex justify-center space-x-3">
                            <button id="error-try-again-btn" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200">
                              Try Again
                            </button>
                            <button id="error-close-btn" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200">
                              Close
                            </button>
                          </div>
                        </div>
                      `,
                      showConfirmButton: false,
                      width: '450px',
                      customClass: {
                        popup: 'rounded-xl overflow-hidden shadow-xl border-0',
                      },
                      showClass: {
                        popup: 'animate__animated animate__fadeIn animate__faster'
                      },
                      didOpen: () => {
                        document.getElementById('error-try-again-btn').addEventListener('click', () => {
                          Swal.close();
                          // Try again
                          handleDeleteOrder(user, orderNumber, onSuccess, onError);
                        });

                        document.getElementById('error-close-btn').addEventListener('click', () => {
                          Swal.close();
                          if (onError) onError(result.error);
                        });
                      }
                    });
                  }
                }, Math.max(0, 700 * (stages.length - currentStage))); // Wait for animation to finish
              })
              .catch(error => {
                clearInterval(interval);

                Swal.fire({
                  html: `
                    <div class="w-full py-8 px-6 text-center">
                      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
                        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 class="text-2xl font-bold text-gray-800 mb-2">System Error</h3>
                      <div class="mb-6">
                        <p class="text-gray-700 mb-3">An unexpected error occurred</p>
                        <div class="bg-red-50 border-l-4 border-red-500 p-3 mb-4 mx-auto max-w-md text-left">
                          <p class="text-sm text-red-700">${error.message}</p>
                        </div>
                        <p class="text-sm text-gray-500">Our team has been notified of this issue.</p>
                      </div>
                      <div class="flex justify-center space-x-3">
                        <button id="system-error-try-again-btn" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200">
                          Try Again
                        </button>
                        <button id="system-error-close-btn" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200">
                          Close
                        </button>
                      </div>
                    </div>
                  `,
                  showConfirmButton: false,
                  width: '450px',
                  customClass: {
                    popup: 'rounded-xl overflow-hidden shadow-xl border-0',
                  },
                  showClass: {
                    popup: 'animate__animated animate__fadeIn animate__faster'
                  },
                  didOpen: () => {
                    document.getElementById('system-error-try-again-btn').addEventListener('click', () => {
                      Swal.close();
                      // Try again
                      handleDeleteOrder(user, orderNumber, onSuccess, onError);
                    });

                    document.getElementById('system-error-close-btn').addEventListener('click', () => {
                      Swal.close();
                      if (onError) onError(error.message);
                    });
                  }
                });
              });
          }
        });
      });
    }
  });
};


