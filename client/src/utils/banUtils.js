// src/utils/banUtils.js
import apiService from '../services/apiService';

export const getTabId = () => {
  let id = localStorage.getItem('tabId');
  if (!id) {
    id = Math.random().toString(36).slice(2, 11);
    localStorage.setItem('tabId', id);
  }
  return id;
};

// Optional local shadow (used as a fallback UX only)
const LOCAL_KEY = 'banList';

const cleanupLocal = (banList) => {
  let changed = false;
  Object.keys(banList).forEach((k) => {
    if (Date.now() > banList[k]) {
      delete banList[k];
      changed = true;
    }
  });
  if (changed) localStorage.setItem(LOCAL_KEY, JSON.stringify(banList));
};

// Ban current tab locally (UX hint; server is the source of truth)
export const banTabLocally = (minutes = 10) => {
  const tabId = getTabId();
  const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  list[tabId] = Date.now() + minutes * 60 * 1000;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
};

// 🔎 The only function you should use to check ban status
export const isTabBannedServer = async () => {
  const tabId = getTabId();

  // Always ask the server
  try {
    const { banned, bannedUntil } = await apiService.checkBan(tabId);
    if (banned && bannedUntil) {
      // mirror locally (optional)
      const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      list[tabId] = bannedUntil;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
      return { banned: true, bannedUntil };
    }
    // cleanup local shadow
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    cleanupLocal(list);
    return { banned: false, bannedUntil: null };
  } catch (e) {
    // On network error, fall back to local shadow (best effort)
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    cleanupLocal(list);
    const exp = list[tabId];
    if (exp && Date.now() < exp) return { banned: true, bannedUntil: exp };
    return { banned: false, bannedUntil: null };
  }
};

// For tests/dev
export const clearLocalBan = () => {
  const tabId = getTabId();
  const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  delete list[tabId];
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
};
