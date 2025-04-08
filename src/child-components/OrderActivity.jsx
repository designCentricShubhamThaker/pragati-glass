import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { CalendarDays, Package, Clock, Check, Filter, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';



const OrderActivity = ({ onClose, orderData }) => {
  const [selectedItem, setSelectedItem] = useState('all');
  const [expandedSections, setExpandedSections] = useState({});


  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      // Handle MongoDB timestamp format ($date.$numberLong)
      const timeMs = typeof timestamp === 'object' && timestamp.$date && timestamp.$date.$numberLong
        ? parseInt(timestamp.$date.$numberLong)
        : new Date(timestamp).getTime();

      if (isNaN(timeMs)) return 'N/A';

      const date = new Date(timeMs);
      return `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} • ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } catch (error) {
      return 'N/A';
    }
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };


  const parseIntFromMongo = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.$numberInt) {
      return parseInt(value.$numberInt);
    }
    return 0;
  };

  // Filter items based on selection
  const getFilteredItems = () => {
    const { order_details } = orderData;
    let items = [];

    if (selectedItem === 'all' || selectedItem === 'glass') {
      items = [
        ...items,
        ...(order_details.glass || []).map(item => ({
          ...item,
          type: 'glass',
          display_name: `${item.glass_name} (${item.weight}, ${item.neck_size})`,
          quantity: parseIntFromMongo(item.quantity),
          completed_qty: parseIntFromMongo(item.team_tracking?.total_completed_qty)
        }))
      ];
    }

    if (selectedItem === 'all' || selectedItem === 'caps') {
      items = [
        ...items,
        ...(order_details.caps || []).map(item => ({
          ...item,
          type: 'caps',
          display_name: `${item.cap_name} (${item.process}, ${item.material})`,
          quantity: parseIntFromMongo(item.quantity),
          completed_qty: parseIntFromMongo(item.team_tracking?.total_completed_qty)
        }))
      ];
    }

    if (selectedItem === 'all' || selectedItem === 'boxes') {
      items = [
        ...items,
        ...(order_details.boxes || []).map(item => ({
          ...item,
          type: 'boxes',
          display_name: `${item.box_name} (Code: ${item.approval_code})`,
          quantity: parseIntFromMongo(item.quantity),
          completed_qty: parseIntFromMongo(item.team_tracking?.total_completed_qty)
        }))
      ];
    }

    if (selectedItem === 'all' || selectedItem === 'pumps') {
      items = [
        ...items,
        ...(order_details.pumps || []).map(item => ({
          ...item,
          type: 'pumps',
          display_name: `${item.pump_name} (${item.neck_type})`,
          quantity: parseIntFromMongo(item.quantity),
          completed_qty: parseIntFromMongo(item.team_tracking?.total_completed_qty)
        }))
      ];
    }

    return items;
  };

  const calculateProgress = (item) => {
    if (!item.quantity || !item.completed_qty) return 0;
    return Math.min(100, Math.floor((item.completed_qty / item.quantity) * 100));
  };

  const parseCompletedEntry = (entry) => {
    if (!entry) return { qty: 0, time: null };
    return {
      qty: parseIntFromMongo(entry.qty_completed),
      time: entry.timestamp
    };
  };

  // Get an item's icon based on type
  const getItemIcon = (type) => {
    switch (type) {
      case 'glass':
        return <Package size={20} />;
      case 'caps':
        return <Package size={20} />;
      case 'boxes':
        return <Package size={20} />;
      case 'pumps':
        return <Package size={20} />;
      default:
        return <Package size={20} />;
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  
  const filteredItems = getFilteredItems();

  return (
    <Dialog open={true} onClose={onClose} className="relative z-20">
      <DialogBackdrop
        className="fixed inset-0 bg-gray-500/75 transition-opacity"
      />

      <div className="fixed inset-0 z-20 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            className="relative transform rounded-lg p-4 bg-white text-left shadow-xl transition-all w-full max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col"
          >

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">Order #{orderData.order_number}</h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${orderData.order_status === 'Completed' ? 'bg-green-100 text-green-800' :
                    orderData.order_status === 'Pending' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                    {orderData.order_status}
                  </div>
                </div>
              </div>

              <div className="flex items-center bg-gray-100 rounded-md p-1">
                <Filter size={16} className="ml-2 text-gray-500" />
                <select
                  className="bg-transparent py-2 pl-2 pr-8 rounded-md border-0 text-gray-500 focus:ring-0 text-sm"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                >
                  <option value="all">All Items</option>
                  <option value="glass">Glass</option>
                  <option value="caps">Caps</option>
                  <option value="boxes">Boxes</option>
                  <option value="pumps">Pumps</option>
                </select>
              </div>
            </div>

            <div className="mb-8 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Order Progress Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['glass', 'caps', 'boxes', 'pumps'].map(type => {
                  const items = orderData.order_details[type] || [];
                  const totalQuantity = items.reduce((sum, item) => sum + parseIntFromMongo(item.quantity), 0);
                  const completedQuantity = items.reduce((sum, item) => sum + parseIntFromMongo(item.team_tracking?.total_completed_qty || 0), 0);
                  const progress = totalQuantity ? Math.floor((completedQuantity / totalQuantity) * 100) : 0;

                  return (
                    <div key={type} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{items.length} items</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">
                          {progress}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {completedQuantity.toLocaleString()} / {totalQuantity.toLocaleString()} units
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              {filteredItems.length > 0 ? filteredItems.map((item, index) => {
                const itemId = `${item.type}-${index}`;
                const isExpanded = expandedSections[itemId] || false;
                const progress = calculateProgress(item);
                const entries = item.team_tracking?.completed_entries || [];
                const isCompleted = item.team_tracking?.status === 'Completed';

                const processedEntries = entries.map(parseCompletedEntry)
                  .filter(entry => entry.qty > 0)
                  .sort((a, b) => {

                    const getTimeValue = (timestamp) => {
                      if (!timestamp) return 0;
                      if (typeof timestamp === 'object' && timestamp.$date && timestamp.$date.$numberLong) {
                        return parseInt(timestamp.$date.$numberLong);
                      }
                      return new Date(timestamp).getTime();
                    };

                    return getTimeValue(a.time) - getTimeValue(b.time);
                  });

                let cumulativeEntries = [];
                let runningTotal = 0;

                processedEntries.forEach((entry, idx) => {
                  runningTotal += entry.qty;
                  const entryProgress = Math.min(100, Math.floor((runningTotal / item.quantity) * 100));

                  cumulativeEntries.push({
                    ...entry,
                    cumulativeQty: runningTotal,
                    progress: entryProgress,
                    isCompleted: runningTotal >= item.quantity,
                    remainingUnits: Math.max(0, item.quantity - runningTotal)
                  });
                });

                let productionRate = null;
                if (processedEntries.length >= 2) {
                  const latest = processedEntries[processedEntries.length - 1];
                  const previous = processedEntries[processedEntries.length - 2];

                  const getTimeValue = (timestamp) => {
                    if (!timestamp) return 0;
                    if (typeof timestamp === 'object' && timestamp.$date && timestamp.$date.$numberLong) {
                      return parseInt(timestamp.$date.$numberLong);
                    }
                    return new Date(timestamp).getTime();
                  };

                  const timeDiff = (getTimeValue(latest.time) - getTimeValue(previous.time)) / (1000 * 60 * 60); // hours
                  if (timeDiff > 0) {
                    productionRate = Math.round(latest.qty / timeDiff);
                  }
                }

                const getProductionStateText = () => {
                  if (isCompleted) return "Production complete";
                  if (processedEntries.length === 0) return "Production not started";
                  return "Production in progress";
                };

                return (
                  <div
                    key={itemId}
                    className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div
                      className={`px-4 py-4 flex items-center justify-between cursor-pointer transition-colors duration-200 ${isExpanded ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      onClick={() => toggleSection(itemId)}
                    >
                      <div className="flex items-start">
                        <div className={`p-2 rounded-md mr-3 ${item.type === 'glass' ? 'bg-orange-100 text-orange-600' :
                          item.type === 'caps' ? 'bg-blue-100 text-blue-600' :
                            item.type === 'boxes' ? 'bg-green-100 text-green-600' :
                              'bg-purple-100 text-purple-600'
                          }`}>
                          {getItemIcon(item.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{item.display_name}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                              Qty: {item.quantity.toLocaleString()}
                            </span>
                            {item.decoration && (
                              <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                                {item.decoration} ({item.decoration_no})
                              </span>
                            )}
                            {item.team && (
                              <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                                Team: {item.team}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block">
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-3 bg-[#FFF0E7] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCompleted ? 'bg-green-500' :
                                  progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                                  }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' :
                              progress > 0 ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                              {progress}%
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(item.team_tracking?.status)
                              }`}>
                              {getProductionStateText()}
                            </span>
                            {isCompleted && (
                              <span className="text-xs text-green-600 flex items-center ml-2">
                                <Check size={12} className="mr-1" /> Done
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`p-1 rounded-full ${isExpanded ? 'bg-gray-200' : 'bg-gray-100'}`}>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="sm:hidden mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCompleted ? 'bg-green-500' :
                                  progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                                  }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' :
                              progress > 0 ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                              {progress}%
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(item.team_tracking?.status)
                              }`}>
                              {getProductionStateText()}
                            </span>
                          </div>
                        </div>
                        {processedEntries.length > 0 && (
                          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <h4 className="text-md font-semibold text-black mb-1">Production Info</h4>
                            <div className="flex items-center gap-4">
                              {productionRate && (
                                <div>
                                  <div className="text-sm font-semibold text-[#9c3900]">Production Rate</div>
                                  <div className="text-lg font-semibold text-[#6A7283]">{productionRate} units/hr</div>
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-semibold text-[#9c3900]">Completed</div>
                                <div className="text-lg font-semibold text-[#6A7283]">
                                  {item.completed_qty.toLocaleString()} / {item.quantity.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border-l-2 border-[#F54A00] pl-6 ml-4 relative">
                          {cumulativeEntries.length > 0 ? (
                            cumulativeEntries.map((entry, entryIndex) => {
                              const isFirst = entryIndex === 0;
                              const isComplete = entry.cumulativeQty >= item.quantity;
                              const hasMoreEntries = entryIndex < cumulativeEntries.length - 1;

                              const cardBgColor = isComplete ? 'bg-[#F3F9EF] border-[#639E3C]' :
                                isFirst ? 'bg-[#FFF1E7] border-[#F54A00]' :
                                  'bg-[#FFF1E7] border-[#F54A00]';

                              const dotColor = isComplete ? 'bg-[#639E3C]' : 'bg-[#F54A00]';

                              const statusBadgeColor = isComplete ?
                                'bg-[#E8F5E2] text-[#639E3C] border border-[#639E3C]' :
                                'bg-[#FFF1E7] text-[#F54A00] border border-[#F54A00]';

                              const statusText = isComplete ? 'completed' : (isFirst ? 'started' : 'added');
                              const messageTextStyle = isComplete ? 'text-[#639E3C] font-medium' :
                                'text-[#F54A00] font-medium';

                              const progressBarColor = isComplete ? 'bg-green-800' : 'bg-[#F54A00]';

                              return (
                                <div key={entryIndex} className="mb-6 relative">
                                  <div className={`absolute -left-8 mt-1 w-4 h-4 rounded-full ${dotColor} border-1 border-white shadow-sm`}></div>

                                  <div className={`rounded-lg p-4 border ${cardBgColor} shadow-sm`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                      <span className="text-sm text-[#9F0F12] flex items-center font-medium">
                                        <CalendarDays size={16} className="mr-2 text-[#9F0F12]" />
                                        {formatTimestamp(entry.time)}
                                       
                                      </span>
                                      <span className={`px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center ${statusBadgeColor}`}>
                                        {isComplete && <Check size={12} className="mr-1 text-[#639E3C]" />}
                                        {entry.qty.toLocaleString()} units {statusText}
                                      </span>
                                    </div>

                                    <div className="mb-3">
                                      <p className={`text-sm ${messageTextStyle}`}>
                                        {isFirst ? (
                                          <span>Started production with initial batch.</span>
                                        ) : isComplete ? (
                                          <span className="text-green-800 font-semibold">
                                            Completed full production run. All units finished.
                                          </span>
                                        ) : (
                                          <span>
                                            Production batch completed. {entry.remainingUnits > 0 ?
                                              `${entry.remainingUnits.toLocaleString()} units remaining.` :
                                              ''}
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="text-xs text-[#666666] font-medium mb-1">Progress at this point</div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-28 h-3 bg-[#FFCCA5] rounded-full overflow-hidden shadow-inner">
                                            <div
                                              className={`h-full rounded-full ${progressBarColor}`}
                                              style={{ width: `${entry.progress}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-sm font-semibold text-[#9F0F12]">
                                            {entry.progress}% ({entry.cumulativeQty.toLocaleString()} of {item.quantity.toLocaleString()})
                                          </span>
                                        </div>
                                      </div>

                                      {isComplete && (
                                        <span className="flex items-center text-green-800 text-sm font-bold">
                                           Production Complete
                                        </span>
                                      )}
                                    </div>

                                    {hasMoreEntries && (
                                      <div className="mt-3 text-right text-sm font-medium text-red-800">
                                        Time to next entry: {(() => {
                                          const current = new Date(typeof entry.time === 'object' && entry.time.$date ?
                                            parseInt(entry.time.$date.$numberLong) : entry.time).getTime();
                                          const next = new Date(typeof cumulativeEntries[entryIndex + 1].time === 'object' &&
                                            cumulativeEntries[entryIndex + 1].time.$date ?
                                            parseInt(cumulativeEntries[entryIndex + 1].time.$date.$numberLong) :
                                            cumulativeEntries[entryIndex + 1].time).getTime();

                                          const diffMs = next - current;
                                          const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
                                          const diffHours = Math.floor(diffMins / 60);
                                          const remainingMins = diffMins % 60;

                                          if (diffHours > 0) {
                                            return `${diffHours}h ${remainingMins}m`;
                                          }
                                          return `${diffMins}m`;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="mb-6 relative">
                              <div className="absolute -left-8 mt-1 w-4 h-4 rounded-full bg-[#999999] border-2 border-white shadow-sm"></div>
                              <div className="bg-[#FFF8F3] rounded-lg p-4 border-2 border-[#FFCCA5] shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-[#666666] flex items-center font-medium">
                                    <Clock size={16} className="mr-2 text-[#F54A00]" />
                                    Pending
                                  </span>
                                  <span className="px-3 py-1 bg-[#FFF1E7] text-[#F54A00] text-xs font-semibold rounded-full border border-[#F54A00]">
                                    Not started
                                  </span>
                                </div>
                                <p className="text-sm text-[#666666] flex items-center">
                                  <AlertTriangle size={16} className="mr-2 text-[#F54A00]" />
                                  Production has not been started. {item.quantity.toLocaleString()} units pending.
                                </p>
                              </div>
                            </div>
                          )}

                          {cumulativeEntries.length > 0 && !isCompleted && (
                            <div className="mb-6 relative">
                              <div className="absolute -left-8 mt-1 w-4 h-4 rounded-full bg-[#999999] border-4 border-white shadow-sm"></div>
                              <div className="bg-[#FFF8F3] rounded-lg p-4 border-2 border-dashed border-[#FFCCA5] shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-[#333333] font-medium">Upcoming</span>
                                  <span className="px-3 py-1 bg-[#FFF1E7] text-[#F54A00] text-xs font-semibold rounded-full border border-[#F54A00]">
                                    {(item.quantity - item.completed_qty).toLocaleString()} more units
                                  </span>
                                </div>
                                <p className="text-sm text-[#333333] font-medium">
                                  {item.quantity > item.completed_qty ?
                                    `${((item.quantity - item.completed_qty) / item.quantity * 100).toFixed(1)}% of production remaining.` :
                                    'All units have been produced. Awaiting final verification.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {item.notes && (
                          <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Production Notes</h4>
                            <p className="text-sm text-gray-600">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-8 px-4 bg-gray-50 rounded--lg border border-gray-200">
                  <p className="text-gray-600">No items found matching the selected filter.</p>
                </div>
              )}
            </div>

          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default OrderActivity;