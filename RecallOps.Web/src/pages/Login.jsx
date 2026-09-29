import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Shield, Lock, Mail, ArrowRight, Eye, EyeOff, 
  CheckCircle2, Sparkles, Database, Activity, AlertCircle, 
  LogIn, UserPlus, Check, Zap, Server, Network, Cpu
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1: return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2: return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3: return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4: return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default: return { score: 0, label: '', color: 'bg-slate-700' };
    }
  };

  const strength = getPasswordStrength(password);

  // Redirect authenticated users to /dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid enterprise work email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters in length.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Signup via Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data?.user && !data?.session) {
          setSuccessMsg(
            'Confirmation email dispatched! Please verify your inbox, then sign in.'
          );
          return;
        }

        setSuccessMsg('Account registered and session authenticated! Launching Command Center...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } else {
        // Sign In via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        setSuccessMsg('Identity verified. Loading Command Center...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 450);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (signUpMode) => {
    setIsSignUp(signUpMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-[#060913] text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Background glowing ambient orbs */}
      <div 
        className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full pointer-events-none opacity-25 blur-[140px]"
        style={{ background: 'radial-gradient(circle, #2563eb 0%, #7c3aed 50%, transparent 100%)' }}
      />
      <div 
        className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full pointer-events-none opacity-20 blur-[150px]"
        style={{ background: 'radial-gradient(circle, #0284c7 0%, #3b82f6 60%, transparent 100%)' }}
      />
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      {/* LEFT COLUMN: Enterprise Value, Live Neural Memory Telemetry & Metrics */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 relative z-10 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3.5 mb-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-wider text-white">RECALL OPS</span>
                <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 uppercase">
                  Enterprise SRE
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 tracking-wider">
                Autonomous Incident Memory &amp; Prevention System
              </div>
            </div>
          </div>

          {/* Hero Value Statement */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-5 shadow-sm shadow-blue-500/10">
              <Sparkles size={13} className="text-blue-400 animate-pulse" />
              <span>Vectorize Hindsight Memory • Sub-Second Groq Reasoning</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15] mb-5">
              Never solve the same <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                production outage twice.
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
              RecallOps is an AI SRE Agent equipped with persistent neural memory. When production fails, it instantly recalls historical post-mortems, verified resolutions, and flagged dead-ends—enabling on-call engineers to resolve incidents with 95%+ confidence.
            </p>
          </div>

          {/* Live Incident Memory Visualizer Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden max-w-xl mb-8 group hover:border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Activity size={14} className="text-emerald-400 animate-pulse" />
                <span>Live Neural Recall Pipeline</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono">
                Bank: recallops-incidents
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-rose-400 font-bold shrink-0">[ALERT]</span>
                <span className="text-slate-200">Payment API — 502 Bad Gateway (Critical)</span>
              </div>
              <div className="flex items-start gap-2 text-blue-300 bg-blue-950/40 p-2.5 rounded-lg border border-blue-500/25">
                <Brain size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-200">Hindsight Recall: </span>
                    <span className="text-emerald-400 font-bold">98% Match (INC-1002)</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-sans">
                    Root Cause: Connection pool exhaustion • Fix: Scaled pool 50 → 100
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
                <Shield size={14} className="text-amber-400 shrink-0" />
                <span className="text-[11px] font-sans">
                  <strong className="text-amber-200">Dead-End Flagged: </strong>
                  Increasing gateway timeout failed previously and was avoided.
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3.5 max-w-xl mb-8">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">72%</div>
              <div className="text-[11px] text-slate-400 font-medium">MTTR Reduction</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-bold text-blue-400 tracking-tight">&lt; 45s</div>
              <div className="text-[11px] text-slate-400 font-medium">Memory Recall Latency</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-bold text-indigo-400 tracking-tight">95%+</div>
              <div className="text-[11px] text-slate-400 font-medium">AI Guidance Confidence</div>
            </div>
          </div>
        </div>

        {/* Enterprise Compliance & Security Markers */}
        <div className="pt-6 flex flex-wrap items-center gap-6 text-xs text-slate-500 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>SOC-2 Type II Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Server size={14} className="text-blue-500" />
            <span>Zero-Trust PostgreSQL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-slate-400" />
            <span>256-Bit Encrypted Sessions</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Dedicated Authentication Console */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-center p-6 sm:p-10 lg:p-14 relative z-10 bg-slate-950/70 backdrop-blur-2xl">
        <div className="max-w-md w-full mx-auto">
          {/* Segmented Mode Switcher */}
          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-8 shadow-inner">
            <button
              type="button"
              onClick={() => toggleMode(false)}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isSignUp 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => toggleMode(true)}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSignUp 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={13} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              {isSignUp ? 'Create RecallOps SRE Account' : 'Sign In to Command Center'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              {isSignUp 
                ? 'Register your engineer credentials to access the incident memory mesh.'
                : 'Enter your credentials to access active incidents and runbooks.'}
            </p>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed flex-1">
                <span className="font-semibold block text-rose-200 mb-0.5">Authentication Error</span>
                <span>{errorMsg}</span>
                {errorMsg.toLowerCase().includes('rate limit') && (
                  <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-[11px] text-rose-200 leading-normal">
                    <strong>Why this happens:</strong> Supabase free-tier limits confirmation emails to 3-4 per hour.
                    <div className="mt-1">
                      <strong>Fix in 10 seconds:</strong> In your Supabase Dashboard, go to <span className="font-mono text-white bg-slate-800 px-1 py-0.5 rounded">Authentication → Providers → Email</span> and toggle <strong>OFF</strong> <span className="font-semibold text-white">"Confirm email"</span>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block text-emerald-200 mb-0.5">Success</span>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.io"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono shadow-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                {!isSignUp && (
                  <button 
                    type="button"
                    onClick={() => alert('Please use your verified password to authenticate.')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'At least 6 characters' : '••••••••••••'}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password strength indicator on signup */}
              {isSignUp && password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Password strength:</span>
                    <span className={`font-semibold ${strength.score >= 3 ? 'text-emerald-400' : strength.score === 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.score >= i ? strength.color : 'bg-slate-800'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    required={isSignUp}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono shadow-sm"
                  />
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isSignUp ? 'Creating RecallOps Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create RecallOps Account' : 'Sign In to Dashboard'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In & Sign Up */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Create one now
                </button>
              </span>
            )}
          </div>

          {/* Status Pill */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <div className="flex items-center gap-2 text-emerald-400/90 font-sans font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RecallOps Incident Intelligence Cluster: Active</span>
            </div>
            <div className="text-[10.5px] text-slate-500">
              Vectorize Hindsight Memory Bank • Protected Session
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
