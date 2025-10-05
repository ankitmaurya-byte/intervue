import React, { useEffect, useState } from "react";
import "./style/StudentEntry.css";
import apiService from "../services/apiService";
import { getTabId } from "../utils/localStorage";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setPollData } from "../store/slices/pollSlice";
import socketService from "../services/socketService";
import { isTabBannedServer } from "../utils/banUtils";

const StudentEntry = () => {
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  useEffect(() => {
    const checkBan = async () => {
      const { banned } = await isTabBannedServer();
      if (banned) {
        navigate("/kicked");
      }
    };

    checkBan();
  }, []);
  const handleJoinPoll = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    try {
      setIsJoining(true);
      setError("");

      const tabId = getTabId();

      // Server expects: { name, tabId, secretKey } at POST /api/poll/join
      const { studentId } = await apiService.joinPoll(name.trim(), tabId);

      // Save to store
      dispatch(
        setPollData({
          studentId,
          studentName: name.trim(),
          userType: "student",
          tabId,
        })
      );

      // Connect & join socket room with secret key
      socketService.connect();
      socketService.joinPoll("student", studentId, name.trim());

      // Route without  (single-room app)
      navigate("/student");
    } catch (err) {
      setError(err?.message || "Failed to join poll. Please try again.");
      console.error("Error joining poll:", err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="student-container">
      {/* Badge */}
      <div className="badge">
        <svg
          width="16"
          height="16"
          fill="white"
          viewBox="0 0 24 24"
          className="badge-icon"
        >
          <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 17h-2v-2h2Zm0-4h-2V7h2Z" />
        </svg>
        <span className="badge-text">Intervue Poll</span>
      </div>

      {/* Heading */}
      <div className="heading">
        <h1>
          Let’s <span className="bold">Get Started</span>
        </h1>
        <p>
          If you’re a student, you’ll be able to{" "}
          <span className="highlight">submit your answers</span>, participate in
          live polls, and see how your responses compare with your classmates.
        </p>
      </div>

      {/* Error */}
      {error && <div className="error">{error}</div>}

      {/* Input Section */}
      <form className="input-section" onSubmit={handleJoinPoll}>
        <label htmlFor="name">Enter your Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rahul Bajaj"
          disabled={isJoining}
        />

        {/* Continue Button */}
        <button
          type="submit"
          className="continue-btn"
          disabled={isJoining || !name.trim()}
        >
          {isJoining ? "Joining…" : "Continue"}
        </button>
      </form>
    </div>
  );
};

export default StudentEntry;
