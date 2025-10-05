import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  setStudents,
  setCurrentQuestion,
  setResults,
  setPollStatus,
  setError,
  clearError,
} from "../store/slices/pollSlice";
import apiService from "../services/apiService";
import socketService from "../services/socketService";
import "./style/TeacherDashboard.css";

const TIMER_OPTS = [15, 30, 45, 60];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    teacherId, // using as teacherKey for now
    students = [],
    currentQuestion,
    results,
    status,
    isConnected,
    error,
  } = useSelector((s) => s.poll);

  // --- Create Question Form state (matches Figma) ---
  const [question, setQuestion] = useState("");
  const [timerSec, setTimerSec] = useState(60);
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const charCount = question.length;
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

  // --- Initial load + socket hooks ---
  useEffect(() => {
    if (!teacherId) {
      navigate("/");
      return;
    }

    loadPollData();

    const socket = socketService.get?.() || socketService.socket;
    if (!socket) return;

    const onAnswer = (data) => {
      // teacher screen: update results live
      dispatch(setResults(data.results));
    };
    const onAll = (data) => {
      dispatch(setResults(data.results));
      dispatch(setPollStatus("waiting"));
    };
    const onTimeUp = (data) => {
      dispatch(setResults(data.results));
      dispatch(setPollStatus("waiting"));
    };

    socket.on("answerSubmitted", onAnswer);
    socket.on("allStudentsAnswered", onAll);
    socket.on("questionTimeUp", onTimeUp);

    return () => {
      socket.off("answerSubmitted", onAnswer);
      socket.off("allStudentsAnswered", onAll);
      socket.off("questionTimeUp", onTimeUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPollData = async () => {
    try {
      const pollData = await apiService.getPoll();
      dispatch(setStudents(pollData.students || []));
      dispatch(setCurrentQuestion(pollData.currentQuestion || null));
      dispatch(setPollStatus(pollData.status || "waiting"));
    } catch (e) {
      dispatch(setError("Failed to load poll data"));
      // eslint-disable-next-line no-console
      console.error("Error loading poll:", e);
    }
  };

  // --- Form handlers ---
  const handleAddOption = () => {
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  };
  const handleRemoveOption = (idx) => {
    setOptions((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev
    );
  };
  const handleOptionText = (idx, val) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
    );
  };
  const handleIsCorrect = (idx, val) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, isCorrect: val } : o))
    );
  };

  const submitQuestion = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      dispatch(setError("Please enter your question"));
      return;
    }
    const cleanOptions = options
      .map((o) => ({ ...o, text: o.text.trim() }))
      .filter((o) => o.text);

    if (cleanOptions.length < 2) {
      dispatch(setError("Please provide at least 2 options"));
      return;
    }

    try {
      setIsSubmitting(true);
      dispatch(clearError());

      // Server currently expects only option texts (no correctness); safe transform:
      // const optionTexts = cleanOptions.map((o) => o.text);

      // teacherId used as teacherKey (per your current store shape)
      
      await apiService.addQuestion(question.trim(), cleanOptions,timerSec);

      // Reset form
      setQuestion("");
      setOptions([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ]);

      dispatch(setPollStatus("active"));
    } catch (err) {
      dispatch(setError(err?.message || "Failed to add question"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAskNew =
    status === "waiting" ||
    (status === "active" &&
      results &&
      results.totalAnswers === students.length);

  return (
    <div className="td-wrap">
      {/* Top bar: badge + heading + view history */}
      <div className="td-top">
        <div className="td-badge">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className="td-badge-icon"
            aria-hidden
          >
            <path
              fill="white"
              d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 17h-2v-2h2Zm0-4h-2V7h2Z"
            />
          </svg>
          <span>Intervue Poll</span>
        </div>

        <button type="button" className="td-history-btn">
          <span className="td-eye" aria-hidden>
            👁️
          </span>{" "}
          View Poll history
        </button>
      </div>

      <div className="td-hero">
        <h1>
          Let’s <span className="bold">Get Started</span>
        </h1>
        <p>
          you’ll have the ability to create and manage polls, ask questions, and
          monitor your students' responses in real-time.
        </p>
      </div>

      {/* Create Question */}
      <form className="td-create" onSubmit={submitQuestion}>
        <div className="td-row td-question-header">
          <label className="td-label">Enter your question</label>

          <div className="td-timer">
            <select
              value={timerSec}
              onChange={(e) => setTimerSec(Number(e.target.value))}
              aria-label="Time limit"
            >
              {TIMER_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s} seconds
                </option>
              ))}
            </select>
            <span className="td-caret">▼</span>
          </div>
        </div>

        <div className="td-textarea-wrap">
          <textarea
            maxLength={100}
            placeholder="Type your question…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="td-counter">{charCount}/100</div>
        </div>

        <div className="td-options-wrap">
          <div className="td-options-head">
            <span className="td-label">Edit Options</span>
            <span className="td-label">Is it Correct?</span>
          </div>

          <div className="td-options-list">
            {options.map((opt, idx) => (
              <div key={idx} className="td-option-row">
                <span className="td-chip">{idx + 1}</span>

                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionText(idx, e.target.value)}
                  placeholder="Option text"
                />

                <div className="td-radio">
                  <label>
                    <input
                      type="radio"
                      checked={opt.isCorrect === true}
                      onChange={() => handleIsCorrect(idx, true)}
                    />
                    <span>Yes</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={opt.isCorrect === false}
                      onChange={() => handleIsCorrect(idx, false)}
                    />
                    <span>No</span>
                  </label>
                </div>

                {options.length > 2 && (
                  <button
                    type="button"
                    className="td-remove"
                    onClick={() => handleRemoveOption(idx)}
                    aria-label="Remove option"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="td-add" onClick={handleAddOption}>
            + Add More option
          </button>
        </div>

        <div className="td-footer-cta">
          <button
            type="submit"
            className="td-ask"
            disabled={
              !canAskNew ||
              isSubmitting ||
              !question.trim() ||
              options.filter((o) => o.text.trim()).length < 2
            }
            title={
              !canAskNew
                ? "Wait until current question completes"
                : "Ask Question"
            }
          >
            {isSubmitting ? "Adding…" : "Ask Question"}
          </button>
        </div>
      </form>

      {/* Results Panel (matches second screen) */}
      {currentQuestion && results && (
        <>
          <h2 className="td-section-title">Question</h2>

          <div className="td-result-card">
            <div className="td-result-header">
              <div className="td-result-title">
                {currentQuestion?.question || "Current Question"}
              </div>
            </div>

            <div className="td-result-body">
              {(currentQuestion?.options || []).map((optText, idx) => {
                const pct = percentMap[optText] ?? 0;

                return (
                  <div key={idx} className="td-result-row">
                    <div
                      className="td-result-fill"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                    <span className="td-result-chip">{idx + 1}</span>
                    <span className="td-result-text">{optText}</span>
                    <span className="td-result-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="td-ask-new-wrap">
            <button
              type="button"
              className="td-ask-new"
              disabled={!canAskNew}
              onClick={() => {
                // focus question input to mirror "+ Ask a new question"
                const ta = document.querySelector(".td-textarea-wrap textarea");
                ta?.focus();
              }}
            >
              + Ask a new question
            </button>
          </div>
        </>
      )}

      {/* Status + Students (kept minimal; you can move into a side panel) */}
      <div className="td-status">
        <div className={`status-dot ${isConnected ? "ok" : "bad"}`} />
        <span>{isConnected ? "Connected" : "Disconnected"}</span>
        <span className="td-dot">•</span>
        <span>Students: {students.length}</span>
        <span className="td-dot">•</span>
        <span>Status: {status}</span>
      </div>

      {/* Floating chat bubble */}
      <button className="td-chat" aria-label="Open help chat">
        💬
      </button>

      {error && <div className="td-error">{error}</div>}
    </div>
  );
};

export default TeacherDashboard;
