import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/UsersManagement';
import ProjectsManagement from './pages/ProjectsManagement';
import TasksManagement from './pages/TasksManagement';
import { supabase } from './supabaseClient';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeTimer'); // Clear active timer on logout
    // supabase.auth.signOut(); // If using Supabase Auth
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <p className="text-gray-600 text-xl">Preparando el café... digo, la aplicación.</p>
      </div>
    );
  }

  return (
    <Router>
      {user ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <Navbar user={user} onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            {user.role === 'admin' && (
              <>
                <Route path="/users" element={<UsersManagement />} />
                <Route path="/projects" element={<ProjectsManagement user={user} />} />
                <Route path="/tasks" element={<TasksManagement user={user} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </Router>
  );
};

export default App;