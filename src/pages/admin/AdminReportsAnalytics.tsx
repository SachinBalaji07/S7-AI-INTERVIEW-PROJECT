import React, { useState } from 'react';
import { getReports, getProfiles } from '../../services/storageService';
import { DecisionBadge } from '../../components/common/Badge';
import { AssessmentReport } from '../../types';
import { Bar, Radar } from 'react-chartjs-2';
import {
  BarChart3,
  Download,
  Users,
  Trophy,
  Award,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const AdminReportsAnalytics: React.FC = () => {
  const reports = getReports();
  const profiles = getProfiles();

  // Selected candidates for comparison (2 to 4)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    reports.slice(0, 3).map((r) => r.candidateId)
  );

  const toggleCandidateSelection = (id: string) => {
    if (selectedCandidateIds.includes(id)) {
      if (selectedCandidateIds.length > 2) {
        setSelectedCandidateIds(selectedCandidateIds.filter((cid) => cid !== id));
      }
    } else {
      if (selectedCandidateIds.length < 4) {
        setSelectedCandidateIds([...selectedCandidateIds, id]);
      }
    }
  };

  // Leaderboard: ranked by overall score desc
  const sortedReports = [...reports].sort((a, b) => b.overallScore - a.overallScore);

  // Filtered reports for side-by-side comparison
  const comparisonReports = reports.filter((r) => selectedCandidateIds.includes(r.candidateId));

  // Comparison Grouped Bar Chart
  const comparisonBarData = {
    labels: ['Technical (40%)', 'Sentiment (25%)', 'Communication (20%)', 'Confidence (15%)', 'Composite'],
    datasets: comparisonReports.map((r, i) => {
      const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b'];
      const color = colors[i % colors.length];
      return {
        label: r.candidateName,
        data: [r.technicalScore, r.sentimentScore, r.communicationScore, r.confidenceScore, r.overallScore],
        backgroundColor: color,
        borderRadius: 6,
      };
    }),
  };

  // Comparison Multi-dataset Radar Chart
  const comparisonRadarData = {
    labels: ['Technical Knowledge', 'Problem Solving', 'Communication', 'Confidence', 'Code Quality', 'Behavioral Fit'],
    datasets: comparisonReports.map((r, i) => {
      const borderColors = ['#6366f1', '#a855f7', '#10b981', '#f43f5e'];
      const bgColors = [
        'rgba(99, 102, 241, 0.15)',
        'rgba(168, 85, 247, 0.15)',
        'rgba(16, 185, 129, 0.15)',
        'rgba(244, 63, 94, 0.15)',
      ];
      return {
        label: r.candidateName,
        data: [
          r.radarCompetencies?.technicalKnowledge || r.technicalScore,
          r.radarCompetencies?.problemSolving || 85,
          r.radarCompetencies?.communication || r.communicationScore,
          r.radarCompetencies?.confidence || r.confidenceScore,
          r.radarCompetencies?.codeQuality || r.codingScore || 85,
          r.radarCompetencies?.behavioralFit || 85,
        ],
        borderColor: borderColors[i % borderColors.length],
        backgroundColor: bgColors[i % bgColors.length],
        borderWidth: 2,
        pointRadius: 3,
      };
    }),
  };

  // Score Distribution Histogram Calculation
  // Ranges: <60, 60-69, 70-79, 80-89, 90-100
  const distributionCounts = [0, 0, 0, 0, 0];
  reports.forEach((r) => {
    const s = r.overallScore;
    if (s < 60) distributionCounts[0]++;
    else if (s < 70) distributionCounts[1]++;
    else if (s < 80) distributionCounts[2]++;
    else if (s < 90) distributionCounts[3]++;
    else distributionCounts[4]++;
  });

  const histogramData = {
    labels: ['<60% (Reject)', '60-69% (Hold)', '70-79% (Hold/Select)', '80-89% (Select)', '90-100% (Top Select)'],
    datasets: [
      {
        label: 'Candidate Count',
        data: distributionCounts,
        backgroundColor: ['#f43f5e', '#f59e0b', '#3b82f6', '#6366f1', '#10b981'],
        borderRadius: 8,
      },
    ],
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Candidate Name',
      'Email',
      'Status',
      'Aptitude Score (%)',
      'Coding Score (%)',
      'Interview Score (%)',
      'Technical (%)',
      'Communication (%)',
      'Confidence (%)',
      'Sentiment (%)',
      'Overall Composite Score (%)',
      'Decision',
      'Completed Date',
    ];

    const rows = sortedReports.map((r) => [
      `"${r.candidateName}"`,
      `"${r.candidateEmail}"`,
      '"Completed"',
      r.aptitudeScore,
      r.codingScore,
      r.interviewScore,
      r.technicalScore,
      r.communicationScore,
      r.confidenceScore,
      r.sentimentScore.toFixed(1),
      r.overallScore.toFixed(1),
      `"${r.decision}"`,
      `"${new Date(r.completedAt).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `InterviewAI_Candidate_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Cohort Reports & Comparative Analytics</h1>
            <p className="text-xs text-slate-400">
              Benchmark candidate competencies, score histograms, and download CSV audit reports.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all hover:scale-[1.02]"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Candidate Cohort Leaderboard</h3>
          </div>
          <span className="text-xs text-slate-400">Ranked by Composite Score</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3 px-3">Rank</th>
                <th className="pb-3 px-3">Candidate</th>
                <th className="pb-3 px-3">Aptitude</th>
                <th className="pb-3 px-3">Coding</th>
                <th className="pb-3 px-3">Technical (40%)</th>
                <th className="pb-3 px-3">Sentiment (25%)</th>
                <th className="pb-3 px-3">Overall Score</th>
                <th className="pb-3 px-3">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedReports.map((r, rank) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                        rank === 0
                          ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                          : rank === 1
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rank + 1}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div>
                      <span className="font-semibold text-slate-100 block">{r.candidateName}</span>
                      <span className="text-[11px] text-slate-400">{r.candidateEmail}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono">{r.aptitudeScore}%</td>
                  <td className="py-3 px-3 font-mono">{r.codingScore}%</td>
                  <td className="py-3 px-3 font-mono text-indigo-400">{r.technicalScore}%</td>
                  <td className="py-3 px-3 font-mono text-emerald-400">{r.sentimentScore.toFixed(0)}%</td>
                  <td className="py-3 px-3">
                    <span className="font-black text-sm text-slate-100">{r.overallScore.toFixed(1)}%</span>
                  </td>
                  <td className="py-3 px-3">
                    <DecisionBadge decision={r.decision} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Comparison Section (Select 2-4 candidates) */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Side-by-Side Candidate Comparison</span>
            </h3>
            <p className="text-xs text-slate-400">Select 2 to 4 candidates to benchmark competency curves.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {reports.map((r) => {
              const isSelected = selectedCandidateIds.includes(r.candidateId);
              return (
                <button
                  key={r.candidateId}
                  onClick={() => toggleCandidateSelection(r.candidateId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {r.candidateName.split(' ')[0]} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grouped Bar Chart */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-3">Grouped Score Dimensions</h4>
            <div className="h-64 w-full">
              <Bar
                data={comparisonBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, max: 100 },
                  },
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>

          {/* Multi-Candidate Radar Chart */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-3">Multi-Candidate Competency Radar</h4>
            <div className="h-64 w-full">
              <Radar
                data={comparisonRadarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                      grid: { color: 'rgba(255, 255, 255, 0.08)' },
                      pointLabels: { color: '#cbd5e1', font: { size: 10 } },
                      ticks: { backdropColor: 'transparent', color: '#64748b', font: { size: 9 }, stepSize: 20 },
                      suggestedMin: 40,
                      suggestedMax: 100,
                    },
                  },
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Score Distribution Histogram */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">Cohort Score Distribution Histogram</h3>
          <p className="text-xs text-slate-400">Applicant counts grouped across performance brackets.</p>
        </div>
        <div className="h-52 w-full">
          <Bar
            data={histogramData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                y: {
                  grid: { color: 'rgba(255,255,255,0.05)' },
                  ticks: { color: '#94a3b8', stepSize: 1 },
                  suggestedMax: 4,
                },
              },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>
    </div>
  );
};
