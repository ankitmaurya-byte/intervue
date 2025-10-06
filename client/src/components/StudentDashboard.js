import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCurrentQuestion,
  setResults,
  setPollStatus,
  updateTimer,
  setError,
  clearError,
} from '../store/slices/pollSlice';
import socketService from '../services/socketService';
import ChatWidget from './ChatWidget';
import './style/StudentDashboard.css';

const formatTime = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const StudentDashboard = () => {
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
    error,
  } = useSelector((state) => state.poll);

  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  // Socket event handlers
  useEffect(() => {
    if (!studentId) {
      navigate('/');
      return;
    }

    const socket = socketService.socket || socketService.get?.();
    if (!socket) return;

    const onNewQuestion = (data) => {
      dispatch(setCurrentQuestion(data));
      dispatch(setPollStatus('active'));
      dispatch(updateTimer(data.timeLimit));
      setSelectedAnswer('');
      setHasAnswered(false);
      dispatch(clearError());
    };

    const onAnswerSubmitted = (data) => {
      dispatch(setResults(data.results));
    };

    const onAllStudentsAnswered = (data) => {
      dispatch(setResults(data.results));
      dispatch(setPollStatus('waiting'));
    };

    const onQuestionTimeUp = (data) => {
      dispatch(setResults(data.results));
      dispatch(setPollStatus('waiting'));
      dispatch(updateTimer(0));
    };

    socket.on('newQuestion', onNewQuestion);
    socket.on('answerSubmitted', onAnswerSubmitted);
    socket.on('allStudentsAnswered', onAllStudentsAnswered);
    socket.on('questionTimeUp', onQuestionTimeUp);

    return () => {
      socket.off('newQuestion', onNewQuestion);
      socket.off('answerSubmitted', onAnswerSubmitted);
      socket.off('allStudentsAnswered', onAllStudentsAnswered);
      socket.off('questionTimeUp', onQuestionTimeUp);
    };
  }, [studentId, navigate, dispatch]);

  // Countdown timer
  useEffect(() => {
    if (timer > 0 && status === 'active') {
      const interval = setInterval(() => {
        dispatch(updateTimer(timer - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, status, dispatch]);

  // Submit answer handler
  const handleSubmitAnswer = () => {
    if (!selectedAnswer || hasAnswered || status !== 'active') return;
    
    try {
      socketService.submitAnswer(studentId, currentQuestion.id, selectedAnswer);
      setHasAnswered(true);
      dispatch(clearError());
    } catch (error) {
      dispatch(setError('Failed to submit answer'));
      console.error('Submit error:', error);
    }
  };

  // Calculate percentages for results view
  const percentMap = useMemo(() => {
    if (!results || !results.totalAnswers) return {};
    
    const total = results.totalAnswers || 1;
    const counts = results.answerCounts || {};
    const map = {};
    
    Object.keys(counts).forEach((optText) => {
      map[optText] = Math.round((counts[optText] / total) * 100);
    });
    
    return map;
  }, [results]);

  const questionNumber = 1; // You can track this from backend if needed
  const isDisabled = status !== 'active' || timer <= 0 || hasAnswered || !selectedAnswer;

  const showResults =
    (!!results && (hasAnswered || status !== 'active')) && !!currentQuestion;

  return (
    <div className="sd-wrap">
      {/* Status bar */}
      <div className="sd-top">
        <div className={`sd-dot ${isConnected ? 'ok' : 'bad'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        <span className="sd-sep">•</span>
        <span className="sd-name">{studentName}</span>
      </div>

      {/* Waiting for question */}
      {status === 'waiting' && !currentQuestion && (
        <div className="sd-wait">
          <h3>Waiting for the teacher to ask a question…</h3>
          <p>Stay connected and be ready!</p>
        </div>
      )}

      {/* Question header */}
      {currentQuestion && (
        <div className="sd-headline">
          <span className="sd-qtitle">Question {questionNumber}</span>
          <div className="sd-timer">
            <span className="sd-timer-icon" aria-hidden>⏱</span>
            <span className={`sd-timer-text ${timer <= 10 ? 'danger' : ''}`}>
              {formatTime(Math.max(timer, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Answering view */}
      {currentQuestion && !showResults && (
        <>
          <div className="sd-card">
            <div className="sd-card-header">
              {currentQuestion.question}
            </div>

            <div className="sd-card-body">
              {(currentQuestion.options || []).map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isOptionDisabled = status !== 'active' || timer <= 0;
                
                return (
                  <button
                    key={index}
                    type="button"
                    className={`sd-option ${isSelected ? 'selected' : ''} ${
                      isOptionDisabled ? 'disabled' : ''
                    }`}
                    onClick={() => !isOptionDisabled && setSelectedAnswer(option)}
                    disabled={isOptionDisabled}
                  >
                    <span className="sd-chip">{index + 1}</span>
                    <span className="sd-opt-text">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sd-submit-row">
            <button
              type="button"
              className="sd-submit"
              disabled={isDisabled}
              onClick={handleSubmitAnswer}
            >
              Submit
            </button>
          </div>
        </>
      )}

      {/* Results view */}
      {currentQuestion && showResults && (
        <>
          <div className="sd-card sd-results">
            <div className="sd-card-header">
              {currentQuestion.question}
            </div>

            <div className="sd-result-body">
              {(currentQuestion.options || []).map((optionText, index) => {
                const percentage = percentMap[optionText] ?? 0;
                
                return (
                  <div key={index} className="sd-result-row">
                    <div 
                      className="sd-result-fill" 
                      style={{ width: `${Math.max(percentage, 0)}%` }} 
                    />
                    <span className="sd-result-chip">{index + 1}</span>
                    <span className="sd-result-text">{optionText}</span>
                    <span className="sd-result-pct">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="sd-wait-next">
            Wait for the teacher to ask a new question..
          </p>
        </>
      )}

      {/* Chat Widget */}
      <ChatWidget
        userType="student"
        studentId={studentId}
        name={studentName}
      />

      {/* Error message */}
      {error && <div className="sd-error">{error}</div>}

      {/* Leave poll button */}
      <div className="sd-leave">
        <button 
          className="sd-leave-btn" 
          onClick={() => navigate('/')}
        >
          Leave Poll
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;