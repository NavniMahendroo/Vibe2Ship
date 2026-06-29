import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Play, CheckCircle2, Shield, Calendar, BarChart2, MessageSquare, AlertCircle, Clock } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  // Simulator State
  const [taskTitle, setTaskTitle] = useState<string>('Final project report');
  const [category, setCategory] = useState<string>('Academia');
  const [daysAllocated, setDaysAllocated] = useState<number>(3);
  const [calculatedScore, setCalculatedScore] = useState<number>(65);
  const [explanation, setExplanation] = useState<string>('');

  // Live simulator drift risk calculator (Heuristic rule-based)
  useEffect(() => {
    let score = 30; // base risk

    // 1. Category weights
    if (category === 'Academia') score += 25;
    if (category === 'Work') score += 15;
    if (category === 'Side Project') score += 20;
    if (category === 'Life Routine') score += 5;

    // 2. Deadline tightness weights
    if (daysAllocated <= 2) {
      score += 35;
    } else if (daysAllocated <= 5) {
      score += 15;
    } else if (daysAllocated >= 14) {
      score -= 15;
    }

    // 3. Keyword matching weights
    const titleLower = taskTitle.toLowerCase();
    if (titleLower.includes('final') || titleLower.includes('report') || titleLower.includes('exam')) {
      score += 15;
    }
    if (titleLower.includes('fix') || titleLower.includes('debug') || titleLower.includes('bug')) {
      score += 20;
    }
    if (titleLower.includes('quick') || titleLower.includes('easy') || titleLower.includes('simple')) {
      score += 10;
    }
    if (titleLower.includes('clean') || titleLower.includes('organize')) {
      score -= 5;
    }

    // Bound between 0 and 100
    const finalScore = Math.max(5, Math.min(98, score));
    setCalculatedScore(finalScore);

    // Formulate a dynamic explanation
    if (finalScore > 75) {
      setExplanation(`Critical Drift Risk! A ${daysAllocated}-day deadline for an ${category.toLowerCase()} task with matching complex keywords is highly likely to drift. We recommend allocating at least ${daysAllocated + 4} days.`);
    } else if (finalScore > 50) {
      setExplanation(`Moderate Drift Risk. Historically, similar tasks in the "${category}" category require about ${daysAllocated + 2} days. Watch out for scope creep.`);
    } else {
      setExplanation(`Low Drift Risk. A solid timeline. You maintain a high completion probability for "${category}" tasks with this duration.`);
    }
  }, [taskTitle, category, daysAllocated]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400 border-red-500 bg-red-500 bg-opacity-10';
    if (score >= 45) return 'text-amber-400 border-amber-500 bg-amber-500 bg-opacity-10';
    return 'text-emerald-400 border-emerald-500 bg-emerald-500 bg-opacity-10';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 70) return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
    if (score >= 45) return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
    return 'bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]';
  };

  return (
    <div className="min-h-screen bg-drift-bg text-drift-textMuted font-sans relative overflow-x-hidden">
      
      {/* 1. Background Gradient Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-drift-accent opacity-5 filter blur-[150px] animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500 opacity-5 filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-drift-accent opacity-5 filter blur-[150px] pointer-events-none" />

      {/* 2. Top Header Navigation */}
      <header className="border-b border-drift-border bg-drift-bg bg-opacity-80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-10 h-10 rounded-xl bg-drift-accent bg-opacity-10 flex items-center justify-center border border-drift-accent border-opacity-20 shadow-inner">
              <Sparkles className="w-5 h-5 text-drift-accent" />
            </div>
            <span className="text-xl font-bold text-white tracking-wider">DRIFT</span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onNavigate('login')}
              className="text-sm font-semibold text-white hover:text-drift-accent px-4 py-2 transition-colors duration-200"
            >
              Sign In
            </button>
            <button 
              onClick={() => onNavigate('register')}
              className="bg-drift-accent hover:bg-opacity-90 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-drift-accent bg-opacity-10 border border-drift-accent border-opacity-20 px-3.5 py-1.5 rounded-full text-xs font-bold text-drift-accent uppercase tracking-wider select-none mx-auto lg:mx-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Driven Deadline Prediction v2.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] max-w-xl mx-auto lg:mx-0">
            Stop Guessing Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-drift-accent to-indigo-400">Deadlines</span>.
          </h1>

          <p className="text-base sm:text-lg text-drift-textMuted leading-relaxed max-w-lg mx-auto lg:mx-0">
            DRIFT is a smart productivity client that measures your deadline shift history, calculates behavioral completion risk, and automatically schedules rescue blocks when you run late.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button 
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-drift-accent hover:bg-opacity-90 text-white font-semibold px-7 py-4 rounded-xl text-base transition-all duration-200 shadow-lg hover:shadow-xl group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-transparent border border-drift-border hover:bg-drift-border text-white font-semibold px-7 py-4 rounded-xl text-base transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              <span>Enter Workspace</span>
            </button>
          </div>

          {/* Social Proof */}
          <div className="pt-6 border-t border-drift-border border-opacity-40 max-w-md mx-auto lg:mx-0 select-none">
            <div className="flex items-center justify-center lg:justify-start space-x-8 text-xs text-drift-textMuted font-medium">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-drift-accent" />
                <span>No CC Required</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-drift-accent" />
                <span>Local DB Fallback</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-drift-accent" />
                <span>Self-hosted Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Risk Simulator Widget */}
        <div className="lg:col-span-6">
          <div className="bg-[#121219] border border-drift-border rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            {/* Header branding */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-drift-border">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] uppercase font-bold text-drift-textMuted tracking-widest bg-[#1a1a24] px-2.5 py-1 rounded border border-drift-border select-none">
                Interactive Risk Simulator
              </span>
            </div>

            <div className="space-y-6">
              {/* Form Input 1: Task Title */}
              <div>
                <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#171722] border border-drift-border rounded-lg px-4 py-2.5 text-sm text-white focus:border-drift-accent outline-none transition-colors"
                  placeholder="e.g. Write business proposal"
                />
              </div>

              {/* Form Input 2: Category & Slider */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                    Task Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#171722] border border-drift-border rounded-lg px-4 py-2.5 text-sm text-white focus:border-drift-accent outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Work">💼 Work & Development</option>
                    <option value="Academia">🎓 Academia & Research</option>
                    <option value="Side Project">🚀 Side Projects</option>
                    <option value="Life Routine">🧼 Life Routines</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-white uppercase tracking-wider">
                      Days Allocated
                    </label>
                    <span className="text-xs font-bold text-white bg-drift-accent bg-opacity-25 px-2 py-0.5 rounded">
                      {daysAllocated} Day(s)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={daysAllocated}
                    onChange={(e) => setDaysAllocated(parseInt(e.target.value))}
                    className="w-full accent-drift-accent bg-[#171722] h-1.5 rounded-lg appearance-none cursor-pointer outline-none mt-3"
                  />
                </div>
              </div>

              {/* Result: Live score visualization */}
              <div className="bg-[#171723] rounded-xl p-5 border border-drift-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-drift-textMuted font-semibold">Calculated Drift Risk Score</span>
                  <div className={`px-2.5 py-0.5 rounded text-xs font-bold border uppercase tracking-wider ${getScoreColor(calculatedScore)}`}>
                    {calculatedScore}% {calculatedScore >= 70 ? 'High' : calculatedScore >= 45 ? 'Medium' : 'Low'}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-[#0d0d12] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${getScoreProgressColor(calculatedScore)}`}
                    style={{ width: `${calculatedScore}%` }}
                  />
                </div>

                {/* AI Explanation Box */}
                <div className="ai-response-box !m-0 !p-3">
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-drift-accent animate-pulse" />
                    <span className="text-[9px] uppercase tracking-wider font-bold text-white">Gemini Coach Forecast</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    {explanation}
                  </p>
                </div>
              </div>

              {/* Call to action inside widget */}
              <button 
                onClick={() => onNavigate('register')}
                className="w-full bg-[#1b1b26] hover:bg-drift-accent hover:text-white border border-drift-border hover:border-drift-accent py-3 rounded-xl text-xs font-bold text-drift-textMuted tracking-wider uppercase transition-all duration-300 shadow-md"
              >
                Save Timeline & Start Tracking
              </button>

            </div>
          </div>
        </div>

      </section>

      {/* 4. Core Architecture / Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-drift-border relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-bold text-drift-accent uppercase tracking-widest">Core Capabilities</h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">Features Built for Realistic Timelines</h3>
          <p className="text-sm text-drift-textMuted">Drift fits into your life by accepting the reality of delays, instead of punishing you for them.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Drift Risk Engine */}
          <div className="bg-[#121219] border border-drift-border rounded-xl p-6 space-y-4 hover:border-drift-accent transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="w-10 h-10 rounded-lg bg-drift-accent bg-opacity-10 border border-drift-accent border-opacity-20 flex items-center justify-center text-drift-accent">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-white">Drift Risk Engine</h4>
            <p className="text-xs text-drift-textMuted leading-relaxed">
              Calculates task shifting risks dynamically by checking keywords, category history, and allocated time constraints to give you predictive alerts.
            </p>
          </div>

          {/* Card 2: AI Coach Reflection */}
          <div className="bg-[#121219] border border-drift-border rounded-xl p-6 space-y-4 hover:border-drift-accent transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="w-10 h-10 rounded-lg bg-indigo-500 bg-opacity-10 border border-indigo-500 border-opacity-20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-white">AI Coach Reflections</h4>
            <p className="text-xs text-drift-textMuted leading-relaxed">
              Logs Voice Transcriptions or keyboard inputs explaining delays, analyzed by the Gemini API to categorize blockers and provide strategic reflection.
            </p>
          </div>

          {/* Card 3: Visual Rescue Scheduler */}
          <div className="bg-[#121219] border border-drift-border rounded-xl p-6 space-y-4 hover:border-drift-accent transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-white">Visual Rescue Scheduler</h4>
            <p className="text-xs text-drift-textMuted leading-relaxed">
              Generates concrete time blocks automatically matching extended durations, placing them visual on your calendar so you actively make up for lost time.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Product Preview Section */}
      <section className="max-w-7xl mx-auto px-6 pb-32 relative z-10">
        <div className="bg-[#121219] border border-drift-border rounded-2xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-[-50%] right-[-30%] w-[400px] h-[400px] rounded-full bg-drift-accent opacity-5 filter blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Designed to make scheduling simple.
              </h3>
              <p className="text-xs sm:text-sm text-drift-textMuted leading-relaxed">
                By understanding your drift statistics, our dashboard tracks how many times you extend certain categories. Get actionable feedback and adjust your goals automatically over time.
              </p>
              
              <ul className="space-y-3 text-xs text-white text-left font-medium max-w-xs mx-auto lg:mx-0 select-none">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-drift-green" />
                  <span>Proactive Interventions & Overdue Warnings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-drift-green" />
                  <span>Interactive Delay Tagging & Analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-drift-green" />
                  <span>Auto-saved sqlite-fallback for local devs</span>
                </li>
              </ul>

              <button 
                onClick={() => onNavigate('register')}
                className="inline-flex items-center space-x-2 bg-white text-drift-bg hover:bg-opacity-90 font-bold text-xs px-6 py-3 rounded-lg uppercase tracking-wider transition-colors duration-200 mt-4"
              >
                <span>Create Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mock Dashboard Frame */}
            <div className="lg:col-span-7 bg-[#0b0b0e] border border-drift-border rounded-xl p-4 md:p-6 shadow-2xl space-y-6 select-none opacity-90 hover:opacity-100 transition-opacity duration-300">
              {/* Fake Menu */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-drift-accent" />
                  <span className="font-bold text-white">DRIFT Workspace</span>
                </div>
                <span className="text-[10px] text-drift-accent bg-drift-accent bg-opacity-10 px-2 py-0.5 rounded font-bold uppercase">
                  LANASPACE ACTIVE
                </span>
              </div>

              {/* Fake task cards */}
              <div className="space-y-4">
                <div className="bg-[#14141c] border-l-4 border-l-red-500 border border-drift-border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-[#181824] border border-drift-border text-[9px] px-2 py-0.5 rounded-full text-drift-textMuted font-bold">
                      Work
                    </span>
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                      92% High Risk
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Implement Docker setup for local fallback</h4>
                  <div className="flex justify-between items-center text-[10px] text-drift-textMuted pt-2 border-t border-drift-border border-opacity-50">
                    <span>Due: Today (Shifted +4d)</span>
                    <span className="text-red-400 font-bold">3 extensions logged</span>
                  </div>
                </div>

                <div className="bg-[#14141c] border-l-4 border-l-amber-500 border border-drift-border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-[#181824] border border-drift-border text-[9px] px-2 py-0.5 rounded-full text-drift-textMuted font-bold">
                      Academia
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      54% Med Risk
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Revise and edit thesis first draft</h4>
                  <div className="flex justify-between items-center text-[10px] text-drift-textMuted pt-2 border-t border-drift-border border-opacity-50">
                    <span>Due: Tomorrow</span>
                    <span className="text-amber-400 font-bold">1 extension logged</span>
                  </div>
                </div>
              </div>

              {/* Fake calendar grid */}
              <div className="bg-[#121219] p-3 rounded-lg border border-drift-border space-y-2">
                <span className="text-[9px] uppercase font-bold text-drift-textMuted tracking-wider">Upcoming Calendar Grid</span>
                <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-drift-textMuted font-bold">
                  <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  <div className="h-6 rounded bg-[#1c1c28]" />
                  <div className="h-6 rounded bg-[#1c1c28] flex items-center justify-center text-[9px] text-white font-bold relative">
                    12
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
                  <div className="h-6 rounded bg-[#1c1c28] flex items-center justify-center text-[9px] text-white font-bold relative">
                    13
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="h-6 rounded bg-drift-accent bg-opacity-20 flex items-center justify-center text-[9px] text-drift-accent font-bold">
                    14 (T)
                  </div>
                  <div className="h-6 rounded bg-[#1c1c28]" />
                  <div className="h-6 rounded bg-[#1c1c28]" />
                  <div className="h-6 rounded bg-[#1c1c28]" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="border-t border-drift-border py-12 bg-[#0b0b0e] text-center">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <div className="flex justify-center items-center space-x-2">
            <Sparkles className="w-5 h-5 text-drift-accent" />
            <span className="text-sm font-bold text-white tracking-widest">DRIFT. PROACTIVE BEHAVIORAL INTELLIGENCE.</span>
          </div>
          <p className="text-xs text-gray-500">© 2026 Drift Project. All rights reserved. Crafted for developers & high-risk deadline planners.</p>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
