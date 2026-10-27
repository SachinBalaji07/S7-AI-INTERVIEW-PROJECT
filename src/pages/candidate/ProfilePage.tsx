import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getAptitudeResult,
  getCodingSubmissions,
  getReportByCandidateId,
  getReportForCandidate,
} from '../../services/storageService';
import { StatusBadge, DecisionBadge } from '../../components/common/Badge';
import { ACTIVE_APPLICATION_KEY } from '../../context/ApplicationContext';
import { fetchApplication } from '../../services/backendService';
import { JobApplication } from '../../types';
import { JobOpening } from '../../types';
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Phone,
  FileText,
  Upload,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Award,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  FileCheck,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, token, candidateProfile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeApplication, setActiveApplication] = useState<JobApplication | null>(null);
  const [activeJob, setActiveJob] = useState<JobOpening | null>(null);
  const [formData, setFormData] = useState({
    fullName: candidateProfile?.fullName || user?.name || '',
    phone: candidateProfile?.phone || '',
    location: candidateProfile?.location || '',
    dob: candidateProfile?.dob || '',
    education: candidateProfile?.education || '',
    graduationYear: candidateProfile?.graduationYear || '',
    currentRole: candidateProfile?.currentRole || '',
    experienceYears: candidateProfile?.experienceYears ?? 0,
    skillsInput: candidateProfile?.skills?.join(', ') || '',
  });

  const activeApplicationId = localStorage.getItem(ACTIVE_APPLICATION_KEY);
  useEffect(() => {
    if (!token || !activeApplicationId) {
      setActiveApplication(null);
      setActiveJob(null);
      return;
    }
    fetchApplication(token, activeApplicationId).then(({ application, job }) => {
      setActiveApplication(application);
      setActiveJob(job);
    }).catch((error) => console.error('Unable to load application progress:', error));
  }, [token, activeApplicationId]);
  const aptitudeRes = activeApplication?.aptitudeResult || (activeApplicationId ? getAptitudeResult(activeApplicationId) : null);
  const codingSubs = activeApplication?.codingSubmissions || (activeApplicationId ? getCodingSubmissions(activeApplicationId) : []);
  const report = activeApplication?.report || (user && activeApplicationId
    ? getReportForCandidate(user.id, user.email, activeApplicationId)
    : null);

  const isAptitudeDone = !!aptitudeRes;
  const isCodingDone = activeJob
    ? activeJob.codingProblemIds.every((problemId) => codingSubs.some((submission) => submission.problemId === problemId))
    : false;
  const isInterviewDone = !!report;

  const completedRoundsCount = (isAptitudeDone ? 1 : 0) + (isCodingDone ? 1 : 0) + (isInterviewDone ? 1 : 0);
  const totalRounds = 3;

  const nextRoundLabel = !isAptitudeDone
    ? 'Round 1: Aptitude'
    : !isCodingDone
    ? 'Round 2: Coding'
    : !isInterviewDone
    ? 'Round 3: AI Interview'
    : 'All Completed';

  const overallScoreVal = report ? `${report.overallScore.toFixed(1)}%` : 'Pending';

  // Resume Upload Handler (PDF / DOC to Base64)
  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      if (candidateProfile) {
        const updated = {
          ...candidateProfile,
          resume: {
            name: file.name,
            size: `${(file.size / 1024).toFixed(0)} KB`,
            uploadedAt: new Date().toISOString().split('T')[0],
            dataUrl: base64Data,
          },
        };
        try {
          await refreshProfile(updated);
          showToast(`Resume "${file.name}" uploaded successfully!`, 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Unable to save the uploaded resume.', 'error');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateProfile) return;

    const { skillsInput, ...profileFields } = formData;
    const updated = {
      ...candidateProfile,
      ...profileFields,
      skills: skillsInput.split(',').map((skill) => skill.trim()).filter(Boolean),
    };
    try {
      await refreshProfile(updated);
      setIsEditModalOpen(false);
      showToast('Personal information updated successfully!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save your profile.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Profile Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] overflow-hidden flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {formData.fullName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">{formData.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Candidate
                </span>
                <StatusBadge status={candidateProfile?.status || 'In Progress'} />
              </div>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <span>{formData.currentRole}</span>
                <span className="text-slate-600">•</span>
                <span>{formData.experienceYears} Years Exp</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {user?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {formData.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Joined {user?.joinedDate || '2026-02-14'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm"
          >
            <Edit3 className="w-4 h-4 text-indigo-400" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Completed Rounds</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {completedRoundsCount} <span className="text-slate-500 text-base font-normal">/ {totalRounds}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {completedRoundsCount === 3 ? 'All rounds finalized' : `${totalRounds - completedRoundsCount} round(s) pending`}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Overall Score (%)</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{overallScoreVal}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Decision:</span>
            <DecisionBadge decision={candidateProfile?.decision || 'PENDING'} size="sm" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Evaluation Status</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-slate-100">{candidateProfile?.status || 'In Progress'}</div>
          <div className="mt-2 text-[11px] text-slate-400">AI Sentiment Engine Enabled</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Next Round</span>
            <GraduationCap className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-sm font-bold text-indigo-300 truncate">{nextRoundLabel}</div>
          <div className="mt-2 text-[11px] text-slate-400">Continuous Assessment</div>
        </div>
      </div>

      {/* Two Column Layout: Personal Information & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information Card (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Personal Information</span>
            </h3>
            <span className="text-xs text-slate-500">Verified Credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Full Name</span>
              <p className="font-semibold text-slate-200">{formData.fullName}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Email Address</span>
              <p className="font-semibold text-slate-200">{user?.email}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Phone Number</span>
              <p className="font-semibold text-slate-200">{formData.phone}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Location</span>
              <p className="font-semibold text-slate-200">{formData.location}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Date of Birth</span>
              <p className="font-semibold text-slate-200">{formData.dob}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Education</span>
              <p className="font-semibold text-slate-200">{formData.education}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Year of Graduation</span>
              <p className="font-semibold text-slate-200">{formData.graduationYear}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Current Role & Level</span>
              <p className="font-semibold text-slate-200">
                {formData.currentRole} ({formData.experienceYears} Years)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <span>Quick Links</span>
            </h3>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  const el = document.getElementById('resume-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>View Uploaded Resume</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => navigate('/candidate/report')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>View Assessment Report</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => navigate('/candidate/interview')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Interview Schedule</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => showToast('Support team: support@interviewai.com (24/7 dedicated line)', 'info')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-pink-400" />
                  <span>Contact Support</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            Profile changes sync automatically across candidate evaluation tables.
          </div>
        </div>
      </div>

      {/* Resume Upload Section */}
      <div id="resume-section" className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-400" />
              <span>Resume & Credentials</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload a resume for recruiter review. Add key skills under Edit Profile to tailor questions; resume text is not auto-extracted.
            </p>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]">
            <Upload className="w-4 h-4" />
            <span>{candidateProfile?.resume ? 'Replace Resume' : 'Upload Resume'}</span>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" />
          </label>
        </div>

        {candidateProfile?.resume ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{candidateProfile.resume.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Size: {candidateProfile.resume.size} • Uploaded on {candidateProfile.resume.uploadedAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {candidateProfile.resume.dataUrl ? (
                <a
                  href={candidateProfile.resume.dataUrl}
                  download={candidateProfile.resume.name}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                >
                  Download / View
                </a>
              ) : (
                <button
                  onClick={() => showToast('Resume stored in session record.', 'info')}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                >
                  View File Details
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center bg-slate-950/40">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Resume Uploaded Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Recruiters use your resume to customize interview question parameters.
            </p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Edit Candidate Profile</h3>
            <p className="text-xs text-slate-400 mb-5">Update your personal credentials and educational history.</p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Graduation Year</label>
                  <input
                    type="text"
                    required
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Education & University</label>
                <input
                  type="text"
                  required
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Key Skills (comma separated)</label>
                <input
                  type="text"
                  required
                  value={formData.skillsInput}
                  onChange={(e) => setFormData({ ...formData, skillsInput: e.target.value })}
                  placeholder="React, TypeScript, SQL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Role</label>
                  <input
                    type="text"
                    required
                    value={formData.currentRole}
                    onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="40"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
