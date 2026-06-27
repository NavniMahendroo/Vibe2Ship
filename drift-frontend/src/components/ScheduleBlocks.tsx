import React from 'react';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import { ScheduleBlock } from '../types';

interface ScheduleBlocksProps {
  blocks: ScheduleBlock[];
  cols?: number;
}

export const ScheduleBlocks: React.FC<ScheduleBlocksProps> = ({ blocks, cols }) => {
  if (blocks.length === 0) {
    return (
      <div className="bg-drift-card border border-drift-border rounded-xl p-8 text-center text-drift-textMuted">
        <BookOpen className="w-10 h-10 mx-auto text-drift-border mb-3" />
        <p className="text-sm">No rescue schedule blocks assigned yet.</p>
        <p className="text-xs mt-1 text-gray-500">Rescue schedules are generated automatically when deadlines shift.</p>
      </div>
    );
  }

  // Helper to group blocks by day: e.g. "Monday, Oct 12"
  const groupBlocksByDay = (blocksList: ScheduleBlock[]) => {
    const groups: Record<string, ScheduleBlock[]> = {};
    
    blocksList.forEach((block) => {
      // The start time is in format "YYYY-MM-DD HH:MM"
      const datePart = block.start.split(' ')[0];
      const dateObj = new Date(datePart);
      
      const dayLabel = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      
      if (!groups[dayLabel]) {
        groups[dayLabel] = [];
      }
      groups[dayLabel].push(block);
    });

    return groups;
  };

  const grouped = groupBlocksByDay(blocks);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, dayBlocks]) => (
        <div key={day} className="space-y-3">
          {/* Day Label Header */}
          <div className="flex items-center space-x-2 text-white font-semibold border-b border-drift-border pb-2">
            <Calendar className="w-4 h-4 text-drift-accent" />
            <span className="text-sm">{day}</span>
          </div>

          {/* Blocks Grid */}
          <div className={cols === 1 ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"}>
            {dayBlocks.map((block, idx) => {
              const startTime = block.start.split(' ')[1];
              const endTime = block.end.split(' ')[1];
              
              return (
                <div
                  key={`${block.start}-${idx}`}
                  className="bg-[#171722] hover:bg-[#1d1d2b] border border-drift-border hover:border-drift-accent hover:border-opacity-40 rounded-xl p-4 transition-all duration-200 flex items-start space-x-3 group cursor-default shadow-md"
                >
                  <div className="bg-drift-accent bg-opacity-10 p-2 rounded-lg text-drift-accent group-hover:bg-drift-accent group-hover:text-white transition-colors duration-200 flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-white tracking-wider">
                      {startTime} - {endTime}
                    </span>
                    <p className="text-xs text-drift-textMuted font-medium truncate mt-1" title={block.label}>
                      {block.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScheduleBlocks;
