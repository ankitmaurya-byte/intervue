import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import HomePage from './components/HomePage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/teacher/:pollId" element={<TeacherDashboard />} />
        <Route path="/student/:pollId" element={<StudentDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
