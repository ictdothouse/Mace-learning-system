import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LessonPlayer from './pages/LessonPlayer';
import CustomPage from './pages/CustomPage';
import ModuleLanding from './pages/ModuleLanding';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lesson/:id" element={<LessonPlayer />} />
        <Route path="/module/:id" element={<ModuleLanding />} />
        <Route path="/p/:slug" element={<CustomPage />} />
        <Route path="/page/:slug" element={<CustomPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
