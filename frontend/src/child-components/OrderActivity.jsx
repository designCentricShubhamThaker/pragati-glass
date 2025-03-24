import React, { useEffect, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { getOrderTimeline,  getTeamDisplayName } from '../utils/TimelineUtils';
import { Clock, PieChart, Users, Package, X, Check, ArrowRight } from 'lucide-react';


const OrderActivity = ({ onClose, orderId }) => {
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('all');

  useEffect(() => {
    if (!orderId) return;
    
    // Fetch timeline data for this specific order
    const orderTimeline = getOrderTimeline(orderId);
    setTimeline(orderTimeline);
    setIsLoading(false);
  }, [orderId]);

  // Filter timeline entries by selected team
  const filteredTimeline = selectedTeam === 'all' 
    ? timeline 
    : timeline.filter(entry => 
        entry.changes.some(change => change.teamType === selectedTeam)
      ).map(entry => ({
        ...entry,
        changes: entry.changes.filter(change => change.teamType === selectedTeam)
      }));

  // Sort timeline entries by date (newest first for each day)
  const sortedTimeline = [...filteredTimeline].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Group timeline entries by date
  const groupedByDate = sortedTimeline.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  // Get all team types from the timeline
  const teams = [...new Set(
    timeline.flatMap(entry => entry.changes.map(change => change.teamType))
  )];

  // Get team icon based on team type
  const getTeamIcon = (teamType) => {
    switch(teamType) {
      case 'glass':
        return <PieChart size={18} className="text-blue-500" />;
      case 'caps':
        return <Clock size={18} className="text-green-500" />;
      case 'boxes':
        return <Package size={18} className="text-amber-500" />;
      case 'pumps':
        return <Users size={18} className="text-purple-500" />;
      default:
        return <Users size={18} className="text-gray-500" />;
    }
  };

  // Get team color class based on team type
  const getTeamColorClass = (teamType) => {
    switch(teamType) {
      case 'glass': return 'bg-blue-50 border-blue-200';
      case 'caps': return 'bg-green-50 border-green-200';
      case 'boxes': return 'bg-amber-50 border-amber-200';
      case 'pumps': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Get team text color based on team type
  const getTeamTextColor = (teamType) => {
    switch(teamType) {
      case 'glass': return 'text-blue-700';
      case 'caps': return 'text-green-700';
      case 'boxes': return 'text-amber-700';
      case 'pumps': return 'text-purple-700';
      default: return 'text-gray-700';
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-20">
      <DialogBackdrop
        className="fixed inset-0 bg-gray-500/75 transition-opacity"
      />

      <div className="fixed inset-0 z-20 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            className="relative transform rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-6xl max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between bg-[#FF6900] px-6 py-4">
              <DialogTitle as="h3" className="text-xl font-semibold text-white flex items-center">
                <Clock className="mr-2" size={20} />
                Order Activity Timeline
              </DialogTitle>
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-b">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTeam('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    selectedTeam === 'all'
                      ? 'bg-[#FF6900] text-white border-[#FF6900]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All Teams
                </button>
                {teams.map(team => (
                  <button
                    key={team}
                    onClick={() => setSelectedTeam(team)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors flex items-center ${
                      selectedTeam === team
                        ? 'bg-[#FF6900] text-white border-[#FF6900]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {getTeamIcon(team)}
                    <span className="ml-2">{getTeamDisplayName(team)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 flex-1 bg-gray-50">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6900]"></div>
                </div>
              ) : sortedTimeline.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No activity found</h3>
                  <p className="mt-1 text-sm text-gray-500">There is no recorded activity for this order yet.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {Object.keys(groupedByDate).map(date => (
                    <div key={date} className="relative">
                      {/* Date label */}
                      <div className="mb-4">
                        <div className="inline-block px-4 py-2 bg-white rounded-md shadow-sm border border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-700">
                            {formatDate(date)}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Horizontal timeline container */}
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-0 right-0 h-1 bg-gray-200 top-10"></div>
                        
                        {/* Timeline entries */}
                        <div className="flex overflow-x-auto pb-8 pt-1" style={{ scrollbarWidth: 'thin' }}>
                          <div className="flex space-x-6 pl-1 pr-6">
                            {groupedByDate[date].map((entry, index) => (
                              <div key={entry.id} className="relative flex-shrink-0" style={{ width: '300px' }}>
                                {/* Timeline node */}
                                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                  <div className="h-5 w-5 rounded-full bg-[#FF6900] border-2 border-white shadow"></div>
                                </div>
                                
                                {/* Time display */}
                                <div className="mb-8 text-center">
                                  <span className="inline-block px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-200">
                                    {formatTime(entry.timestamp)}
                                  </span>
                                </div>
                                
                                {/* Entry content */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                  {entry.changes && entry.changes.map((change, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`${getTeamColorClass(change.teamType)} ${idx !== 0 ? 'border-t' : ''}`}
                                    >
                                      <div className="p-4">
                                        {/* Team header */}
                                        <div className={`flex items-center mb-3 ${getTeamTextColor(change.teamType)}`}>
                                          {getTeamIcon(change.teamType)}
                                          <span className="ml-2 font-semibold">
                                            {getTeamDisplayName(change.teamType)}
                                          </span>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="text-sm space-y-2">
                                          <div className="flex justify-between">
                                            <span className="font-medium text-gray-700">Order:</span>
                                            <span className="text-gray-900">{entry.orderNumber || '—'}</span>
                                          </div>
                                          
                                          <div className="flex justify-between">
                                            <span className="font-medium text-gray-700">Item:</span>
                                            <span className="text-gray-900">{change.itemName}</span>
                                          </div>
                                          
                                          <div>
                                            <div className="flex items-center mb-1.5">
                                              <span className="font-medium text-gray-700 mr-2">Progress:</span>
                                              <div className="flex items-center">
                                                <span className="text-gray-600">{change.previousCompleted}</span>
                                                <ArrowRight size={14} className="mx-1 text-gray-400" />
                                                <span className="text-gray-900">{change.newCompleted}</span>
                                                <span className="ml-1.5 px-1.5 py-0.5 bg-[#FF6900]/10 text-[#FF6900] text-xs font-medium rounded">
                                                  +{change.change} units
                                                </span>
                                              </div>
                                            </div>
                                            
                                            <div className="mt-3 mb-1">
                                              <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                  className="bg-[#FF6900] h-2 rounded-full"
                                                  style={{ width: `${change.percentComplete}%` }}
                                                ></div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-xs">
                                              <div>
                                                <span className="font-medium">{change.percentComplete}%</span> complete
                                              </div>
                                              {change.isComplete && (
                                                <div className="flex items-center text-green-600">
                                                  <Check size={14} className="mr-1" />
                                                  <span className="font-medium">Completed</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default OrderActivity;