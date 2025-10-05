import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Utility to get and store tab ID
const getTabId = () => {
  let id = localStorage.getItem('tabId');
  if (!id) {
    id = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tabId', id);
  }
  return id;
};

// Ban logic (prevent rejoining within 10 minutes)
const banTabId = () => {
  const tabId = getTabId();
  const bans = JSON.parse(localStorage.getItem('banList') || '{}');
  bans[tabId] = Date.now() + 10 * 60 * 1000; // Ban for 10 minutes
  localStorage.setItem('banList', JSON.stringify(bans));
};

const isTabBanned = () => {
  const tabId = getTabId();
  const bans = JSON.parse(localStorage.getItem('banList') || '{}');
  const expiry = bans[tabId];
  if (expiry && Date.now() < expiry) return true;
  return false;
};

const KickedOut = () => {
  const navigate = useNavigate();

  useEffect(() => {
    banTabId(); // Store ban in localStorage
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#fff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      fontFamily: 'Sora, sans-serif'
    }}>
      {/* Badge */}
      <div style={{
        position: 'absolute',
        top: '420px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '134px',
        height: '31px',
        borderRadius: '24px',
        background: 'linear-gradient(90deg, #7565D9 0%, #4D0ACD 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        padding: '0 9px'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 17h-2v-2h2Zm0-4h-2V7h2Z" />
        </svg>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff'
        }}>Intervue Poll</span>
      </div>

      {/* Content */}
      <div style={{ textAlign: 'center', maxWidth: '737px', marginTop: '60px' }}>
        <h1 style={{
          fontSize: '40px',
          fontWeight: 400,
          lineHeight: '50px',
          marginBottom: '5px',
        }}>
          You’ve been Kicked out !
        </h1>
        <p style={{
          fontSize: '19px',
          lineHeight: '24px',
          color: 'rgba(0,0,0,0.5)',
          margin: 0,
        }}>
          Looks like the teacher had removed you from the poll system. <br />
          Please try again sometime.
        </p>
      </div>
    </div>
  );
};

export default KickedOut;
