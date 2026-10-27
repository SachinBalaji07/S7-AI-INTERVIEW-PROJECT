import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createJob, fetchApplicationsForJob, fetchJobs, loadAssessmentQuestionBanks } from '../../services/backendService';
import { getAptitudeQuestions, getCodingProblems, getQuestions } from '../../services/storageService';
import { AssessmentQuestionBanks, JobApplication, JobOpening } from '../../types';
import { Briefcase, Plus, Users, X } from 'lucide-react';

export const AdminJobsPage: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applicantsJob, setApplicantsJob] = useState<JobOpening | null>(null);
  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [questionBanks, setQuestionBanks] = useState<AssessmentQuestionBanks>({
    aptitudeQuestions: getAptitudeQuestions(),
    codingProblems: getCodingProblems(),
    interviewQuestions: getQuestions(),
  });
  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'Full-time' as JobOpening['employmentType'],
    description: '',
    requiredSkills: '',
    minimumExperienceYears: '0',
    aptitudeQuestionIds: [] as string[],
    codingProblemIds: [] as string[],
    interviewQuestionIds: [] as string[],
  });

  const aptitudeQuestions = questionBanks.aptitudeQuestions;
  const codingProblems = questionBanks.codingProblems;
  const interviewQuestions = questionBanks.interviewQuestions;

  const refreshJobs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setJobs(await fetchJobs(token));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load jobs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshJobs();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadAssessmentQuestionBanks(token, {
      aptitudeQuestions: getAptitudeQuestions(),
      codingProblems: getCodingProblems(),
      interviewQuestions: getQuestions(),
    }).then(setQuestionBanks).catch((error) => {
      console.error('Unable to load the shared assessment question banks:', error);
      showToast(error instanceof Error ? error.message : 'Unable to load assessment question banks.', 'error');
    });
  }, [token]);

  const toggle = (field: 'aptitudeQuestionIds' | 'codingProblemIds' | 'interviewQuestionIds', id: string) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((value) => value !== id)
        : [...current[field], id],
    }));
  };

  const suggestQuestionsForSkills = () => {
    const roleTerms = [form.title, ...form.requiredSkills.split(',')]
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);
    if (!roleTerms.length) {
      showToast('Enter a job title and required skills before suggesting assessment questions.', 'info');
      return;
    }
    const matches = (tags: string[] | undefined) =>
      !!tags?.some((tag) => roleTerms.some((term) => tag.toLowerCase().includes(term) || term.includes(tag.toLowerCase())));
    setForm((current) => ({
      ...current,
      aptitudeQuestionIds: aptitudeQuestions.filter((question) => matches(question.skillTags)).map((question) => question.id),
      codingProblemIds: codingProblems.filter((problem) => matches(problem.skillTags)).map((problem) => problem.id),
      interviewQuestionIds: interviewQuestions.filter((question) => matches(question.skillTags)).map((question) => question.id),
    }));
    showToast('Suggested matching questions for all three rounds. Review the selections before publishing.', 'success');
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await createJob(token, {
        ...form,
        requiredSkills: form.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean),
        minimumExperienceYears: Number(form.minimumExperienceYears),
        assessmentContent: {
          aptitudeQuestions: aptitudeQuestions.filter((question) => form.aptitudeQuestionIds.includes(question.id)),
          codingProblems: codingProblems.filter((problem) => form.codingProblemIds.includes(problem.id)),
          interviewQuestions: interviewQuestions.filter((question) => form.interviewQuestionIds.includes(question.id)),
        },
      });
      setForm({
        title: '',
        department: '',
        location: '',
        employmentType: 'Full-time',
        description: '',
        requiredSkills: '',
        minimumExperienceYears: '0',
        aptitudeQuestionIds: [],
        codingProblemIds: [],
        interviewQuestionIds: [],
      });
      showToast('Job opening published with its role-specific assessment.', 'success');
      await refreshJobs();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to publish job opening.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showApplicants = async (job: JobOpening) => {
    if (!token) return;
    try {
      setApplicants(await fetchApplicationsForJob(token, job.id));
      setApplicantsJob(job);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load applicants.', 'error');
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none';
  const selectClass = 'w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none';
  const checkboxGroup = (
    title: string,
    items: Array<{ id: string; label: string; tags?: string[] }>,
    field: 'aptitudeQuestionIds' | 'codingProblemIds' | 'interviewQuestionIds'
  ) => (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold text-slate-200">{title}</legend>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        {items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form[field].includes(item.id)}
              onChange={() => toggle(field, item.id)}
              className="mt-0.5 accent-purple-500"
            />
            <span>{item.label}{item.tags?.length ? <span className="mt-1 block text-[10px] text-slate-500">{item.tags.join(' · ')}</span> : null}</span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Selected: {form[field].length}</p>
    </fieldset>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Briefcase className="h-5 w-5 text-purple-400" />Jobs & Assessments</h1>
        <p className="mt-1 text-sm text-slate-400">Publish a role and select the aptitude, coding, and interview questions that evaluate its requirements.</p>
      </header>

      <form onSubmit={handleCreate} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <h2 className="text-base font-bold text-white">Create a job opening</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Job title (e.g. Frontend Engineer)" className={inputClass} />
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" className={inputClass} />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location (e.g. Remote)" className={inputClass} />
          <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value as JobOpening['employmentType'] })} className={selectClass}>
            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
          </select>
        </div>
        <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the job responsibilities and what the successful candidate will do." className={inputClass} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} placeholder="Required skills, comma separated (React, TypeScript)" className={inputClass} />
          <input type="number" min="0" max="40" value={form.minimumExperienceYears} onChange={(e) => setForm({ ...form, minimumExperienceYears: e.target.value })} aria-label="Minimum experience in years" placeholder="Minimum experience in years" className={inputClass} />
        </div>
        <button type="button" onClick={suggestQuestionsForSkills} className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20">
          Suggest questions from job title & skills
        </button>
        <div className="grid gap-5 lg:grid-cols-3">
          {checkboxGroup('Round 1 · Aptitude', aptitudeQuestions.map((q) => ({ id: q.id, label: `${q.chart ? 'Pie chart · ' : ''}${q.question}`, tags: q.skillTags })), 'aptitudeQuestionIds')}
          {checkboxGroup('Round 2 · Coding', codingProblems.map((p) => ({ id: p.id, label: `${p.title} · ${p.difficulty}`, tags: p.skillTags })), 'codingProblemIds')}
          {checkboxGroup('Round 3 · Interview', interviewQuestions.map((q) => ({ id: q.id, label: q.questionText, tags: q.skillTags })), 'interviewQuestionIds')}
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
          <Plus className="h-4 w-4" />{saving ? 'Publishing…' : 'Publish job'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">Your open jobs</h2>
        {loading ? <p className="text-sm text-slate-400">Loading jobs…</p> : jobs.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">No open roles yet. Publish one above to begin receiving applications.</p>
        ) : jobs.map((job) => (
          <article key={job.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-semibold text-white">{job.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{job.department || 'General'} · {job.location} · {job.employmentType}</p>
              <p className="mt-2 text-xs text-slate-500">Skills: {job.requiredSkills.join(', ')}</p>
            </div>
            <button type="button" onClick={() => void showApplicants(job)} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-purple-500 sm:self-auto">
              <Users className="h-4 w-4" />View applicants
            </button>
          </article>
        ))}
      </section>

      {applicantsJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Job applicants">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-bold text-white">Applicants</h2><p className="text-xs text-slate-400">{applicantsJob.title}</p></div>
              <button onClick={() => setApplicantsJob(null)} aria-label="Close applicants" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {applicants.length === 0 ? <p className="py-6 text-sm text-slate-400">No applications received yet.</p> : (
              <div className="space-y-3">
                {applicants.map((application) => (
                  <article key={application.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <h3 className="font-semibold text-white">{application.candidateName}</h3>
                    <p className="text-xs text-slate-400">{application.candidateEmail} · {application.candidateProfile.currentRole} · {application.candidateProfile.experienceYears} years</p>
                    <p className="mt-2 text-xs text-slate-300">Skills: {application.candidateProfile.skills?.join(', ') || 'Not provided'}</p>
                    {application.candidateProfile.resume?.name && <p className="mt-1 text-xs text-indigo-300">Resume: {application.candidateProfile.resume.name}</p>}
                    <p className="mt-2 text-[11px] text-slate-500">Application status: {application.status}</p>
                    {application.aptitudeResult && <p className="mt-1 text-xs text-slate-300">Aptitude: {application.aptitudeResult.score}%</p>}
                    {application.codingSubmissions?.length ? <p className="mt-1 text-xs text-slate-300">Coding average: {Math.round(application.codingSubmissions.reduce((total, item) => total + item.overallScore, 0) / application.codingSubmissions.length)}%</p> : null}
                    {application.report && <p className="mt-1 text-xs text-emerald-300">Final score: {application.report.overallScore}% · {application.report.decision}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
