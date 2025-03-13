import React, { useEffect, useMemo, useState } from 'react';
import { useTable, useGlobalFilter, useSortBy, usePagination } from 'react-table';
import { Eye, Plus } from 'lucide-react';
import ViewDispatcherOrderDetails from '../child-components/ViewDispatcherOrderDetails';
import axios from 'axios';
import CreateOrder from '../child-components/CreateOrder';

const Table = () => {
  const [showModal, setShowModal] = useState(false);
  const [createOrder, setCreateOrder] = useState(false)
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/orders');
        setOrders(response.data.Orders || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleClose = () => {
    setShowModal(false);
    setCreateOrder(false)
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
      const glassStatus = orderDetails.glass?.[0]?.status || "Pending";
      const capStatus = getTeamStatus(orderDetails.caps || []);
      const boxStatus = orderDetails.boxes?.[0]?.status || "Pending";
      const pumpStatus = getTeamStatus(orderDetails.pumps || []);
      const decorationStatus = orderDetails.glass?.[0]?.decoration_details ? "Done" : "Pending";

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
    <span
      className={`px-2 py-1 text-sm font-medium rounded-full ${value === "Done" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
        }`}
    >
      {value}
    </span>
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
          },
          {
            Header: "Dispatcher Name",
            accessor: "dispatcherName",
          },
          {
            Header: "Customer Name",
            accessor: "customerName",
          },
          {
            Header: "Created At",
            accessor: "createdAt",
            Cell: ({ value }) => formatSimpleDate(value),
          },
          {
            Header: "View",
            accessor: "f",
            Cell: ({ row }) => (
              <button
                onClick={() => handleView(row.original)}
                className="p-2 text-blue-600 hover:text-blue-800"
              >
                <Eye size={18} />
              </button>
            ),
          },
          {
            Header: "Completion",
            accessor: (row) => calculateCompletionPercentage(row),
            id: "completionPercentage",
            Cell: ({ value }) => (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
                <span className="text-xs ml-1">{value.toFixed(0)}%</span>
              </div>
            ),
          },
        ],
      },
      {
        Header: "Teams",
        columns: [
          { Header: "Glass", accessor: "glass", Cell: StatusBadge },
          { Header: "Cap", accessor: "cap", Cell: StatusBadge },
          { Header: "Box", accessor: "box", Cell: StatusBadge },
          { Header: "Pump", accessor: "pump", Cell: StatusBadge },
          { Header: "Decoration", accessor: "decoration", Cell: StatusBadge },
        ],
      },
    ],
    []
  );

  const tableInstance = useTable(
    {
      columns,
      data: transformedData,
      initialState: { pageIndex: 0, pageSize: 5 },
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading orders...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCreateOrder(true)} className="mt-2 sm:mt-0 bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2 px-3 py-1 rounded-full shadow-md transition-colors duration-200">
          <Plus size={16} /> Create Order
        </button>

        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={e => setGlobalFilter(e.target.value || undefined)}
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
      </div>

      {transformedData.length === 0 ? (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <div className="overflow-x-auto">
              <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  {headerGroups.map((headerGroup, idx) => (
                    <tr {...headerGroup.getHeaderGroupProps()} key={idx}>
                      {headerGroup.headers.map((column, colIdx) => (
                        <th
                          {...column.getHeaderProps(column.getSortByToggleProps())}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          key={colIdx}
                        >
                          {column.render('Header')}
                          <span>
                            {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
                          </span>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody
                  {...getTableBodyProps()}
                  className="bg-white divide-y divide-gray-200"
                >
                  {page.map((row, idx) => {
                    prepareRow(row);
                    return (
                      <tr {...row.getRowProps()} className="hover:bg-gray-50" key={idx}>
                        {row.cells.map((cell, cellIdx) => {
                          return (
                            <td
                              {...cell.getCellProps()}
                              className="px-5 py-4 whitespace-nowrap text-sm text-gray-500"
                              key={cellIdx}
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
                  className="ml-2 border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50"
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