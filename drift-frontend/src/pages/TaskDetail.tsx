import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  CheckSquare, 
  Clock, 
  Mic, 
  Keyboard, 
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';
import client from '../api/client';
import { Task, Extension, ScheduleBlock } from '../types';
import { SkeletonDetails } from '../components/SkeletonLoader';
import TimelineView from '../components/TimelineView';
import ScheduleBlocks from '../components/ScheduleBlocks';
import ExtensionModal from '../components/ExtensionModal';

interface TaskDetailProps {
  taskId: number | null;
  onNavigate: (page: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onNavigate }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [completing, setCompleting] = useState<boolean>(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      // 1. Fetch task details
      const taskRes = await client.get(`/api/tasks/${taskId}`);
      setTask(taskRes.data);

      // 2. Fetch rescue blocks schedule for this task
      const scheduleRes = await client.get(`/api/schedule/task/${taskId}`);
      // The suggested_blocks is returned as a JSON array
      setScheduleBlocks(scheduleRes.data.suggested_blocks || []);
    } catch (err) {
      console.error('Failed to fetch task details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTaskDetails();
  }, [taskId]);

  const handleMarkComplete = async () => {
    if (!task) return;
    setCompleting(true);
    try {
      const newStatus = task.status === 'completed' ? 'active' : 'completed';
      const response = await client.put(`/api/tasks/${task.id}`, {
        status: newStatus
      });
      setTask(response.data);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setCompleting(false);
    }
  };

  // Checklist toggle handler: updates task description with new checked status
  const handleToggleChecklist = async (index: number) => {
    if (!task || !task.description) return;
    
    const lines = task.description.split('\n');
    let checkboxCount = 0;
    
    const updatedLines = lines.map((line) => {
      const match = line.match(/^(\s*[-*]\s*\[)([ xX]\])(.*)$/);
      if (match) {
        if (checkboxCount === index) {
          const isChecked = match[2] === 'x]' || match[2] === 'X]';
          const newCheckbox = isChecked ? ' ]' : 'x]';
          checkboxCount++;
          return `${match[1]}${newCheckbox}${match[3]}`;
        }
        checkboxCount++;
      }
      return line;
    });

    const newDescription = updatedLines.join('\n');

    try {
      const response = await client.put(`/api/tasks/${task.id}`, {
        description: newDescription
      });
      setTask(response.data);
    } catch (err) {
      console.error('Failed to update subtasks checklist:', err);
    }
  };

  if (loading || !task) {
    return <SkeletonDetails />;
  }

  // Count subtasks checklist items
  const parseChecklist = () => {
    if (!task.description) return [];
    
    const lines = task.description.split('\n');
    const checklistItems: { text: string; checked: boolean; originalIndex: number }[] = [];
    let index = 0;

    lines.forEach((line) => {
      const match = line.match(/^\s*[-*]\s*\[([ xX])\](.*)$/);
      if (match) {
        checklistItems.push({
          text: match[2].trim(),
          checked: match[1] === 'x' || match[1] === 'X',
          originalIndex: index++
        });
      }
    });

    return checklistItems;
  };

  const subtasks = parseChecklist();
  const completedSubtasks = subtasks.filter(s => s.checked).length;

  return (
    <div className="space-y-8">
      {/* Top action header navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-drift-border pb-6">
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2 text-xs font-semibold text-drift-textMuted hover:text-white mb-2 transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{task.title}</h1>
            <span className="bg-[#181824] border border-drift-border text-xs px-2.5 py-0.5 rounded-full text-drift-textMuted font-semibold select-none">
              {task.category}
            </span>
          </div>
        </div>

        {/* Form action buttons */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={handleMarkComplete}
            disabled={completing}
            className={`flex items-center space-x-2 border px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              task.status === 'completed'
                ? 'bg-emerald-500 bg-opacity-10 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                : 'bg-transparent border-drift-border text-white hover:bg-white hover:text-drift-bg'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>{task.status === 'completed' ? 'Reopen Task' : 'Mark Completed'}</span>
          </button>

          {task.status !== 'completed' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-drift-accent hover:bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>Extend Deadline</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Horizontal Timeline View */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider select-none">Task Deadline Path</h2>
        <TimelineView
          originalDeadline={task.original_deadline}
          currentDeadline={task.current_deadline}
          extensions={task.extensions || []}
          status={task.status}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Left side Details & logs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Subtasks / Checklist progress card */}
          {subtasks.length > 0 && (
            <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-md space-y-4">
              <div className="flex justify-between items-center select-none">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Subtask Checklist</h3>
                <span className="text-xs text-drift-textMuted font-medium">
                  {completedSubtasks} of {subtasks.length} Completed
                </span>
              </div>

              {/* Progress Slider */}
              <div className="w-full h-1.5 bg-[#12121a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                />
              </div>

              {/* Checkboxes list */}
              <div className="space-y-2 pt-2">
                {subtasks.map((sub, i) => (
                  <label
                    key={i}
                    onClick={() => handleToggleChecklist(sub.originalIndex)}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-[#14141d] hover:bg-[#1a1a28] cursor-pointer transition-all duration-150 border border-transparent hover:border-drift-border"
                  >
                    <input
                      type="checkbox"
                      checked={sub.checked}
                      readOnly
                      className="w-4.5 h-4.5 rounded border-drift-border text-drift-accent bg-transparent focus:ring-transparent accent-drift-accent"
                    />
                    <span className={`text-sm ${sub.checked ? 'line-through text-drift-textMuted' : 'text-white font-medium'}`}>
                      {sub.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Raw Text description (if not checklists or alongside them) */}
          {task.description && subtasks.length === 0 && (
            <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-md">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 select-none">Description</h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Extension History List Logs */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest select-none">AI Extension History logs</h2>
            
            {(!task.extensions || task.extensions.length === 0) ? (
              <div className="bg-drift-card border border-drift-border rounded-xl p-8 text-center text-drift-textMuted">
                <CheckSquare className="w-10 h-10 mx-auto text-drift-border mb-3" />
                <p className="text-sm font-medium text-white">Sacred Deadline Maintained</p>
                <p className="text-xs mt-1 text-gray-500">No extensions have been logged for this task yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {task.extensions.map((ext) => {
                  const Icon = ext.input_method === 'voice' ? Mic : Keyboard;
                  const isCritical = ext.severity === 3;
                  const isModerate = ext.severity === 2;

                  return (
                    <div
                      key={ext.id}
                      className="bg-drift-card border border-drift-border rounded-xl p-5 md:p-6 shadow-md space-y-4"
                    >
                      {/* Log Header */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="bg-[#181824] border border-drift-border p-1.5 rounded-lg text-drift-accent">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-semibold text-white">
                              Extended by +{ext.extended_by_days} Day(s)
                            </span>
                            <span className="text-[10px] text-drift-textMuted">
                              via {ext.input_method === 'voice' ? 'Voice Transcription' : 'Keyboard Reason'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 select-none">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCritical 
                              ? 'bg-rose-500 bg-opacity-10 text-rose-400' 
                              : isModerate 
                                ? 'bg-amber-500 bg-opacity-10 text-amber-400' 
                                : 'bg-emerald-500 bg-opacity-10 text-emerald-400'
                          }`}>
                            {ext.ai_tag}
                          </span>
                          <span className="text-gray-500 text-[10px]">
                            {new Date(ext.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Transcribed text reason */}
                      <div className="bg-[#121219] p-3 rounded-lg border border-drift-border text-sm leading-relaxed text-gray-200">
                        "{ext.raw_transcription || ext.raw_reason}"
                      </div>

                      {/* AI Reflection box */}
                      <div className="ai-response-box">
                        <div className="flex items-center space-x-1.5 mb-1.5 select-none">
                          <Sparkles className="ai-sparkle-icon w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Coach Reflection</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {ext.ai_reflection}
                        </p>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* 3. Right Side visual calendar scheduler */}
        <div className="space-y-6">
          <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-md space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 select-none">
                <Clock className="w-4.5 h-4.5 text-drift-accent animate-spin" style={{ animationDuration: '6s' }} />
                <span>Visual Rescue Schedule</span>
              </h3>
              <p className="text-xs text-drift-textMuted mt-1">Suggested time blocks to reconcile this task's deadline extension.</p>
            </div>
            
            <ScheduleBlocks blocks={scheduleBlocks} cols={1} />
          </div>
        </div>

      </div>

      {/* 4. Extension Modal Coach Trigger */}
      <ExtensionModal
        isOpen={isModalOpen}
        taskId={task.id}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTaskDetails}
      />

    </div>
  );
};

export default TaskDetail;
