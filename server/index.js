const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// In-memory store for active polls
const polls = new Map();
const pollTimers = new Map();

// Data models
class Poll {
  constructor(id, teacherId) {
    this.id = id;
    this.teacherId = teacherId;
    this.students = new Map(); // studentId -> { name, tabId, hasAnswered }
    this.currentQuestion = null;
    this.questions = [];
    this.results = new Map(); // questionId -> { answers: Map, totalAnswers: number }
    this.status = 'waiting'; // waiting, active, completed
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
    result.answers.forEach(answer => {
      answerCounts[answer] = (answerCounts[answer] || 0) + 1;
    });

    return {
      questionId,
      totalAnswers: result.totalAnswers,
      totalStudents: this.students.size,
      answerCounts,
      studentAnswers: Array.from(result.answers.entries()).map(([studentId, answer]) => ({
        studentId,
        studentName: this.students.get(studentId)?.name,
        answer
      }))
    };
  }
}

// REST API Routes
app.post('/api/polls', (req, res) => {
  const pollId = uuidv4();
  const teacherId = uuidv4();
  const poll = new Poll(pollId, teacherId);
  polls.set(pollId, poll);
  
  res.json({ pollId, teacherId });
});

app.get('/api/polls/:pollId', (req, res) => {
  const poll = polls.get(req.params.pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  
  res.json({
    id: poll.id,
    status: poll.status,
    students: Array.from(poll.students.values()),
    currentQuestion: poll.currentQuestion,
    questions: poll.questions
  });
});

app.post('/api/polls/:pollId/join', (req, res) => {
  const { name, tabId } = req.body;
  const poll = polls.get(req.params.pollId);
  
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  // Check if tabId already exists
  const existingStudent = Array.from(poll.students.values()).find(s => s.tabId === tabId);
  if (existingStudent) {
    return res.status(400).json({ error: 'This tab is already connected to the poll' });
  }

  const studentId = uuidv4();
  poll.addStudent(studentId, name, tabId);
  
  res.json({ studentId });
});

app.post('/api/polls/:pollId/questions', (req, res) => {
  const { question, options, teacherId } = req.body;
  const poll = polls.get(req.params.pollId);
  
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  if (poll.teacherId !== teacherId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (poll.status === 'active' && !poll.canProceedToNext()) {
    return res.status(400).json({ error: 'Cannot add new question until current question is answered by all students' });
  }

  const questionId = poll.addQuestion({ question, options });
  poll.currentQuestion = { id: questionId, question, options };
  poll.status = 'active';

  // Clear previous timer
  if (pollTimers.has(req.params.pollId)) {
    clearTimeout(pollTimers.get(req.params.pollId));
  }

  // Set 60-second timer
  const timer = setTimeout(() => {
    const currentPoll = polls.get(req.params.pollId);
    if (currentPoll && currentPoll.status === 'active') {
      io.to(req.params.pollId).emit('questionTimeUp', {
        questionId: currentPoll.currentQuestion.id,
        results: currentPoll.getQuestionResults(currentPoll.currentQuestion.id)
      });
      currentPoll.status = 'waiting';
      currentPoll.currentQuestion = null;
    }
    pollTimers.delete(req.params.pollId);
  }, 60000);

  pollTimers.set(req.params.pollId, timer);

  // Broadcast new question to all students in the poll
  io.to(req.params.pollId).emit('newQuestion', {
    questionId,
    question,
    options,
    timeLimit: 60
  });

  res.json({ questionId });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinPoll', ({ pollId, userType, studentId }) => {
    socket.join(pollId);
    
    if (userType === 'student') {
      socket.emit('pollJoined', { pollId, studentId });
    } else if (userType === 'teacher') {
      socket.emit('pollJoined', { pollId });
    }
  });

  socket.on('submitAnswer', ({ pollId, studentId, questionId, answer }) => {
    const poll = polls.get(pollId);
    if (!poll) return;

    const success = poll.submitAnswer(studentId, questionId, answer);
    if (success) {
      // Broadcast updated results to teacher
      const results = poll.getQuestionResults(questionId);
      io.to(pollId).emit('answerSubmitted', {
        questionId,
        results,
        studentId,
        studentName: poll.students.get(studentId)?.name
      });

      // Check if all students have answered
      if (poll.canProceedToNext()) {
        io.to(pollId).emit('allStudentsAnswered', {
          questionId,
          results
        });
        poll.status = 'waiting';
        poll.currentQuestion = null;
        
        // Clear timer
        if (pollTimers.has(pollId)) {
          clearTimeout(pollTimers.get(pollId));
          pollTimers.delete(pollId);
        }
      }
    }
  });

  socket.on('requestResults', ({ pollId, questionId }) => {
    const poll = polls.get(pollId);
    if (!poll) return;

    const results = poll.getQuestionResults(questionId);
    socket.emit('questionResults', results);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Handle React routing, return all requests to React app
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
