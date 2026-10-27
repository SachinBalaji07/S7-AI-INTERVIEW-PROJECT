import React, { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAptitudeResult, getCodingSubmissions, getReportForCandidate } from '../../services/storageService';
import { fetchApplication } from '../../services/backendService';
import { ACTIVE_APPLICATION_KEY } from '../../context/ApplicationContext';
import { JobApplication, JobOpening } from '../../types';
import { DecisionBadge } from '../../components/common/Badge';
import { requestAppFullscreen } from '../../components/common/FullscreenGuard';
import {
  BrainCircuit,
  Code2,
  Video,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  Maximize2,
  Shield,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export const CandidateHome: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [showProctorModal, setShowProctorModal] = useState(false);
  const [activeRole, setActiveRole] = useState<{ application: JobApplication; job: JobOpening } | null>(null);

  useEffect(() => {
    const applicationId = localStorage.getItem(ACTIVE_APPLICATION_KEY);
    if (!token || !applicationId) {
      setActiveRole(null);
      return;
    }
    let active = true;
    fetchApplication(token, applicationId).then((value) => {
      if (active) setActiveRole(value);
    }).catch((error) => {
      console.error('Unable to load the selected job assessment:', error);
      localStorage.removeItem(ACTIVE_APPLICATION_KEY);
      if (active) setActiveRole(null);
    });
    return () => { active = false; };
  }, [token]);

  const aptitudeRes = activeRole
    ? activeRole.application.aptitudeResult || getAptitudeResult(activeRole.application.id)
    : null;
  const codingSubs = activeRole
    ? activeRole.application.codingSubmissions || getCodingSubmissions(activeRole.application.id)
    : [];
  const report = activeRole?.application.report || (user && activeRole
    ? getReportForCandidate(user.id, user.email, activeRole.application.id)
    : null);
  const isAptitudeDone = !!aptitudeRes;
  const isCodingDone = !!activeRole && activeRole.job.codingProblemIds.every((problemId) =>
    codingSubs.some((submission) => submission.problemId === problemId)
  );
  const isInterviewDone = !!report;

  const completedCount = (isAptitudeDone ? 1 : 0) + (isCodingDone ? 1 : 0) + (isInterviewDone ? 1 : 0);

  const handleLaunchProctoredAssessment = async () => {
    setShowProctorModal(false);
    if (!activeRole) {
      navigate('/candidate/jobs');
      return;
    }
    await requestAppFullscreen();

    // Route to first pending round or report
    if (!isAptitudeDone) {
      navigate('/candidate/aptitude');
    } else if (!isCodingDone) {
      navigate('/candidate/coding');
    } else if (!isInterviewDone) {
      navigate('/candidate/interview');
    } else {
      navigate('/candidate/report');
    }
  };

  const handleStartRound = async (path: string) => {
    await requestAppFullscreen();
    navigate(path);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Driven Hiring Evaluation</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Welcome to the InterviewAI Assessment Portal. When you begin the assessment, it runs in continuous Full Screen mode until all evaluation sections are submitted. Your complete Sentiment Analytics and Competency Report will be displayed immediately upon completion.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => activeRole ? setShowProctorModal(true) : navigate('/candidate/jobs')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>{!activeRole ? 'Browse Jobs & Choose an Assessment' : completedCount === 3 ? 'Review Assessment Report' : 'Start Assessment (Full Screen)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 px-3.5 py-2.5 rounded-xl border border-slate-800">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>
                Rounds Completed:{' '}
                <strong className="text-white font-semibold">{completedCount} of 3</strong>
              </span>
            </div>

            {report && (
              <button
                onClick={() => navigate('/candidate/report')}
                className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 hover:bg-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-800 transition-colors"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>
                  Overall Score: <strong className="text-emerald-400 font-bold">{report.overallScore.toFixed(1)}%</strong>
                </span>
                <span className="ml-1">
                  <DecisionBadge decision={report.decision} size="sm" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Proctored Assessment Launch Modal */}
      {showProctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowProctorModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Proctored Full Screen Assessment
            </h3>

            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Full Screen Enforced:</strong> The assessment will lock into full screen mode until you submit your test.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Anti-Tab Switching:</strong> Exiting full screen triggers proctor integrity warnings.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Instant Report:</strong> Full assessment report with sentiment, audio analysis, and hiring decision is revealed immediately upon finish.
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLaunchProctoredAssessment}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Enter Full Screen & Begin Assessment</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProctorModal(false)}
                className="py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 Core Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Aptitude Round 1 */}
        <div className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-6 h-6" />
              </div>
              {isAptitudeDone ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  Round 1
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Aptitude & Logical Assessment</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              10 multiple-choice questions testing quantitative problem-solving, algorithmic fundamentals, and logical reasoning with a countdown timer.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="text-slate-300 font-medium">15 Mins</span>
              </div>
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-slate-300 font-medium">10 MCQs</span>
              </div>
              {aptitudeRes && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Your Score:</span>
                  <span>{aptitudeRes.score}%</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleStartRound('/candidate/aptitude')}
            className={`mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isAptitudeDone
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
            }`}
          >
            <span>{isAptitudeDone ? 'Retake / Review Round 1' : 'Start Aptitude Round 1 (Full Screen)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Coding Evaluation */}
        <div className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/40 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              {isCodingDone ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">
                  Round 2
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Round 2: Coding Evaluation</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              2 hands-on algorithm challenges evaluated in real-time by Gemini for correctness, Big-O space-time efficiency, and code elegance.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <div className="flex justify-between">
                <span>Challenges:</span>
                <span className="text-slate-300 font-medium">2 Problems</span>
              </div>
              <div className="flex justify-between">
                <span>Evaluation:</span>
                <span className="text-purple-400 font-medium">Gemini 2.5 Flash</span>
              </div>
              {codingSubs.length > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Submitted:</span>
                  <span>{codingSubs.length} of 2</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleStartRound('/candidate/coding')}
            className={`mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isCodingDone
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25'
            }`}
          >
            <span>{isCodingDone ? 'Review Coding Submissions' : 'Start Round 2: Coding (Full Screen)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: AI WebRTC Interview */}
        <div className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-pink-500/40 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              {isInterviewDone ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="text-xs font-semibold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full">
                  Round 3 (Core)
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-2">WebRTC AI Live Interview</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Interactive video & voice interview. Live speech transcription, affective sentiment analytics, and technical keyword semantic similarity.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <div className="flex justify-between">
                <span>Media:</span>
                <span className="text-slate-300 font-medium">Camera + Microphone</span>
              </div>
              <div className="flex justify-between">
                <span>NLP Engine:</span>
                <span className="text-pink-400 font-medium">Gemini Sentiment</span>
              </div>
              {report && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Interview Score:</span>
                  <span>{report.interviewScore}%</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleStartRound('/candidate/interview')}
            className={`mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isInterviewDone
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-600/25'
            }`}
          >
            <span>{isInterviewDone ? 'Launch Again / Re-evaluate' : 'Launch Round 3: WebRTC AI Interview'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Navigation to Full Report if available */}
      {report && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Assessment Report Ready</h4>
              <p className="text-xs text-slate-400">
                Your full performance radar, per-question audio recordings, and recruiter recommendation are finalized.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/candidate/report')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-all shadow-md shadow-indigo-600/20"
          >
            <span>Open Assessment Report</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
