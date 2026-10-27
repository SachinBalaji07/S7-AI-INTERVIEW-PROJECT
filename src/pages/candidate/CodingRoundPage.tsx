import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCodingProblems, saveCodingSubmissions, getCodingSubmissions } from '../../services/storageService';
import { evaluateCodeWithAI } from '../../services/apiService';
import { saveSharedCodingSubmissions } from '../../services/backendService';
import { executeJavaScriptTestCases, CodeExecutionSummary } from '../../services/codeRunner';
import { CodingProblem, CodingSubmissionResult } from '../../types';
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Clock,
  HardDrive,
  Lightbulb,
  FileCode,
  Loader2,
  Video,
  FileSpreadsheet,
  Terminal,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { FullscreenGuard, exitAppFullscreen } from '../../components/common/FullscreenGuard';
import { useCandidateApplication } from '../../context/ApplicationContext';

export const CodingRoundPage: React.FC = () => {
  const { user, token } = useAuth();
  const { application, job } = useCandidateApplication();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const codingPool = job.assessmentContent?.codingProblems || getCodingProblems();
  const problems: CodingProblem[] = codingPool.filter((problem) => job.codingProblemIds.includes(problem.id));
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('javascript');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunningLocal, setIsRunningLocal] = useState(false);
  const [submissions, setSubmissions] = useState<CodingSubmissionResult[]>([]);
  const [localTestResults, setLocalTestResults] = useState<Record<string, CodeExecutionSummary | null>>({});

  const currentProblem = problems[selectedProblemIdx];

  useEffect(() => {
    if (user) {
      const stored = application.codingSubmissions || getCodingSubmissions(application.id);
      setSubmissions(stored);
    }
  }, [application.id, user]);

  // Initialize code if not set
  useEffect(() => {
    if (currentProblem && !codeMap[currentProblem.id]) {
      setCodeMap((prev) => ({
        ...prev,
        [currentProblem.id]: currentProblem.initialCode,
      }));
    }
  }, [currentProblem]);

  const activeCode = codeMap[currentProblem?.id] || currentProblem?.initialCode || '';
  const currentSubmission = submissions.find((s) => s.problemId === currentProblem?.id);
  const currentLocalTest = localTestResults[currentProblem?.id] || null;

  const handleCodeChange = (val: string) => {
    setCodeMap((prev) => ({
      ...prev,
      [currentProblem.id]: val,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      handleCodeChange(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Instant local deterministic test case execution
  const handleRunLocalTests = () => {
    if (!activeCode.trim()) {
      showToast('Please write code before running tests', 'error');
      return;
    }

    setIsRunningLocal(true);
    try {
      const summary = executeJavaScriptTestCases(
        activeCode,
        currentProblem.id,
        currentProblem.testCases || []
      );

      setLocalTestResults((prev) => ({
        ...prev,
        [currentProblem.id]: summary,
      }));

      if (summary.allPassed) {
        showToast(`All ${summary.totalCount} test cases passed! (100% Correctness)`, 'success');
      } else if (summary.syntaxError) {
        showToast(`Syntax error: ${summary.syntaxError}`, 'error');
      } else {
        showToast(
          `${summary.passedCount} of ${summary.totalCount} test cases passed (${summary.correctnessScore}%). Review failed cases below.`,
          'warning'
        );
      }
    } catch (err: any) {
      showToast(`Error running tests: ${err.message || err}`, 'error');
    } finally {
      setIsRunningLocal(false);
    }
  };

  // Final evaluation with Gemini AI and submission saving
  const handleEvaluate = async () => {
    if (!activeCode.trim()) {
      showToast('Please write code before submitting', 'error');
      return;
    }

    setIsEvaluating(true);
    try {
      const result = await evaluateCodeWithAI({
        problemId: currentProblem.id,
        problemTitle: currentProblem.title,
        problemDescription: currentProblem.description,
        language,
        userCode: activeCode,
        testCases: currentProblem.testCases,
      });

      const submissionRecord: CodingSubmissionResult = {
        problemId: currentProblem.id,
        code: activeCode,
        correctnessScore: result.correctnessScore,
        efficiencyScore: result.efficiencyScore,
        styleScore: result.styleScore,
        overallScore: result.overallScore,
        timeComplexity: result.timeComplexity,
        spaceComplexity: result.spaceComplexity,
        feedback: result.feedback,
        testCases: result.testCases || [],
        submittedAt: new Date().toISOString(),
      };

      const updated = submissions.filter((s) => s.problemId !== currentProblem.id);
      updated.push(submissionRecord);
      setSubmissions(updated);

      if (user) {
        saveCodingSubmissions(application.id, updated);
      }
      if (token) {
        try {
          await saveSharedCodingSubmissions(token, application.id, updated);
        } catch (error) {
          console.error('Unable to synchronize coding submissions:', error);
          showToast('Your code was evaluated, but the result could not be synchronized.', 'warning');
        }
      }

      // Also sync local test results display
      const passedCount = (result.testCases || []).filter((tc) => tc.passed).length;
      const totalCount = (result.testCases || []).length;
      setLocalTestResults((prev) => ({
        ...prev,
        [currentProblem.id]: {
          passedCount,
          totalCount,
          allPassed: passedCount === totalCount && totalCount > 0,
          correctnessScore: result.correctnessScore,
          testCases: result.testCases || [],
        },
      }));

      if (result.correctnessScore === 100) {
        showToast(`100% Testcases Cleared! Overall Score: ${result.overallScore}%`, 'success');
      } else if (result.correctnessScore === 0) {
        showToast(`0 Testcases Cleared (${passedCount}/${totalCount}). Fix bugs and re-submit.`, 'error');
      } else {
        showToast(
          `Partially Cleared: ${passedCount}/${totalCount} Testcases (${result.correctnessScore}%). Overall: ${result.overallScore}%`,
          'warning'
        );
      }
    } catch (err) {
      showToast('Evaluation failed. Please try again.', 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleResetToTemplate = () => {
    handleCodeChange(currentProblem.initialCode);
    setLocalTestResults((prev) => ({ ...prev, [currentProblem.id]: null }));
    showToast('Reset to starter function template', 'info');
  };

  const handleLoadReferenceSolution = () => {
    if (currentProblem.referenceSolution) {
      handleCodeChange(currentProblem.referenceSolution);
      showToast('Loaded reference optimal solution. Run tests to see it pass!', 'info');
    }
  };

  const allSubmitted = problems.every((p) => submissions.some((s) => s.problemId === p.id));

  if (problems.length === 0) {
    return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-200">The coding challenges configured for this role are unavailable. Contact the recruiter.</div>;
  }

  // Determine active test cases to display: prefers currentLocalTest if newer, or currentSubmission
  const displayTestCases = currentLocalTest?.testCases || currentSubmission?.testCases || [];
  const displayPassedCount = currentLocalTest
    ? currentLocalTest.passedCount
    : displayTestCases.filter((t) => t.passed).length;
  const displayTotalCount = displayTestCases.length;
  const displayCorrectness = displayTotalCount > 0 ? Math.round((displayPassedCount / displayTotalCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Fullscreen Proctor Guard */}
      <FullscreenGuard isActive={!allSubmitted} testTitle="Round 2: Coding Evaluation" />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Round 2: Algorithmic Coding Evaluation</h1>
            <p className="text-xs text-slate-400">
              Submit solutions for both problems. Graded by deterministic test execution & Gemini 2.5 Flash.
            </p>
          </div>
        </div>

        {/* Problem Selector Buttons & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {problems.map((p, idx) => {
              const sub = submissions.find((s) => s.problemId === p.id);
              const isCleared = sub && sub.correctnessScore === 100;
              const isPartial = sub && sub.correctnessScore > 0 && sub.correctnessScore < 100;
              const isFailed = sub && sub.correctnessScore === 0;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProblemIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedProblemIdx === idx
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Problem {idx + 1}</span>
                  {isCleared && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                  {isPartial && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
                  {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-300" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              exitAppFullscreen();
              navigate('/candidate/report');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/20 transition-all"
            title="View Current Assessment Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">View Report</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Problem Description, Right Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Problem Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {currentProblem.difficulty}
                </span>
                <span className="text-xs text-slate-500">Max Score: 100</span>
              </div>

              <h2 className="text-xl font-bold text-white">{currentProblem.title}</h2>

              <div className="prose prose-invert prose-sm text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 font-sans">
                {currentProblem.description}
              </div>

              {/* Defined Problem Test Cases Preview */}
              {currentProblem.testCases && currentProblem.testCases.length > 0 && (
                <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Defined Test Cases ({currentProblem.testCases.length}):
                  </span>
                  <div className="space-y-1.5">
                    {currentProblem.testCases.map((tc, i) => (
                      <div key={tc.id || i} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-0.5">
                        <div className="text-slate-300 font-mono">
                          <span className="text-indigo-400 font-semibold">Input: </span>
                          {tc.input}
                        </div>
                        <div className="text-emerald-400 font-mono">
                          <span className="text-slate-400 font-semibold">Expected: </span>
                          {tc.expected}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentProblem.hints && currentProblem.hints.length > 0 && (
                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-indigo-200">Algorithmic Tip:</strong>
                    {currentProblem.hints.join(' ')}
                  </div>
                </div>
              )}
            </div>

            {/* Transition to Round 3 if completed */}
            {allSubmitted && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => navigate('/candidate/interview')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-pink-600/20 transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Launch Round 3: WebRTC AI Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Editor, Test Runner & AI Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300">Solution Editor</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 px-2 py-1 focus:outline-none"
                >
                  <option value="javascript">JavaScript (ES6)</option>
                  <option value="typescript">TypeScript</option>
                </select>

                <button
                  onClick={handleResetToTemplate}
                  className="px-2 py-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 text-[11px] flex items-center gap-1 transition-all"
                  title="Reset to starter function template"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>

                {currentProblem.referenceSolution && (
                  <button
                    onClick={handleLoadReferenceSolution}
                    className="px-2 py-1 text-indigo-400 hover:text-indigo-300 rounded-md hover:bg-indigo-950/40 text-[11px] flex items-center gap-1 border border-indigo-500/30 transition-all"
                    title="Load reference solution to test 100% correct code"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Reference Sol.</span>
                  </button>
                )}

                {/* Run Tests (Local Deterministic Testcase Runner) */}
                <button
                  onClick={handleRunLocalTests}
                  disabled={isRunningLocal || isEvaluating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-emerald-500/30 disabled:opacity-50 transition-all"
                  title="Run against real test cases with instant pass/fail validation"
                >
                  {isRunningLocal ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Run Tests</span>
                </button>

                {/* Submit & Grade with AI */}
                <button
                  onClick={handleEvaluate}
                  disabled={isEvaluating || isRunningLocal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Grading...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Submit & Grade</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Textarea */}
            <div className="p-4 bg-slate-950 relative font-mono text-xs">
              <textarea
                value={activeCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={13}
                spellCheck={false}
                placeholder="// Write your algorithmic solution here..."
                className="w-full bg-transparent text-emerald-300 font-mono text-xs sm:text-sm focus:outline-none resize-y leading-relaxed border-0 selection:bg-purple-900/60"
              />
            </div>
          </div>

          {/* Test Cases Execution Results (Real Deterministic Verification) */}
          {displayTestCases.length > 0 && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 backdrop-blur-xl space-y-4 animate-in fade-in duration-200 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Test Case Execution Breakdown</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Status:</span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      displayPassedCount === displayTotalCount
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : displayPassedCount === 0
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {displayPassedCount} / {displayTotalCount} Passed ({displayCorrectness}%)
                  </span>
                </div>
              </div>

              {/* Status Alert Banner */}
              {displayPassedCount === displayTotalCount ? (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>All test cases cleared!</strong> Your solution produces correct outputs across all boundary
                    and standard cases.
                  </span>
                </div>
              ) : displayPassedCount === 0 ? (
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>Test cases failed (0 cleared).</strong> Your code did not return the expected values or
                    encountered errors. Inspect actual output vs expected below.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Partially passed ({displayPassedCount}/{displayTotalCount}).</strong> Check failed test cases
                    below to fix edge-case bugs.
                  </span>
                </div>
              )}

              {/* Individual Test Cases with Expected vs Actual */}
              <div className="space-y-2.5">
                {displayTestCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      tc.passed
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-rose-950/20 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {tc.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="font-semibold text-white">
                          Test Case {idx + 1}
                        </span>
                        {tc.executionTimeMs !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            ({tc.executionTimeMs}ms)
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tc.passed
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tc.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-900">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans uppercase">Input:</span>
                        <span className="text-slate-300 break-all">{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans uppercase">Expected:</span>
                        <span className="text-emerald-400 break-all">{tc.expected}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans uppercase">Actual Output:</span>
                        <span className={`break-all font-bold ${tc.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tc.output || 'undefined'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Grade Results Panel (Only if evaluated) */}
          {currentSubmission && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 backdrop-blur-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">Gemini 2.5 Flash Architectural Evaluation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Composite Score:</span>
                  <span
                    className={`text-base font-extrabold ${
                      currentSubmission.overallScore >= 75
                        ? 'text-emerald-400'
                        : currentSubmission.overallScore >= 45
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {currentSubmission.overallScore}%
                  </span>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Correctness</span>
                  <span
                    className={`text-base font-bold ${
                      currentSubmission.correctnessScore === 100
                        ? 'text-emerald-400'
                        : currentSubmission.correctnessScore === 0
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {currentSubmission.correctnessScore}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Efficiency</span>
                  <span className="text-base font-bold text-purple-400">{currentSubmission.efficiencyScore}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Code Style</span>
                  <span className="text-base font-bold text-pink-400">{currentSubmission.styleScore}%</span>
                </div>
              </div>

              {/* Big-O Complexity */}
              <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Time Complexity:</span>
                  <code className="text-indigo-300 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                    {currentSubmission.timeComplexity || 'O(n)'}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Space Complexity:</span>
                  <code className="text-purple-300 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                    {currentSubmission.spaceComplexity || 'O(1)'}
                  </code>
                </div>
              </div>

              {/* Feedback Note */}
              <div className="text-xs text-slate-300 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                <strong className="text-indigo-400 block mb-1">Architectural Review:</strong>
                {currentSubmission.feedback}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
