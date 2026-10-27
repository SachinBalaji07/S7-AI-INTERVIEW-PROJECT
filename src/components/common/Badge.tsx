import React from 'react';
import { RecruiterDecision, SentimentType, EmotionType, CandidateStatus } from '../../types';

export const DecisionBadge: React.FC<{ decision: RecruiterDecision; size?: 'sm' | 'md' | 'lg' }> = ({
  decision,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs tracking-wide uppercase font-semibold',
    lg: 'px-4 py-1.5 text-sm tracking-wider uppercase font-bold',
  }[size];

  switch (decision) {
    case 'SELECT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold shadow-sm shadow-emerald-500/10 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          SELECT
        </span>
      );
    case 'HOLD':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold shadow-sm shadow-amber-500/10 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          HOLD
        </span>
      );
    case 'REJECT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold shadow-sm shadow-rose-500/10 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          REJECT
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 text-slate-400 font-medium ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          PENDING
        </span>
      );
  }
};

export const SentimentBadge: React.FC<{ sentiment: SentimentType | string }> = ({ sentiment }) => {
  switch (sentiment) {
    case 'positive':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-teal-500/30 bg-teal-500/10 text-teal-300">
          Positive
        </span>
      );
    case 'negative':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300">
          Negative
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-600 bg-slate-800 text-slate-300">
          Neutral
        </span>
      );
  }
};

export const EmotionBadge: React.FC<{ emotion: EmotionType | string }> = ({ emotion }) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    confident: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/30' },
    enthusiastic: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
    nervous: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
    hesitant: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30' },
    neutral: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  };

  const current = map[emotion.toLowerCase()] || map.neutral;

  return (
    <span className={`inline-flex items-center capitalize px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.border} ${current.bg} ${current.text}`}>
      {emotion}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: CandidateStatus }> = ({ status }) => {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
        Completed
      </span>
    );
  }
  if (status === 'Under Review') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-500/30 bg-purple-500/10 text-purple-300">
        Under Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500/30 bg-blue-500/10 text-blue-300">
      In Progress
    </span>
  );
};
