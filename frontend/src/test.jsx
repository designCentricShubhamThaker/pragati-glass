import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function ViewDispatcherOrderDetails({ onClose, orders }) {

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

  if (!orders) {
    console.error("No order data provided to ViewDispatcherOrderDetails");
    return null;
  }

  const completionPercentage = calculateCompletion(orders.order_details);

  const OrderItemTable = ({ title, items, fields }) => {
    if (!items || !items.length) return null;

    return (
      <div className="mt-4">
        <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-lg">
            <thead className="bg-amber-50">
              <tr>
                {fields.map((field, idx) => (
                  <th key={idx} scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {fields.map((field, fieldIdx) => (
                    <td key={fieldIdx} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                      {field.key === 'link' ? (
                        <a href={item[field.key]} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : field.key === 'decoration' && item.decoration_details ? (
                        item.decoration_details.type
                      ) : field.key === 'decoration_no' && item.decoration_details ? (
                        item.decoration_details.decoration_number
                      ) : (
                        item[field.key]
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

  return (
   <Div></Div>
  );
}

export default ViewDispatcherOrderDetails;