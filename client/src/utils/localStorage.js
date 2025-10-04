// Utility functions for managing local storage

export const generateTabId = () => {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getTabId = () => {
  let tabId = localStorage.getItem('tabId');
  if (!tabId) {
    tabId = generateTabId();
    localStorage.setItem('tabId', tabId);
  }
  return tabId;
};

export const getStudentName = () => {
  return localStorage.getItem('studentName') || '';
};

export const setStudentName = (name) => {
  localStorage.setItem('studentName', name);
};

export const clearStudentData = () => {
  localStorage.removeItem('studentName');
  // Note: We don't clear tabId to maintain uniqueness per tab
};
