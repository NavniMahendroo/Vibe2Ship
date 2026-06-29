import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import client from '../api/client';

interface RegisterProps {
  onNavigate: (page: string) => void;
  onRegisterSuccess: (token: string, user: any) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate, onRegisterSuccess }) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Call register endpoint
      await client.post('/api/auth/register', { name, email, password });
      
      // 2. Automatically log in on registration success
      const loginResponse = await client.post('/api/auth/login', { email, password });
      const { access_token } = loginResponse.data;
      
      // Fetch user profile info
      const userProfile = await client.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      onRegisterSuccess(access_token, userProfile.data);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-drift-bg px-4 relative overflow-hidden">
      
      {/* Back to Landing Button */}
      <button
        onClick={() => onNavigate('landing')}
        className="absolute top-6 left-6 flex items-center space-x-2 text-sm text-drift-textMuted hover:text-white transition-colors duration-200 bg-drift-card bg-opacity-40 backdrop-blur border border-drift-border px-3.5 py-2 rounded-lg z-20"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-semibold text-xs uppercase tracking-wider">Back</span>
      </button>

      {/* Background visual glowing filters */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-drift-accent opacity-5 filter blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500 opacity-5 filter blur-[120px]" />

      <div className="w-full max-w-md bg-drift-card border border-drift-border rounded-xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-drift-accent bg-opacity-10 rounded-xl flex items-center justify-center text-drift-accent mx-auto mb-3 border border-drift-accent border-opacity-20 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create Account</h1>
          <p className="text-sm text-drift-textMuted font-medium">Join Drift and master your productivity patterns.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 text-red-400 rounded-lg p-3 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-drift-textMuted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="drift-input pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-drift-textMuted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="drift-input pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-drift-textMuted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="drift-input pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-drift-accent hover:bg-opacity-95 text-white py-3 rounded-lg font-semibold text-sm shadow-md transition-all duration-200 flex justify-center items-center space-x-2"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-drift-border pt-6 text-center">
          <p className="text-xs text-drift-textMuted font-medium">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-drift-accent hover:underline font-semibold"
              disabled={loading}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
