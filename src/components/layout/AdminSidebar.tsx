import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  HelpCircle,
  MessageSquare,
  BarChart3,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/candidates', label: 'Candidates', icon: Users },
    { to: '/admin/jobs', label: 'Jobs & Assessments', icon: Briefcase },
    { to: '/admin/questions', label: 'Question Bank', icon: HelpCircle },
    { to: '/admin/responses', label: 'Interviews & Responses', icon: MessageSquare },
    { to: '/admin/analytics', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between border-r border-slate-800/80 bg-slate-950/50 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        {/* Recruiter Badge Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-purple-950/40 to-slate-950 border border-purple-500/20 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user?.name?.slice(0, 2).toUpperCase() || 'RC'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{user?.name}</h4>
              <p className="text-[11px] text-purple-400 font-medium">Recruiting Lead</p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Admin Console:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-purple-400" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Gemini 2.5 Flash</span>
          </div>
          Sentiment & semantic scoring engine active.
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
