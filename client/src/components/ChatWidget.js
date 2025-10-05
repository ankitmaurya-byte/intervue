import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import socketService from "../services/socketService";
import "./style/ChatWidget.css";
import { setStudents } from "../store/slices/pollSlice";
import { store } from "../store/store";
import { banTabId, banTabLocally } from "../utils/banUtils";
import { useNavigate } from "react-router-dom";
const ChatWidget = ({ userType, studentId, name }) => {
  const { students = [] } = useSelector((s) => s.poll);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat"); // 'chat' | 'participants'
  const [messages, setMessages] = useState([
    // sample system line when opening
    // { system: true, text: 'Welcome to class chat', ts: Date.now() }
  ]);
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  // auto-scroll to latest
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, tab]);

  useEffect(() => {
    const socket = socketService.socket || socketService.get?.();
    if (!socket) return;

    const onJoined = ({ userType, name, id, students }) => {
      // show system line and optionally update participants via your existing store logic
      setMessages((m) => [
        ...m,
        { system: true, text: `${name} joined as ${userType}`, ts: Date.now() },
      ]);
    };

    const onList = ({ students }) => {
      // your Redux already updates students from elsewhere;
      // if needed, you can dispatch here. We just keep UI in sync via selector.
      store.dispatch(setStudents(students));
    };

    const onMsg = (payload) => {
      setMessages((m) => [...m, payload]);
    };

    const onKicked = ({ studentId, name }) => {
      setMessages((m) => [
        ...m,
        {
          system: true,
          text: `${name} was removed by the teacher`,
          ts: Date.now(),
        },
      ]);
      // store.dispatch(setStudents(students.filter(s => s.id !== studentId)));
    };

    const onForce = ({ reason }) => {
      // for the kicked student: show toast + redirect
      setMessages((m) => [
        ...m,
        {
          system: true,
          text: reason || "Removed by the teacher",
          ts: Date.now(),
        },
      ]);
      // optional: navigate away after short delay
      // setTimeout(() => navigate("/kicked"), 1200);
      banTabLocally(10); // local mirror; server already banned
  navigate('/kicked');
    };
   
    socket.on("userJoined", onJoined);
    socket.on("participants:list", onList);
    socket.on("chat:message", onMsg);
    socket.on("participantKicked", onKicked);
    socket.on("forceDisconnect", onForce);

    return () => {
      socket.off("userJoined", onJoined);
      socket.off("participants:list", onList);
      socket.off("chat:message", onMsg);
      socket.off("participantKicked", onKicked);
      socket.off("forceDisconnect", onForce);
    };
  }, []);

  const sendMsg = () => {
    const text = input.trim();
    if (!text) return;
    const payload = {
      userId: studentId || "teacher",
      userType,
      name: name || "Teacher",
      text,
    };
    socketService.sendChatMessage(payload);
    setInput("");
  };

  const handleKick = (sid) => {
    console.log("handleKick", sid);
    if (userType !== "teacher") return;
    socketService.kickStudent(sid);
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="td-chat"
        aria-label="Open help chat"
        onClick={() => setOpen((v) => !v)}
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div className="cw-panel" role="dialog" aria-label="Class chat">
          <div className="cw-tabs">
            <button
              className={`cw-tab ${tab === "chat" ? "active" : ""}`}
              onClick={() => setTab("chat")}
            >
              Chat
            </button>
            <button
              className={`cw-tab ${tab === "participants" ? "active" : ""}`}
              onClick={() => setTab("participants")}
            >
              Participants
            </button>
          </div>

          <div className="cw-divider" />

          {tab === "chat" ? (
            <div className="cw-body" ref={listRef}>
              {messages.map((m, i) =>
                m.system ? (
                  <div key={i} className="cw-system">
                    {m.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`cw-msg ${
                      m.userId === studentId && userType !== "teacher"
                        ? "mine"
                        : userType === "teacher" && m.userType === "teacher"
                        ? "mine"
                        : ""
                    }`}
                  >
                    <div
                      className={`cw-msg-user ${
                        m.userType === "teacher" ? "teacher" : ""
                      }`}
                    >
                      {m.userType === "teacher" ? "Teacher" : m.name || "User"}
                    </div>
                    <div
                      className={`cw-bubble ${
                        m.userType === "teacher" ? "teacher" : "student"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="cw-body">
              <div className="cw-part-head">
                <span>Name</span>
                {userType === "teacher" && <span>Action</span>}
              </div>

              {students.length === 0 && (
                <div className="cw-empty">No students yet</div>
              )}

              {students.map((s) => (
                <div key={s.studentId || s.id} className="cw-part-row">
                  <span className="cw-name">{s.name}</span>
                  {userType === "teacher" && (
                    <button
                      className="cw-kick"
                      onClick={() => handleKick(s.studentId || s.id)}
                    >
                      Kick out
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "chat" && (
            <div className="cw-input">
              <input
                type="text"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              />
              <button onClick={sendMsg}>Send</button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
