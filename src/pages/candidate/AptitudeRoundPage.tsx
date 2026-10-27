import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getAptitudeQuestions, saveAptitudeResult, getAptitudeResult } from '../../services/storageService';
import { AptitudeQuestion } from '../../types';
import {
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  HelpCircle,
  Code2,
  Maximize2,
  FileSpreadsheet,
} from 'lucide-react';
import { FullscreenGuard, requestAppFullscreen, exitAppFullscreen } from '../../components/common/FullscreenGuard';
import { useCandidateApplication } from '../../context/ApplicationContext';
import { saveSharedAptitudeResult } from '../../services/backendService';

const chartColors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

const AptitudeQuestionChart: React.FC<{ question: AptitudeQuestion }> = ({ question }) => {
  if (!question.chart) return null;
  const total = question.chart.data.reduce((sum, item) => sum + item.value, 0);
  let runningPercent = 0;
  const slices = question.chart.data.map((item, index) => {
    const start = runningPercent;
    runningPercent += (item.value / total) * 100;
    return `${chartColors[index % chartColors.length]} ${start}% ${runningPercent}%`;
  });

  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">{question.chart.title}</h3>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div
          role="img"
          aria-label={`Pie chart: ${question.chart.data.map((item) => `${item.label} ${item.value}`).join(', ')}`}
          className="h-40 w-40 shrink-0 rounded-full border-4 border-slate-900 shadow-lg"
          style={{ background: `conic-gradient(${slices.join(', ')})` }}
        />
        <ul className="grid w-full grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {question.chart.data.map((item, index) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-slate-300">
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.label}</span>
              <strong className="text-white">
                {total === 100 ? `${item.value}%` : `${item.value} (${Math.round((item.value / total) * 100)}%)`}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const AptitudeRoundPage: React.FC = () => {
  const { user, token } = useAuth();
  const { application, job } = useCandidateApplication();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const aptitudePool = job.assessmentContent?.aptitudeQuestions || getAptitudeQuestions();
  const questions: AptitudeQuestion[] = aptitudePool.filter((question) => job.aptitudeQuestionIds.includes(question.id));
  const existingResult = application.aptitudeResult || getAptitudeResult(application.id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(existingResult ? existingResult.score : null);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted || existingResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, existingResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  const handleSubmitQuiz = (isTimeOut = false) => {
    let correct = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctOptionIndex) {
        correct++;
      }
    });

    const finalPercent = Math.round((correct / questions.length) * 100);
    setCalculatedScore(finalPercent);
    setIsSubmitted(true);

    // Exit fullscreen once assessment is submitted
    exitAppFullscreen();

    if (user) {
      saveAptitudeResult(application.id, finalPercent, selectedAnswers);
    }
    if (token) {
      void saveSharedAptitudeResult(token, application.id, finalPercent, selectedAnswers).catch((error) => {
        console.error('Unable to synchronize aptitude result:', error);
        showToast('Your result was saved on this device but could not be synchronized.', 'warning');
      });
    }

    if (isTimeOut) {
      showToast('Time expired! Your answers were automatically submitted.', 'info');
    } else {
      showToast(`Aptitude submitted! You scored ${finalPercent}%. Fullscreen exited.`, 'success');
    }
  };

  const handleRetake = async () => {
    setSelectedAnswers({});
    setTimeLeft(15 * 60);
    setIsSubmitted(false);
    setCalculatedScore(null);
    setCurrentIndex(0);
    await requestAppFullscreen();
  };

  if (questions.length === 0) {
    return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-200">The aptitude questions configured for this role are unavailable. Contact the recruiter.</div>;
  }

  // If already completed or just submitted: show Results & Review View
  if (isSubmitted || (existingResult && calculatedScore !== null && !isSubmitted && Object.keys(selectedAnswers).length === 0)) {
    const score = calculatedScore ?? existingResult?.score ?? 85;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
        {/* Score Summary Banner */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-8 text-center backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/25">
            <Award className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Round 1 Complete
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-2">Aptitude & Technical MCQ Results</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Your logical, quantitative, and computer science aptitude has been recorded. Fullscreen assessment mode concluded.
          </p>

          <div className="my-6 inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
              {score}%
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">
              Score: {Math.round((score / 100) * questions.length)} / {questions.length} Correct
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake in Full Screen</span>
            </button>

            <button
              onClick={() => navigate('/candidate/report')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold transition-all border border-indigo-500/30"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>View Assessment Report</span>
            </button>

            <button
              onClick={async () => {
                await requestAppFullscreen();
                navigate('/candidate/coding');
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-purple-600/25"
            >
              <Code2 className="w-4 h-4" />
              <span>Proceed to Round 2: Coding</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detailed Questions Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <span>Question Answers & Explanations</span>
          </h3>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAns = selectedAnswers[q.id];
              const isCorrect = userAns === q.correctOptionIndex;

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-400">Question {idx + 1} • {q.category}</span>
                    {userAns !== undefined ? (
                      isCorrect ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-500">Unanswered</span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-100 mb-3">{q.question}</p>
                  <AptitudeQuestionChart question={q} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = userAns === optIdx;
                      const isActualCorrect = optIdx === q.correctOptionIndex;

                      let style = 'bg-slate-950/60 border-slate-800 text-slate-400';
                      if (isActualCorrect) {
                        style = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-semibold';
                      } else if (isSelected && !isCorrect) {
                        style = 'bg-rose-950/30 border-rose-500/40 text-rose-300';
                      }

                      return (
                        <div key={optIdx} className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${style}`}>
                          <span className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-800/60 font-mono text-[11px]">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/60 text-xs text-slate-300">
                    <strong className="text-indigo-400">Explanation: </strong>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active Quiz View
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Fullscreen Proctor Guard */}
      <FullscreenGuard isActive={!isSubmitted} testTitle="Round 1: Aptitude Assessment" />

      {/* Top Status Bar: Countdown & Progress */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Timer className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Time Remaining</span>
            <div className={`text-xl font-mono font-bold ${timeLeft < 180 ? 'text-rose-400' : 'text-slate-100'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Progress counter */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-slate-400">
            Answered: <strong className="text-indigo-400">{answeredCount}</strong> of {questions.length}
          </div>
          <button
            onClick={() => handleSubmitQuiz(false)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
          >
            Submit Round 1
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Category: <strong className="text-slate-300">{currentQ.category}</strong>
            </span>
          </div>
          <span className="text-xs text-slate-500">1 Mark</span>
        </div>

        <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed mb-6">
          {currentQ.question}
        </h2>
        <AptitudeQuestionChart question={currentQ} />

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQ.id] === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left text-sm transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10 font-medium'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-semibold ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-800">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              type="button"
              onClick={() => handleSubmitQuiz(false)}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition-all"
            >
              <span>Submit Assessment</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Palette Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
        <span className="text-xs font-semibold text-slate-400 block mb-3">Question Palette:</span>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const isAnswered = selectedAnswers[q.id] !== undefined;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'ring-2 ring-indigo-400 bg-indigo-600 text-white'
                    : isAnswered
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
