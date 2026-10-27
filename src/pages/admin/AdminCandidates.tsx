import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  getProfiles,
  getReports,
  updateRecruiterDecision,
} from '../../services/storageService';
import { CandidateProfile, RecruiterDecision } from '../../types';
import { fetchCandidateProfiles, updateCandidateDecision } from '../../services/backendService';
import { useAuth } from '../../context/AuthContext';
import { DecisionBadge, StatusBadge } from '../../components/common/Badge';
import {
  Search,
  Filter,
  Users,
  Eye,
  FileText,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  X,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  Edit,
} from 'lucide-react';

export const AdminCandidates: React.FC = () => {
  const { showToast } = useToast();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<CandidateProfile[]>(getProfiles());
  const reports = getReports();

  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);

  // Recruiter Decision Override Modal State
  const [overrideDecision, setOverrideDecision] = useState<RecruiterDecision>('SELECT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchCandidateProfiles(token).then((sharedProfiles) => {
      setProfiles((localProfiles) => {
        const merged = new Map(localProfiles.map((profile) => [profile.id, profile]));
        sharedProfiles.forEach((profile) => merged.set(profile.id, profile));
        return [...merged.values()];
      });
    }).catch((error) => {
      console.error('Unable to load candidate profiles from the shared database:', error);
      showToast('Could not load shared candidate profiles.', 'error');
    });
  }, [token]);

  const filtered = profiles.filter((prof) => {
    const matchesSearch =
      prof.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.currentRole.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDecision = decisionFilter === 'ALL' || prof.decision === decisionFilter;

    return matchesSearch && matchesDecision;
  });

  const handleOpenDetail = (cand: CandidateProfile) => {
    setSelectedCandidate(cand);
    setOverrideDecision(cand.decision || 'SELECT');
    setOverrideNotes(cand.decisionNotes || '');
  };

  const handleSaveDecisionOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      const saved = token
        ? await updateCandidateDecision(token, selectedCandidate.id, overrideDecision, overrideNotes)
        : selectedCandidate;
      updateRecruiterDecision(selectedCandidate.id, overrideDecision, overrideNotes);
      setProfiles((current) => current.map((profile) => profile.id === saved.id ? saved : profile));
      setSelectedCandidate(saved);
      setIsOverrideModalOpen(false);
      showToast(`Recruiter decision updated to ${overrideDecision}.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save recruiter decision.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Candidate Talent Pipeline</h1>
            <p className="text-xs text-slate-400">
              Review applicant assessment metrics, resume credentials, and manage final hiring decisions.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
          Total Candidates: <strong className="text-white font-semibold">{profiles.length}</strong>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, email, or role..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span>Decision:</span>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="ALL">All Decisions</option>
              <option value="SELECT">SELECT</option>
              <option value="HOLD">HOLD</option>
              <option value="REJECT">REJECT</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">Candidate</th>
                <th className="py-3.5 px-4 font-semibold">Role & Experience</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Aptitude</th>
                <th className="py-3.5 px-4 font-semibold">Coding</th>
                <th className="py-3.5 px-4 font-semibold">Interview</th>
                <th className="py-3.5 px-4 font-semibold">Overall Composite</th>
                <th className="py-3.5 px-4 font-semibold">Decision</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No candidates found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((cand) => {
                  const rep = reports.find((r) => r.candidateId === cand.id);

                  return (
                    <tr
                      key={cand.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetail(cand)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                            {cand.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 group-hover:text-purple-300 transition-colors block">
                              {cand.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400">{cand.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>
                          <span>{cand.currentRole}</span>
                          <span className="block text-[10px] text-slate-500">
                            {cand.experienceYears} Years • {cand.location}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={cand.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                        {rep ? `${rep.aptitudeScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                        {rep ? `${rep.codingScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        {rep ? (
                          <span className={rep.interviewScore === 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {rep.interviewScore}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {rep ? (
                          <span className="font-bold text-sm text-slate-100">
                            {rep.overallScore.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <DecisionBadge decision={cand.decision} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(cand)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {selectedCandidate.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{selectedCandidate.fullName}</h3>
                  <DecisionBadge decision={selectedCandidate.decision} size="sm" />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCandidate.currentRole} • {selectedCandidate.experienceYears} Years Experience
                </p>
              </div>
            </div>

            {/* Personal & Academic Details */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block mb-0.5">Email</span>
                <span className="font-semibold text-slate-200">{selectedCandidate.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Phone</span>
                <span className="font-semibold text-slate-200">{selectedCandidate.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Location</span>
                <span className="font-semibold text-slate-200">{selectedCandidate.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Education</span>
                <span className="font-semibold text-slate-200">{selectedCandidate.education}</span>
              </div>
            </div>

            {/* Resume Access */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    {selectedCandidate.resume?.name || 'Resume Document'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedCandidate.resume?.size || 'PDF Document'} • Uploaded {selectedCandidate.resume?.uploadedAt || 'Recently'}
                  </span>
                </div>
              </div>
              {selectedCandidate.resume?.dataUrl && (
                <a
                  href={selectedCandidate.resume.dataUrl}
                  download={selectedCandidate.resume.name}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                >
                  Download File
                </a>
              )}
            </div>

            {/* Recruiter Evaluation & Override Section */}
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">Recruiter Evaluation & Final Decision</span>
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(!isOverrideModalOpen)}
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{isOverrideModalOpen ? 'Cancel Edit' : 'Override Decision'}</span>
                </button>
              </div>

              {!isOverrideModalOpen ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Current Status:</span>
                    <DecisionBadge decision={selectedCandidate.decision} size="sm" />
                    {selectedCandidate.decisionOverridden && (
                      <span className="text-[10px] text-indigo-400">(Manual Override by Recruiter)</span>
                    )}
                  </div>
                  {selectedCandidate.decisionNotes && (
                    <p className="italic text-slate-300 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      "{selectedCandidate.decisionNotes}"
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveDecisionOverride} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      New Decision:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['SELECT', 'HOLD', 'REJECT'] as RecruiterDecision[]).map((dec) => (
                        <button
                          key={dec}
                          type="button"
                          onClick={() => setOverrideDecision(dec)}
                          className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            overrideDecision === dec
                              ? dec === 'SELECT'
                                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                : dec === 'HOLD'
                                ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                                : 'bg-rose-600/30 border-rose-500 text-rose-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {dec}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Hiring Manager Justification Note:
                    </label>
                    <textarea
                      rows={2}
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      placeholder="Enter specific hiring rationale..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md"
                    >
                      Save Decision
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Full Report Link */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => navigate(`/admin/responses?candidateId=${selectedCandidate.id}`)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md"
              >
                <span>View Recorded Answers</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
