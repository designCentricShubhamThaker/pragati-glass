// Timeline utility functions to track order progress changes

/**
 * Tracks changes in completedQuantities and builds a timeline history
 * @param {Object} newCompletions - The updated completion data that was just saved
 * @param {Object} previousCompletions - The previous completion data from localStorage
 * @returns {Array} The timeline entry for this update
 */
export const trackOrderChanges = (newCompletions, previousCompletions = {}) => {
  const timelineKey = 'orderTimelineHistory';
  const existingTimeline = JSON.parse(localStorage.getItem(timelineKey) || '[]');
  const timestamp = new Date().toISOString();
  const changes = [];
  
  // Find all keys that were changed or added
  Object.keys(newCompletions).forEach(key => {
    const newEntry = newCompletions[key];
    const prevEntry = previousCompletions[key];
    
    // Check if this is a new entry or an update to existing entry
    if (!prevEntry || (prevEntry && newEntry.completed !== prevEntry.completed)) {
      const teamType = determineItemTeamType(newEntry.itemName);
      const prevCompleted = prevEntry?.completed || 0;
      const change = newEntry.completed - prevCompleted;
      
      if (change > 0) {
        changes.push({
          orderId: newEntry.orderId,
          orderNumber: newEntry.orderNumber,
          itemId: newEntry.itemId,
          itemName: newEntry.itemName,
          teamType,
          previousCompleted: prevCompleted,
          newCompleted: newEntry.completed,
          change,
          originalQuantity: newEntry.originalQuantity,
          percentComplete: Math.round((newEntry.completed / newEntry.originalQuantity) * 100),
          isComplete: newEntry.completed >= newEntry.originalQuantity,
          timestamp
        });
      }
    }
  });
  
  // If we have changes, add a new timeline entry
  if (changes.length > 0) {
    const timelineEntry = {
      id: `timeline-${Date.now()}`,
      timestamp,
      changes
    };
    
    // Add to the timeline and save to localStorage
    const updatedTimeline = [timelineEntry, ...existingTimeline];
    localStorage.setItem(timelineKey, JSON.stringify(updatedTimeline));
    
    return timelineEntry;
  }
  
  return null;
};

/**
 * Determine team type from item name - fallback if team type isn't directly available
 */
export const determineItemTeamType = (itemName) => {
  const lowerName = (itemName || '').toLowerCase();
  
  if (lowerName.includes('bottle') || lowerName.includes('glass')) return 'glass';
  if (lowerName.includes('cap')) return 'caps';
  if (lowerName.includes('box')) return 'boxes';
  if (lowerName.includes('pump')) return 'pumps';
  
  return 'unknown';
};

/**
 * Get the team's display name for UI
 */
export const getTeamDisplayName = (teamType) => {
  switch(teamType) {
    case 'glass': return 'Glass Team';
    case 'caps': return 'Caps Team';
    case 'boxes': return 'Box Team';
    case 'pumps': return 'Pumps Team';
    default: return 'Unknown Team';
  }
};

/**
 * Get all timeline entries for a specific order
 * @param {string} orderId - The order ID to filter by
 * @returns {Array} Timeline entries for the specified order
 */
export const getOrderTimeline = (orderId) => {
  const allTimeline = JSON.parse(localStorage.getItem('orderTimelineHistory') || '[]');
  return allTimeline.filter(entry => 
    entry.changes.some(change => change.orderId === orderId)
  );
};

/**
 * Get recent timeline activities across all orders
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} Recent timeline entries
 */
export const getRecentTimeline = (limit = 10) => {
  const allTimeline = JSON.parse(localStorage.getItem('orderTimelineHistory') || '[]');
  return allTimeline.slice(0, limit);
};

/**
 * Format date for timeline display
 */
export const formatTimelineDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};