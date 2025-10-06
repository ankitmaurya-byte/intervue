import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import socketService from "../services/socketService";
import { setStudents } from "../store/slices/pollSlice";
import { store } from "../store/store";
import { banTabLocally } from "../utils/banUtils";
import "./style/ChatWidget.css";

const ChatWidget = ({ userType, studentId, name }) => {
  const { students = [] } = useSelector((s) => s.poll);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll to latest message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, open, tab]);

  // Socket event handlers
  useEffect(() => {
    const socket = socketService.socket || socketService.get?.();
    if (!socket) return;

    const onJoined = ({ userType: joinedType, name: joinedName, id }) => {
      setMessages((m) => [
        ...m,
        {
          system: true,
          text: `${joinedName} joined as ${joinedType}`,
          ts: Date.now(),
        },
      ]);
    };

    const onList = ({ students: updatedStudents }) => {
      store.dispatch(setStudents(updatedStudents));
    };

    const onMsg = (payload) => {
      setMessages((m) => [...m, payload]);
    };

    const onKicked = ({ studentId: kickedId, name: kickedName }) => {
      setMessages((m) => [
        ...m,
        {
          system: true,
          text: `${kickedName} was removed by the teacher`,
          ts: Date.now(),
        },
      ]);
    };

    const onForce = ({ reason }) => {
      setMessages((m) => [
        ...m,
        {
          system: true,
          text: reason || "Removed by the teacher",
          ts: Date.now(),
        },
      ]);
      
      banTabLocally(10);
      setTimeout(() => {
        navigate("/kicked");
      }, 1000);
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
  }, [navigate]);

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
    if (userType !== "teacher") return;
    socketService.kickStudent(sid);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  };

  return (
    <>
      {/* Floating chat button */}
      <button
        className="td-chat"
        aria-label="Open chat"
        onClick={() => setOpen((v) => !v)}
      >
        💬
      </button>

      {/* Chat panel */}
      {open && (
        <div className="cw-panel" role="dialog" aria-label="Class chat">
          {/* Tabs */}
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

          {/* Chat view */}
          {tab === "chat" ? (
            <>
              <div className="cw-body" ref={listRef}>
                {messages.length === 0 && (
                  <div className="cw-system">
                    No messages yet. Start a conversation!
                  </div>
                )}
                
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
                        {m.userType === "teacher"
                          ? "Teacher"
                          : m.name || "User"}
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

              {/* Input area */}
              <div className="cw-input">
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  maxLength={500}
                />
                <button onClick={sendMsg} disabled={!input.trim()}>
                  Send
                </button>
              </div>
            </>
          ) : (
            /* Participants view */
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
        </div>
      )}
    </>
  );
};

export default ChatWidget;