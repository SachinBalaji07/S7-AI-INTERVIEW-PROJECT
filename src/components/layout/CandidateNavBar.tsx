import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCheck, BrainCircuit, Code2, Video, FileSpreadsheet, Briefcase } from 'lucide-react';

export const CandidateNavBar: React.FC = () => {
  const tabs = [
    { to: '/candidate', label: 'Candidate Portal', icon: LayoutDashboard, end: true },
    { to: '/candidate/profile', label: 'Profile & Resume', icon: UserCheck },
    { to: '/candidate/jobs', label: 'Browse Jobs', icon: Briefcase },
    { to: '/candidate/aptitude', label: 'Aptitude Round 1', icon: BrainCircuit },
    { to: '/candidate/coding', label: 'Round 2: Coding Evaluation', icon: Code2 },
    { to: '/candidate/interview', label: 'Round 3: AI WebRTC Interview', icon: Video },
    { to: '/candidate/report', label: 'My Assessment Report', icon: FileSpreadsheet },
  ];

  return (
    <nav className="w-full bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
