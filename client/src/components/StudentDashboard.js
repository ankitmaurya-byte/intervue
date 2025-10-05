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
import './style/StudentDashboard.css';
import ChatWidget from './ChatWidget';

const formatTime = (s) => {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
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

  useEffect(() => {
    if (!studentId) {
      navigate('/');
      return;
    }

    const socket = socketService.socket || socketService.get?.();
    if (!socket) return;

    const onNewQ = (data) => {
      dispatch(setCurrentQuestion(data));
      dispatch(setPollStatus('active'));
      dispatch(updateTimer(data.timeLimit));
      setSelectedAnswer('');
      setHasAnswered(false);
      dispatch(clearError());
    };
    const onAnswer = (data) => dispatch(setResults(data.results));
    const onAll = (data) => {
      dispatch(setResults(data.results));
      dispatch(setPollStatus('waiting'));
    };
    const onTime = (data) => {
      dispatch(setResults(data.results));
      dispatch(setPollStatus('waiting'));
      dispatch(updateTimer(0));
    };

    socket.on('newQuestion', onNewQ);
    socket.on('answerSubmitted', onAnswer);
    socket.on('allStudentsAnswered', onAll);
    socket.on('questionTimeUp', onTime);

    return () => {
      socket.off('newQuestion', onNewQ);
      socket.off('answerSubmitted', onAnswer);
      socket.off('allStudentsAnswered', onAll);
      socket.off('questionTimeUp', onTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // countdown
  useEffect(() => {
    if (timer > 0 && status === 'active') {
      const t = setInterval(() => dispatch(updateTimer(timer - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [timer, status, dispatch]);

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || hasAnswered || status !== 'active') return;
    try {
      socketService.submitAnswer(studentId, currentQuestion.id, selectedAnswer);
      setHasAnswered(true);
      dispatch(clearError());
    } catch (e) {
      dispatch(setError('Failed to submit answer'));
      console.error(e);
    }
  };

  // percentages for results view
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

  const qNumber = 1; // change if you track index on the backend
  const disabled = status !== 'active' || timer <= 0 || hasAnswered || !selectedAnswer;

  const showResults =
    // show when user submitted OR time's up / teacher advanced
    (!!results && (hasAnswered || status !== 'active')) &&
    !!currentQuestion;

  return (
    <div className="sd-wrap">
      <div className="sd-top">
        <div className={`sd-dot ${isConnected ? 'ok' : 'bad'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        <span className="sd-sep">•</span>
        <span className="sd-name">{studentName}</span>
      </div>

      {/* Waiting initial */}
      {status === 'waiting' && !currentQuestion && (
        <div className="sd-wait">
          <h3>Waiting for the teacher to ask a question…</h3>
          <p>Stay connected and be ready!</p>
        </div>
      )}

      {/* Header */}
      {currentQuestion && (
        <div className="sd-headline">
          <span className="sd-qtitle">Question {qNumber}</span>
          <div className="sd-timer">
            <span className="sd-timer-icon" aria-hidden>⏱</span>
            <span className={`sd-timer-text ${timer <= 10 ? 'danger' : ''}`}>
              {formatTime(Math.max(timer, 0))}
            </span>
          </div>
        </div>
      )}

      {/* === Answering view === */}
      {currentQuestion && !showResults && (
        <>
          <div className="sd-card">
            <div className="sd-card-header">
              {currentQuestion.question}
            </div>

            <div className="sd-card-body">
              {(currentQuestion.options || []).map((opt, idx) => {
                const selected = selectedAnswer === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`sd-option ${selected ? 'selected' : ''}`}
                    onClick={() => setSelectedAnswer(opt)}
                    disabled={status !== 'active' || timer <= 0}
                  >
                    <span className="sd-chip">{idx + 1}</span>
                    <span className="sd-opt-text">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sd-submit-row">
            <button
              type="button"
              className="sd-submit"
              disabled={disabled}
              onClick={handleSubmitAnswer}
            >
              Submit
            </button>
          </div>
        </>
      )}

      {/* === Results view (after submit / time-up) === */}
      {currentQuestion && showResults && (
        <>
          <div className="sd-card sd-results">
            <div className="sd-card-header">
              {currentQuestion.question}
            </div>

            <div className="sd-result-body">
              {(currentQuestion.options || []).map((optText, idx) => {
                const pct = percentMap[optText] ?? 0;
                return (
                  <div key={idx} className="sd-result-row">
                    <div className="sd-result-fill" style={{ width: `${Math.max(pct, 0)}%` }} />
                    <span className="sd-result-chip">{idx + 1}</span>
                    <span className="sd-result-text">{optText}</span>
                    <span className="sd-result-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="sd-wait-next">Wait for the teacher to ask a new question..</p>
        </>
      )}

      {/* Chat */}
    <ChatWidget
  userType="student"
  studentId={studentId}
  name={studentName}
/>
      {error && <div className="sd-error">{error}</div>}

      <div className="sd-leave">
        <button className="sd-leave-btn" onClick={() => navigate('/')}>Leave Poll</button>
      </div>
    </div>
  );
};

export default StudentDashboard;
