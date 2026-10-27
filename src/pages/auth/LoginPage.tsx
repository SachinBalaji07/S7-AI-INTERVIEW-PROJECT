import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Sparkles, Briefcase, User, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [dob, setDob] = useState('');
  const [education, setEducation] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [skills, setSkills] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, loginAsDemo } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleDemoLogin = async (demoRole: 'candidate' | 'recruiter') => {
    setIsSubmitting(true);
    try {
      await loginAsDemo(demoRole);
      showToast(`Welcome! Logged in as demo ${demoRole}.`, 'success');
      navigate(demoRole === 'recruiter' ? '/admin' : '/candidate');
    } catch {
      showToast('Demo login encountered an issue.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (activeTab === 'login') {
      const res = await login(email, password);
      if (res.success) {
        showToast('Signed in successfully!', 'success');
        navigate(res.role === 'recruiter' ? '/admin' : '/candidate');
      } else {
        showToast(res.message || 'Invalid credentials', 'error');
      }
    } else {
      if (!name.trim()) {
        showToast('Please enter your full name', 'error');
        setIsSubmitting(false);
        return;
      }
      const res = await register(name, email, password, role, role === 'candidate' ? {
        phone,
        location,
        dob,
        education,
        graduationYear,
        currentRole,
        experienceYears: Number(experienceYears),
        skills: skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      } : undefined);
      if (res.success) {
        showToast('Account registered successfully! Welcome aboard.', 'success');
        navigate(role === 'recruiter' ? '/admin' : '/candidate');
      } else {
        showToast(res.message || 'Registration failed', 'error');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-xl shadow-indigo-500/25 mb-4 ring-1 ring-white/20">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          InterviewAI Platform
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Automated Candidate Interview Sentiment Analytics, Technical & Coding Evaluation
        </p>
      </div>

      {/* Centered Glass Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative z-10">
        {/* Quick Demo Logins */}
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
            One-Click Instant Access
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin('recruiter')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Briefcase className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Demo as Recruiter</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('candidate')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <User className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Demo as Candidate</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 shrink-0">
            OR SIGN IN
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Tabs: Log In / Register */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {activeTab === 'register' && role === 'candidate' && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Candidate profile</h2>
                <p className="mt-1 text-xs text-slate-400">Enter your details so your profile is accurate.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Location</label>
                  <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Birth</label>
                  <input type="date" required max={new Date().toISOString().split('T')[0]} value={dob} onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Graduation Year</label>
                  <input type="number" required min="1950" max={new Date().getFullYear() + 10} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2024"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Education & University</label>
                <input type="text" required value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Degree and institution"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Role</label>
                  <input type="text" required value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Student"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Experience (Years)</label>
                  <input type="number" required min="0" max="40" step="1" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Key Skills (comma separated)</label>
                <input type="text" required value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, TypeScript, SQL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                <p className="mt-1 text-[11px] text-slate-500">Used to match your experience to roles and interview questions.</p>
              </div>
            </section>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            {activeTab === 'register' && <p className="mt-1 text-[11px] text-slate-500">Use at least 8 characters.</p>}
          </div>

          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('candidate')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    role === 'candidate'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Candidate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('recruiter')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    role === 'recruiter'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Recruiter</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-slate-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>SHA-256 Web Crypto hashed & JWT session protected</span>
        </div>
      </div>
    </div>
  );
};
