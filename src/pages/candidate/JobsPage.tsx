import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ACTIVE_APPLICATION_KEY } from '../../context/ApplicationContext';
import { useToast } from '../../context/ToastContext';
import { applyToJob, fetchJobs, fetchMyApplications } from '../../services/backendService';
import { JobApplication, JobOpening } from '../../types';
import { Briefcase, CheckCircle2, Play } from 'lucide-react';

export const JobsPage: React.FC = () => {
  const { token, candidateProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [availableJobs, myApplications] = await Promise.all([fetchJobs(token), fetchMyApplications(token)]);
      setJobs(availableJobs);
      setApplications(myApplications);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load jobs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  const handleApply = async (job: JobOpening) => {
    if (!token) return;
    if (!candidateProfile) {
      showToast('Please complete your profile before applying.', 'error');
      navigate('/candidate/profile');
      return;
    }
    setApplyingTo(job.id);
    try {
      const application = await applyToJob(token, job.id);
      setApplications((current) => [...current, application]);
      showToast(`Applied to ${job.title}. Your role-specific assessments are ready.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to submit your application.', 'error');
    } finally {
      setApplyingTo(null);
    }
  };

  const startApplication = (application: JobApplication) => {
    localStorage.setItem(ACTIVE_APPLICATION_KEY, application.id);
    navigate('/candidate');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Briefcase className="h-5 w-5 text-indigo-400" />Jobs matched with your skills</h1>
        <p className="mt-1 text-sm text-slate-400">Apply for a role to unlock its recruiter-selected aptitude, coding, and interview questions.</p>
        {candidateProfile?.skills?.length ? <p className="mt-3 text-xs text-indigo-300">Your skills: {candidateProfile.skills.join(', ')}</p> : (
          <button type="button" onClick={() => navigate('/candidate/profile')} className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200">Add skills to your profile to personalize interview questions.</button>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">Open positions</h2>
        {loading ? <p className="text-sm text-slate-400">Loading available roles…</p> : jobs.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">There are no open positions right now. Check back later.</p>
        ) : jobs.map((job) => {
          const application = applications.find((item) => item.jobId === job.id);
          const matches = job.requiredSkills.filter((skill) => candidateProfile?.skills?.some((candidateSkill) => candidateSkill.toLowerCase() === skill.toLowerCase()));
          return (
            <article key={job.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="space-y-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{job.title}</h3>
                    <p className="text-xs text-slate-400">{job.department || 'General'} · {job.location} · {job.employmentType} · {job.minimumExperienceYears}+ years experience</p>
                  </div>
                  <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{job.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill) => (
                      <span key={skill} className={`rounded-full border px-2.5 py-1 text-[11px] ${matches.includes(skill) ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`}>
                        {skill}{matches.includes(skill) ? ' · match' : ''}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">Assessment includes {job.aptitudeQuestionIds.length} aptitude question(s), {job.codingProblemIds.length} coding challenge(s), and {job.interviewQuestionIds.length} interview question(s).</p>
                </div>
                <div className="shrink-0">
                  {application ? (
                    <button type="button" onClick={() => startApplication(application)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500">
                      {localStorage.getItem(ACTIVE_APPLICATION_KEY) === application.id ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {localStorage.getItem(ACTIVE_APPLICATION_KEY) === application.id ? 'Selected assessment' : 'Select assessment'}
                    </button>
                  ) : (
                    <button type="button" onClick={() => void handleApply(job)} disabled={applyingTo === job.id} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
                      {applyingTo === job.id ? 'Applying…' : 'Apply for this role'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
