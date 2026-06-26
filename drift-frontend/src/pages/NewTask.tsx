import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Loader2, BarChart2 } from 'lucide-react';
import client from '../api/client';
import { useDriftScore } from '../hooks/useDriftScore';

interface NewTaskProps {
  onNavigate: (page: string) => void;
}

const CATEGORIES = [
  'Development',
  'Design',
  'Marketing',
  'Writing',
  'Research',
  'Database',
  'Operations',
  'Testing',
  'Other'
];

export const NewTask: React.FC<NewTaskProps> = ({ onNavigate }) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Development');
  
  // Set default deadline to 3 days from now in YYYY-MM-DD
  const getDefaultDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  };
  const [deadline, setDeadline] = useState<string>(getDefaultDateString());
  
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [categoryStats, setCategoryStats] = useState<{ count: number; extended: number } | null>(null);

  // Invoke the debounced live Drift Risk Engine hook
  const { score, explanation, loading: previewLoading } = useDriftScore(title, category, deadline);

  // Fetch category history on load or when category changes
  useEffect(() => {
    const fetchCategoryHistory = async () => {
      try {
        const response = await client.get('/api/tasks');
        const allTasks = response.data;
        const catTasks = allTasks.filter((t: any) => t.category.toLowerCase() === category.toLowerCase());
        const extendedCount = catTasks.filter((t: any) => t.current_deadline > t.original_deadline || (t.extensions && t.extensions.length > 0)).length;
        
        setCategoryStats({
          count: catTasks.length,
          extended: extendedCount
        });
      } catch (err: any) {
        console.error('Failed to fetch category statistics:', err);
        if (err.response?.status === 401) {
          setErrorMsg('Not authenticated. Please log in again.');
        }
      }
    };
    fetchCategoryHistory();
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category.trim() || !deadline) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Current deadline is set in UTC timezone
      const utcDeadline = new Date(deadline + 'T23:59:59').toISOString();
      
      await client.post('/api/tasks', {
        title,
        description,
        category,
        current_deadline: utcDeadline
      });

      onNavigate('dashboard');
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine risk dial color
  const getDialColor = (val: number) => {
    if (val > 70) return '#ef4444'; // Red
    if (val > 30) return '#f59e0b'; // Amber
    return '#22c55e'; // Green
  };

  const dialColor = getDialColor(score);
  const strokeDashoffset = 251.2 - (251.2 * score) / 100;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center space-x-2 text-sm text-drift-textMuted hover:text-white transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Create Form */}
        <div className="flex-1 bg-drift-card border border-drift-border rounded-xl p-6 md:p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create New Task</h1>
            <p className="text-sm text-drift-textMuted mt-1">Specify parameters to analyze risk and construct scheduler.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-35 rounded-lg p-3 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Task Title *
              </label>
              <input
                type="text"
                placeholder="E.g., Implement OAuth user profile lookup endpoints"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="drift-input text-sm"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="drift-input text-sm bg-[#15151e]"
                  disabled={loading}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                  Deadline Date *
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="drift-input text-sm"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Description / Checklist
              </label>
              <textarea
                rows={5}
                placeholder="Add checklist subtasks using markdown checkboxes:&#10;- [ ] Implement validation schema&#10;- [ ] Write service logic tests"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="drift-input text-sm resize-none font-mono leading-relaxed"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="w-full bg-drift-accent hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Create Task & Commit Timeline</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Drift Risk Preview Panel */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-[#161623] border border-drift-border rounded-xl p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl">
            {/* Sparkle Glow Top Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-drift-accent to-transparent" />
            
            <span className="text-xs font-bold text-drift-accent uppercase tracking-wider mb-4 flex items-center space-x-1.5 select-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Drift Risk Analysis</span>
            </span>

            {/* Circular/Radial Progress Indicator Dial */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="40"
                  className="stroke-gray-800 fill-transparent"
                  strokeWidth="8"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="40"
                  className="fill-transparent transition-all duration-500 ease-out"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke={dialColor}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                {previewLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-drift-accent" />
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-white">{score}%</span>
                    <span className="text-[9px] text-drift-textMuted font-semibold uppercase tracking-wider">
                      Probability
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* AI Explanation Box */}
            <div className="ai-response-box w-full text-left">
              <div className="flex items-center space-x-1.5 mb-2 select-none">
                <Sparkles className="ai-sparkle-icon w-3.5 h-3.5" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Coach Prediction</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-200 font-medium">
                {explanation}
              </p>
            </div>
          </div>

          {/* Historical Category Rates Metrics Card */}
          {categoryStats && categoryStats.count > 0 && (
            <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-lg">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-drift-accent" />
                <span>{category} Category History</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-drift-textMuted">Past Created Tasks</span>
                  <span className="font-semibold text-white">{categoryStats.count}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-drift-textMuted">
                    <span>Deadline Extension Frequency</span>
                    <span className="text-amber-400">
                      {Math.round((categoryStats.extended / categoryStats.count) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#12121a] rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-drift-accent" 
                      style={{ width: `${(categoryStats.count - categoryStats.extended) / categoryStats.count * 100}%` }}
                    />
                    <div 
                      className="h-full bg-rose-500" 
                      style={{ width: `${categoryStats.extended / categoryStats.count * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-500 font-bold uppercase mt-1">
                    <span>On Time</span>
                    <span>Extended</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NewTask;
