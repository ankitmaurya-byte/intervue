import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPollData, resetPoll } from '../store/slices/pollSlice';
import { setSocket, setConnectionStatus } from '../store/slices/socketSlice';
import apiService from '../services/apiService';
import socketService from '../services/socketService';
import { getTabId } from '../utils/localStorage';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinData, setJoinData] = useState({ pollId: '', studentName: '' });
  const [error, setError] = useState('');

  const handleCreatePoll = async () => {
    try {
     
      setIsCreating(true);
      setError('');
      
      const { pollId, teacherId } = await apiService.createPoll();
      
      dispatch(setPollData({
        pollId,
        teacherId,
        userType: 'teacher',
        tabId: getTabId()
      }));
      
      // Connect to socket
      socketService.connect();
      socketService.joinPoll(pollId, 'teacher');
      
      navigate(`/teacher/${pollId}`);
    } catch (error) {
      setError('Failed to create poll. Please try again.');
      console.error('Error creating poll:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinPoll = async (e) => {
    e.preventDefault();
    
    if (!joinData.pollId.trim() || !joinData.studentName.trim()) {
      setError('Please enter both poll ID and your name');
      return;
    }

    try {
      setIsJoining(true);
      setError('');
      
      const tabId = getTabId();
      const { studentId } = await apiService.joinPoll(
        joinData.pollId.trim(),
        joinData.studentName.trim(),
        tabId
      );
      
      dispatch(setPollData({
        pollId: joinData.pollId.trim(),
        studentId,
        studentName: joinData.studentName.trim(),
        userType: 'student',
        tabId
      }));
      
      // Connect to socket
      socketService.connect();
      socketService.joinPoll(joinData.pollId.trim(), 'student', studentId);
      
      navigate(`/student/${joinData.pollId.trim()}`);
    } catch (error) {
      setError(error.message || 'Failed to join poll. Please check the poll ID and try again.');
      console.error('Error joining poll:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setJoinData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>InterVue2</h1>
        <p>Real-time Polling for Teachers and Students</p>
      </div>

      <div className="persona-selector">
        <div className="persona-card" onClick={handleCreatePoll}>
          <div className="persona-icon teacher-icon">👨‍🏫</div>
          <h2>Teacher</h2>
          <p>Create polls, ask questions, and view live results from your students</p>
          <button 
            className="btn" 
            disabled={isCreating}
            onClick={handleCreatePoll}
          >
            {isCreating ? 'Creating...' : 'Create New Poll'}
          </button>
        </div>

        <div className="persona-card">
          <div className="persona-icon student-icon">👨‍🎓</div>
          <h2>Student</h2>
          <p>Join a poll with your name and answer questions in real-time</p>
          <form onSubmit={handleJoinPoll}>
            <div className="form-group">
              <input
                type="text"
                name="pollId"
                placeholder="Enter Poll ID"
                value={joinData.pollId}
                onChange={handleInputChange}
                className="form-control"
                disabled={isJoining}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="studentName"
                placeholder="Enter Your Name"
                value={joinData.studentName}
                onChange={handleInputChange}
                className="form-control"
                disabled={isJoining}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-success"
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Poll'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}
    </div>
  );
};

export default HomePage;
