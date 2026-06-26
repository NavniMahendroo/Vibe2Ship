import React from 'react';
import { AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface DriftScoreBadgeProps {
  score: number;
  extensionsCount?: number;
  showIcon?: boolean;
}

export const DriftScoreBadge: React.FC<DriftScoreBadgeProps> = ({ 
  score, 
  extensionsCount = 0,
  showIcon = true
}) => {
  // Determine color based on extension count (per design specs) or fallback to raw score range
  let color = 'drift-green';
  let Icon = CheckCircle;
  let statusText = 'Low Risk';

  if (extensionsCount >= 3 || score > 70) {
    color = 'drift-red';
    Icon = ShieldAlert;
    statusText = 'Critical Risk';
  } else if (extensionsCount >= 1 || score > 30) {
    color = 'drift-amber';
    Icon = AlertCircle;
    statusText = 'Moderate Risk';
  }

  // Map theme custom colors back to tailwind colors
  const colorMap: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    'drift-green': {
      bg: 'bg-emerald-500 bg-opacity-10',
      text: 'text-emerald-400',
      border: 'border-emerald-500 border-opacity-35',
      dot: 'bg-emerald-400'
    },
    'drift-amber': {
      bg: 'bg-amber-500 bg-opacity-10',
      text: 'text-amber-400',
      border: 'border-amber-500 border-opacity-35',
      dot: 'bg-amber-400'
    },
    'drift-red': {
      bg: 'bg-rose-500 bg-opacity-10',
      text: 'text-rose-400',
      border: 'border-rose-500 border-opacity-35',
      dot: 'bg-rose-400'
    }
  };

  const theme = colorMap[color];

  return (
    <div 
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold select-none ${theme.bg} ${theme.text} ${theme.border}`}
      title={`Drift Score: ${score}% (${extensionsCount} extension${extensionsCount === 1 ? '' : 's'})`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{score}% ({extensionsCount} Ext)</span>
    </div>
  );
};

export default DriftScoreBadge;
