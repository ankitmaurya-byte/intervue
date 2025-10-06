import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import HomePage from './components/HomePage';
// import './App.css';
import StudentEntry from './components/StudentEntry';
import PollHistory from './components/PollHistory';
import KickedOut from './components/KickedOut';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/teacher/" element={<TeacherDashboard />} />
        <Route path="/student/joinpoll" element={<StudentEntry />} />
        <Route path="/student/" element={<StudentDashboard />} />
        <Route path="/poll/history" element={<PollHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/kicked" element={<KickedOut />} />

      </Routes>
    </div>
  );
}

export default App;
