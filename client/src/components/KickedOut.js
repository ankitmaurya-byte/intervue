import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { banTabLocally } from '../utils/banUtils';
import './style/KickedOut.css';

const KickedOut = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Store ban locally (10 minutes)
    banTabLocally(10);
  }, []);

  return (
    <div className="ko-wrap">
      {/* Badge */}
      <div className="ko-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 17h-2v-2h2Zm0-4h-2V7h2Z" />
        </svg>
        <span>Intervue Poll</span>
      </div>

      {/* Content */}
      <div className="ko-content">
        <h1 className="ko-title">You've been Kicked out !</h1>
        <p className="ko-description">
          Looks like the teacher had removed you from the poll system .Please<br />
          Try again sometime.
        </p>
      </div>
    </div>
  );
};

export default KickedOut;