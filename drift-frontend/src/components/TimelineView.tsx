import React from 'react';
import { Flag, Clock, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import { Extension } from '../types';

interface TimelineViewProps {
  originalDeadline: string;
  currentDeadline: string;
  extensions: Extension[];
  status: 'active' | 'completed' | 'overdue';
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  originalDeadline,
  currentDeadline,
  extensions = [],
  status,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSeverityColor = (sev: number) => {
    if (sev === 3) return 'bg-rose-500';
    if (sev === 2) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-md overflow-x-auto">
      <div className="flex items-center space-x-4 min-w-[700px] py-4">
        
        {/* Node 1: Original Deadline */}
        <div className="flex flex-col items-center flex-shrink-0 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500 bg-opacity-10 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-2">
            <Flag className="w-5 h-5" />
          </div>
          <span className="text-xs text-white font-semibold block">Original Target</span>
          <span className="text-[10px] text-drift-textMuted mt-0.5">{formatDate(originalDeadline)}</span>
        </div>

        {/* Link from original to first node */}
        <div className="flex-1 h-0.5 bg-drift-border relative min-w-[50px]">
          {extensions.length > 0 && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-rose-400">
              Shorted
            </span>
          )}
        </div>

        {/* Intermediate Nodes: Extensions */}
        {extensions.map((ext, idx) => (
          <React.Fragment key={ext.id}>
            <div className="flex flex-col items-center flex-shrink-0 text-center max-w-[150px]">
              {/* Severity dot indicator */}
              <div className="flex items-center space-x-1.5 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${getSeverityColor(ext.severity || 1)} animate-pulse`} />
                <span className="text-[10px] text-white font-semibold">+{ext.extended_by_days} Day(s)</span>
              </div>
              
              {/* Tag Badge */}
              <div className="bg-[#1e1e2d] border border-drift-border rounded-lg px-2.5 py-1 flex items-center space-x-1 select-none">
                <Sparkles className="w-3 h-3 text-drift-accent" />
                <span className="text-[10px] text-gray-300 font-medium truncate max-w-[80px]" title={ext.ai_tag}>
                  {ext.ai_tag || 'Coach Analyze'}
                </span>
              </div>
              
              <span className="text-[9px] text-drift-textMuted mt-1">
                {new Date(ext.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Path connector */}
            <div className="flex-1 h-0.5 bg-drift-border min-w-[50px]" />
          </React.Fragment>
        ))}

        {/* Node 3: Current Deadline */}
        <div className="flex flex-col items-center flex-shrink-0 text-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
            status === 'overdue' 
              ? 'bg-rose-500 bg-opacity-10 border border-rose-500 text-rose-400' 
              : 'bg-drift-accent bg-opacity-10 border border-drift-accent text-drift-accent'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs text-white font-semibold block">
            {status === 'overdue' ? 'Overdue Deadline' : 'Active Target'}
          </span>
          <span className="text-[10px] text-drift-textMuted mt-0.5">{formatDate(currentDeadline)}</span>
        </div>

        {/* Final Completion Flag (only shown if status is completed) */}
        {status === 'completed' && (
          <>
            <div className="flex-1 h-0.5 bg-emerald-500 min-w-[50px]" />
            <div className="flex flex-col items-center flex-shrink-0 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 bg-opacity-10 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-2">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="text-xs text-emerald-400 font-semibold block">Completed</span>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default TimelineView;
