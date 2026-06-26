import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  TrendingUp, 
  Award, 
  HelpCircle, 
  AlertOctagon, 
  CheckCircle,
  FileText,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import client from '../api/client';
import { InsightsOut } from '../types';
import { SkeletonDetails } from '../components/SkeletonLoader';

export const Insights: React.FC = () => {
  const [data, setData] = useState<InsightsOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await client.get('/api/insights');
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch insights data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading || !data) {
    return <SkeletonDetails />;
  }

  const { metrics, tag_distribution, drift_over_time, category_breakdown, hall_of_fame } = data;

  // Compute maximum count in tag distribution to scale bars
  const maxTagCount = tag_distribution.length > 0 ? Math.max(...tag_distribution.map(t => t.count)) : 1;

  // Custom SVG line chart coordinates generator
  const renderDriftChart = () => {
    if (drift_over_time.length < 2) {
      return (
        <div className="h-40 flex items-center justify-center text-xs text-drift-textMuted select-none">
          Add at least 2 tasks on different days to plot timeline progress.
        </div>
      );
    }

    const width = 500;
    const height = 150;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Generate points
    const points = drift_over_time.map((pt, idx) => {
      const x = paddingLeft + (idx / (drift_over_time.length - 1)) * chartWidth;
      // Drift score ranges 0-100%
      const y = height - paddingBottom - (pt.avg_drift_score / 100) * chartHeight;
      return { x, y, score: pt.avg_drift_score, date: pt.date };
    });

    // Create SVG path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Create glowing area path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

    return (
      <div className="relative w-full h-[180px]">
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#2a2a3a" strokeWidth="1" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#2a2a3a" strokeWidth="1" strokeDasharray="3" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#2a2a3a" strokeWidth="1" />

          {/* Glowing Area under path */}
          <path d={areaD} fill="url(#chart-glow)" />

          {/* Path Line */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="4" fill="#0f0f13" stroke="#6366f1" strokeWidth="2" />
              <circle cx={pt.x} cy={pt.y} r="8" fill="#6366f1" opacity="0" className="hover:opacity-20 transition-opacity duration-150" />
              
              {/* Tooltip on hover */}
              <title>{`${pt.date}: ${Math.round(pt.score)}%`}</title>
            </g>
          ))}

          {/* X axis labels */}
          {drift_over_time.length > 0 && (
            <>
              <text x={paddingLeft} y={height - 10} fill="#a0a0b0" fontSize="8" textAnchor="middle">
                {drift_over_time[0].date.split('-').slice(1).join('/')}
              </text>
              <text x={width - paddingRight} y={height - 10} fill="#a0a0b0" fontSize="8" textAnchor="middle">
                {drift_over_time[drift_over_time.length - 1].date.split('-').slice(1).join('/')}
              </text>
            </>
          )}

          {/* Y axis labels */}
          <text x={paddingLeft - 8} y={paddingTop + 4} fill="#a0a0b0" fontSize="8" textAnchor="end">100%</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 4} fill="#a0a0b0" fontSize="8" textAnchor="end">50%</text>
          <text x={paddingLeft - 8} y={height - paddingBottom + 4} fill="#a0a0b0" fontSize="8" textAnchor="end">0%</text>
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Insights & Analytics</h1>
        <p className="text-sm text-drift-textMuted">Evaluate behavioral trends, category ratios, and streak data.</p>
      </div>

      {/* 1. Six Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-4 flex flex-col justify-between h-28 shadow-md">
          <div className="flex items-center justify-between text-drift-textMuted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Tasks</span>
            <FileText className="w-4 h-4 text-drift-accent" />
          </div>
          <span className="text-2xl font-extrabold text-white">{metrics.total_tasks}</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-4 flex flex-col justify-between h-28 shadow-md">
          <div className="flex items-center justify-between text-drift-textMuted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completion Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{metrics.completion_rate}%</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-4 flex flex-col justify-between h-28 shadow-md">
          <div className="flex items-center justify-between text-drift-textMuted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Drift Score</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{metrics.average_drift_score}%</span>
        </div>

        {/* Metric 4 */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-4 flex flex-col justify-between h-28 shadow-md">
          <div className="flex items-center justify-between text-drift-textMuted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Common Tag</span>
            <Sparkles className="w-4 h-4 text-drift-accent animate-pulse" />
          </div>
          <span className="text-sm font-bold text-white truncate max-w-full" title={metrics.most_common_tag}>
            {metrics.most_common_tag}
          </span>
        </div>

        {/* Metric 5 */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-4 flex flex-col justify-between h-28 shadow-md">
          <div className="flex items-center justify-between text-drift-textMuted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Extensions</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{metrics.total_extensions}</span>
        </div>

        {/* Metric 6 */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-4 flex flex-col justify-between h-28 shadow-md">
          <div className="flex items-center justify-between text-drift-textMuted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sacred Streak</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{metrics.longest_streak}</span>
        </div>

      </div>

      {/* 2. Charts and lists panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tag Distribution Bar Chart */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 select-none">
            <BarChart className="w-4.5 h-4.5 text-drift-accent" />
            <span>AI Coach Delay Tag Distribution</span>
          </h3>

          {tag_distribution.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-drift-textMuted">
              No delay tag logs available yet. Keep timelines clean!
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {tag_distribution.map((tagObj) => {
                const percent = Math.max(5, (tagObj.count / maxTagCount) * 100);
                return (
                  <div key={tagObj.tag} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-200">{tagObj.tag}</span>
                      <span className="text-drift-textMuted">{tagObj.count} occurrence(s)</span>
                    </div>
                    <div className="w-full h-3 bg-[#13131c] rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-drift-accent rounded-lg transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drift Score Over Time line chart */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 select-none">
            <TrendingUp className="w-4.5 h-4.5 text-drift-accent" />
            <span>Drift Score Over Time</span>
          </h3>
          {renderDriftChart()}
        </div>

        {/* Category breakdown table */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 select-none">
            <Layers className="w-4.5 h-4.5 text-drift-accent" />
            <span>Category Productivity Ratios</span>
          </h3>

          {category_breakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-drift-textMuted">
              No categories mapped yet.
            </div>
          ) : (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-drift-border text-drift-textMuted font-bold uppercase">
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5 text-center">Tasks</th>
                    <th className="py-2.5 text-center">Extension Rate</th>
                    <th className="py-2.5 text-center">Avg Exts/Task</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c28]">
                  {category_breakdown.map((cat) => (
                    <tr key={cat.category} className="hover:bg-[#14141c] transition-colors duration-150">
                      <td className="py-3 font-semibold text-white">{cat.category}</td>
                      <td className="py-3 text-center text-gray-300">{cat.task_count}</td>
                      <td className="py-3 text-center text-amber-400 font-semibold">{cat.extension_rate}%</td>
                      <td className="py-3 text-center text-gray-300">{cat.avg_extensions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drift Hall of Fame */}
        <div className="bg-drift-card border border-drift-border rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 select-none">
            <Award className="w-4.5 h-4.5 text-drift-accent" />
            <span>Drift Hall of Fame (Most Extended)</span>
          </h3>

          {hall_of_fame.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-drift-textMuted">
              Hall of fame is currently empty. Maintain task deadlines!
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {hall_of_fame.map((task, idx) => (
                <div 
                  key={task.id}
                  className="bg-[#181824] border border-drift-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black text-drift-accent bg-drift-accent bg-opacity-10 w-7 h-7 rounded-full flex items-center justify-center border border-drift-accent border-opacity-20 select-none">
                      #{idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <span className="block text-sm font-semibold text-white truncate max-w-[180px] md:max-w-md" title={task.title}>
                        {task.title}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.tags.map((tag) => (
                          <span key={tag} className="text-[8px] font-bold bg-drift-border text-drift-textMuted px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-black text-rose-400 bg-rose-500 bg-opacity-10 px-2.5 py-1 rounded-lg border border-rose-500 border-opacity-20 flex-shrink-0 select-none">
                    {task.extension_count} Ext
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Insights;
