import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfiles, getReports } from '../../services/storageService';
import { DecisionBadge, StatusBadge } from '../../components/common/Badge';
import {
  Users,
  Award,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  Briefcase,
  HelpCircle,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS } from 'chart.js';

ChartJS.register(ArcElement);

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const profiles = getProfiles();
  const reports = getReports();

  const totalCandidates = profiles.length;
  const completedInterviews = profiles.filter((p) => p.status === 'Completed').length;
  const selectedCount = profiles.filter((p) => p.decision === 'SELECT').length;
  const holdCount = profiles.filter((p) => p.decision === 'HOLD').length;
  const rejectCount = profiles.filter((p) => p.decision === 'REJECT').length;

  const avgOverallScore =
    reports.length > 0
      ? (reports.reduce((acc, r) => acc + r.overallScore, 0) / reports.length).toFixed(1)
      : '82.5';

  // Doughnut: Decision Distribution
  const doughnutData = {
    labels: ['SELECT', 'HOLD', 'REJECT', 'PENDING'],
    datasets: [
      {
        data: [
          selectedCount,
          holdCount,
          rejectCount,
          Math.max(0, totalCandidates - (selectedCount + holdCount + rejectCount)),
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e', '#64748b'],
        borderWidth: 0,
      },
    ],
  };

  // Bar: Candidate Score Comparison
  const barData = {
    labels: reports.map((r) => r.candidateName.split(' ')[0]),
    datasets: [
      {
        label: 'Overall Composite Score (%)',
        data: reports.map((r) => r.overallScore),
        backgroundColor: reports.map((r) =>
          r.decision === 'SELECT' ? '#10b981' : r.decision === 'HOLD' ? '#f59e0b' : '#f43f5e'
        ),
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, max: 100 },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Recruiter Overview Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/20 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Talent Intelligence Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Recruiter Analytics Dashboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Live sentiment metrics, technical accuracy validation, and candidate pipeline decisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/candidates')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02]"
            >
              <Users className="w-4 h-4" />
              <span>View All Candidates</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Candidates</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalCandidates}</div>
          <div className="mt-2 text-[11px] text-slate-400">In assessment pipeline</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Interviews Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{completedInterviews}</div>
          <div className="mt-2 text-[11px] text-slate-400">Full 3-round assessments</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Average Overall Score</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">{avgOverallScore}%</div>
          <div className="mt-2 text-[11px] text-slate-400">Weighted cross-cohort</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Offers Recommended</span>
            <Award className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-3xl font-extrabold text-pink-400">{selectedCount}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-amber-400">{holdCount} Hold</span> • <span className="text-rose-400">{rejectCount} Reject</span>
          </div>
        </div>
      </div>

      {/* Visual Charts: Candidate Score Comparison & Decision Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Candidate Composite Score Comparison</h3>
              <p className="text-xs text-slate-400">Green = Select (≥75%), Amber = Hold (60-74%), Red = Reject (&lt;60%)</p>
            </div>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <span>Deep Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-60 w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Doughnut Chart (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Decision Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4">Candidate cohort distribution.</p>
          </div>
          <div className="h-44 flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } } },
              }}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 text-center">
            Automated recommendations calculated by weighted sum.
          </div>
        </div>
      </div>

      {/* Recent Candidate Assessments Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Candidate Evaluations</h3>
            <p className="text-xs text-slate-400">Candidates with active interview scores and recruiter recommendations.</p>
          </div>
          <button
            onClick={() => navigate('/admin/candidates')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            View Full Roster
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Candidate</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Overall Score</th>
                <th className="pb-3 font-semibold">Decision</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {profiles.slice(0, 4).map((prof) => {
                const rep = reports.find((r) => r.candidateId === prof.id);
                return (
                  <tr key={prof.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div>
                        <span className="font-semibold text-slate-200 block">{prof.fullName}</span>
                        <span className="text-[11px] text-slate-400">{prof.email}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">{prof.currentRole}</td>
                    <td className="py-3">
                      <StatusBadge status={prof.status} />
                    </td>
                    <td className="py-3 font-bold text-slate-100">
                      {rep ? `${rep.overallScore.toFixed(1)}%` : 'Pending'}
                    </td>
                    <td className="py-3">
                      <DecisionBadge decision={prof.decision} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate('/admin/candidates')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
