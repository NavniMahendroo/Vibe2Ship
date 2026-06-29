import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Info, Clock } from 'lucide-react';
import client from '../api/client';
import { Task } from '../types';

interface CalendarPageProps {
  onNavigate: (page: string) => void;
  onSelectTask: (id: number) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onNavigate, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleDeleteCalendarTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task? This will also remove all its extensions and scheduled rescue blocks.')) {
      return;
    }
    try {
      await client.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task from calendar:', err);
      alert('Failed to delete task. Please try again.');
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await client.get('/api/tasks');
        setTasks(response.data);
      } catch (err) {
        console.error('Failed to fetch tasks for calendar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Get starting day index (0 for Sunday, 6 for Saturday)
  const startDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedTask(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedTask(null);
  };

  // Filter tasks due within 48h
  const now = new Date();
  const criticalTasks = tasks.filter((t) => {
    if (t.status !== 'active') return false;
    const deadline = new Date(t.current_deadline);
    const diffHours = (deadline.getTime() - now.getTime()) / 3600000;
    return diffHours > 0 && diffHours <= 48;
  });

  const getMarkerColor = (extCount: number) => {
    if (extCount >= 3) return 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/50';
    if (extCount >= 1) return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/50';
    return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/50';
  };

  // Generate date cells
  const renderCells = () => {
    const cells = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Weekday headers
    daysOfWeek.forEach((day) => {
      cells.push(
        <div key={`header-${day}`} className="text-center text-[10px] font-bold uppercase tracking-wider text-drift-textMuted py-2 border-b border-drift-border select-none">
          {day}
        </div>
      );
    });

    // Blank cells before starting day of the month
    for (let i = 0; i < startDayIndex; i++) {
      cells.push(
        <div key={`empty-${i}`} className="bg-[#0b0b0e] bg-opacity-20 border border-drift-border min-h-[90px] md:min-h-[110px]" />
      );
    }

    // Days of the month cells
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      
      // Filter tasks due on this day
      const dayTasks = tasks.filter((task) => {
        const taskDate = new Date(task.current_deadline);
        return (
          taskDate.getDate() === day &&
          taskDate.getMonth() === month &&
          taskDate.getFullYear() === year
        );
      });

      const isToday = 
        day === now.getDate() && 
        month === now.getMonth() && 
        year === now.getFullYear();

      cells.push(
        <div
          key={`day-${day}`}
          className={`border border-drift-border min-h-[90px] md:min-h-[110px] p-2 flex flex-col justify-between transition-colors duration-200 hover:bg-[#13131d] relative ${
            isToday ? 'bg-[#151524]' : 'bg-[#0f0f15]'
          }`}
        >
          {/* Day Number */}
          <div className="flex justify-between items-center select-none">
            <span className={`text-xs font-semibold ${isToday ? 'text-drift-accent font-bold' : 'text-gray-400'}`}>
              {day}
            </span>
            {isToday && (
              <span className="text-[8px] bg-drift-accent bg-opacity-10 text-drift-accent px-1.5 py-0.5 rounded font-bold uppercase">
                Today
              </span>
            )}
          </div>

          {/* Task dots */}
          <div className="flex flex-wrap gap-1.5 mt-2 max-h-[50px] overflow-y-auto">
            {dayTasks.map((task) => (
              <button
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(task);
                }}
                className={`w-3.5 h-3.5 rounded-full shadow-sm hover:scale-110 transition-transform duration-150 ${getMarkerColor(task.extensions?.length || 0)}`}
                title={`${task.title} (${task.extensions?.length || 0} extensions)`}
              />
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Critical Deadline alerts banner */}
      {criticalTasks.length > 0 && (
        <div className="bg-rose-500 bg-opacity-10 border border-rose-500 border-opacity-35 rounded-xl p-4 flex items-start space-x-3.5 shadow-lg select-none">
          <div className="bg-rose-500 bg-opacity-10 p-2 rounded-lg text-rose-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="block text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
              Critical Deadlines (Next 48 Hours)
            </span>
            <div className="space-y-1.5">
              {criticalTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-2 text-sm text-gray-200">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold truncate max-w-[200px] md:max-w-md">{task.title}</span>
                  <span className="text-gray-400 text-xs">— due in category {task.category} (Risk: {task.drift_score}%)</span>
                  <button 
                    onClick={() => onSelectTask(task.id)}
                    className="text-xs text-drift-accent hover:underline font-semibold"
                  >
                    Manage
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-drift-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rescue Calendar</h1>
          <p className="text-sm text-drift-textMuted">Visualize deadline paths and track schedule overrides.</p>
        </div>
      </div>

      {/* 2. Month Selector Controls */}
      <div className="flex justify-between items-center bg-drift-card border border-drift-border p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold text-white">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg bg-[#14141d] hover:bg-drift-border text-drift-textMuted hover:text-white transition-colors duration-150 border border-drift-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg bg-[#14141d] hover:bg-drift-border text-drift-textMuted hover:text-white transition-colors duration-150 border border-drift-border"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-7 bg-drift-card border border-drift-border rounded-xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="col-span-7 py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-drift-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-drift-textMuted">Syncing calendar grid...</span>
          </div>
        ) : (
          renderCells()
        )}
      </div>

      {/* 3. Popover Detail Modal widget for clicked task dot */}
      {selectedTask && (
        <div className="fixed inset-0 bg-[#07070b] bg-opacity-60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-drift-card border border-drift-border rounded-xl shadow-2xl p-6 relative">
            <h3 className="text-base font-bold text-white mb-2 truncate pr-6">{selectedTask.title}</h3>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-drift-textMuted">Category</span>
                <span className="font-semibold text-white">{selectedTask.category}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-drift-textMuted">Drift Risk Score</span>
                <span className="font-bold text-drift-accent">{selectedTask.drift_score}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-drift-textMuted">Extensions Count</span>
                <span className="font-bold text-rose-400">{selectedTask.extensions?.length || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-drift-textMuted">Target Deadline</span>
                <span className="font-semibold text-white">
                  {new Date(selectedTask.current_deadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-col space-y-2">
              <div className="flex space-x-3">
                <button
                  onClick={() => onSelectTask(selectedTask.id)}
                  className="flex-1 bg-drift-accent text-white py-2 rounded-lg text-xs font-semibold hover:bg-opacity-90 transition-colors duration-200"
                >
                  Open Details
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 bg-transparent border border-drift-border text-drift-textMuted py-2 rounded-lg text-xs font-semibold hover:bg-drift-border hover:text-white transition-colors duration-200"
                >
                  Close
                </button>
              </div>
              <button
                onClick={() => handleDeleteCalendarTask(selectedTask.id)}
                className="w-full bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 text-red-400 py-2 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors duration-200"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarPage;
