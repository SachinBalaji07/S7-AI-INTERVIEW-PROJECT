import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProfiles, getReports } from '../../services/storageService';
import { DecisionBadge, SentimentBadge, EmotionBadge } from '../../components/common/Badge';
import { AssessmentReport, InterviewAnswerRecord } from '../../types';
import {
  MessageSquare,
  User,
  Volume2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  Smile,
  Activity,
  Brain,
} from 'lucide-react';

export const AdminResponsesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const profiles = getProfiles();
  const reports = getReports();

  const queryCandidateId = searchParams.get('candidateId');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    queryCandidateId || profiles[0]?.id || 'prof-alex'
  );

  useEffect(() => {
    if (queryCandidateId) {
      setSelectedCandidateId(queryCandidateId);
    }
  }, [queryCandidateId]);

  const selectedProfile = profiles.find((p) => p.id === selectedCandidateId) || profiles[0];
  const selectedReport: AssessmentReport | undefined = reports.find(
    (r) => r.candidateId === selectedProfile?.id
  );

  const answers: InterviewAnswerRecord[] = selectedReport?.answers || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Interviews & Recorded Responses</h1>
            <p className="text-xs text-slate-400">
              Inspect candidate video/audio answers, full AI speech transcripts, and affective emotion telemetry.
            </p>
          </div>
        </div>

        {/* Candidate Selector Dropdown */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800">
          <User className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-slate-400">Candidate:</span>
          <select
            value={selectedProfile?.id}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            className="bg-transparent text-xs text-slate-100 font-semibold focus:outline-none cursor-pointer"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                {p.fullName} ({p.currentRole})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidate Summary Card */}
      {selectedProfile && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-purple-950/40 border border-slate-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md">
              {selectedProfile.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{selectedProfile.fullName}</h2>
                <DecisionBadge decision={selectedProfile.decision} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedProfile.currentRole} • {selectedProfile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Overall Score</span>
              <span className="text-lg font-black text-emerald-400">
                {selectedReport ? `${selectedReport.overallScore.toFixed(1)}%` : 'Pending'}
              </span>
            </div>
            <div className="text-right border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Answers Logged</span>
              <span className="text-lg font-bold text-slate-200">{answers.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Answers List */}
      <div className="space-y-4">
        {answers.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
            <Volume2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No Recorded Answers Available</p>
            <p className="text-slate-500 mt-1">This candidate has not finalized Round 3 AI Interview yet.</p>
          </div>
        ) : (
          answers.map((ans, idx) => (
            <div
              key={ans.id}
              className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl space-y-4 shadow-lg"
            >
              {/* Question Header & Metrics Badges */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
                    Q{idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{ans.questionText}</h3>
                    <span className="text-[11px] text-slate-400">
                      Duration: {ans.durationSeconds || 45}s • Recorded: {new Date(ans.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SentimentBadge sentiment={ans.analysis.sentiment} />
                  <EmotionBadge emotion={ans.analysis.emotion} />
                </div>
              </div>

              {/* Playable Video / Audio Answer Player */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-purple-400 shrink-0" />
                {ans.audioBlobUrl ? (
                  <audio src={ans.audioBlobUrl} controls className="w-full h-8" />
                ) : (
                  <div className="flex items-center justify-between w-full text-xs text-slate-400">
                    <span>Acoustic recording session #{ans.id} (Verified Stream)</span>
                    <span className="text-purple-400 font-semibold">Audio Analyzed</span>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                  Candidate Verbal Transcript:
                </span>
                <p className="italic leading-relaxed">"{ans.analysis.transcript}"</p>
              </div>

              {/* Model Expected Answer Reference */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                  Ideal Technical Answer Reference:
                </span>
                <p className="leading-relaxed">{ans.expectedAnswer}</p>
              </div>

              {/* 4 Score Metrics & Speech Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Technical Accuracy</span>
                  <span className="text-base font-bold text-indigo-400">{ans.analysis.technicalScore}%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Semantic Similarity</span>
                  <span className="text-base font-bold text-emerald-400">{ans.analysis.similarityScore}%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Communication</span>
                  <span className="text-base font-bold text-purple-400">{ans.analysis.communicationScore}%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Confidence</span>
                  <span className="text-base font-bold text-pink-400">{ans.analysis.confidenceScore}%</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Pace & Fillers</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {ans.analysis.wordsPerMinute} WPM • {ans.analysis.fillerWordCount} Fillers
                  </span>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                  <strong className="block text-emerald-200 font-semibold mb-1">Candidate Strengths:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {ans.analysis.strengths.map((str, sIdx) => (
                      <li key={sIdx}>{str}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300">
                  <strong className="block text-amber-200 font-semibold mb-1">Coaching Areas:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {ans.analysis.improvements.map((imp, iIdx) => (
                      <li key={iIdx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
