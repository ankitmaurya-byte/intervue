const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  path: '/socket.io',
  cors: {
    origin: [process.env.FRONTEND_URL || "http://localhost:3000"], // Your Vercel FE domain
    methods: ['GET', 'POST'],
    credentials: false,
  },
});


app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
}

/** ---------------- Keys & Single Room ---------------- **/
const ROOM_KEY = process.env.ROOM_KEY || "default-room"; //
/** ---------------- Single-poll storage ---------------- **/
let poll = null; // holds the single Poll instance (or null if none created)
let pollTimer = null; // holds the single timer (or null if none running)
const studentIdToSocketId = new Map();
const socketIdToStudentId = new Map();
const bannedTabs = new Map(); // tabId -> expiryTs (ms)
function addBan(tabId, minutes = 10) {
    if (!tabId) return;
    const expiresAt = Date.now() + minutes * 60 * 1000;
    bannedTabs.set(tabId, expiresAt);
  }

 function isBanned(tabId) {
    if (!tabId) return false;
    const exp = bannedTabs.get(tabId);
    if (!exp) return false;
    if (Date.now() > exp) {
      bannedTabs.delete(tabId);
      return false;
    }
    return true;
  }

 function getBanExpiry(tabId) {
    const exp = bannedTabs.get(tabId);
    if (!exp) return null;
    if (Date.now() > exp) {
      bannedTabs.delete(tabId);
      return null;
    }
    return exp;
  }
/** ---------------- Data models ---------------- **/
class Poll {
  constructor(teacherId) {
    this.id = uuidv4(); // internal id (not exposed/required by clients)
    this.teacherId = teacherId;
    this.students = new Map(); // studentId -> { name, tabId, hasAnswered }
    this.currentQuestion = null;

    this.questions = [];
    this.results = new Map(); // questionId -> { answers: Map, totalAnswers: number }
    this.status = "waiting"; // waiting, active, completed
    this.createdAt = new Date();
  }

  addStudent(studentId, name, tabId) {
    this.students.set(studentId, { name, tabId, hasAnswered: false });
  }

  addQuestion(question) {
    const questionId = uuidv4();
    this.questions.push({ id: questionId, ...question });
    this.results.set(questionId, { answers: new Map(), totalAnswers: 0 });
    return questionId;
  }
  
  submitAnswer(studentId, questionId, answer) {
    if (!this.results.has(questionId)) return false;

    const student = this.students.get(studentId);
    if (!student) return false;

    const result = this.results.get(questionId);
    if (result.answers.has(studentId)) return false; // prevent double answers

    result.answers.set(studentId, answer);
    result.totalAnswers++;
    student.hasAnswered = true;

    return true;
  }

  canProceedToNext() {
    if (!this.currentQuestion) return false;
    const questionId = this.currentQuestion.id;
    const result = this.results.get(questionId);
    return result.totalAnswers === this.students.size;
  }

  getQuestionResults(questionId) {
    const result = this.results.get(questionId);
    if (!result) return null;

    const answerCounts = {};
    result.answers.forEach((answer) => {
      answerCounts[answer] = (answerCounts[answer] || 0) + 1;
    });

    return {
      questionId,
      totalAnswers: result.totalAnswers,
      totalStudents: this.students.size,
      answerCounts,
      studentAnswers: Array.from(result.answers.entries()).map(
        ([studentId, answer]) => ({
          studentId,
          studentName: this.students.get(studentId)?.name,
          answer,
        })
      ),
    };
  }
}

/** ---------------- REST API Routes (no ) ---------------- **/

// Create (or reset) the single poll
app.post("/api/poll", (req, res) => {
  const teacherId = uuidv4();
  poll = new Poll(teacherId);

  // Clear any stray timer when creating a fresh poll
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  res.json({
    teacherId,
  });
});

// Get current poll
app.get("/api/poll", (req, res) => {
  if (!poll) {
    return res.status(404).json({ error: "Poll not created yet" });
  }

  res.json({
    id: poll.id,
    status: poll.status,
    students: Array.from(poll.students.values()),
    currentQuestion: poll.currentQuestion,
    questions: poll.questions,
  });
});

// Student Join (requires secret room key)
app.post("/api/poll/join", (req, res) => {
  if (!poll) {
    return res.status(404).json({ error: "Poll not created yet" });
  }

  const { name, tabId } = req.body;
  if (!name || !tabId) {
    return res
      .status(400)
      .json({ error: "name, tabId and secretKey are required" });
  }
  if (isBanned(tabId)) {
    return res.status(403).json({
      error: "You are temporarily banned from joining.",
      bannedUntil: getBanExpiry(tabId),
    });
  }
  // Prevent same tab joining twice
  const existingStudent = Array.from(poll.students.values()).find(
    (s) => s.tabId === tabId
  );
  if (existingStudent) {
    return res
      .status(400)
      .json({ error: "This tab is already connected to the poll" });
  }

  const studentId = uuidv4();
  poll.addStudent(studentId, name, tabId);
  res.json({ studentId });
});

app.post("/api/poll/questions", (req, res) => {
  if (!poll) {
    return res.status(404).json({ error: "Poll not created yet" });
  }

  const { question, options, timerSec } = req.body;

  if (!question || !Array.isArray(options) || options.length === 0) {
    return res.status(400).json({ error: "Invalid question payload" });
  }

  if (poll.status === "active" && !poll.canProceedToNext()) {
    return res.status(400).json({
      error:
        "Cannot add new question until current question is answered by all students",
    });
  }

  const questionId = poll.addQuestion({ question, options });
  const optiontexts = options.map((opt) => opt.text);
  poll.currentQuestion = { id: questionId, question, options: optiontexts };
  poll.status = "active";

  // Clear previous timer
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  // Set 60-second timer
  pollTimer = setTimeout(() => {
    if (
      poll &&
      poll.status === "active" &&
      poll.currentQuestion?.id === questionId
    ) {
      io.to(ROOM_KEY).emit("questionTimeUp", {
        questionId: poll.currentQuestion.id,
        results: poll.getQuestionResults(poll.currentQuestion.id),
      });
      poll.status = "waiting";
      poll.currentQuestion = null;
    }
    pollTimer = null;
  }, timerSec * 1000);

  // Broadcast new question to all students in the room
  io.to(ROOM_KEY).emit("newQuestion", {
    ...poll.currentQuestion,
    timeLimit: timerSec,
  });

  res.json({ questionId });
});
app.get("/api/poll/ban/check", (req, res) => {
  const { tabId } = req.query;
  if (!tabId) {
    return res.status(400).json({ error: "tabId is required" });
  }

  const expiry = getBanExpiry(tabId);

  return res.json({
    banned: !!expiry,
    bannedUntil: expiry || null,
  });
});

function broadcastStudents() {
  if (!poll) return;
  const students = Array.from(poll.students.entries()).map(([id, s]) => ({
    studentId: id,
    name: s.name,
  }));
  io.to(ROOM_KEY).emit("participants:list", { students });
}
/** ---------------- Socket.io (no ) ---------------- **/
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Clients must provide the room secret to join the room
  socket.on("joinPoll", ({ userType, studentId, name }) => {
    if (!poll) return;

    socket.join(ROOM_KEY);

    // Map student socket for kicks, only for students having an id
    if (userType === "student" && studentId) {
      studentIdToSocketId.set(studentId, socket.id);
      socketIdToStudentId.set(socket.id, studentId);
    }

    // Acknowledge to the joiner
    socket.emit("pollJoined", { userType, studentId, name });

    // Broadcast joined event + updated participants list
    const students = Array.from(poll.students.entries()).map(([id, s]) => ({
      studentId: id,
      name: s.name,
    }));

    io.to(ROOM_KEY).emit("userJoined", {
      userType,
      name: name || "Unknown",
      id: studentId || socket.id,
      students,
    });

    broadcastStudents();
  });

  // --- Chat message: relay to room ---
  socket.on("chat:message", (payload) => {
    // payload: { userId, userType, name, text, ts }
    if (!payload || !payload.text) return;
    io.to(ROOM_KEY).emit("chat:message", payload);
  });

  // --- Kick a participant (teacher only) ---
 socket.on("participant:kick", ({ studentId }) => {
  if (!poll) return;

  const student = poll.students.get(studentId);
  if (!student) return;

  // 🚫 add tabId to server ban list for 10 minutes
  addBan(student.tabId, 10);

  // remove from poll
  poll.students.delete(studentId);

  // find socket and disconnect
  const sid = studentIdToSocketId.get(studentId);
  if (sid) {
    io.to(sid).emit("forceDisconnect", {
      reason: "You have been removed from the poll by the teacher.",
    });
    const s = io.sockets.sockets.get(sid);
    if (s) s.leave(ROOM_KEY);
    studentIdToSocketId.delete(studentId);
    socketIdToStudentId.delete(sid);
  }

  // notify room (system message + updated list)
  io.to(ROOM_KEY).emit("participantKicked", {
    studentId,
    name: student.name,
  });
  broadcastStudents();
});


  socket.on("submitAnswer", ({ studentId, questionId, answer }) => {
    if (!poll) return;

    const success = poll.submitAnswer(studentId, questionId, answer);
    if (success) {
      const results = poll.getQuestionResults(questionId);
      io.to(ROOM_KEY).emit("answerSubmitted", {
        questionId,
        results,
        studentId,
        studentName: poll.students.get(studentId)?.name,
      });

      if (poll.canProceedToNext()) {
        io.to(ROOM_KEY).emit("allStudentsAnswered", {
          questionId,
          results,
        });
        poll.status = "waiting";
        poll.currentQuestion = null;

        if (pollTimer) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
      }
    }
  });

  socket.on("requestResults", ({ questionId }) => {
    if (!poll) return;
    const results = poll.getQuestionResults(questionId);
    socket.emit("questionResults", results);
  });

  socket.on("disconnect", () => {
    // remove mapping if it was a student
    const studentId = socketIdToStudentId.get(socket.id);
    if (studentId) {
      studentIdToSocketId.delete(studentId);
      socketIdToStudentId.delete(socket.id);
      // do NOT remove from poll.students on disconnect (tab refresh) unless you want to
    }
    console.log("User disconnected:", socket.id);
  });
});

/** ---------------- React fallback ---------------- **/
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`ROOM_KEY: ${ROOM_KEY} (share with students)`);
});
