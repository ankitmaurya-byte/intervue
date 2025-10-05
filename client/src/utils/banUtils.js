// utils/banUtils.js

// Get or create a unique tab ID
export const getTabId = () => {
  let id = localStorage.getItem('tabId');
  if (!id) {
    id = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tabId', id);
  }
  return id;
};

// Add current tab to ban list for 10 minutes
export const banTabId = () => {
  const tabId = getTabId();
  const banList = JSON.parse(localStorage.getItem('banList') || '{}');
  banList[tabId] = Date.now() + 10 * 60 * 1000; // 10 minutes
  localStorage.setItem('banList', JSON.stringify(banList));
};

// Check if current tab is banned
export const isTabBanned = () => {
  const tabId = getTabId();
  const banList = JSON.parse(localStorage.getItem('banList') || '{}');
  const expiry = banList[tabId];

  // Clean up expired bans
  Object.keys(banList).forEach(id => {
    if (Date.now() > banList[id]) {
      delete banList[id];
    }
  });
  localStorage.setItem('banList', JSON.stringify(banList));

  return expiry && Date.now() < expiry;
};

// Optional: clear tab ID from ban (for testing)
export const clearTabBan = () => {
  const tabId = getTabId();
  const banList = JSON.parse(localStorage.getItem('banList') || '{}');
  delete banList[tabId];
  localStorage.setItem('banList', JSON.stringify(banList));
};
