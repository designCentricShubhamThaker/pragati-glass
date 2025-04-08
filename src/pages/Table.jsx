import React, { useEffect, useMemo, useState } from 'react';
import { useTable, useGlobalFilter, useSortBy, usePagination } from 'react-table';
import { Eye, Plus, Check } from 'lucide-react';
import { FiEdit } from "react-icons/fi";
import { BsFiletypeCsv } from "react-icons/bs";
import { TbTimelineEvent } from "react-icons/tb";
import { RiTimelineView } from "react-icons/ri";

import axios from 'axios';
import CreateOrder from '../child-components/CreateOrder';
import OrderActivity from '../child-components/OrderActivity';
import ViewDispatcherOrderDetails from '../child-components/ViewDispatcherOrderDetails.jsx';
import { useAuth } from '../context/auth';

import {
  setupLocalStorageSync,
  updateLocalStorageOrders,
  getOrdersFromLocalStorage,
} from '../utils/LocalStorageUtils.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import { useSocket } from '../context/SocketContext.jsx';

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
  const [showTimeline, setShowTimeline] = useState(false);
  const { socket, isConnected } = useSocket();

  const { user } = useAuth();

  useEffect(() => {
    const storedOrders = getOrdersFromLocalStorage(user);
    if (storedOrders.length > 0) {
      setOrders(storedOrders);
      setIsLoading(false);
    } else {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    const cleanup = setupLocalStorageSync(user, (updatedOrders) => {
      setOrders(updatedOrders);
    });

    return cleanup;
  }, [user]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:5000/orders');

      const updatedOrders = updateLocalStorageOrders(user, response.data || []);
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleOrderUpdate = (updatedOrder) => {
      console.log('📦 Received order update via socket:', updatedOrder);
      const updatedOrders = updateLocalStorageOrders(user, [updatedOrder]);
      setOrders(updatedOrders);
    };

    socket.on('order-updated', handleOrderUpdate);

    return () => {
      socket.off('order-updated', handleOrderUpdate);
    };
  }, [socket, isConnected, user]);

  const handleCreateOrder = async (newOrderData) => {
    try {
      const orderToAdd = newOrderData.order ? newOrderData.order : newOrderData;

      const updatedOrders = updateLocalStorageOrders(user, [orderToAdd]);
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setCreateOrder(false);
    setShowTimeline(false);
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getTeamStatus = (items, teamType) => {
    if (!items || !Array.isArray(items) || items.length === 0) return "Pending";

    return items.every(item =>
      item.status === "Done" ||
      (item.team_tracking?.total_completed_qty >= item.quantity)
    ) ? "Done" : "Pending";
  };

  const transformedData = useMemo(() => {
    return orders.map(order => {
      const orderDetails = order.order_details || {};

      const glassStatus = orderDetails.glass ?
        getTeamStatus(orderDetails.glass) : "Pending";

      const capStatus = orderDetails.caps ?
        getTeamStatus(orderDetails.caps) : "Pending";

      const boxStatus = orderDetails.boxes ?
        getTeamStatus(orderDetails.boxes) : "Pending";

      const pumpStatus = orderDetails.pumps ?
        getTeamStatus(orderDetails.pumps) : "Pending";

      const decorationStatus = orderDetails.glass &&
        orderDetails.glass.length > 0 &&
        orderDetails.glass.every(glass =>
          glass.decoration_details?.type &&
          glass.decoration_details?.decoration_number &&
          glass.status === "Done"
        )
        ? "Done"
        : "Pending";

      return {
        orderNo: order.order_number,
        dispatcherName: order.dispatcher_name,
        customerName: order.customer_name,
        createdAt: order.created_at || order.createdAt,
        glass: glassStatus,
        cap: capStatus,
        box: boxStatus,
        pump: pumpStatus,
        decoration: decorationStatus,
        orderDetails: order,
        orderStatus: order.order_status
      };
    });
  }, [orders]);

  const calculateCompletionPercentage = (row) => {
    const teamsToCheck = ['glass', 'cap', 'box', 'pump', 'decoration'];
    const doneCount = teamsToCheck.filter(team => row[team] === 'Done').length;
    return (doneCount / teamsToCheck.length) * 100;
  };

  const StatusBadge = ({ value }) => (
    <div className="flex justify-center">
      {value === "Done" ? (
        <Check size={18} strokeWidth={3} className="text-[#FF6900] font-bold" />
      ) : (
        <img src="./download.svg" alt="" className='w-5 filter drop-shadow-md' />
      )}
    </div>
  );

  const handleView = (rowData) => {
    setSelectedOrder(rowData.orderDetails);
    setShowModal(true);
  };

  const handleViewHistory = (rowData) => {
    setSelectedOrder(rowData.orderDetails);
    setShowTimeline(true);
  };

  const columns = useMemo(
    () => [
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
      {
        Header: "History",
        accessor: "history",
        Cell: ({ row }) => (
          <div className="flex justify-center">
            <button 
              className="flex items-center justify-center p-2 bg-amber-700 rounded-lg text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm"
              onClick={() => handleViewHistory(row.original)}
            >
              <TbTimelineEvent size={18} />
            </button>
          </div>
        ),
        width: 80,
      },
      {
        Header: "View",
        accessor: "f",
        Cell: ({ row }) => (
          <div className="flex justify-center">
            <button 
              className="flex items-center justify-center p-2 bg-orange-400 rounded-lg text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm"
              onClick={() => handleView(row.original)}
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
              className="flex items-center justify-center p-2 bg-orange-600 rounded-lg text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm"
              onClick={() => console.log('Edit clicked')}
            >
              <FiEdit size={18} />
            </button>
          </div>
        ),
        width: 50,
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
        <div className="flex items-center gap-3">
          <button onClick={() => setCreateOrder(true)} className="mt-2 sm:mt-0  bg-[#FF3333] text-white  flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-md transition-colors duration-200 font-medium  hover:bg-orange-600 hover:text-white">
            <Plus size={16} /> Create Order
          </button>
          <ConnectionStatus />
        </div>

        <div className='flex items-center gap-8'>
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={filterInput}
              className="px-4 py-2 pr-10 border border-[#FFD7BC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:border-[#FF6900] font-inter text-gray-700"
              onChange={handleFilterChange}
            />
            <svg
              className="w-5 h-5 absolute right-3 top-3 text-[#FF6900]"
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
          <button className="flex items-center justify-center gap-2 bg-[#6B7499] hover:bg-gray-500 text-white py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
            <BsFiletypeCsv size={20} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {page.length === 0 ? (
        <div className="flex justify-center items-center h-64 bg-[#FFF5EC] rounded-md border border-[#FFD7BC]">
          <p className="text-[#996633] font-medium">No orders found</p>
        </div>
      ) : (
        <>
          <div className="flex-1 mt-2 overflow-auto">
            <div className="overflow-x-auto">
              <table
                {...getTableProps()}
                className="min-w-full divide-y divide-[#FFDFC8] rounded-lg shadow-md overflow-hidden font-inter"
                style={{
                  tableLayout: 'fixed',
                  boxShadow: '0 4px 15px -2px rgba(255, 105, 0, 0.1), 0 2px 8px -1px rgba(255, 105, 0, 0.05)'
                }}
              >
                <thead className="sticky top-0 z-10">
                  {headerGroups.map((headerGroup, idx) => (
                    <tr {...headerGroup.getHeaderGroupProps()} key={idx}>
                      {headerGroup.headers.map((column, colIdx) => {
                        const isFirstColumn = colIdx === 0;
                        const isLastColumn = colIdx === headerGroup.headers.length - 1;

                        let headerClass = "px-3 py-3 text-center font-bold text-sm text-white bg-[#FF6600]";

                       
                        headerClass += ` ${isFirstColumn ? 'rounded-tl-lg' : ''}
                        ${isLastColumn ? 'rounded-tr-lg' : ''}`;

                        return (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
                            className={headerClass}
                            key={colIdx}
                            style={{
                              width: column.width,
                              minWidth: column.width,
                              overflow: 'hidden'
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

                <tbody {...getTableBodyProps()} className="bg-white divide-y divide-[#FFDFC8]">
                  {page.map((row, idx) => {
                    prepareRow(row);
                    const isLastRow = idx === page.length - 1;
                    // Apply alternating row colors for better readability
                    const rowBgColor = idx % 2 === 0 ? 'bg-white' : 'bg-[#FFF0E6]';

                    return (
                      <tr {...row.getRowProps()} className={`${rowBgColor} hover:bg-[#FFF0E6] transition-colors duration-150`} key={idx}>
                        {row.cells.map((cell, cellIdx) => {
                          const isFirstColumn = cellIdx === 0;
                          const isLastColumn = cellIdx === row.cells.length - 1;

                          // Determine column type
                          const columnHeader = cell.column.Header;

                          // Base cell class
                          let cellClass = 'px-4 py-3.5 whitespace-nowrap text-sm text-center ';

                          // Special styling for Status column
                          if (columnHeader === "Status") {
                            cellClass += 'font-medium ';

                            // Custom styles for different status values and percentages
                            if (String(cell.value).includes("40%")) {
                              cellClass += 'text-[#FF6900] ';
                            } else if (String(cell.value).includes("20%")) {
                              cellClass += 'text-[#FF9A56] ';
                            } else if (String(cell.value).includes("100%")) {
                              cellClass += 'text-green-600 ';
                            } else if (String(cell.value).includes("0%")) {
                              cellClass += 'text-gray-500 ';
                            } else {
                              cellClass += 'text-[#FF6900] ';
                            }
                          }
                          // Special styling for Team columns (colored circles)
                          else if (["Glass", "Cap", "Box", "Pump", "Deco"].includes(columnHeader)) {
                            if (cell.value && String(cell.value).includes("✓")) {
                              cellClass += 'text-green-600 font-bold ';
                            } else if (cell.value && String(cell.render('Cell')).includes("🕒")) {
                              cellClass += 'text-[#FF9A56] ';
                            }
                          }
                          // Text coloring for different columns
                          else if (columnHeader === "Order No") {
                            cellClass += 'text-[#FF6900] font-medium ';
                          }
                          else if (columnHeader === "Dispatcher" || columnHeader === "Customer") {
                            cellClass += 'text-[#703800] ';
                          }
                          else if (columnHeader === "Created At") {
                            cellClass += 'text-gray-700 ';
                          }
                          else if (columnHeader === "View" || columnHeader === "Edit") {
                            cellClass += 'text-[#FF6900] ';
                          }
                          else if (columnHeader === "History") {
                            cellClass += 'text-[#B84700] ';
                          }
                          else {
                            cellClass += 'text-gray-700 ';
                          }

                          // Border and corner styling
                          cellClass += `
                          ${isFirstColumn && isLastRow ? 'rounded-bl-lg' : ''}
                          ${isLastColumn && isLastRow ? 'rounded-br-lg' : ''}`;

                          return (
                            <td
                              {...cell.getCellProps()}
                              className={cellClass}
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

          <div className="mt-4 pt-3 border-t border-[#FFDFC8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-[#703800]">
                  Page{' '}
                  <span className="font-medium">{pageIndex + 1}</span> of{' '}
                  <span className="font-medium">{pageOptions.length}</span>
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                  }}
                  className="ml-2 border-[#FFD7BC] rounded-lg focus:outline-none focus:ring-[#FF6900] focus:border-[#FF6900] text-sm text-[#703800]"
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
                  className="px-3 py-1.5 border border-[#FFD7BC] rounded-md text-sm font-medium text-[#FF6900] disabled:opacity-50 hover:bg-[#FFF5EC] transition-colors duration-200"
                >
                  {'<<'}
                </button>
                <button
                  onClick={() => previousPage()}
                  disabled={!canPreviousPage}
                  className="px-3 py-1.5 border border-[#FFD7BC] rounded-md text-sm font-medium text-[#FF6900] disabled:opacity-50 hover:bg-[#FFF5EC] transition-colors duration-200"
                >
                  {'<'}
                </button>
                <button
                  onClick={() => nextPage()}
                  disabled={!canNextPage}
                  className="px-3 py-1.5 border border-[#FFD7BC] rounded-md text-sm font-medium text-[#FF6900] disabled:opacity-50 hover:bg-[#FFF5EC] transition-colors duration-200"
                >
                  {'>'}
                </button>
                <button
                  onClick={() => gotoPage(pageCount - 1)}
                  disabled={!canNextPage}
                  className="px-3 py-1.5 border border-[#FFD7BC] rounded-md text-sm font-medium text-[#FF6900] disabled:opacity-50 hover:bg-[#FFF5EC] transition-colors duration-200"
                >
                  {'>>'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && <ViewDispatcherOrderDetails orders={selectedOrder} onClose={handleClose} />}
      {createOrder && <CreateOrder onClose={handleClose} onCreateOrder={handleCreateOrder} />}
      {showTimeline && <OrderActivity onClose={handleClose} orderData={selectedOrder} />}
    </div>
  );
};

export default Table;