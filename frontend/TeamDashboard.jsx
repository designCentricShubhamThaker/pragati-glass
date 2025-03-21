import React, { useState, useEffect } from 'react';
import { ChevronLeft, X, Menu } from 'lucide-react';
import { useAuth } from './context/auth';
import { useParams, useNavigate } from 'react-router-dom';

const TeamDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('liveOrders');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
 
  const { user, logout } = useAuth();
  const { teamId, subteamId } = useParams();
  const navigate = useNavigate();
  
  const isSubteamView = !!subteamId;
  

  const currentTeam = teamId || user?.team;
  const currentSubteam = subteamId || user?.subteam;

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  useEffect(() => {

    const fetchOrders = async () => {
      setLoading(true);
      try {
       
        let endpoint;
        
        if (isSubteamView) {
          endpoint = `/api/teams/${currentTeam}/subteams/${currentSubteam}/orders/${activeTab === 'liveOrders' ? 'live' : 'past'}`;
        } else {
          endpoint = `/api/teams/${currentTeam}/orders/${activeTab === 'liveOrders' ? 'live' : 'past'}`;
        }
        
        console.log(`Fetching from: ${endpoint}`);
        
       
        const dummyData = [
          { id: 1, customer: 'Customer A', status: 'Pending', date: '2025-03-17' },
          { id: 2, customer: 'Customer B', status: 'Processing', date: '2025-03-16' },
          { id: 3, customer: 'Customer C', status: 'Completed', date: '2025-03-15' },
        ];
        
      
        setTimeout(() => {
          setOrders(dummyData);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [activeTab, currentTeam, currentSubteam, isSubteamView]);

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

  const getDashboardTitle = () => {
    if (isSubteamView) {
      return `Subteam ${currentSubteam}`;
    } else {
      return `Team ${currentTeam}`;
    }
  };

  const MobileSidebar = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex md:hidden">
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 text-white w-64 h-full flex flex-col shadow-lg">
        <div className="flex items-center p-4 border-b border-orange-400">
          <img src="./logo.png" alt="logo" className="w-32" />
          <button onClick={toggleSidebar} className="ml-auto p-1 rounded-full bg-orange-600 hover:bg-orange-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 py-6">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center py-3 px-4 w-full rounded-lg transition-all ${activeTab === item.id
                    ? 'bg-white text-orange-600 font-bold shadow-sm'
                    : 'text-white hover:bg-orange-400'
                    }`}
                >
                  <span>{item.label}</span>
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
          className={`bg-[url('/bg2.jpg')] bg-cover bg-center text-white flex flex-col transition-all duration-300 
          ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64'}`}
        >
          <div className="flex items-center p-4 border-b border-orange-400">
            <img src="/logo.png" alt="logo" className="w-[170px] mx-auto" />
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
                      : 'text-white hover:bg-orange-400'
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
              <span className="text-black">Welcome</span> <span className="text-orange-500">{getDashboardTitle()}</span>
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Logout</button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-hidden">
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {activeTab === 'liveOrders' ? (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Live Orders</h2>
                   
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Past Orders</h2>
                    
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeamDashboard;