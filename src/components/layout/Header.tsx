import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogOut, User as UserIcon, Shield, Briefcase, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitchRole = async () => {
    if (!user) return;
    const targetRole = user.role === 'candidate' ? 'recruiter' : 'candidate';
    await loginAsDemo(targetRole);
    navigate(targetRole === 'recruiter' ? '/admin' : '/candidate');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate(user?.role === 'recruiter' ? '/admin' : '/candidate')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                InterviewAI
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PLATFORM
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">
              Sentiment Analytics & Technical Competency Evaluation
            </p>
          </div>
        </div>

        {/* Right Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Quick Switch Role Helper Button */}
            <button
              onClick={handleQuickSwitchRole}
              title={`Switch to ${user.role === 'candidate' ? 'Recruiter' : 'Candidate'} view`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch to {user.role === 'candidate' ? 'Recruiter' : 'Candidate'}</span>
            </button>

            {/* Role indicator */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-200">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                  {user.role === 'recruiter' ? (
                    <>
                      <Briefcase className="w-2.5 h-2.5 text-purple-400" /> Recruiter (Admin)
                    </>
                  ) : (
                    <>
                      <Shield className="w-2.5 h-2.5 text-indigo-400" /> Candidate
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">Authentication Portal</div>
        )}
      </div>
    </header>
  );
};
