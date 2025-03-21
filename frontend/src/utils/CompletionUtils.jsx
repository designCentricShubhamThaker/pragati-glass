

export const loadCompletedQuantities = () => {
  return JSON.parse(localStorage.getItem('completedQuantities') || '{}');
};



export const saveCompletedQuantities = (data) => {
  localStorage.setItem('completedQuantities', JSON.stringify(data));
};

export const getRemainingQuantity = (order, item, completedQuantities) => {
  const itemKey = `${order._id}-${item._id}`;
  const completedData = completedQuantities[itemKey];
  
  if (!completedData) return item.quantity;
  
  return Math.max(0, item.quantity - completedData.completed);
};

export const getLastUpdateTime = (order, item, completedQuantities) => {
  const itemKey = `${order._id}-${item._id}`;
  const completedData = completedQuantities[itemKey];
  
  if (!completedData) return null;
  
  const date = new Date(completedData.timestamp);
  return date.toLocaleString();
};

export const clearCompletedQuantities = () => {
  localStorage.removeItem('completedQuantities');
};


export const getCompletionHistory = () => {
  const completions = loadCompletedQuantities();
  
  return Object.values(completions).sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
};