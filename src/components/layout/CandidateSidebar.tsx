import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  User,
  FileText,
  Layers,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
  Code2,
  Video,
  FileSpreadsheet,
  LogOut,
  Award,
  Briefcase,
} from 'lucide-react';

export const CandidateSidebar: React.FC = () => {
  const { user, candidateProfile, logout } = useAuth();
  const [roundsOpen, setRoundsOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between border-r border-slate-800/80 bg-slate-950/50 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        {/* Candidate Mini Profile Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-inner">
              {user?.name?.slice(0, 2).toUpperCase() || 'CA'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{user?.name}</h4>
              <p className="text-xs text-slate-400 truncate">{candidateProfile?.currentRole || 'Candidate'}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status:</span>
            <span className="font-medium text-indigo-400">{candidateProfile?.status || 'In Progress'}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-1">
          <NavLink
            to="/candidate"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/candidate/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </NavLink>

          <NavLink
            to="/candidate/jobs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <Briefcase className="w-4 h-4" />
            <span>Browse Jobs</span>
          </NavLink>

          <NavLink
            to="/candidate/profile"
            onClick={() => {
              setTimeout(() => {
                const el = document.getElementById('resume-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>My Resume</span>
          </NavLink>

          {/* Collapsible Rounds */}
          <div>
            <button
              onClick={() => setRoundsOpen(!roundsOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Interview Rounds</span>
              </div>
              {roundsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {roundsOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                <NavLink
                  to="/candidate/aptitude"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Aptitude (Round 1)</span>
                </NavLink>

                <NavLink
                  to="/candidate/coding"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Coding (Round 2)</span>
                </NavLink>

                <NavLink
                  to="/candidate/interview"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  <Video className="w-3.5 h-3.5 text-pink-400" />
                  <span>AI WebRTC (Round 3)</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink
            to="/candidate/report"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Assessment Report</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom Area */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>AI Verified Track</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Sentiment cadence & technical depth evaluated in real-time.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
