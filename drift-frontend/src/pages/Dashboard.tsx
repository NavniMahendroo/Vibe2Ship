import React, { useState, useEffect } from 'react';
import { Plus, Calendar, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import client from '../api/client';
import { Task } from '../types';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import { useIntervention } from '../hooks/useIntervention';
import DriftScoreBadge from '../components/DriftScoreBadge';
import InterventionBanner from '../components/InterventionBanner';

interface DashboardProps {
  onNavigate: (page: string) => void;
  onSelectTask: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Proactive Alerts Hooks
  const { interventions, fetchInterventions, dismissIntervention } = useIntervention();

  const fetchTasks = async () => {
    try {
      const response = await client.get('/api/tasks');
      setTasks(response.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Re-check interventions on dashboard load
    fetchInterventions();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  // Group tasks
  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  
  // Due soon: status is active and deadline is within 48 hours
  const now = new Date();
  const dueSoonTasks = tasks.filter(t => {
    if (t.status !== 'active') return false;
    const deadline = new Date(t.current_deadline);
    const diffHours = (deadline.getTime() - now.getTime()) / 3600000;
    return diffHours > 0 && diffHours <= 48;
  });

  // Standard Active: status is active but NOT due soon
  const activeTasks = tasks.filter(t => {
    if (t.status !== 'active') return false;
    const deadline = new Date(t.current_deadline);
    const diffHours = (deadline.getTime() - now.getTime()) / 3600000;
    return diffHours > 48 || diffHours < 0;
  });

  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return <SkeletonDashboard />;
  }

  const renderTaskCard = (task: Task, borderColorClass: string) => {
    const isExtended = new Date(task.current_deadline) > new Date(task.original_deadline);
    
    // Calculate extension difference in days
    const origDate = new Date(task.original_deadline);
    const currDate = new Date(task.current_deadline);
    const daysExtended = Math.round((currDate.getTime() - origDate.getTime()) / (1000 * 3600 * 24));

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task.id)}
        className={`drift-card cursor-pointer border-l-4 ${borderColorClass} flex flex-col justify-between`}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <span className="bg-[#181824] border border-drift-border text-xs px-2.5 py-1 rounded-full text-drift-textMuted font-medium select-none">
              {task.category}
            </span>
            <DriftScoreBadge score={task.drift_score} extensionsCount={task.extensions?.length || 0} />
          </div>

          {/* Title */}
          <div>
            <h3 className="text-base font-semibold text-white group-hover:text-drift-accent transition-colors duration-200 truncate" title={task.title}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-drift-textMuted line-clamp-2 mt-1 leading-relaxed">
                {task.description.replace(/\[\s*\]|\[[xX]\]/g, '') /* hide checklists from description preview */}
              </p>
            )}
          </div>
        </div>

        {/* Footer Timeline Gap Indicator */}
        <div className="mt-4 pt-3 border-t border-drift-border">
          <div className="flex items-center justify-between text-xs text-drift-textMuted">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Target: {formatDate(task.current_deadline)}</span>
            </div>
            {task.extensions && task.extensions.length > 0 && (
              <span className="text-[10px] bg-red-500 bg-opacity-10 text-red-400 px-2 py-0.5 rounded font-bold uppercase select-none">
                {task.extensions.length} Ext
              </span>
            )}
          </div>

          {/* Mini Deadline Gap Bar */}
          {isExtended && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between items-center text-[9px] text-drift-textMuted font-semibold">
                <span>Orig: {formatDate(task.original_deadline)}</span>
                <span className="text-red-400 font-bold uppercase">+{daysExtended}d Shifted</span>
              </div>
              <div className="w-full h-1.5 bg-[#12121a] rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 w-3/4" />
                <div className="h-full bg-rose-500 w-1/4 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Proactive Alerts Container Banner */}
      <InterventionBanner
        interventions={interventions}
        onDismiss={dismissIntervention}
        onViewSchedule={() => onNavigate('calendar')}
      />

      {/* 2. Top actions header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Timeline Dashboard</h1>
          <p className="text-sm text-drift-textMuted">Monitor delays, risk metrics, and rescue plans.</p>
        </div>
        <button
          onClick={() => onNavigate('new-task')}
          className="flex items-center space-x-2 bg-drift-accent hover:bg-opacity-90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tasks grids */}
      <div className="space-y-8">
        
        {/* Overdue Section (Red Border) */}
        {overdueTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center space-x-1.5 select-none">
              <AlertCircle className="w-4 h-4 animate-pulse" />
              <span>Overdue Tasks ({overdueTasks.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {overdueTasks.map(task => renderTaskCard(task, 'border-l-red-500'))}
            </div>
          </div>
        )}

        {/* Due Soon Section (Amber Border) */}
        {dueSoonTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1.5 select-none">
              <Clock className="w-4 h-4" />
              <span>Due Within 48 Hours ({dueSoonTasks.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dueSoonTasks.map(task => renderTaskCard(task, 'border-l-amber-500'))}
            </div>
          </div>
        )}

        {/* Active Section (Indigo/Normal Border) */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-drift-accent uppercase tracking-widest flex items-center space-x-1.5 select-none">
            <Calendar className="w-4 h-4" />
            <span>Active Timeline Tasks ({activeTasks.length})</span>
          </h2>
          {activeTasks.length === 0 ? (
            <div className="bg-drift-card border border-drift-border rounded-xl p-8 text-center text-drift-textMuted">
              <p className="text-sm">No active tasks. Create a new task to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTasks.map(task => renderTaskCard(task, 'border-l-drift-accent'))}
            </div>
          )}
        </div>

        {/* Completed Section (Optional/Collapsible) */}
        {completedTasks.length > 0 && (
          <div className="space-y-4 border-t border-drift-border pt-6">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5 select-none">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed Tasks ({completedTasks.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
              {completedTasks.map(task => renderTaskCard(task, 'border-l-emerald-500'))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
