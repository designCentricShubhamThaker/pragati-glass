import React, { useEffect, useMemo, useState } from 'react';
import { useTable, useGlobalFilter, useSortBy, usePagination } from 'react-table';
import { Eye, Plus, Check } from 'lucide-react';
import { FaPencil } from "react-icons/fa6";
import { BsFiletypeCsv } from "react-icons/bs";
import { BsHourglassTop } from "react-icons/bs";
import ViewDispatcherOrderDetails from '../child-components/ViewDispatcherOrderDetails';
import axios from 'axios';
import CreateOrder from '../child-components/CreateOrder';
import { FaClockRotateLeft } from "react-icons/fa6";
import { useSocket } from '../context/SocketContext';

function customGlobalFilter(rows, columnIds, filterValue) {
  if (filterValue === "") return rows;
  const filterLower = String(filterValue).toLowerCase();
  return rows.filter(row => {
    return columnIds.some(columnId => {
      const rowValue = row.values[columnId];
      if (rowValue == null) return false;
      const strValue = String(rowValue).toLowerCase();
      return strValue.includes(filterLower);
    });
  });
}

const Table = () => {
  const [showModal, setShowModal] = useState(false);
  const [createOrder, setCreateOrder] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterInput, setFilterInput] = useState("");
  const { socket, connected } = useSocket();
  const [updatedOrders, setUpdatedOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/orders');
        console.log(response.data);
        setOrders(response.data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('joinRoom', { role: 'dispatcher' });
      
      socket.on('orderStatusUpdated', (data) => {
        console.log('Dispatcher received order status update:', data);
        
  
        setOrders(prevOrders => {
          return prevOrders.map(order => {
            if (order._id === data.orderId) {
              const updatedOrder = { ...order };
              
              // Make sure order_details exists
              if (!updatedOrder.order_details) {
                updatedOrder.order_details = {};
              }
              
              // Update the appropriate team's items based on the team type
              const teamType = data.team;
              
              if (teamType === 'glass' && !updatedOrder.order_details.glass) {
                updatedOrder.order_details.glass = [];
              } else if (teamType === 'caps' && !updatedOrder.order_details.caps) {
                updatedOrder.order_details.caps = [];
              } else if (teamType === 'boxes' && !updatedOrder.order_details.boxes) {
                updatedOrder.order_details.boxes = [];
              } else if (teamType === 'pumps' && !updatedOrder.order_details.pumps) {
                updatedOrder.order_details.pumps = [];
              }
              
              // Update each item in the appropriate array
              if (data.items && data.items.length > 0) {
                data.items.forEach(updatedItem => {
                  // Find and update the specific item in the appropriate array
                  if (teamType === 'glass' && updatedOrder.order_details.glass) {
                    const itemIndex = updatedOrder.order_details.glass.findIndex(
                      item => item._id === updatedItem.itemId
                    );
                    if (itemIndex !== -1) {
                      updatedOrder.order_details.glass[itemIndex].status = updatedItem.status;
                    }
                  } else if (teamType === 'caps' && updatedOrder.order_details.caps) {
                    const itemIndex = updatedOrder.order_details.caps.findIndex(
                      item => item._id === updatedItem.itemId
                    );
                    if (itemIndex !== -1) {
                      updatedOrder.order_details.caps[itemIndex].status = updatedItem.status;
                    }
                  } else if (teamType === 'boxes' && updatedOrder.order_details.boxes) {
                    const itemIndex = updatedOrder.order_details.boxes.findIndex(
                      item => item._id === updatedItem.itemId
                    );
                    if (itemIndex !== -1) {
                      updatedOrder.order_details.boxes[itemIndex].status = updatedItem.status;
                    }
                  } else if (teamType === 'pumps' && updatedOrder.order_details.pumps) {
                    const itemIndex = updatedOrder.order_details.pumps.findIndex(
                      item => item._id === updatedItem.itemId
                    );
                    if (itemIndex !== -1) {
                      updatedOrder.order_details.pumps[itemIndex].status = updatedItem.status;
                    }
                  }
                });
              }
              
              return updatedOrder;
            }
            return order;
          });
        });
      });
      
      return () => {
        socket.off('orderStatusUpdated');
      };
    }
  }, [socket, connected]);


  const handleClose = () => {
    setShowModal(false);
    setCreateOrder(false);
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getTeamStatus = (items, statusKey = 'status') => {
    if (!items || !Array.isArray(items) || items.length === 0) return "Pending";
    return items.every(item => item[statusKey] === "Done") ? "Done" : "Pending";
  };

  const transformedData = useMemo(() => {
    return orders.map(order => {
      const orderDetails = order.order_details || {};

      const glassStatus = orderDetails.glass && orderDetails.glass.length > 0
        ? orderDetails.glass[0]?.status || "Pending"
        : "Pending";

      const capStatus = getTeamStatus(orderDetails.caps || []);

      const boxStatus = orderDetails.boxes && orderDetails.boxes.length > 0
        ? orderDetails.boxes[0]?.status || "Pending"
        : "Pending";

      const pumpStatus = getTeamStatus(orderDetails.pumps || []);

      const decorationStatus = orderDetails.glass &&
        orderDetails.glass.length > 0 &&
        orderDetails.glass[0]?.decoration_details &&
        orderDetails.glass[0]?.decoration_details.type &&
        orderDetails.glass[0]?.decoration_details.decoration_number
        ? "Done"
        : "Pending";

      return {
        orderNo: order.order_number,
        dispatcherName: order.dispatcher_name,
        customerName: order.customer_name,
        createdAt: order.created_at,
        glass: glassStatus,
        cap: capStatus,
        box: boxStatus,
        pump: pumpStatus,
        decoration: decorationStatus,
        orderDetails: order
      };
    });
  }, [orders]);

  const calculateCompletionPercentage = (row) => {
    const teams = ['glass', 'cap', 'box', 'pump', 'decoration'];
    const doneCount = teams.filter(team => row[team] === 'Done').length;
    return (doneCount / teams.length) * 100;
  };

  const StatusBadge = ({ value }) => (
    <div className="flex justify-center">
      {value === "Done" ? (
        <Check size={18} strokeWidth={3} className="text-[#FF6900] font-bold" />
      ) : (
        // <FaClockRotateLeft size={20} className="text-[#FF6900] font-bold" />
        <img src="./download.svg" alt="" className='w-5 filter drop-shadow-md' />
      )}
    </div>
  );

  const handleView = (rowData) => {
    setSelectedOrder(rowData.orderDetails);
    setShowModal(true);
  };

  const columns = useMemo(
    () => [
      {
        Header: "Process",
        columns: [
          {
            Header: "Order No",
            accessor: "orderNo",
            width: 80,
            Cell: ({ value }) => String(value)
          },
          {
            Header: "Dispatcher",
            accessor: "dispatcherName",
            width: 100,
          },
          {
            Header: "Customer",
            accessor: "customerName",
            width: 100,
          },
          {
            Header: "Created At",
            accessor: "createdAt",
            Cell: ({ value }) => formatSimpleDate(value),
            width: 100,
          },
          {
            Header: "View",
            accessor: "f",
            Cell: ({ row }) => (
              <div className="flex justify-center">
                <button
                  onClick={() => handleView(row.original)}
                  className="p-1 text-[#FF6900] hover:text-[#FF6900]"
                >
                  <Eye size={18} />
                </button>
              </div>
            ),
            width: 50,
          },
          {
            Header: "Edit",
            accessor: "edit",
            Cell: ({ row }) => (
              <div className="flex justify-center">
                <button
                  onClick={() => handleView(row.original)}
                  className="p-1 text-gray-500 hover:text-[#FF6900]"
                >
                  <FaPencil size={18} />
                </button>
              </div>
            ),
            width: 50,
          },
          {
            Header: "Status",
            accessor: (row) => calculateCompletionPercentage(row),
            id: "completionPercentage",
            Cell: ({ value }) => (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-[#FF6900] h-2.5 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
                <span className="text-xs ml-1 text-[#FF6900] font-medium">{value.toFixed(0)}%</span>
              </div>
            ),
            width: 80,
          },
        ],
      },
      {
        Header: "Teams",
        columns: [
          {
            Header: "Glass",
            accessor: "glass",
            Cell: StatusBadge,
            width: 80,
          },
          {
            Header: "Cap",
            accessor: "cap",
            Cell: StatusBadge,
            width: 80,
          },
          {
            Header: "Box",
            accessor: "box",
            Cell: StatusBadge,
            width: 80,
          },
          {
            Header: "Pump",
            accessor: "pump",
            Cell: StatusBadge,
            width: 80,
          },
          {
            Header: "Deco",
            accessor: "decoration",
            Cell: StatusBadge,
            width: 80,
          },
        ],
      },
    ],
    []
  );

 
  const filterableColumns = useMemo(() => 
    ['orderNo', 'dispatcherName', 'customerName'],
    []
  );

  const tableInstance = useTable(
    {
      columns,
      data: transformedData,
      initialState: { pageIndex: 0, pageSize: 5 },
      globalFilter: (rows, columnIds, filterValue) => 
        customGlobalFilter(rows, filterableColumns, filterValue),
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
    setGlobalFilter,
  } = tableInstance;

  const handleFilterChange = e => {
    const value = e.target.value || "";
    setFilterInput(value);
    setGlobalFilter(value);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading orders...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCreateOrder(true)} className="mt-2 sm:mt-0 bg-[#FF6900] hover:bg-orange-800 text-white flex items-center gap-2 px-3 py-1 rounded-full shadow-xl transition-colors duration-200">
          <Plus size={16} /> Create Order
        </button>
        <div className='flex items-center gap-8'>
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={filterInput}
              className="px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              onChange={handleFilterChange}
            />
            <svg
              className="w-5 h-5 absolute right-3 top-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>
          <BsFiletypeCsv size={28} className='text-[#FF6900] hover:text-[#FF6900]' />
        </div>
      </div>

      {page.length === 0 ? (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <div className="overflow-x-auto">
              <table
                {...getTableProps()}
                className="min-w-full divide-y divide-gray-200 rounded-lg shadow-md overflow-hidden"
                style={{
                  tableLayout: 'fixed',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                <colgroup>
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                </colgroup>

                <thead className="sticky top-0 z-10">
                  {headerGroups.map((headerGroup, idx) => (
                    <tr {...headerGroup.getHeaderGroupProps()} key={idx}>
                      {headerGroup.headers.map((column, colIdx) => {
                        const isGroupHeader = column.columns;
                        const isFirstColumn = colIdx === 0;
                        const isLastColumn = colIdx === headerGroup.headers.length - 1;

                        return (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
                            className={`px-3 py-2 text-center font-bold 
                ${isGroupHeader ? "text-[#FF6900] bg-gray-100 uppercase tracking-wider"
                                : "text-gray-700 bg-[#F1E3C8]"} 
                ${column.id === 'completionPercentage' ? 'border-l border-gray-300' : ''}
                ${isFirstColumn && idx === 0 ? 'rounded-tl-lg' : ''}
                ${isLastColumn && idx === 0 ? 'rounded-tr-lg' : ''}`
                            }
                            key={colIdx}
                            style={{
                              width: column.width,
                              minWidth: column.width
                            }}
                          >
                            {column.render('Header')}
                            <span>
                              {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>

                <tbody {...getTableBodyProps()} className="bg-gray-100 divide-y divide-gray-200">
                  {page.map((row, idx) => {
                    prepareRow(row);
                    const isLastRow = idx === page.length - 1;

                    return (
                      <tr {...row.getRowProps()} className="hover:bg-gray-50" key={idx}>
                        {row.cells.map((cell, cellIdx) => {
                          const isFirstColumn = cellIdx === 0;
                          const isLastColumn = cellIdx === row.cells.length - 1;

                          return (
                            <td
                              {...cell.getCellProps()}
                              className={`px-4 py-4 whitespace-nowrap text-black text-sm text-center 
                  ${cell.column.id === 'completionPercentage' ? 'border-l border-gray-300' : ''}
                  ${isFirstColumn && isLastRow ? 'rounded-bl-lg' : ''}
                  ${isLastColumn && isLastRow ? 'rounded-br-lg' : ''}`
                              }
                              key={cellIdx}
                              style={{
                                width: cell.column.width,
                                minWidth: cell.column.width
                              }}
                            >
                              {cell.render('Cell')}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  Page{' '}
                  <span className="font-medium">{pageIndex + 1}</span> of{' '}
                  <span className="font-medium">{pageOptions.length}</span>
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                  }}
                  className="ml-2 border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => gotoPage(0)}
                  disabled={!canPreviousPage}
                  className="px-3 py-1 border border-gray-300 rounded-b-lg text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {'<<'}
                </button>
                <button
                  onClick={() => previousPage()}
                  disabled={!canPreviousPage}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {'<'}
                </button>
                <button
                  onClick={() => nextPage()}
                  disabled={!canNextPage}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {'>'}
                </button>
                <button
                  onClick={() => gotoPage(pageCount - 1)}
                  disabled={!canNextPage}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {'>>'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && <ViewDispatcherOrderDetails orders={selectedOrder} onClose={handleClose} />}
      {createOrder && <CreateOrder onClose={handleClose} />}
    </div>
  );
};

export default Table;