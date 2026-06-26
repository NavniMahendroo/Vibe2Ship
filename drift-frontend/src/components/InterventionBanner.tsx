import React from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import { InterventionLog } from '../types';

interface InterventionBannerProps {
  interventions: InterventionLog[];
  onDismiss: (id: number) => void;
  onViewSchedule: () => void;
}

export const InterventionBanner: React.FC<InterventionBannerProps> = ({
  interventions,
  onDismiss,
  onViewSchedule,
}) => {
  if (interventions.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {interventions.map((alert) => (
        <div
          key={alert.id}
          className="relative bg-gradient-to-r from-[#211a1d] to-[#161623] border border-red-500 border-opacity-20 rounded-xl p-4 md:p-5 flex items-start space-x-4 shadow-lg overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500"
        >
          {/* Warning Icon Indicator */}
          <div className="flex-shrink-0 bg-red-500 bg-opacity-10 p-2 rounded-lg text-red-400">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>

          {/* Banner message and buttons */}
          <div className="flex-1 md:flex md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="pr-6">
              <span className="block text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
                Proactive Behavioral Alert
              </span>
              <p className="text-sm text-gray-200 leading-relaxed">
                {alert.message}
              </p>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={onViewSchedule}
                className="flex items-center space-x-2 bg-drift-accent bg-opacity-20 text-drift-accent border border-drift-accent border-opacity-30 hover:bg-drift-accent hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>View Rescue Schedule</span>
              </button>
            </div>
          </div>

          {/* Close Banner Button */}
          <button
            onClick={() => onDismiss(alert.id)}
            className="absolute top-4 right-4 text-drift-textMuted hover:text-white transition-colors duration-200"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default InterventionBanner;
