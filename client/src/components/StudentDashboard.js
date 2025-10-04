import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentQuestion, setResults, setPollStatus, updateTimer, setError, clearError } from '../store/slices/pollSlice';
import socketService from '../services/socketService';

const StudentDashboard = () => {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { 
    studentId, 
    studentName, 
    currentQuestion, 
    results, 
    status, 
    timer,
    isConnected,
    error 
  } = useSelector(state => state.poll);

  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    if (!studentId) {
      navigate('/');
      return;
    }

    // Set up socket listeners
    const socket = socketService.socket;
    if (socket) {
      socket.on('newQuestion', (data) => {
        dispatch(setCurrentQuestion(data));
        dispatch(setPollStatus('active'));
        dispatch(updateTimer(data.timeLimit));
        setSelectedAnswer('');
        setHasAnswered(false);
        dispatch(clearError());
      });
      
      socket.on('answerSubmitted', (data) => {
        dispatch(setResults(data.results));
      });
      
      socket.on('allStudentsAnswered', (data) => {
        dispatch(setResults(data.results));
        dispatch(setPollStatus('waiting'));
      });
      
      socket.on('questionTimeUp', (data) => {
        dispatch(setResults(data.results));
        dispatch(setPollStatus('waiting'));
        dispatch(updateTimer(0));
      });
    }

    return () => {
      if (socket) {
        socket.off('newQuestion');
        socket.off('answerSubmitted');
        socket.off('allStudentsAnswered');
        socket.off('questionTimeUp');
      }
    };
  }, [pollId, studentId, navigate, dispatch]);

  // Timer countdown effect
  useEffect(() => {
    if (timer > 0 && status === 'active') {
      const interval = setInterval(() => {
        dispatch(updateTimer(timer - 1));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timer, status, dispatch]);

  const handleAnswerSelect = (answer) => {
    if (hasAnswered || status !== 'active') return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || hasAnswered || status !== 'active') return;

    try {
      socketService.submitAnswer(pollId, studentId, currentQuestion.id, selectedAnswer);
      setHasAnswered(true);
      dispatch(clearError());
    } catch (error) {
      dispatch(setError('Failed to submit answer'));
      console.error('Error submitting answer:', error);
    }
  };

  const getTimerColor = () => {
    if (timer > 30) return '#28a745';
    if (timer > 10) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Student Dashboard</h1>
          <div>
            <span className={`status-indicator ${isConnected ? 'answered' : 'pending'}`}></span>
            <span style={{ marginLeft: '8px' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <p><strong>Poll ID:</strong> {pollId}</p>
        <p><strong>Your Name:</strong> {studentName}</p>
        <p><strong>Status:</strong> {status}</p>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {status === 'waiting' && !currentQuestion && (
          <div className="loading">
            <h3>Waiting for the teacher to ask a question...</h3>
            <p>Stay connected and ready to answer!</p>
          </div>
        )}

        {currentQuestion && status === 'active' && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Question</h3>
            <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
              <strong>{currentQuestion.question}</strong>
            </p>
            
            {timer > 0 && (
              <div className="timer" style={{ color: getTimerColor() }}>
                Time remaining: {timer}s
              </div>
            )}
            
            {!hasAnswered ? (
              <div>
                <h4>Select your answer:</h4>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-button ${selectedAnswer === option ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={timer <= 0}
                  >
                    {option}
                  </button>
                ))}
                
                {selectedAnswer && timer > 0 && (
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      className="btn btn-success"
                      onClick={handleSubmitAnswer}
                    >
                      Submit Answer
                    </button>
                  </div>
                )}
                
                {timer <= 0 && !hasAnswered && (
                  <div className="error" style={{ textAlign: 'center', marginTop: '20px' }}>
                    Time's up! You can no longer submit an answer.
                  </div>
                )}
              </div>
            ) : (
              <div className="success" style={{ textAlign: 'center' }}>
                <h4>Answer Submitted!</h4>
                <p>You answered: <strong>{selectedAnswer}</strong></p>
                <p>Waiting for other students to answer...</p>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Results</h3>
            <p>Total answers: {results.totalAnswers} / {results.totalStudents}</p>
            
            <div className="results">
              {Object.entries(results.answerCounts).map(([option, count]) => (
                <div key={option} className="result-item">
                  <span>{option}</span>
                  <div className="result-bar">
                    <div 
                      className="result-fill" 
                      style={{ 
                        width: `${(count / results.totalAnswers) * 100}%`,
                        backgroundColor: selectedAnswer === option ? '#28a745' : '#667eea'
                      }}
                    ></div>
                  </div>
                  <span>{count}</span>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <h4>Student Answers:</h4>
              {results.studentAnswers.map((studentAnswer, index) => (
                <div key={index} className="student-item">
                  <span>{studentAnswer.studentName}</span>
                  <span style={{ 
                    color: studentAnswer.studentId === studentId ? '#28a745' : '#666',
                    fontWeight: studentAnswer.studentId === studentId ? 'bold' : 'normal'
                  }}>
                    {studentAnswer.answer}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Leave Poll
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
