const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production" ? false : "http://localhost:3000",
    methods: ["GET", "POST"],
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

// Teacher adds a question (requires teacherKey)
app.post("/api/poll/questions", (req, res) => {
  if (!poll) {
    return res.status(404).json({ error: "Poll not created yet" });
  }

  const { question, options, timerSec } = req.body;

  if (!question || !Array.isArray(options) || options.length === 0) {
    return res.status(400).json({ error: "Invalid question payload" });
  }

  if (poll.status === "active" && !poll.canProceedToNext()) {
    return res
      .status(400)
      .json({
        error:
          "Cannot add new question until current question is answered by all students",
      });
  }
  
  const questionId = poll.addQuestion({ question, options });
  const optiontexts= options.map(opt=>opt.text);
  poll.currentQuestion = { id: questionId, question, options:optiontexts };
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

/** ---------------- Socket.io (no ) ---------------- **/
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Clients must provide the room secret to join the room
  socket.on("joinPoll", ({ userType, studentId, name }) => {
    socket.join(ROOM_KEY);

    // Notify the newly joined user only
    socket.emit("pollJoined", {
      userType,
      ...(userType === "student" ? { studentId, name } : {}),
    });

    // Broadcast to all others in the room that a user has joined
    io.to(ROOM_KEY).emit("userJoined", {
      userType,
      name: name || "Unknown",
      id: studentId || socket.id, // fallback to socket.id if studentId is undefined
      students: Array.from(poll.students.values()) || [],
    });

    console.log(`${userType} joined: ${name} (${studentId || socket.id})`);
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
