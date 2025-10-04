import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setStudents, setCurrentQuestion, setResults, setPollStatus, setError, clearError } from '../store/slices/pollSlice';
import apiService from '../services/apiService';
import socketService from '../services/socketService';

const TeacherDashboard = () => {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { 
    teacherId, 
    students, 
    currentQuestion, 
    results, 
    status, 
    isConnected,
    error 
  } = useSelector(state => state.poll);

  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', '']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!teacherId) {
      navigate('/');
      return;
    }

    // Load initial poll data
    loadPollData();
    
    // Set up socket listeners
    const socket = socketService.socket;
    if (socket) {
      socket.on('answerSubmitted', (data) => {
        dispatch(setStudents(data.students || students));
        dispatch(setResults(data.results));
      });
      
      socket.on('allStudentsAnswered', (data) => {
        dispatch(setResults(data.results));
        dispatch(setPollStatus('waiting'));
      });
      
      socket.on('questionTimeUp', (data) => {
        dispatch(setResults(data.results));
        dispatch(setPollStatus('waiting'));
      });
    }

    return () => {
      if (socket) {
        socket.off('answerSubmitted');
        socket.off('allStudentsAnswered');
        socket.off('questionTimeUp');
      }
    };
  }, []);

  const loadPollData = async () => {
    try {
      const pollData = await apiService.getPoll(pollId);
      dispatch(setStudents(pollData.students));
      dispatch(setCurrentQuestion(pollData.currentQuestion));
      dispatch(setPollStatus(pollData.status));
    } catch (error) {
      dispatch(setError('Failed to load poll data'));
      console.error('Error loading poll:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuestionForm(prev => ({
      ...prev,
      [name]: value
    }));
    dispatch(clearError());
  };

  const handleOptionChange = (index, value) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  };

  const addOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    if (questionForm.options.length > 2) {
      setQuestionForm(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    
    if (!questionForm.question.trim()) {
      dispatch(setError('Please enter a question'));
      return;
    }

    const validOptions = questionForm.options.filter(option => option.trim());
    if (validOptions.length < 2) {
      dispatch(setError('Please provide at least 2 options'));
      return;
    }

    try {
      setIsSubmitting(true);
      dispatch(clearError());
      
      await apiService.addQuestion(pollId, questionForm.question, validOptions, teacherId);
      
      setQuestionForm({
        question: '',
        options: ['', '', '', '']
      });
      
      dispatch(setPollStatus('active'));
    } catch (error) {
      dispatch(setError(error.message || 'Failed to add question'));
      console.error('Error adding question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAddQuestion = status === 'waiting' || (status === 'active' && results && results.totalAnswers === students.length);

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Teacher Dashboard</h1>
          <div>
            <span className={`status-indicator ${isConnected ? 'answered' : 'pending'}`}></span>
            <span style={{ marginLeft: '8px' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <p><strong>Poll ID:</strong> {pollId}</p>
        <p><strong>Students Connected:</strong> {students.length}</p>
        <p><strong>Status:</strong> {status}</p>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {currentQuestion && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Current Question</h3>
            <p><strong>{currentQuestion.question}</strong></p>
            <div>
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="option-button">
                  {option}
                </div>
              ))}
            </div>
            
            {results && (
              <div className="results">
                <h4>Live Results</h4>
                <p>Answers: {results.totalAnswers} / {students.length}</p>
                {Object.entries(results.answerCounts).map(([option, count]) => (
                  <div key={option} className="result-item">
                    <span>{option}</span>
                    <div className="result-bar">
                      <div 
                        className="result-fill" 
                        style={{ 
                          width: `${(count / results.totalAnswers) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canAddQuestion && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Add New Question</h3>
            <form onSubmit={handleSubmitQuestion}>
              <div className="form-group">
                <label>Question:</label>
                <input
                  type="text"
                  name="question"
                  value={questionForm.question}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Enter your question"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="form-group">
                <label>Options:</label>
                {questionForm.options.map((option, index) => (
                  <div key={index} style={{ display: 'flex', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="form-control"
                      placeholder={`Option ${index + 1}`}
                      disabled={isSubmitting}
                      style={{ marginRight: '10px' }}
                    />
                    {questionForm.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="btn btn-danger"
                        disabled={isSubmitting}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Add Option
                </button>
              </div>
              
              <button
                type="submit"
                className="btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Question'}
              </button>
            </form>
          </div>
        )}

        <div className="student-list">
          <h3>Connected Students ({students.length})</h3>
          {students.length === 0 ? (
            <p>No students connected yet</p>
          ) : (
            students.map((student, index) => (
              <div key={index} className="student-item">
                <span>{student.name}</span>
                <div className="status-indicator answered"></div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
