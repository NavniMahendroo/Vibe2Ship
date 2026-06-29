import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  PlusCircle, 
  BarChart2, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

import client from './api/client';
import { User } from './types';

// Page components
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewTask from './pages/NewTask';
import TaskDetail from './pages/TaskDetail';
import CalendarPage from './pages/CalendarPage';
import Insights from './pages/Insights';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        setCurrentPage('landing');
        return;
      }
      try {
        const response = await client.get('/api/auth/me');
        setUser(response.data);
      } catch (err) {
        console.error('Session expired or invalid', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleLoginSuccess = (newToken: string, loggedInUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    setCurrentPage('dashboard');
  };

  const handleRegisterSuccess = (newToken: string, registeredUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(registeredUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSelectedTaskId(null);
    setCurrentPage('landing');
  };

  const navigateToTaskDetail = (id: number) => {
    setSelectedTaskId(id);
    setCurrentPage('task-detail');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-drift-bg flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-drift-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-drift-textMuted text-sm animate-pulse">Initializing Drift workspace...</p>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    if (currentPage === 'register') {
      return (
        <Register 
          onNavigate={setCurrentPage} 
          onRegisterSuccess={handleRegisterSuccess}
        />
      );
    }
    if (currentPage === 'login') {
      return (
        <Login 
          onNavigate={setCurrentPage} 
          onLoginSuccess={handleLoginSuccess} 
        />
      );
    }
    return (
      <Landing onNavigate={setCurrentPage} />
    );
  }

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'new-task', label: 'New Task', icon: PlusCircle },
    { id: 'insights', label: 'Insights', icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-drift-bg text-drift-textMuted flex flex-col md:flex-row">
      
      {/* 1. Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 bg-drift-card border-r border-drift-border flex-col justify-between h-screen sticky top-0">
        <div>
          {/* Logo / Branding */}
          <div className="p-6 border-b border-drift-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-drift-accent" />
              <span className="text-xl font-bold text-white tracking-wider">DRIFT</span>
            </div>
            <span className="text-[10px] bg-drift-accent bg-opacity-20 text-drift-accent px-2 py-0.5 rounded-full font-semibold">
              v2.0
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setCurrentPage(link.id);
                    setSelectedTaskId(null);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-drift-accent bg-opacity-10 text-white border-l-2 border-drift-accent' 
                      : 'hover:bg-drift-border text-drift-textMuted hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-drift-accent' : ''}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Log Out */}
        <div className="p-4 border-t border-drift-border space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-full bg-drift-accent bg-opacity-20 flex items-center justify-center text-drift-accent font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
              <p className="text-xs text-drift-textMuted truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-[#1b1b22] border border-drift-border text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-drift-card border-b border-drift-border sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-drift-accent" />
          <span className="text-xl font-bold text-white tracking-wider">DRIFT</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-red-400 p-2 hover:bg-drift-border rounded-lg"
          title="Log Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* 3. Main Content Panel */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10">
        {/* Render Page Components */}
        {currentPage === 'dashboard' && (
          <Dashboard onNavigate={setCurrentPage} onSelectTask={navigateToTaskDetail} />
        )}
        {currentPage === 'calendar' && (
          <CalendarPage onNavigate={setCurrentPage} onSelectTask={navigateToTaskDetail} />
        )}
        {currentPage === 'new-task' && (
          <NewTask onNavigate={setCurrentPage} />
        )}
        {currentPage === 'insights' && (
          <Insights />
        )}
        {currentPage === 'task-detail' && (
          <TaskDetail taskId={selectedTaskId} onNavigate={setCurrentPage} />
        )}
      </main>

      {/* 4. Mobile Sticky Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-drift-card border-t border-drift-border flex justify-around py-3 px-2 z-40">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = currentPage === link.id;
          return (
            <button
              key={link.id}
              onClick={() => {
                setCurrentPage(link.id);
                setSelectedTaskId(null);
              }}
              className={`flex flex-col items-center justify-center text-[10px] font-medium transition-all duration-200 ${
                isActive ? 'text-white scale-105' : 'text-drift-textMuted'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-drift-accent' : ''}`} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
};

export default App;
