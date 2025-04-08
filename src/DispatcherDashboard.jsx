import React, { useState, useEffect } from 'react';
import { ChevronLeft, X, Menu } from 'lucide-react';
import Table from './pages/Table';
import { useAuth } from './context/auth';
import { LuCalendarClock } from "react-icons/lu";
import { FaCheck } from "react-icons/fa";


const DispatcherDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('liveOrders');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth()

  const handleLogout = () => {
    logout();

    window.location.href = '/login';
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const menuItems = [
    { id: 'liveOrders', label: 'LIVE ORDERS' },
    { id: 'pastOrders', label: 'PAST ORDERS' },
  ];

  const getStatusCount = () => {
    const data = localStorage.getItem("dispatcher_all_orders");
    let allOrders = [];
  
    if (data) {
      try {
        allOrders = JSON.parse(data);
        if (!Array.isArray(allOrders)) {
          allOrders = [];
        }
      } catch (error) {
        allOrders = [];
      }
    }
  
    let pendingOrdersCount = 0;
    let completedOrderCount = 0;
  
    allOrders.forEach((e) => {
      if (e.order_status === "Pending") {
        pendingOrdersCount += 1;
      } else {
        completedOrderCount += 1;
      }
    });
  
    return { pendingOrdersCount, completedOrderCount };
  };
  
  const MobileSidebar = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex md:hidden">
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 text-white w-64 h-full flex flex-col shadow-lg">
        <div className="flex items-center p-4 border-b border-orange-400">
          <img src="./logo.png" alt="logo" className="w-32" />
          <button onClick={toggleSidebar} className="ml-auto p-1 rounded-full bg-[#F36821] hover:bg-orange-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 py-6">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  style={{ color: "black !important", fontWeight: "500" }}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center py-3 px-4 w-full rounded-lg transition-all ${activeTab === item.id
                    ? 'bg-white text-orange-600 font-bold shadow-sm'
                    : 'text-black !important hover:bg-orange-400 hover:text-white'
                    }`}
                >
                  <span className="text-black !important">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {!isMobile && (
        <div
          className={`bg-[url('./bg2.jpg')] bg-cover bg-center text-white flex flex-col transition-all duration-300 
          ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64'}`}
        >
          <div className="flex items-center p-4 border-b border-orange-400">
            <img src="./logo.png" alt="logo" className="w-[170px] mx-auto" />
            <button
              onClick={toggleSidebar}
              className="ml-auto p-1 rounded-full bg-orange-600 hover:bg-orange-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          <div className="flex-1 py-6">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center py-3 px-4 w-full rounded-lg transition-all ${activeTab === item.id
                      ? 'bg-white text-orange-600 font-bold shadow-sm'
                      : 'text-black font-bold hover:bg-orange-400'
                      }`}
                  >
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isMobile && mobileMenuOpen && <MobileSidebar />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            {isMobile || collapsed ? (
              <button onClick={toggleSidebar} className="p-2 mr-2 rounded-lg hover:bg-gray-100">
                <Menu size={24} className="text-orange-500" />
              </button>
            ) : null}
            <div className="text-xl font-bold ml-2">
              <span className="text-black">Welcome</span> <span className="text-orange-500">Dispatcher !</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-2">
            {/* Pending Tasks Indicator */}
            <div className="flex items-center bg-none text-orange-500 rounded border-1">
              <div className="flex items-center gap-2 px-4 py-2">
                <LuCalendarClock size={20} />
                <div className=" font-bold border-r-2 pr-2">
                  {getStatusCount().pendingOrdersCount}
                </div>
                <span className="font-medium pl-1">Pending</span>
              </div>

            </div>
            {/* /bg-[#639e3c] */}
            {/* Completed Tasks Indicator */}
            <div className="flex items-center text-[#639e3c] bg-none rounded border-1">
              <div className="flex items-center gap-2 px-4 py-2">
                <FaCheck size={20} />
                <div className="font-bold border-r-2 pr-2">
                {getStatusCount().CompletedOrderCount}
                </div>
                <span className="font-medium">Completed</span>
              </div>

            </div>

            {/* Logout Button */}
            <div className="flex items-center bg-red-500 text-white px-4 py-2.5 rounded-xl gap-2 hover:bg-red-800 hover:text-white shadow-2xl">
              <svg className="w-5 h-5 transform rotate-180" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <button onClick={handleLogout} className="font-medium cursor-pointer">LOGOUT</button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-hidden">
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            {activeTab === 'liveOrders' ? (
              <Table />
            ) : (
              <div className="text-center text-gray-500 py-8 flex-1">
                Past Orders Content Will Appear Here
              </div>
            )}
          </div>
        </main>
      </div>

    </div>

  );
};

export default DispatcherDashboard;