import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import axios from 'axios';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const CreateOrder = ({ onClose }) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [dispatcherName, setDispatcherName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("")


  const dispatchers = ["Rajesh Kumar", "Anita Sharma"];
  const customers = [
    "Amit Verma",
    "Priya Patel",
    "Rohan Singh",
    "Neha Gupta",
    "Vikram Iyer",
    "Sunita Nair",
    "Arjun Malhotra",
    "Deepa Joshi"
  ];


  const glassNames = ["Bottle A", "Bottle B", "Bottle C", "Jar A", "Jar B"];
  const decorationOptions = ["Printing", "Coating", "Frosting", "None"];
  const capNames = ["Cap A", "Cap B", "Cap C", "Cap D", "Cap E"];
  const capProcessOptions = ["Metalised", "Non Metalised", "Metal and Assembly", "Non Metal and Assembly"];
  const capMaterialOptions = ["Plastic", "Aluminium", "Other"];
  const boxNames = ["Box A", "Box B", "Box C", "Box D"];
  const pumpNames = ["Pump A", "Pump B", "Pump C", "Pump D"];


  const [orderDetails, setOrderDetails] = useState({
    items: [{
      glass_name: glassNames[0],
      quantity: "",
      weight: "",
      neck_size: "",
      decoration: decorationOptions[0],
      decoration_no: "",
      status: "Pending"
    }],
    caps: [{
      cap_name: capNames[0],
      neck_size: "",
      quantity: "",
      process: capProcessOptions[0],
      material: capMaterialOptions[0],
      status: "Pending"
    }],
    boxes: [{
      box_name: boxNames[0],
      quantity: "",
      approval_code: "",
      status: "Pending"
    }],
    pumps: [{
      pump_name: pumpNames[0],
      neck_type: "",
      quantity: "",
      status: "Pending"
    }]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);



  const handleDetailChange = (category, index, field, value) => {
    const updatedDetails = { ...orderDetails };
    updatedDetails[category][index][field] = value;
    setOrderDetails(updatedDetails);
  };

  const addItem = (category) => {
    const updatedDetails = { ...orderDetails };

    let newItem = {};

    switch (category) {
      case 'items':
        newItem = {
          glass_name: glassNames[0],
          quantity: "",
          weight: "",
          neck_size: "",
          decoration: decorationOptions[0],
          decoration_no: "",
          team: "Glass Manufacturing - Mumbai",
          status: "Pending"
        };
        break;
      case 'caps':
        newItem = {
          cap_name: capNames[0],
          neck_size: "",
          quantity: "",
          process: capProcessOptions[0],
          material: capMaterialOptions[0],
          team: "Cap Manufacturing Team",
          status: "Pending"
        };
        break;
      case 'boxes':
        newItem = {
          box_name: boxNames[0],
          quantity: "",
          approval_code: "",
          team: "Packaging Team",
          status: "Pending"
        };
        break;
      case 'pumps':
        newItem = {
          pump_name: pumpNames[0],
          neck_type: "",
          quantity: "",
          team: "Pump Manufacturing Team",
          status: "Pending"
        };
        break;
      default:
        break;
    }

    updatedDetails[category].push(newItem);
    setOrderDetails(updatedDetails);
  };

  const removeItem = (category, index) => {
    if (orderDetails[category].length === 1) return;

    const updatedDetails = { ...orderDetails };
    updatedDetails[category].splice(index, 1);
    setOrderDetails(updatedDetails);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!orderNumber || !dispatcherName || !customerName) {
        setError('Please fill in all required fields: order number, dispatcher name, and customer name');
        setIsSubmitting(false);
        return;
      }

      // Check if at least one category has items
      const hasItems = orderDetails.items.length > 0 ||
        orderDetails.caps.length > 0 ||
        orderDetails.boxes.length > 0 ||
        orderDetails.pumps.length > 0;

      if (!hasItems) {
        setError('Please add at least one item to the order (glass, caps, boxes, or pumps)');
        setIsSubmitting(false);
        return;
      }

      const mappedOrderDetails = {};

      if (orderDetails.items.length > 0) {
        mappedOrderDetails.glass = orderDetails.items.map(item => ({
          glass_name: item.glass_name,
          quantity: parseInt(item.quantity, 10) || 0,
          weight: item.weight || '',
          neck_size: item.neck_size || '',
          decoration: item.decoration || '',
          decoration_no: item.decoration_no || '',
          decoration_details: {
            type: item.decoration || '',
            decoration_number: item.decoration_no || ''
          },
          team: item.team || '',
          status: item.status || 'Pending'
        }));
      }

      if (orderDetails.caps.length > 0) {
        mappedOrderDetails.caps = orderDetails.caps.map(cap => ({
          cap_name: cap.cap_name,
          neck_size: cap.neck_size || '',
          quantity: parseInt(cap.quantity, 10) || 0,
          process: cap.process || '',
          material: cap.material || '',
          team: cap.team || '',
          status: cap.status || 'Pending'
        }));
      }


      if (orderDetails.boxes.length > 0) {
        mappedOrderDetails.boxes = orderDetails.boxes.map(box => ({
          box_name: box.box_name,
          quantity: parseInt(box.quantity, 10) || 0,
          approval_code: box.approval_code || '',
          team: box.team || '',
          status: box.status || 'Pending'
        }));
      }

      // Only add pumps if there are pump items
      if (orderDetails.pumps.length > 0) {
        mappedOrderDetails.pumps = orderDetails.pumps.map(pump => ({
          pump_name: pump.pump_name,
          neck_type: pump.neck_type || '',
          quantity: parseInt(pump.quantity, 10) || 0,
          team: pump.team || '',
          status: pump.status || 'Pending'
        }));
      }

      const newOrder = {
        order_number: orderNumber.trim(),
        dispatcher_name: dispatcherName.trim(),
        customer_name: customerName.trim(),
        order_status: 'Pending',
        order_details: mappedOrderDetails
      };

      const response = await axios.post("http://localhost:5000/orders", newOrder);

      if (typeof window !== 'undefined' && window.Orders) {
        window.Orders = [...window.Orders, response.data.order];
      }


      alert("Order created successfully!");
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating order:", error);

      // Display appropriate error message
      if (error.response?.status === 409) {
        setError("Order number already exists. Please use a different order number.");
      } else {
        setError(error.response?.data?.error || "Failed to create order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
                    Create New Order
                  </DialogTitle>
                  <form onSubmit={handleSubmit} className='mt-4'>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="shadow-sm rounded-md p-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Order Number
                        </label>
                        <input
                          type="text"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          required
                        />
                      </div>

                      <div className="shadow-sm rounded-md p-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dispatcher Name
                        </label>
                        <select
                          value={dispatcherName}
                          onChange={(e) => setDispatcherName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          required
                        >
                          <option value="">Select Dispatcher</option>
                          {dispatchers.map((dispatcher, idx) => (
                            <option key={idx} value={dispatcher}>
                              {dispatcher}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="shadow-sm rounded-md p-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Name
                        </label>
                        <select
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          required
                        >
                          <option value="">Select Customer</option>
                          {customers.map((customer, idx) => (
                            <option key={idx} value={customer}>
                              {customer}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-8 border border-gray-200 p-5 rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Glass Items</h3>
                        <button
                          type="button"
                          onClick={() => addItem('items')}
                          className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                        >
                          <Plus size={16} className="mr-1" /> Add Glass Item
                        </button>
                      </div>

                      {orderDetails.items.map((item, index) => (
                        <div key={`item-${index}`} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Glass Name</label>
                            <select
                              value={item.glass_name}
                              onChange={(e) => handleDetailChange('items', index, 'glass_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {glassNames.map((name, idx) => (
                                <option key={idx} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleDetailChange('items', index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Weight</label>
                            <input
                              type="text"
                              value={item.weight}
                              onChange={(e) => handleDetailChange('items', index, 'weight', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Neck Size</label>
                            <input
                              type="text"
                              value={item.neck_size}
                              onChange={(e) => handleDetailChange('items', index, 'neck_size', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Decoration</label>
                            <select
                              value={item.decoration}
                              onChange={(e) => handleDetailChange('items', index, 'decoration', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {decorationOptions.map((option, idx) => (
                                <option key={idx} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Decoration No</label>
                            <input
                              type="text"
                              value={item.decoration_no}
                              onChange={(e) => handleDetailChange('items', index, 'decoration_no', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeItem('items', index)}
                              className="flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                              disabled={orderDetails.items.length === 1}
                            >
                              <Minus size={16} className="mr-1" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-8 border border-gray-200 p-5 rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Caps</h3>
                        <button
                          type="button"
                          onClick={() => addItem('caps')}
                          className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                        >
                          <Plus size={16} className="mr-1" /> Add Cap
                        </button>
                      </div>
                      {orderDetails.caps.map((cap, index) => (
                        <div key={`cap-${index}`} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cap Name</label>
                            <select
                              value={cap.cap_name}
                              onChange={(e) => handleDetailChange('caps', index, 'cap_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {capNames.map((name, idx) => (
                                <option key={idx} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Neck Size</label>
                            <input
                              type="text"
                              value={cap.neck_size}
                              onChange={(e) => handleDetailChange('caps', index, 'neck_size', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={cap.quantity}
                              onChange={(e) => handleDetailChange('caps', index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Process</label>
                            <select
                              value={cap.process}
                              onChange={(e) => handleDetailChange('caps', index, 'process', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {capProcessOptions.map((option, idx) => (
                                <option key={idx} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                            <select
                              value={cap.material}
                              onChange={(e) => handleDetailChange('caps', index, 'material', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {capMaterialOptions.map((option, idx) => (
                                <option key={idx} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeItem('caps', index)}
                              className="flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                              disabled={orderDetails.caps.length === 1}
                            >
                              <Minus size={16} className="mr-1" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-8 border border-gray-200 p-5 rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Boxes</h3>
                        <button
                          type="button"
                          onClick={() => addItem('boxes')}
                          className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                        >
                          <Plus size={16} className="mr-1" /> Add Box
                        </button>
                      </div>

                      {orderDetails.boxes.map((box, index) => (
                        <div key={`box-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Box Name</label>
                            <select
                              value={box.box_name}
                              onChange={(e) => handleDetailChange('boxes', index, 'box_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {boxNames.map((name, idx) => (
                                <option key={idx} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={box.quantity}
                              onChange={(e) => handleDetailChange('boxes', index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Approval Code</label>
                            <input
                              type="text"
                              value={box.approval_code}
                              onChange={(e) => handleDetailChange('boxes', index, 'approval_code', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div className="flex items-end md:col-span-3">
                            <button
                              type="button"
                              onClick={() => removeItem('boxes', index)}
                              className="flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                              disabled={orderDetails.boxes.length === 1}
                            >
                              <Minus size={16} className="mr-1" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-8 border border-gray-200 p-5 rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Pumps</h3>
                        <button
                          type="button"
                          onClick={() => addItem('pumps')}
                          className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                        >
                          <Plus size={16} className="mr-1" /> Add Pump
                        </button>
                      </div>

                      {orderDetails.pumps.map((pump, index) => (
                        <div key={`pump-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Pump Name</label>
                            <select
                              value={pump.pump_name}
                              onChange={(e) => handleDetailChange('pumps', index, 'pump_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              {pumpNames.map((name, idx) => (
                                <option key={idx} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Neck Type</label>
                            <input
                              type="text"
                              value={pump.neck_type}
                              onChange={(e) => handleDetailChange('pumps', index, 'neck_type', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={pump.quantity}
                              onChange={(e) => handleDetailChange('pumps', index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div className="flex items-end md:col-span-3">
                            <button
                              type="button"
                              onClick={() => removeItem('pumps', index)}
                              className="flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                              disabled={orderDetails.pumps.length === 1}
                            >
                              <Minus size={16} className="mr-1" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end mt-8">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-gray-700 bg-gray-200 rounded-md mr-4 hover:bg-gray-300 transition-colors shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-5 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                      >
                        {isSubmitting ? "Creating..." : "Create Order"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateOrder;