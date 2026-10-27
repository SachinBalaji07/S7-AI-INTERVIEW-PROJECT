import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DecisionBadge, SentimentBadge, EmotionBadge } from '../../components/common/Badge';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Radar, Bar, Line } from 'react-chartjs-2';
import {
  FileText,
  Printer,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Brain,
  MessageSquare,
  Activity,
  Smile,
  Volume2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Share2,
  Code2,
  Video,
  XCircle,
} from 'lucide-react';
import { AssessmentReport, InterviewAnswerRecord } from '../../types';
import { ACTIVE_APPLICATION_KEY } from '../../context/ApplicationContext';
import { fetchApplication } from '../../services/backendService';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

import { exitAppFullscreen, requestAppFullscreen } from '../../components/common/FullscreenGuard';
import {
  getAptitudeResult,
  getCodingSubmissions,
  getReportForCandidate,
  getReportByCandidateId,
  generateInstantReportForCandidate,
  saveReport,
} from '../../services/storageService';

export const ReportPage: React.FC<{ candidateIdProp?: string }> = ({ candidateIdProp }) => {
  const { user, token, candidateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [activeReport, setActiveReport] = useState<AssessmentReport | null>(null);

  // Automatically ensure fullscreen is released when viewing the report
  React.useEffect(() => {
    exitAppFullscreen();
  }, []);

  // Retrieve report strictly for the current candidate or requested candidateId
  React.useEffect(() => {
    let found: AssessmentReport | null = null;
    if (candidateIdProp) {
      found = getReportByCandidateId(candidateIdProp) || null;
    } else if (user) {
      // Find report belonging strictly to this user
      const applicationId = localStorage.getItem(ACTIVE_APPLICATION_KEY);
      found =
        (applicationId ? getReportForCandidate(user.id, user.email, applicationId) : undefined) ||
        (!applicationId ? getReportForCandidate(user.id, user.email) : undefined) ||
        (candidateProfile ? getReportByCandidateId(candidateProfile.id) : null) ||
        (user.email.toLowerCase() === 'alex.johnson@example.com' ? getReportByCandidateId('prof-alex') : null) ||
        null;
    }

    if (found) {
      // Correct legacy reports where overallScore was computed only on interview metrics
      const aptS = found.aptitudeScore ?? 0;
      const codS = found.codingScore ?? 0;
      const intS = found.interviewScore ?? 0;

      if (found.overallScore === 0 && (codS > 0 || aptS > 0)) {
        const correctedOverall = Number(((aptS * 0.25) + (codS * 0.45) + (intS * 0.30)).toFixed(1));
        found.overallScore = correctedOverall;
        if (codS >= 70 && intS < 30) {
          found.decision = 'HOLD';
          found.decisionReason = `Candidate demonstrated strong practical coding proficiency (${codS}%) and passed aptitude (${aptS}%), but received a 0% score in Round 3 Interview due to inaudible speech or silence. Status placed on HOLD for a communication verification re-interview.`;
          if (found.keyStrengths && found.keyStrengths.some((s) => s.includes('articulation'))) {
            found.keyStrengths = [
              `Strong algorithmic problem-solving and coding proficiency (${codS}%)`,
              `Completed analytical reasoning and aptitude evaluation (${aptS}%)`,
              'Demonstrated clean code structure in submitted problems',
            ];
          }
          if (found.recommendedImprovements) {
            found.recommendedImprovements = [
              'Provide audible verbal explanations during the live WebRTC interview',
              'Check microphone hardware setup and audio input settings',
              'Practice verbalizing technical design trade-offs aloud',
            ];
          }
          if (found.radarCompetencies) {
            found.radarCompetencies.communication = 0;
            found.radarCompetencies.confidence = 0;
            found.radarCompetencies.codeQuality = codS;
            found.radarCompetencies.problemSolving = Math.round((codS + aptS) / 2);
          }
        }
        saveReport(found);
      }
    }

    setActiveReport(found);
    const applicationId = localStorage.getItem(ACTIVE_APPLICATION_KEY);
    if (!candidateIdProp && token && applicationId) {
      fetchApplication(token, applicationId).then(({ application }) => {
        if (application.report) setActiveReport(application.report);
      }).catch((error) => console.error('Unable to load the shared assessment report:', error));
    }
  }, [candidateIdProp, user, candidateProfile, token]);

  const report = activeReport;

  const handlePrint = () => {
    window.print();
  };

  const candidateDisplayName = user?.name || candidateProfile?.fullName || 'Candidate';
  const candidateDisplayEmail = user?.email || candidateProfile?.email || '';

  // Check round progress for candidate
  const applicationId = localStorage.getItem(ACTIVE_APPLICATION_KEY);
  const aptitudeRes = applicationId ? getAptitudeResult(applicationId) : null;
  const codingSubs = applicationId ? getCodingSubmissions(applicationId) : [];

  const handleGenerateInstant = () => {
    const candId = candidateProfile?.id || `prof-${user?.id || Date.now()}`;
    const newReport = generateInstantReportForCandidate(
      candId,
      candidateDisplayName,
      candidateDisplayEmail
    );
    setActiveReport(newReport);
    void refreshProfile().catch((error) => console.error('Unable to synchronize candidate profile:', error));
  };

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl text-center shadow-xl space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
            <FileText className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Assessment In Progress
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">
              Assessment Report for {candidateDisplayName}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Candidate Account: <strong className="text-slate-200">{candidateDisplayEmail}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              You haven't completed your evaluation rounds yet. Complete all 3 rounds to generate your automated sentiment analytics, speech metrics, and recruiter hiring recommendation.
            </p>
          </div>

          {/* Current Evaluation Rounds Checklist */}
          <div className="text-left bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Your Assessment Status
            </span>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Brain className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-200">Round 1: Aptitude & Logic</span>
              </div>
              <span className={aptitudeRes ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {aptitudeRes ? `${aptitudeRes.score}% (Completed)` : 'Not Started'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-slate-200">Round 2: Coding Evaluation</span>
              </div>
              <span className={codingSubs.length >= 2 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {codingSubs.length >= 2 ? 'Completed' : `${codingSubs.length} of 2 Submitted`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-pink-400" />
                <span className="font-semibold text-slate-200">Round 3: AI WebRTC Interview</span>
              </div>
              <span className="text-amber-400 font-semibold">Pending Completion</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={async () => {
                await requestAppFullscreen();
                if (!aptitudeRes) navigate('/candidate/aptitude');
                else if (codingSubs.length < 2) navigate('/candidate/coding');
                else navigate('/candidate/interview');
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
            >
              Start Assessment (Full Screen)
            </button>

            <button
              onClick={handleGenerateInstant}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs sm:text-sm font-semibold transition-all"
            >
              Generate Instant Report for {candidateDisplayName}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Radar Chart Data: 6 Core Competencies
  const radarData = {
    labels: ['Technical Knowledge', 'Problem Solving', 'Communication', 'Confidence', 'Code Quality', 'Behavioral Fit'],
    datasets: [
      {
        label: 'Candidate Competency',
        data: [
          report.radarCompetencies?.technicalKnowledge || report.technicalScore,
          report.radarCompetencies?.problemSolving || 86,
          report.radarCompetencies?.communication || report.communicationScore,
          report.radarCompetencies?.confidence || report.confidenceScore,
          report.radarCompetencies?.codeQuality || report.codingScore || 88,
          report.radarCompetencies?.behavioralFit || 85,
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#818cf8',
        borderWidth: 2,
        pointBackgroundColor: '#c084fc',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#c084fc',
      },
      {
        label: 'Benchmark Target (80%)',
        data: [80, 80, 80, 80, 80, 80],
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
        borderColor: 'rgba(148, 163, 184, 0.4)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        pointLabels: {
          color: '#cbd5e1',
          font: { size: 11, family: 'Inter' },
        },
        ticks: {
          backdropColor: 'transparent',
          color: '#64748b',
          stepSize: 20,
          font: { size: 9 },
        },
        suggestedMin: 30,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { size: 11 } },
        position: 'bottom' as const,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#ffffff',
      },
    },
  };

  // Bar Chart Data: Per-Question Scores
  const questionLabels = report.answers?.map((_, idx) => `Q${idx + 1}`) || ['Q1', 'Q2', 'Q3'];
  const barData = {
    labels: questionLabels,
    datasets: [
      {
        label: 'Technical Accuracy',
        data: report.answers?.map((a) => a.analysis.technicalScore) || [94, 92, 93],
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
      {
        label: 'Communication',
        data: report.answers?.map((a) => a.analysis.communicationScore) || [90, 88, 92],
        backgroundColor: '#a855f7',
        borderRadius: 6,
      },
      {
        label: 'Confidence',
        data: report.answers?.map((a) => a.analysis.confidenceScore) || [91, 89, 90],
        backgroundColor: '#ec4899',
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
        suggestedMin: 50,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#cbd5e1', font: { size: 11 } },
      },
    },
  };

  // Line Chart Data: Sentiment Progression across interview questions
  const lineData = {
    labels: questionLabels,
    datasets: [
      {
        label: 'Sentiment Positivity Index (%)',
        data: report.answers?.map((a) => a.analysis.sentimentScore) || [89, 88, 91],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#34d399',
        pointBorderColor: '#ffffff',
        pointRadius: 5,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
        suggestedMin: 60,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#cbd5e1', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16 print:p-0 print:space-y-4">
      {/* Print & Top Controls (Hidden during print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Assessment Concluded • Full Screen Session Ended</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-400" />
            <span>Automated Interview Assessment Report</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Candidate ID: <span className="font-mono text-slate-300">{report.candidateId}</span> • Generated:{' '}
            {new Date(report.completedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/candidate')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Candidate Portal</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Main Score & Decision Banner Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
            {/* Circular Overall Score Radial Badge */}
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-slate-950/90 border-4 border-indigo-500/40 shadow-xl shadow-indigo-500/20 shrink-0">
              <div className="text-center">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-white via-slate-100 to-indigo-300">
                  {report.overallScore.toFixed(1)}%
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                  Composite
                </span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h2 className="text-2xl font-bold text-white">{report.candidateName}</h2>
                <DecisionBadge decision={report.decision} size="lg" />
              </div>
              <p className="text-xs text-slate-400">{report.candidateEmail}</p>

              <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 max-w-xl text-left leading-relaxed">
                <strong className="text-indigo-400">Recruiter Decision Note: </strong>
                {report.decisionReason}
              </div>
            </div>
          </div>

          {/* Assessment Round Breakdown Pills */}
          <div className="flex flex-col gap-2 shrink-0 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs min-w-[210px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              Evaluation Round Weights
            </span>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Round 1 (Aptitude • 25%):</span>
              <span className="font-bold text-indigo-400">{report.aptitudeScore}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Round 2 (Coding • 45%):</span>
              <span className="font-bold text-purple-400">{report.codingScore}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Round 3 (Interview • 30%):</span>
              <span className="font-bold text-pink-400">{report.interviewScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter & Candidate Context Banner: High Coding with Silent Interview */}
      {report.interviewScore === 0 && report.codingScore >= 60 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>Verified Coding Competency ({report.codingScore}%) • Round 3 Voice Inaudible (0%)</span>
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                Candidate performed solidly in practical coding (<strong>{report.codingScore}%</strong>) and completed aptitude reasoning (<strong>{report.aptitudeScore}%</strong>). However, no verbal response was recorded during the Round 3 AI WebRTC Interview (<strong>0%</strong>).
              </p>
              <p className="text-amber-300/90">
                Composite Score: <strong>{report.overallScore.toFixed(1)}%</strong> (Aptitude 25% + Coding 45% + Interview 30%). Candidate is recommended for an Interview Re-take to evaluate verbal communication.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/candidate/interview')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shrink-0 transition-all shadow-md hover:scale-[1.02]"
          >
            Re-take Round 3 Interview
          </button>
        </div>
      )}

      {/* 4 Primary Weighted Evaluation Cards for Round 3 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Video className="w-4 h-4 text-pink-400" />
            <span>Round 3 AI Voice & Sentiment Evaluation Dimensions</span>
          </h3>
          <span className="text-[11px] text-slate-500">Acoustic & NLP Diagnostics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Technical Competency 40% */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Technical Competency</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              40% Weight
            </span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">{report.technicalScore}%</div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span className="italic">Sentence Transformers Validated</span>
          </div>
        </div>

        {/* Communication Score 20% */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Communication Score</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              20% Weight
            </span>
          </div>
          <div className="text-3xl font-extrabold text-purple-400">{report.communicationScore}%</div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span className="italic">Whisper STT Analyzed</span>
          </div>
        </div>

        {/* Confidence Index 15% */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Confidence Index</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
              15% Weight
            </span>
          </div>
          <div className="text-3xl font-extrabold text-pink-400">{report.confidenceScore}%</div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span className="italic">Steady Cadence</span>
          </div>
        </div>

        {/* Sentiment Score 25% */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Sentiment Score</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              25% Weight
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{report.sentimentScore.toFixed(0)}%</div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Smile className="w-3.5 h-3.5 text-emerald-400" />
            <span className="italic">Affective NLP Engine</span>
          </div>
        </div>
      </div>
    </div>

      {/* Strengths & Improvements Panels (Generated by Gemini) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Strengths */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Key Strengths</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            {report.keyStrengths?.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Improvements */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4 text-amber-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Recommended Improvements</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            {report.recommendedImprovements?.map((imp, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Visual Analytics: Chart.js Radar, Bar & Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart: 6 Competencies (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Competency Radar Matrix</h3>
            <p className="text-xs text-slate-400 mb-4">
              Multi-dimensional evaluation against senior role benchmark (80%).
            </p>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        {/* Bar & Line Charts (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Per-Question Score Breakdown */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-1">Per-Question Competency Breakdown</h3>
            <p className="text-xs text-slate-400 mb-3">Technical accuracy, communication, and confidence.</p>
            <div className="h-44 w-full">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          {/* Sentiment Progression Line */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-1">Sentiment Trajectory</h3>
            <p className="text-xs text-slate-400 mb-3">Acoustic positivity and composure across questions.</p>
            <div className="h-40 w-full">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Question-by-Question Deep Dive with Audio Playback */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>Question-by-Question Audio Answers & Transcripts</span>
        </h3>

        <div className="space-y-3">
          {report.answers?.map((ans, idx) => {
            const isExpanded = expandedQuestion === idx;

            return (
              <div
                key={ans.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{ans.questionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <SentimentBadge sentiment={ans.analysis.sentiment} />
                        <EmotionBadge emotion={ans.analysis.emotion} />
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          Similarity: <strong className="text-emerald-400">{ans.analysis.similarityScore}%</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-indigo-400 hidden sm:block">
                      Tech: {ans.analysis.technicalScore}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 space-y-4 animate-in fade-in duration-200">
                    {/* Audio Player if present */}
                    {ans.audioBlobUrl && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                        <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        <audio src={ans.audioBlobUrl} controls className="w-full h-8" />
                      </div>
                    )}

                    {/* Transcribed Text */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                        Candidate Answer Transcript:
                      </span>
                      <p className="italic leading-relaxed">{ans.analysis.transcript}</p>
                    </div>

                    {/* Ideal Expected Answer Comparison */}
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200">
                      <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">
                        Ideal Technical Model Reference:
                      </span>
                      <p className="leading-relaxed">{ans.expectedAnswer}</p>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Speaking Pace</span>
                        <span className="font-semibold text-slate-200">{ans.analysis.wordsPerMinute} WPM</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Filler Frequency</span>
                        <span className="font-semibold text-amber-400">{ans.analysis.fillerWordCount} fillers</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Communication</span>
                        <span className="font-semibold text-purple-400">{ans.analysis.communicationScore}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Confidence</span>
                        <span className="font-semibold text-pink-400">{ans.analysis.confidenceScore}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Round 2 Coding Submissions & Test Case Validation Breakdown */}
      {codingSubs && codingSubs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-400" />
            <span>Round 2: Algorithmic Coding Submissions & Testcases</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {codingSubs.map((sub, sIdx) => {
              const passedCount = (sub.testCases || []).filter((tc) => tc.passed).length;
              const totalCount = (sub.testCases || []).length;
              const probTitle = sub.problemId === 'code1' ? 'Problem 1: Two Sum' : 'Problem 2: Valid Parentheses';

              return (
                <div
                  key={sub.problemId || sIdx}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{probTitle}</h4>
                      <span className="text-[10px] text-slate-400">
                        Submitted: {new Date(sub.submittedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        sub.correctnessScore === 100
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : sub.correctnessScore === 0
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      Score: {sub.overallScore}% ({passedCount}/{totalCount} Tests)
                    </span>
                  </div>

                  {/* Test Cases Status Pills */}
                  {sub.testCases && sub.testCases.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                        Testcases Cleared:
                      </span>
                      <div className="space-y-1">
                        {sub.testCases.map((tc, tcIdx) => (
                          <div
                            key={tcIdx}
                            className={`flex items-center justify-between p-2 rounded-lg text-[11px] border ${
                              tc.passed
                                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {tc.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className="font-mono truncate">{tc.input}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                tc.passed ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {tc.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Architectural Feedback */}
                  {sub.feedback && (
                    <div className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                      <strong className="text-purple-400 block mb-0.5">AI Review:</strong>
                      {sub.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
