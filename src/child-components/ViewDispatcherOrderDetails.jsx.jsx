import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function ViewDispatcherOrderDetails({ onClose, orders }) {
  if (!orders) {
    console.error("No order data provided to ViewDispatcherOrderDetails");
    return null;
  }

  const calculateCompletion = (orderDetails) => {
    if (!orderDetails) return 0;

    let totalItems = 0;
    let completedItems = 0;

    const countItems = (items) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach(item => {
        totalItems++;
        if (item.status === "Done") completedItems++;
      });
    };

    countItems(orderDetails.glass);
    countItems(orderDetails.caps);
    countItems(orderDetails.boxes);
    countItems(orderDetails.pumps);

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const StatusBadge = ({ value }) => {
    // If value is undefined, null, or "Pending", show as "Pending"
    const status = value || "Pending";
    
    return (
      <div className="flex items-center">
        
        <div className="ml-2 flex justify-center">
          {status === "Completed" ? (
            <Check size={18} strokeWidth={3} className="text-[#FF6900] font-bold" />
          ) : (
            <img src="./download.svg" alt="" className="w-5 filter drop-shadow-md" />
          )}
        </div>
      </div>
    );
  };
  
  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  // Organize all table configurations in one place
  const tableConfigurations = {
    glass: {
      title: "Glass",
      items: orders.order_details.glass || [],
      fields: [
        { key: 'glass_name', label: 'Name' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'weight', label: 'Weight' },
        { key: 'neck_size', label: 'Neck Size' },
        { key: 'decoration_type', label: 'Decoration' }
      ]
    },
    caps: {
      title: "Caps",
      items: orders.order_details.caps || [],
      fields: [
        { key: 'cap_name', label: 'Name' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'neck_size', label: 'Neck Size' },
        { key: 'process', label: 'Process' },
        { key: 'material', label: 'Material' }
      ]
    },
    boxes: {
      title: "Boxes",
      items: orders.order_details.boxes || [],
      fields: [
        { key: 'box_name', label: 'Name' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'approval_code', label: 'Approval Code' }
      ]
    },
    pumps: {
      title: "Pumps",
      items: orders.order_details.pumps || [],
      fields: [
        { key: 'pump_name', label: 'Name' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'neck_type', label: 'Neck Type' }
      ]
    }
  };

  const OrderItemTable = ({ title, items, fields }) => {
    if (!items || !items.length) return null;

    return (
      <div className="mt-4">
        <div className='bg-[#6F7298] rounded-md p-2 rounded-b-none'>
        <h4 className="font-medium text-lg text-white  mb-2">{title}</h4>

        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-lg">
            <thead className="bg-amber-50">
              <tr>
                {fields.map((field, idx) => (
                  <th key={idx} scope="col" className="px-3 py-2 text-left text-sm font-medium bg-[#F8CDA7] text-[#6B3809] uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-left text-sm font-medium bg-[#F8CDA7] text-[#6B3809] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#FDF0E7] divide-y divide-dashed text-black">
              {items.map((item, idx) => (
                <tr key={idx} >
                  {fields.map((field, fieldIdx) => (
                    <td key={fieldIdx} className="px-3 py-2 whitespace-nowrap text-sm ">
                      {field.key === 'decoration_type' && item.decoration_details ? (
                        item.decoration_details.type
                      ) : field.key === 'decoration_number' && item.decoration_details ? (
                        item.decoration_details.decoration_number
                      ) : item[field.key] || '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    
                      {StatusBadge(item.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-10">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
              <div className="sm:flex sm:items-start">

                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <DialogTitle as="h3" className="text-lg p-4 rounded-md bg-orange-400 font-semibold text-white">
                    Order #{orders.order_number} Details
                  </DialogTitle>
                  <div className="mt-4 bg-[#fdf0e7] p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-orange-400 pb-2">Customer</h4>
                        <p className="text-black font-semibold">{orders.customer_name}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-orange-400 pb-2">Order Date</h4>
                        <p className="text-black font-semibold">{formatDate(orders.created_at)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-orange-400 pb-2">Dispatcher</h4>
                        <p className="text-black font-semibold">{orders.dispatcher_name}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-orange-400 pb-2">Status</h4>
                       
                            {StatusBadge(orders.order_status)}
                      
                      </div>
                    </div>
                  </div>


                  {Object.values(tableConfigurations).map((config, index) => (
                    <OrderItemTable
                      key={index}
                      title={config.title}
                      items={config.items}
                      fields={config.fields}
                    />
                  ))}
                </div>
              </div>
            </div>


            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 sm:ml-3 sm:w-auto"
                onClick={() => {
                  alert('Mark order as complete functionality would go here');
                }}
              >
                Complete Order
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default ViewDispatcherOrderDetails;