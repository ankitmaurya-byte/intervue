import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setPollData } from "../store/slices/pollSlice";
import apiService from "../services/apiService";
import socketService from "../services/socketService";
import { getTabId } from "../utils/localStorage";
import "./style/HomePage.css";
import { isTabBanned } from "../utils/banUtils";

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedRole, setSelectedRole] = useState(null); // "student" | "teacher"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isTabBanned()) {
    navigate("/kicked");
    return null;
  }

  const handleCreatePoll = async () => {
    try {
      setLoading(true);
      setError("");

      const { teacherId } = await apiService.createPoll();

      dispatch(
        setPollData({
          teacherId,
          userType: "teacher",
          tabId: getTabId(),
        })
      );

      socketService.connect();
      socketService.joinPoll("teacher");
      navigate(`/teacher`);
    } catch (e) {
      console.error(e);
      setError("Failed to create poll. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedRole || loading) return;
    if (selectedRole === "teacher") {
      handleCreatePoll();
    } else {
      // Student path – go to your join screen (enter Poll ID + Name)
      navigate("/student/joinpoll");
    }
  };

  return (
    <main className="lp-root">
      {/* Top badge */}
      <div className="lp-badge" role="status" aria-label="Intervue Poll">
        <svg
          className="lp-badge-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2l1.6 3.9L18 7.4l-3 3 0.7 4.2L12 12.8 8.3 14.6 9 10.4 6 7.4l4.4-1.5L12 2z"
            fill="white"
          />
        </svg>
        <span>Intervue Poll</span>
      </div>

      {/* Heading */}
      <section className="lp-head">
        <h1 className="lp-title">
          Welcome to the{" "}
          <span className="lp-title-strong">Live Polling System</span>
        </h1>
        <p className="lp-subtitle">
          Please select the role that best describes you to begin using the live
          polling system
        </p>
      </section>

      {/* Cards */}
      <section
        className="lp-cards"
        role="listbox"
        aria-label="Choose your role"
      >
        <button
          type="button"
          role="option"
          aria-selected={selectedRole === "student"}
          onClick={() => setSelectedRole("student")}
          className={`lp-card lp-card--outlined ${
            selectedRole === "student" ? "is-selected" : ""
          }`}
        >
          <h3 className="lp-card-title">I’m a Student</h3>
          <p className="lp-card-desc">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry
          </p>
        </button>

        <button
          type="button"
          role="option"
          aria-selected={selectedRole === "teacher"}
          onClick={() => setSelectedRole("teacher")}
          className={`lp-card lp-card--outlined ${
            selectedRole === "teacher" ? "is-selected" : ""
          }`}
        >
          <h3 className="lp-card-title">I’m a Teacher</h3>
          <p className="lp-card-desc">
            Submit answers and view live poll results in real-time.
          </p>
        </button>
      </section>

      {/* Continue */}
      <div className="lp-cta-wrap">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className="lp-cta"
        >
          {loading ? "Please wait…" : "Continue"}
        </button>
      </div>

      {error ? <div className="lp-error">{error}</div> : null}
    </main>
  );
};

export default HomePage;
