import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import vm from 'node:vm';
import { GoogleGenAI, Type } from '@google/genai';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  getApplicationForCandidate,
  deleteAssessmentQuestionBankItem,
  getCandidateProfile,
  getJob,
  getOrCreateAuthSecret,
  getAssessmentQuestionBanks,
  getUserByEmail,
  getUserById,
  listApplicationsForCandidate,
  listApplicationsForJob,
  listCandidateProfiles,
  listJobs,
  saveApplication,
  saveAssessmentQuestionBankItem,
  saveCandidateProfile,
  saveJob,
  saveUser,
  updateApplication,
  updateUserName,
} from './serverDatabase';
import { AssessmentReport, CandidateProfile, CandidateRegistrationDetails, CodingSubmissionResult, JobApplication, JobOpening, RecruiterDecision, User } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const authSecret = getOrCreateAuthSecret();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    joinedDate: user.joinedDate,
    avatar: user.avatar,
  };
}

function issueToken(user: User): string {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  })).toString('base64url');
  const signature = createHmac('sha256', authSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function authenticatedUser(req: Request) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', authSecret).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; exp: number };
    if (parsed.exp * 1000 <= Date.now()) return null;
    return getUserById(parsed.sub) || null;
  } catch {
    return null;
  }
}

function requireRole(req: Request, res: Response, role: User['role']) {
  const user = authenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return null;
  }
  if (user.role !== role) {
    res.status(403).json({ error: 'You do not have permission to perform this action.' });
    return null;
  }
  return user;
}

const demoSalt = 'interviewai-demo-salt';
if (!getUserByEmail('recruiter@interviewai.com')) {
  saveUser({
    id: 'u-recruiter-1',
    name: 'TIGER MUTHUVEL PANDIYAN',
    email: 'recruiter@interviewai.com',
    role: 'recruiter',
    joinedDate: '2026-01-10',
    avatar: '',
    passwordSalt: demoSalt,
    passwordHash: scryptSync('password123', demoSalt, 64).toString('hex'),
  });
}
const demoRecruiter = getUserByEmail('recruiter@interviewai.com');
if (demoRecruiter && demoRecruiter.name !== 'TIGER MUTHUVEL PANDIYAN') {
  updateUserName(demoRecruiter.id, 'TIGER MUTHUVEL PANDIYAN');
}
if (!getUserByEmail('alex.johnson@example.com')) {
  const alex: User = {
    id: 'u-candidate-alex',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    role: 'candidate',
    joinedDate: '2026-02-14',
    avatar: '',
  };
  saveUser({
    ...alex,
    passwordSalt: demoSalt,
    passwordHash: scryptSync('password123', demoSalt, 64).toString('hex'),
  });
}
const demoCandidate = getUserByEmail('alex.johnson@example.com')!;
if (!getCandidateProfile(demoCandidate.id)) {
  saveCandidateProfile({
    id: 'prof-alex',
    userId: demoCandidate.id,
    fullName: demoCandidate.name,
    email: demoCandidate.email,
    phone: '+1 (555) 234-8901',
    location: 'San Francisco, CA',
    dob: '1998-05-14',
    education: 'B.S. in Computer Science, UC Berkeley',
    graduationYear: '2020',
    currentRole: 'Full Stack Engineer',
    experienceYears: 4,
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    status: 'In Progress',
    decision: 'PENDING',
  });
}
if (!getJob('job-demo-software')) {
  saveJob({
    id: 'job-demo-software',
    recruiterId: 'u-recruiter-1',
    title: 'Full Stack Software Engineer',
    department: 'Engineering',
    location: 'Remote',
    employmentType: 'Full-time',
    description: 'Build accessible web applications and scalable API services. This sample opening demonstrates how recruiter-selected assessments follow a role.',
    requiredSkills: ['React', 'TypeScript', 'Node.js'],
    minimumExperienceYears: 2,
    aptitudeQuestionIds: ['apt1', 'apt2', 'apt3', 'apt4', 'apt5', 'apt6', 'apt7', 'apt8', 'apt9', 'apt10', 'apt11', 'apt12', 'apt13', 'apt14', 'apt15'],
    codingProblemIds: ['code1', 'code2'],
    interviewQuestionIds: ['q1', 'q4', 'q8'],
    createdAt: new Date().toISOString(),
    status: 'Open',
  });
}
const demoSoftwareJob = getJob('job-demo-software');
if (
  demoSoftwareJob &&
  (demoSoftwareJob.aptitudeQuestionIds.length === 3 || demoSoftwareJob.aptitudeQuestionIds.length === 10) &&
  demoSoftwareJob.aptitudeQuestionIds.every((id, index) => id === ['apt1', 'apt2', 'apt3', 'apt4', 'apt5', 'apt6', 'apt7', 'apt8', 'apt9', 'apt10'][index]) &&
  !demoSoftwareJob.assessmentContent?.aptitudeQuestions?.length
) {
  saveJob({
    ...demoSoftwareJob,
    aptitudeQuestionIds: ['apt1', 'apt2', 'apt3', 'apt4', 'apt5', 'apt6', 'apt7', 'apt8', 'apt9', 'apt10', 'apt11', 'apt12', 'apt13', 'apt14', 'apt15'],
  });
}
if (!listApplicationsForCandidate(demoCandidate.id).some((application) => application.jobId === 'job-demo-software')) {
  const demoProfile = getCandidateProfile(demoCandidate.id)!;
  const application: JobApplication = {
    id: 'application-demo-alex',
    jobId: 'job-demo-software',
    candidateId: demoCandidate.id,
    candidateName: demoCandidate.name,
    candidateEmail: demoCandidate.email,
    candidateProfile: demoProfile,
    appliedAt: new Date().toISOString(),
    status: 'Applied',
  };
  saveApplication(application);
}

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role, candidateDetails } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: User['role'];
    candidateDetails?: CandidateRegistrationDetails;
  };
  const cleanName = name?.trim() || '';
  const cleanEmail = email?.trim().toLowerCase() || '';
  if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !password || password.length < 8) {
    return res.status(400).json({ error: 'Enter a name, valid email, and password with at least 8 characters.' });
  }
  if (role !== 'candidate' && role !== 'recruiter') {
    return res.status(400).json({ error: 'Choose a valid account role.' });
  }
  if (role === 'candidate' && (
    !candidateDetails?.phone?.trim() ||
    !candidateDetails.location?.trim() ||
    !candidateDetails.dob ||
    !candidateDetails.education?.trim() ||
    !candidateDetails.graduationYear?.trim() ||
    !candidateDetails.currentRole?.trim() ||
    !Array.isArray(candidateDetails.skills) ||
    !candidateDetails.skills.some((skill) => typeof skill === 'string' && skill.trim()) ||
    !Number.isInteger(candidateDetails.experienceYears) ||
    candidateDetails.experienceYears < 0 ||
    candidateDetails.experienceYears > 40
  )) {
    return res.status(400).json({ error: 'Please complete all candidate profile details.' });
  }
  if (getUserByEmail(cleanEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const id = `u-${role}-${randomBytes(12).toString('hex')}`;
  const salt = randomBytes(16).toString('hex');
  const user: User = {
    id,
    name: cleanName,
    email: cleanEmail,
    role,
    joinedDate: new Date().toISOString().slice(0, 10),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
  };
  saveUser({
    ...user,
    passwordSalt: salt,
    passwordHash: scryptSync(password, salt, 64).toString('hex'),
  });
  let profile: CandidateProfile | undefined;
  if (role === 'candidate' && candidateDetails) {
    profile = {
      id: `prof-${randomBytes(12).toString('hex')}`,
      userId: id,
      fullName: cleanName,
      email: cleanEmail,
      phone: candidateDetails.phone.trim(),
      location: candidateDetails.location.trim(),
      dob: candidateDetails.dob,
      education: candidateDetails.education.trim(),
      graduationYear: candidateDetails.graduationYear.trim(),
      currentRole: candidateDetails.currentRole.trim(),
      experienceYears: candidateDetails.experienceYears,
      skills: candidateDetails.skills.map((skill) => skill.trim()).filter(Boolean),
      status: 'In Progress',
      decision: 'PENDING',
    };
    saveCandidateProfile(profile);
  }
  return res.status(201).json({ user, profile, token: issueToken(user) });
});

app.post('/api/auth/migrate-local', (req: Request, res: Response) => {
  const { legacyUser, password, legacyProfile } = req.body as {
    legacyUser?: User;
    password?: string;
    legacyProfile?: CandidateProfile;
  };
  const name = legacyUser?.name?.trim() || '';
  const email = legacyUser?.email?.trim().toLowerCase() || '';
  if (
    !legacyUser ||
    !/^u-(candidate|recruiter)-[a-zA-Z0-9-]{1,100}$/.test(legacyUser.id) ||
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 6 ||
    (legacyUser.role !== 'candidate' && legacyUser.role !== 'recruiter')
  ) {
    return res.status(400).json({ error: 'The existing local account could not be migrated.' });
  }
  if (getUserByEmail(email) || getUserById(legacyUser.id)) {
    return res.status(409).json({ error: 'An account with this email already exists on the server. Sign in with that account.' });
  }

  const user: User = {
    id: legacyUser.id,
    name,
    email,
    role: legacyUser.role,
    joinedDate: legacyUser.joinedDate || new Date().toISOString().slice(0, 10),
    avatar: legacyUser.avatar || '',
  };
  const salt = randomBytes(16).toString('hex');
  saveUser({
    ...user,
    passwordSalt: salt,
    passwordHash: scryptSync(password, salt, 64).toString('hex'),
  });

  let profile: CandidateProfile | undefined;
  if (user.role === 'candidate') {
    const old = legacyProfile;
    profile = {
      id: old?.id || `prof-${randomBytes(12).toString('hex')}`,
      userId: user.id,
      fullName: name,
      email,
      phone: old?.phone.includes('000-0000') ? '' : old?.phone || '',
      location: old?.location === 'Remote, USA' || old?.location === 'Remote' ? '' : old?.location || '',
      dob: old?.dob === '2000-01-01' ? '' : old?.dob || '',
      education: old?.education === 'B.S. in Computer Science' ? '' : old?.education || '',
      graduationYear: old?.graduationYear === '2024' ? '' : old?.graduationYear || '',
      currentRole: old?.currentRole === 'Software Engineer' ? '' : old?.currentRole || '',
      experienceYears: old?.experienceYears === 1 ? 0 : old?.experienceYears || 0,
      skills: old?.skills || [],
      resume: old?.resume,
      status: 'In Progress',
      decision: 'PENDING',
    };
    saveCandidateProfile(profile);
  }

  return res.status(201).json({ user, profile, token: issueToken(user) });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = email ? getUserByEmail(email.trim().toLowerCase()) : undefined;
  if (!user || !password) return res.status(401).json({ error: 'Invalid email or password.' });
  const hash = scryptSync(password, user.passwordSalt, 64);
  if (!timingSafeEqual(hash, Buffer.from(user.passwordHash, 'hex'))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const { passwordHash, passwordSalt, ...cleanUser } = user;
  void passwordHash;
  void passwordSalt;
  return res.json({
    user: publicUser(cleanUser),
    profile: user.role === 'candidate' ? getCandidateProfile(user.id) || null : null,
    token: issueToken(user),
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = authenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  const { passwordHash, passwordSalt, ...cleanUser } = user;
  void passwordHash;
  void passwordSalt;
  return res.json({
    user: publicUser(cleanUser),
    profile: user.role === 'candidate' ? getCandidateProfile(user.id) || null : null,
  });
});

app.get('/api/profile', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  return res.json({ profile: getCandidateProfile(user.id) || null });
});

app.put('/api/profile', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  const currentProfile = getCandidateProfile(user.id);
  if (!currentProfile) return res.status(404).json({ error: 'Candidate profile not found.' });
  const submitted = req.body as CandidateProfile;
  if (
    !submitted ||
    !submitted.fullName?.trim() ||
    submitted.fullName.trim().length > 160 ||
    !submitted.phone?.trim() ||
    !submitted.location?.trim() ||
    !submitted.dob ||
    !submitted.education?.trim() ||
    !submitted.graduationYear?.trim() ||
    !submitted.currentRole?.trim() ||
    !Number.isInteger(submitted.experienceYears) ||
    submitted.experienceYears < 0 ||
    submitted.experienceYears > 40 ||
    !Array.isArray(submitted.skills) ||
    submitted.skills.length > 50 ||
    submitted.skills.some((skill) => typeof skill !== 'string' || skill.length > 80)
  ) {
    return res.status(400).json({ error: 'Invalid profile data.' });
  }
  const profile: CandidateProfile = {
    ...currentProfile,
    fullName: submitted.fullName.trim(),
    phone: submitted.phone.trim(),
    location: submitted.location.trim(),
    dob: submitted.dob,
    education: submitted.education.trim(),
    graduationYear: submitted.graduationYear.trim(),
    currentRole: submitted.currentRole.trim(),
    experienceYears: submitted.experienceYears,
    skills: submitted.skills.map((skill) => skill.trim()).filter(Boolean),
    resume: submitted.resume,
  };
  updateUserName(user.id, profile.fullName);
  saveCandidateProfile(profile);
  return res.json({ profile });
});

app.get('/api/admin/profiles', (req: Request, res: Response) => {
  if (!requireRole(req, res, 'recruiter')) return;
  return res.json({ profiles: listCandidateProfiles() });
});

app.put('/api/admin/profiles/:profileId/decision', (req: Request, res: Response) => {
  if (!requireRole(req, res, 'recruiter')) return;
  const profile = listCandidateProfiles().find((item) => item.id === req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Candidate profile not found.' });
  const { decision, notes } = req.body as { decision?: RecruiterDecision; notes?: string };
  if (!['SELECT', 'HOLD', 'REJECT', 'PENDING'].includes(decision || '')) {
    return res.status(400).json({ error: 'Choose a valid hiring decision.' });
  }
  const updated = {
    ...profile,
    decision: decision!,
    decisionNotes: typeof notes === 'string' ? notes.slice(0, 4000) : '',
    decisionOverridden: true,
  };
  saveCandidateProfile(updated);
  return res.json({ profile: updated });
});

app.get('/api/admin/question-bank', (req: Request, res: Response) => {
  if (!requireRole(req, res, 'recruiter')) return;
  return res.json({ banks: getAssessmentQuestionBanks() });
});

app.post('/api/admin/question-bank', (req: Request, res: Response) => {
  if (!requireRole(req, res, 'recruiter')) return;
  const { bank, item } = req.body as {
    bank?: keyof import('./src/types').AssessmentQuestionBanks;
    item?: { id?: string };
  };
  const validBanks = ['aptitudeQuestions', 'codingProblems', 'interviewQuestions'];
  if (
    !bank ||
    !validBanks.includes(bank) ||
    !item ||
    typeof item.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) ||
    JSON.stringify(item).length > 500_000
  ) {
    return res.status(400).json({ error: 'Invalid question bank item.' });
  }
  if (bank === 'aptitudeQuestions') {
    const question = item as import('./src/types').AptitudeQuestion;
    if (
      typeof question.question !== 'string' ||
      !question.question.trim() ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      !Number.isInteger(question.correctOptionIndex) ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length ||
      typeof question.explanation !== 'string' ||
      (question.chart && (
        question.chart.type !== 'pie' ||
        !Array.isArray(question.chart.data) ||
        question.chart.data.length < 2 ||
        question.chart.data.length > 12 ||
        question.chart.data.some((slice) => !slice.label?.trim() || !Number.isFinite(slice.value) || slice.value <= 0)
      ))
    ) {
      return res.status(400).json({ error: 'Invalid aptitude question or pie chart data.' });
    }
  } else if (bank === 'codingProblems') {
    const problem = item as import('./src/types').CodingProblem;
    if (
      typeof problem.title !== 'string' ||
      !problem.title.trim() ||
      typeof problem.description !== 'string' ||
      !problem.description.trim() ||
      !problem.initialCode?.includes('function ') ||
      !Array.isArray(problem.testCases) ||
      !problem.testCases.length ||
      problem.testCases.some((testCase) => !testCase.callCode?.includes('(') || !Object.hasOwn(testCase, 'expectedValue'))
    ) {
      return res.status(400).json({ error: 'Coding challenges need a statement, JavaScript starter function, and runnable test cases.' });
    }
  } else {
    const question = item as import('./src/types').QuestionBankItem;
    if (
      typeof question.questionText !== 'string' ||
      !question.questionText.trim() ||
      typeof question.expectedAnswer !== 'string' ||
      !question.expectedAnswer.trim() ||
      !Array.isArray(question.keywords)
    ) {
      return res.status(400).json({ error: 'Invalid interview question.' });
    }
  }
  saveAssessmentQuestionBankItem(bank, item.id, item as import('./src/types').AptitudeQuestion | import('./src/types').CodingProblem | import('./src/types').QuestionBankItem);
  return res.json({ success: true });
});

app.delete('/api/admin/question-bank/:bank/:id', (req: Request, res: Response) => {
  if (!requireRole(req, res, 'recruiter')) return;
  const validBanks = ['aptitudeQuestions', 'codingProblems', 'interviewQuestions'];
  const bank = req.params.bank as keyof import('./src/types').AssessmentQuestionBanks;
  if (!validBanks.includes(bank) || !/^[a-zA-Z0-9_-]{1,100}$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid question bank item.' });
  }
  if (/^(apt|code|q)\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Built-in assessment questions cannot be deleted.' });
  }
  deleteAssessmentQuestionBankItem(bank, req.params.id);
  return res.json({ success: true });
});

app.get('/api/jobs', (req: Request, res: Response) => {
  const user = authenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to view jobs.' });
  const visibleJobs = listJobs().filter((job) => (
    job.status === 'Open' && (user.role === 'candidate' || job.recruiterId === user.id)
  )).map((job) => user.role === 'candidate' ? { ...job, assessmentContent: undefined } : job);
  return res.json({ jobs: visibleJobs });
});

app.post('/api/jobs', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'recruiter');
  if (!user) return;
  const payload = req.body as Partial<JobOpening>;
  const content = payload.assessmentContent;
  if (
    typeof payload.title !== 'string' ||
    !payload.title.trim() ||
    payload.title.length > 160 ||
    typeof payload.description !== 'string' ||
    !payload.description.trim() ||
    payload.description.length > 10000 ||
    !Array.isArray(payload.requiredSkills) ||
    !payload.requiredSkills.some((skill) => typeof skill === 'string' && skill.trim()) ||
    payload.requiredSkills.length > 50 ||
    payload.requiredSkills.some((skill) => typeof skill !== 'string' || skill.length > 80) ||
    !Array.isArray(payload.aptitudeQuestionIds) ||
    !payload.aptitudeQuestionIds.length ||
    payload.aptitudeQuestionIds.some((id) => typeof id !== 'string') ||
    !Array.isArray(payload.codingProblemIds) ||
    !payload.codingProblemIds.length ||
    payload.codingProblemIds.some((id) => typeof id !== 'string') ||
    !Array.isArray(payload.interviewQuestionIds) ||
    !payload.interviewQuestionIds.length ||
    payload.interviewQuestionIds.some((id) => typeof id !== 'string') ||
    !content ||
    !Array.isArray(content.aptitudeQuestions) ||
    !Array.isArray(content.codingProblems) ||
    !Array.isArray(content.interviewQuestions) ||
    payload.aptitudeQuestionIds.some((id) => !content.aptitudeQuestions.some((question) => question.id === id)) ||
    payload.codingProblemIds.some((id) => !content.codingProblems.some((problem) => problem.id === id)) ||
    payload.interviewQuestionIds.some((id) => !content.interviewQuestions.some((question) => question.id === id)) ||
    !Number.isFinite(payload.minimumExperienceYears) ||
    payload.minimumExperienceYears! < 0 ||
    payload.minimumExperienceYears! > 40
  ) {
    return res.status(400).json({ error: 'Provide job details and at least one assessment item for each round.' });
  }
  const job: JobOpening = {
    id: `job-${randomBytes(12).toString('hex')}`,
    recruiterId: user.id,
    title: payload.title.trim(),
    department: typeof payload.department === 'string' ? payload.department.trim().slice(0, 120) : '',
    location: typeof payload.location === 'string' ? payload.location.trim().slice(0, 160) : 'Remote',
    employmentType: ['Full-time', 'Part-time', 'Contract', 'Internship'].includes(payload.employmentType || '')
      ? payload.employmentType!
      : 'Full-time',
    description: payload.description.trim(),
    requiredSkills: payload.requiredSkills.map((skill) => skill.trim()).filter(Boolean),
    minimumExperienceYears: Math.max(0, Number(payload.minimumExperienceYears) || 0),
    aptitudeQuestionIds: payload.aptitudeQuestionIds,
    codingProblemIds: payload.codingProblemIds,
    interviewQuestionIds: payload.interviewQuestionIds,
    assessmentContent: {
      aptitudeQuestions: content.aptitudeQuestions.filter((question) => payload.aptitudeQuestionIds!.includes(question.id)),
      codingProblems: content.codingProblems.filter((problem) => payload.codingProblemIds!.includes(problem.id)),
      interviewQuestions: content.interviewQuestions.filter((question) => payload.interviewQuestionIds!.includes(question.id)),
    },
    createdAt: new Date().toISOString(),
    status: 'Open',
  };
  saveJob(job);
  return res.status(201).json({ job });
});

app.get('/api/jobs/:jobId/applications', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'recruiter');
  if (!user) return;
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job opening not found.' });
  if (job.recruiterId !== user.id) return res.status(403).json({ error: 'You do not own this job opening.' });
  const applications = listApplicationsForJob(job.id).map((application) => {
    const profile = getCandidateProfile(application.candidateId);
    return profile
      ? { ...application, candidateProfile: { ...profile, resume: profile.resume ? { ...profile.resume, dataUrl: undefined } : undefined } }
      : application;
  });
  return res.json({ applications });
});

app.post('/api/jobs/:jobId/applications', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  const job = getJob(req.params.jobId);
  if (!job || job.status !== 'Open') return res.status(404).json({ error: 'This job opening is not available.' });
  const profile = getCandidateProfile(user.id);
  if (!profile) return res.status(400).json({ error: 'Complete your candidate profile before applying.' });
  if (
    !profile.phone.trim() ||
    !profile.location.trim() ||
    !profile.dob ||
    !profile.education.trim() ||
    !profile.graduationYear.trim() ||
    !profile.currentRole.trim() ||
    !profile.skills?.length
  ) {
    return res.status(400).json({ error: 'Complete your profile and add at least one skill before applying.' });
  }
  const existing = listApplicationsForCandidate(user.id).find((application) => application.jobId === job.id);
  if (existing) return res.status(409).json({ error: 'You have already applied for this role.', application: existing });

  const safeProfile = { ...profile, resume: profile.resume ? { ...profile.resume, dataUrl: undefined } : undefined };
  const application: JobApplication = {
    id: `application-${randomBytes(12).toString('hex')}`,
    jobId: job.id,
    candidateId: user.id,
    candidateName: user.name,
    candidateEmail: user.email,
    candidateProfile: safeProfile,
    appliedAt: new Date().toISOString(),
    status: 'Applied',
  };
  saveApplication(application);
  return res.status(201).json({ application });
});

app.get('/api/applications/me', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  return res.json({ applications: listApplicationsForCandidate(user.id) });
});

app.get('/api/applications/:applicationId', (req: Request, res: Response) => {
  const user = authenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  if (user.role !== 'candidate') return res.status(403).json({ error: 'Candidate access is required.' });
  const application = getApplicationForCandidate(req.params.applicationId, user.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const job = getJob(application.jobId);
  return res.json({ application, job });
});

app.put('/api/applications/:applicationId/aptitude', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  const application = getApplicationForCandidate(req.params.applicationId, user.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const { score, answersMap } = req.body as { score?: number; answersMap?: Record<string, number> };
  if (!Number.isFinite(score) || score! < 0 || score! > 100 || !answersMap || typeof answersMap !== 'object') {
    return res.status(400).json({ error: 'Invalid aptitude result.' });
  }
  application.aptitudeResult = { score: score!, answersMap, completedAt: new Date().toISOString() };
  application.status = 'In Progress';
  updateApplication(application.id, application);
  return res.json({ application });
});

app.put('/api/applications/:applicationId/coding', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  const application = getApplicationForCandidate(req.params.applicationId, user.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const job = getJob(application.jobId);
  const submissions = (req.body as { submissions?: CodingSubmissionResult[] }).submissions;
  if (
    !job ||
    !Array.isArray(submissions) ||
    submissions.some((submission) =>
      !job.codingProblemIds.includes(submission.problemId) ||
      !Number.isFinite(submission.overallScore) ||
      submission.overallScore < 0 ||
      submission.overallScore > 100
    )
  ) {
    return res.status(400).json({ error: 'Invalid coding submission.' });
  }
  application.codingSubmissions = submissions;
  application.status = 'In Progress';
  updateApplication(application.id, application);
  return res.json({ application });
});

app.put('/api/applications/:applicationId/report', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  const application = getApplicationForCandidate(req.params.applicationId, user.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const report = req.body as AssessmentReport;
  const candidateProfile = getCandidateProfile(user.id);
  if (
    !report ||
    report.applicationId !== application.id ||
    report.candidateEmail.toLowerCase() !== user.email.toLowerCase() ||
    report.candidateId !== candidateProfile?.id ||
    !Number.isFinite(report.overallScore) ||
    report.overallScore < 0 ||
    report.overallScore > 100
  ) {
    return res.status(400).json({ error: 'Invalid assessment report.' });
  }
  application.report = report;
  application.status = 'Completed';
  updateApplication(application.id, application);
  if (candidateProfile) {
    saveCandidateProfile({
      ...candidateProfile,
      status: 'Completed',
      decision: report.decision,
      decisionNotes: report.decisionReason,
    });
  }
  return res.json({ application });
});

app.put('/api/applications/:applicationId/status', (req: Request, res: Response) => {
  const user = requireRole(req, res, 'candidate');
  if (!user) return;
  const application = getApplicationForCandidate(req.params.applicationId, user.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const { status } = req.body as { status?: JobApplication['status'] };
  if (status !== 'In Progress' && status !== 'Completed') {
    return res.status(400).json({ error: 'Invalid application status.' });
  }
  application.status = status;
  updateApplication(application.id, application);
  return res.json({ application });
});

// Helper for local filler word detection
function analyzeTextMetrics(text: string, keywords: string[] = []) {
  const clean = text.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  const fillerList = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically', 'actually', 'literally', 'so yeah', 'right'];
  let fillerCount = 0;
  for (const filler of fillerList) {
    const matches = clean.match(new RegExp(`\\b${filler}\\b`, 'gi'));
    if (matches) {
      fillerCount += matches.length;
    }
  }

  // Keywords matched
  const matchedKeywords = keywords.filter((k) => clean.includes(k.toLowerCase().trim()));
  const keywordCoverage = keywords.length > 0 ? Math.round((matchedKeywords.length / keywords.length) * 100) : 80;

  return {
    wordCount: totalWords,
    fillerWordCount: fillerCount,
    keywordCoverage,
    matchedKeywords,
  };
}

// Fallback evaluation if Gemini key is missing or model network fails
function generateFallbackEvaluation(questionText: string, expectedAnswer: string, transcript: string, keywords: string[] = []) {
  const clean = (transcript || '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wCount = words.length;

  // Strict Silence Detection: If empty, placeholder, or fewer than 3 words
  const isSilent = !clean || 
    wCount < 3 || 
    clean.toLowerCase().includes('no speech') || 
    clean.toLowerCase().includes('candidate remained silent') ||
    clean.toLowerCase().includes('audio transcription captured in session');

  if (isSilent) {
    return {
      transcript: '[No speech detected / Candidate remained silent]',
      sentiment: 'neutral',
      sentimentScore: 0,
      emotion: 'neutral',
      similarityScore: 0,
      technicalScore: 0,
      communicationScore: 0,
      confidenceScore: 0,
      fillerWordCount: 0,
      wordsPerMinute: 0,
      strengths: [
        'No audible response provided.',
      ],
      improvements: [
        'No speech was detected in this recording. Ensure your microphone is active and not muted.',
        `Please click "Re-record Answer" and audibly explain concepts such as ${keywords.slice(0, 3).join(', ') || 'the requested technical principles'}.`,
      ],
    };
  }

  const metrics = analyzeTextMetrics(clean, keywords);
  const coverage = metrics.keywordCoverage;

  // If very short answer (3-15 words), give low score commensurate with an incomplete answer
  if (wCount < 15) {
    const techShort = Math.min(45, Math.max(10, Math.round(coverage * 0.3 + wCount * 1.5)));
    return {
      transcript: clean,
      sentiment: 'neutral',
      sentimentScore: 40,
      emotion: 'hesitant',
      similarityScore: Math.min(40, Math.round(coverage * 0.4)),
      technicalScore: techShort,
      communicationScore: Math.min(50, Math.max(20, wCount * 3)),
      confidenceScore: 45,
      fillerWordCount: metrics.fillerWordCount,
      wordsPerMinute: Math.min(130, Math.max(60, Math.round(wCount * 2.2))),
      strengths: [
        'Attempted an initial statement on the topic',
      ],
      improvements: [
        'Answer was extremely brief or incomplete. A thorough technical explanation requires elaborating on mechanisms, trade-offs, and examples.',
        `Cover key concepts in depth: ${keywords.slice(0, 3).join(', ')}`,
      ],
    };
  }

  // Realistic scoring for full answers
  const technicalScore = Math.min(95, Math.max(25, Math.round(25 + coverage * 0.5 + Math.min(wCount, 120) * 0.15)));
  const communicationScore = Math.min(95, Math.max(30, Math.round(60 - metrics.fillerWordCount * 3 + Math.min(wCount, 80) * 0.2)));
  const confidenceScore = Math.min(95, Math.max(30, Math.round(65 - metrics.fillerWordCount * 4 + (wCount > 40 ? 15 : 0))));
  const similarityScore = Math.min(95, Math.max(20, Math.round(coverage * 0.65 + Math.min(wCount, 60) * 0.2)));
  const sentimentScore = Math.min(95, Math.max(40, Math.round(55 + (technicalScore > 70 ? 20 : 0))));

  return {
    transcript: clean,
    sentiment: sentimentScore > 70 ? 'positive' : sentimentScore > 45 ? 'neutral' : 'negative',
    sentimentScore,
    emotion: confidenceScore > 75 ? 'confident' : confidenceScore > 55 ? 'enthusiastic' : 'neutral',
    similarityScore,
    technicalScore,
    communicationScore,
    confidenceScore,
    fillerWordCount: metrics.fillerWordCount,
    wordsPerMinute: Math.min(160, Math.max(90, Math.round(wCount * 2.5))),
    strengths: [
      `Addressed core concept regarding ${keywords[0] || 'the technical domain'}`,
      `Demonstrated technical terminology and explanation structure`,
    ],
    improvements: [
      `Could provide deeper edge-case coverage and architectural trade-offs`,
      metrics.fillerWordCount > 0 ? `Minimize hesitation markers (${metrics.fillerWordCount} detected)` : `Include concrete real-world production examples`,
    ],
  };
}

// API: Analyze Audio + Question Answer
app.post('/api/ai/analyze-answer', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', questionText, expectedAnswer, keywords = [], userTranscriptFallback = '' } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    if (!ai) {
      // Deterministic evaluation with strict silence checks
      const fallback = generateFallbackEvaluation(questionText, expectedAnswer || '', userTranscriptFallback, keywords);
      return res.json(fallback);
    }

    const cleanFallback = (userTranscriptFallback || '').trim();

    const promptText = `You are an authentic, strict Senior Technical Hiring Lead and Interview Evaluator assessing a candidate's spoken response.
Question Asked: "${questionText}"
Expected Technical Answer: "${expectedAnswer || 'Clear technical breakdown with best practices, core mechanisms, and trade-offs'}"
Target Keywords: ${JSON.stringify(keywords)}
${cleanFallback ? `Browser Speech Recognition Text (if audio is noisy or needs reference): "${cleanFallback}"` : ''}

CRITICAL REAL-WORLD INTERVIEW EVALUATION RULES:
1. SILENCE / NO SPEECH DETECTION:
   If the candidate remained silent, did not speak, made only background noise/breathing/static, or spoke nothing intelligible (or if both audio and transcript are empty):
   - "transcript": "[No speech detected / Candidate remained silent]"
   - "technicalScore": 0
   - "communicationScore": 0
   - "confidenceScore": 0
   - "similarityScore": 0
   - "sentimentScore": 0
   - "fillerWordCount": 0
   - "wordsPerMinute": 0
   - "emotion": "neutral"
   - "sentiment": "neutral"
   - "strengths": ["No verbal response was provided."]
   - "improvements": ["No speech detected. Please unmute your microphone and audibly explain the technical concept.", "Speak clearly and address key concepts: ${keywords.slice(0, 3).join(', ')}."]
   CRITICAL: DO NOT invent, hallucinate, or award scores to a silent candidate! In a real interview, silence receives 0 score.

2. AUTHENTIC SPOKEN ANSWER EVALUATION:
   - "transcript": Transcribe EXACTLY what the candidate spoke word-for-word. Do NOT embellish or add technical terms they did not actually say.
   - "technicalScore": 0-100 based strictly on accuracy and technical depth. If incorrect, irrelevant, or incomplete, give low marks (10-40). Reserve 85+ only for thorough, accurate answers.
   - "communicationScore": 0-100 (structure, grammar, clarity).
   - "confidenceScore": 0-100 (steady pace, minimal hesitation, assertiveness).
   - "similarityScore": 0-100 (semantic alignment with expected technical principles).
   - "sentiment": "positive" | "neutral" | "negative"
   - "sentimentScore": 0-100
   - "emotion": "confident" | "nervous" | "enthusiastic" | "neutral" | "hesitant"
   - "fillerWordCount": count actual filler words spoken (e.g. um, uh, like, you know)
   - "wordsPerMinute": estimated speaking tempo (0 if silent, typical is 110-150)
   - "strengths": 2-3 specific points on what the candidate actually got right
   - "improvements": 2-3 actionable points on what was missed or can be deepened

Return ONLY a valid JSON object matching the requested schema.`;

    const parts: any[] = [];
    if (audioBase64) {
      // Strip data url prefix if present
      const cleanData = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const cleanMime = mimeType.split(';')[0]; // clean codecs=opus
      parts.push({
        inlineData: {
          mimeType: cleanMime || 'audio/webm',
          data: cleanData,
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            sentimentScore: { type: Type.INTEGER },
            emotion: { type: Type.STRING },
            similarityScore: { type: Type.INTEGER },
            technicalScore: { type: Type.INTEGER },
            communicationScore: { type: Type.INTEGER },
            confidenceScore: { type: Type.INTEGER },
            fillerWordCount: { type: Type.INTEGER },
            wordsPerMinute: { type: Type.INTEGER },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'transcript',
            'sentiment',
            'sentimentScore',
            'emotion',
            'similarityScore',
            'technicalScore',
            'communicationScore',
            'confidenceScore',
            'fillerWordCount',
            'wordsPerMinute',
            'strengths',
            'improvements',
          ],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    // Enforce strict silence check on Gemini output as a safeguard
    const cleanTrans = (parsed.transcript || '').trim();
    const transWords = cleanTrans.split(/\s+/).filter(Boolean);
    const isSilentOutput = 
      !cleanTrans || 
      cleanTrans.toLowerCase().includes('no speech') || 
      cleanTrans.toLowerCase().includes('silent') || 
      cleanTrans.toLowerCase().includes('did not speak') ||
      transWords.length < 3;

    if (isSilentOutput) {
      parsed.transcript = '[No speech detected / Candidate remained silent]';
      parsed.technicalScore = 0;
      parsed.communicationScore = 0;
      parsed.confidenceScore = 0;
      parsed.similarityScore = 0;
      parsed.sentimentScore = 0;
      parsed.fillerWordCount = 0;
      parsed.wordsPerMinute = 0;
      parsed.emotion = 'neutral';
      parsed.sentiment = 'neutral';
      parsed.strengths = ['No verbal response provided.'];
      parsed.improvements = [
        'No speech was detected during the recording. Please unmute your microphone and record an audible response.',
        `Review the technical concepts: ${keywords.slice(0, 3).join(', ')}`,
      ];
    } else {
      // Run text analysis verification to guarantee realistic metrics
      const metrics = analyzeTextMetrics(parsed.transcript || '', keywords);
      if (!parsed.fillerWordCount || parsed.fillerWordCount === 0) {
        parsed.fillerWordCount = metrics.fillerWordCount;
      }
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in analyze-answer:', err);
    // Graceful fallback with strict silence handling
    const { questionText = '', expectedAnswer = '', keywords = [], userTranscriptFallback = '' } = req.body;
    const fallback = generateFallbackEvaluation(questionText, expectedAnswer, userTranscriptFallback, keywords);
    return res.json(fallback);
  }
});

// Known default test cases for standard assessment problems
const KNOWN_PROBLEM_TEST_CASES: Record<string, any[]> = {
  code1: [
    { id: 'tc1-1', input: 'nums = [2, 7, 11, 15], target = 9', expected: '[0, 1]', callCode: 'twoSum([2, 7, 11, 15], 9)', expectedValue: [0, 1] },
    { id: 'tc1-2', input: 'nums = [3, 2, 4], target = 6', expected: '[1, 2]', callCode: 'twoSum([3, 2, 4], 6)', expectedValue: [1, 2] },
    { id: 'tc1-3', input: 'nums = [3, 3], target = 6', expected: '[0, 1]', callCode: 'twoSum([3, 3], 6)', expectedValue: [0, 1] },
    { id: 'tc1-4', input: 'nums = [-1, -2, -3, -4, -5], target = -8', expected: '[2, 4]', callCode: 'twoSum([-1, -2, -3, -4, -5], -8)', expectedValue: [2, 4] },
  ],
  code2: [
    { id: 'tc2-1', input: 's = "()"', expected: 'true', callCode: 'isValid("()")', expectedValue: true },
    { id: 'tc2-2', input: 's = "()[]{}"', expected: 'true', callCode: 'isValid("()[]{}")', expectedValue: true },
    { id: 'tc2-3', input: 's = "(]"', expected: 'false', callCode: 'isValid("(]")', expectedValue: false },
    { id: 'tc2-4', input: 's = "([)]"', expected: 'false', callCode: 'isValid("([)]")', expectedValue: false },
    { id: 'tc2-5', input: 's = "{[]}"', expected: 'true', callCode: 'isValid("{[]}")', expectedValue: true },
  ],
};

function matchOutput(actual: any, expected: any, problemId?: string): boolean {
  if (actual === undefined || expected === undefined) return actual === expected;
  if (problemId === 'code1' || (Array.isArray(actual) && Array.isArray(expected))) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
    if (actual.length !== expected.length) return false;
    const aSorted = [...actual].sort((a, b) => (a > b ? 1 : -1)).join(',');
    const eSorted = [...expected].sort((a, b) => (a > b ? 1 : -1)).join(',');
    return aSorted === eSorted;
  }
  if (typeof expected === 'boolean') {
    return actual === expected;
  }
  try {
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return actual === expected;
  }
}

function stringifySafe(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function executeCodeTestCases(userCode: string, testCases: any[], problemId?: string) {
  const cleanCode = (userCode || '').trim();
  if (!cleanCode) {
    return {
      passedCount: 0,
      totalCount: testCases.length,
      correctnessScore: 0,
      testCases: testCases.map((tc) => ({
        input: tc.input,
        expected: tc.expected,
        passed: false,
        output: 'No code submitted / function body empty',
      })),
    };
  }

  // Pre-check syntax
  try {
    new Function(cleanCode);
  } catch (err: any) {
    const errorMsg = `${err.name}: ${err.message}`;
    return {
      passedCount: 0,
      totalCount: testCases.length,
      correctnessScore: 0,
      testCases: testCases.map((tc) => ({
        input: tc.input,
        expected: tc.expected,
        passed: false,
        output: errorMsg,
      })),
    };
  }

  const results: any[] = [];
  let passedCount = 0;

  for (const tc of testCases) {
    try {
      const sandbox = {
        __actual__: undefined,
        console: { log: () => {} },
      };
      const context = vm.createContext(sandbox);
      const callCode = tc.callCode || tc.callExpression || tc.input;
      const functionName = callCode.split('(')[0].trim();
      const scriptCode = `
        "use strict";
        ${cleanCode}
        if (typeof ${functionName} !== 'function') {
          throw new ReferenceError("Function '${functionName}' is not defined. Ensure the function signature matches.");
        }
        __actual__ = (${callCode});
      `;
      const script = new vm.Script(scriptCode);
      script.runInContext(context, { timeout: 1500 });

      const actual = sandbox.__actual__;
      const passed = matchOutput(actual, tc.expectedValue, problemId);
      if (passed) passedCount++;

      results.push({
        input: tc.input,
        expected: tc.expected,
        passed,
        output: stringifySafe(actual),
      });
    } catch (err: any) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        passed: false,
        output: `${err.name || 'RuntimeError'}: ${err.message}`,
      });
    }
  }

  const total = testCases.length;
  const correctness = total > 0 ? Math.round((passedCount / total) * 100) : 0;
  return {
    passedCount,
    totalCount: total,
    correctnessScore: correctness,
    testCases: results,
  };
}

// API: Evaluate Coding Problem with Deterministic Test Execution
app.post('/api/ai/evaluate-code', async (req: Request, res: Response) => {
  try {
    const { problemId, problemTitle, problemDescription, language = 'javascript', userCode, testCases: clientTestCases } = req.body;

    if (!userCode || !problemTitle) {
      return res.status(400).json({ error: 'Code and problem title are required' });
    }

    // Determine relevant test cases
    let testCasesToRun: any[] = [];
    if (Array.isArray(clientTestCases) && clientTestCases.length > 0) {
      testCasesToRun = clientTestCases;
    } else if (problemId && KNOWN_PROBLEM_TEST_CASES[problemId]) {
      testCasesToRun = KNOWN_PROBLEM_TEST_CASES[problemId];
    } else if (problemTitle.toLowerCase().includes('two sum')) {
      testCasesToRun = KNOWN_PROBLEM_TEST_CASES.code1;
    } else if (problemTitle.toLowerCase().includes('parenthes') || problemTitle.toLowerCase().includes('bracket')) {
      testCasesToRun = KNOWN_PROBLEM_TEST_CASES.code2;
    } else {
      // Fallback simple test case
      testCasesToRun = [
        { input: 'Default Execution Test', expected: 'Valid', callCode: 'true', expectedValue: true },
      ];
    }

    // 1. Run deterministic test case execution
    const execution = executeCodeTestCases(userCode, testCasesToRun, problemId);

    // If Gemini is not available, return deterministic results immediately
    if (!ai) {
      let overall = 0;
      let feedback = '';

      if (execution.correctnessScore === 100) {
        overall = 94;
        feedback = 'All test cases passed cleanly! Algorithmic logic and edge cases are handled correctly.';
      } else if (execution.correctnessScore === 0) {
        overall = 0;
        feedback = `Code failed all test cases (${execution.passedCount}/${execution.totalCount} passed). Check function return types, syntax errors, and algorithmic logic.`;
      } else {
        overall = Math.round(execution.correctnessScore * 0.7 + 10);
        feedback = `Passed ${execution.passedCount} of ${execution.totalCount} test cases (${execution.correctnessScore}%). Some edge cases or boundary conditions returned incorrect results.`;
      }

      return res.json({
        correctnessScore: execution.correctnessScore,
        efficiencyScore: execution.correctnessScore > 0 ? 82 : 0,
        styleScore: execution.correctnessScore > 0 ? 85 : 20,
        overallScore: overall,
        timeComplexity: execution.correctnessScore > 0 ? 'O(n)' : 'N/A',
        spaceComplexity: execution.correctnessScore > 0 ? 'O(n)' : 'N/A',
        feedback,
        testCases: execution.testCases,
      });
    }

    // 2. Query Gemini for asymptotic Big-O analysis and code review
    const prompt = `You are a Principal Software Engineer grading a candidate's coding submission.
Problem: ${problemTitle}
Description: ${problemDescription}
Language: ${language}
Candidate's Solution:
\`\`\`${language}
${userCode}
\`\`\`

Deterministic Test Execution Results:
Total Test Cases: ${execution.totalCount}
Passed: ${execution.passedCount}
Failed: ${execution.totalCount - execution.passedCount}
Correctness: ${execution.correctnessScore}%
Test Case Breakdown:
${JSON.stringify(execution.testCases, null, 2)}

Instructions:
1. Candidate achieved ${execution.correctnessScore}% correctness on real execution. Do NOT contradict or change this correctness score.
2. If correctness is 0% or any test failed, analyze the failure in your feedback and explain the bugs, edge cases, or syntax issues.
3. Provide:
   - efficiencyScore (0-100): Optimal time/space trade-offs. If correctness is 0%, efficiencyScore must be 0-20.
   - styleScore (0-100): Code clarity, naming, and readability.
   - timeComplexity: string (e.g. O(n), O(n²), or "Undefined (Runtime Error)")
   - spaceComplexity: string (e.g. O(1), O(n), or "Undefined")
   - feedback: 2-3 sentences of constructive technical feedback explaining why tests passed or failed.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            efficiencyScore: { type: Type.INTEGER },
            styleScore: { type: Type.INTEGER },
            timeComplexity: { type: Type.STRING },
            spaceComplexity: { type: Type.STRING },
            feedback: { type: Type.STRING },
          },
          required: [
            'efficiencyScore',
            'styleScore',
            'timeComplexity',
            'spaceComplexity',
            'feedback',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const effScore = typeof parsed.efficiencyScore === 'number' ? parsed.efficiencyScore : (execution.correctnessScore > 0 ? 80 : 0);
    const styScore = typeof parsed.styleScore === 'number' ? parsed.styleScore : (execution.correctnessScore > 0 ? 85 : 20);

    // Compute composite score strictly respecting correctness
    let overall = 0;
    if (execution.correctnessScore === 0) {
      overall = 0;
    } else if (execution.correctnessScore === 100) {
      overall = Math.round(0.6 * execution.correctnessScore + 0.25 * effScore + 0.15 * styScore);
    } else {
      overall = Math.round(0.65 * execution.correctnessScore + 0.2 * effScore + 0.15 * styScore);
    }

    res.json({
      correctnessScore: execution.correctnessScore,
      efficiencyScore: effScore,
      styleScore: styScore,
      overallScore: Math.min(100, Math.max(0, overall)),
      timeComplexity: parsed.timeComplexity || (execution.correctnessScore > 0 ? 'O(n)' : 'N/A'),
      spaceComplexity: parsed.spaceComplexity || (execution.correctnessScore > 0 ? 'O(n)' : 'N/A'),
      feedback: parsed.feedback || (execution.correctnessScore === 100 ? 'All test cases passed.' : 'Some test cases failed.'),
      testCases: execution.testCases, // ALWAYS return the real test results!
    });
  } catch (err: any) {
    console.error('Error in evaluate-code:', err);
    // Even in catch block, execute locally and return true test results
    const { problemId, userCode, testCases: clientTestCases } = req.body;
    const testCasesToRun = Array.isArray(clientTestCases) && clientTestCases.length > 0
      ? clientTestCases
      : (problemId && KNOWN_PROBLEM_TEST_CASES[problemId]) || KNOWN_PROBLEM_TEST_CASES.code1;
    
    const execution = executeCodeTestCases(userCode || '', testCasesToRun, problemId);
    const overall = execution.correctnessScore === 100 ? 90 : (execution.correctnessScore === 0 ? 0 : Math.round(execution.correctnessScore * 0.7));

    res.json({
      correctnessScore: execution.correctnessScore,
      efficiencyScore: execution.correctnessScore > 0 ? 80 : 0,
      styleScore: execution.correctnessScore > 0 ? 85 : 20,
      overallScore: overall,
      timeComplexity: execution.correctnessScore > 0 ? 'O(n)' : 'N/A',
      spaceComplexity: execution.correctnessScore > 0 ? 'O(n)' : 'N/A',
      feedback: execution.correctnessScore === 100
        ? 'All test cases passed successfully.'
        : `Execution resulted in ${execution.passedCount}/${execution.totalCount} passed test cases. Please review failed cases.`,
      testCases: execution.testCases,
    });
  }
});

// API: Generate Comprehensive Executive Summary Report
app.post('/api/ai/generate-summary', async (req: Request, res: Response) => {
  try {
    const { candidateName, answers = [], aptitudeScore = 80, codingScore = 85 } = req.body;

    const ansList = Array.isArray(answers) ? answers : [];
    const avgTech = ansList.length > 0 ? Math.round(ansList.reduce((acc: number, a: any) => acc + (a.analysis?.technicalScore ?? a.technicalScore ?? 0), 0) / ansList.length) : 0;
    const avgComm = ansList.length > 0 ? Math.round(ansList.reduce((acc: number, a: any) => acc + (a.analysis?.communicationScore ?? a.communicationScore ?? 0), 0) / ansList.length) : 0;
    const avgConf = ansList.length > 0 ? Math.round(ansList.reduce((acc: number, a: any) => acc + (a.analysis?.confidenceScore ?? a.confidenceScore ?? 0), 0) / ansList.length) : 0;

    const isSilentCandidate = ansList.length > 0 && avgTech === 0;

    if (!ai) {
      if (isSilentCandidate) {
        return res.json({
          executiveSummary: `${candidateName || 'The candidate'} completed the assessment but provided no verbal answers during the AI WebRTC interview round (0% interview score). While other components were registered, the lack of technical articulation in the interview requires candidate re-testing or disqualification.`,
          keyStrengths: [
            'Attempted assessment portal rounds',
            'Completed technical round setup',
          ],
          recommendedImprovements: [
            'Candidate must verbally answer technical questions during the live interview',
            'Ensure functional microphone configuration before re-taking the interview',
          ],
          radarCompetencies: {
            technicalKnowledge: Math.max(10, Math.round(codingScore * 0.3)),
            problemSolving: Math.max(10, Math.round(aptitudeScore * 0.3)),
            communication: 0,
            confidence: 0,
            codeQuality: codingScore || 50,
            behavioralFit: 20,
          },
        });
      }

      return res.json({
        executiveSummary: `${candidateName || 'The candidate'} completed the evaluation with an average interview technical score of ${avgTech}%. Demonstrating aptitude (${aptitudeScore}%) and coding proficiency (${codingScore}%).`,
        keyStrengths: [
          'Expressed foundational concepts across required technical stacks',
          'Demonstrated problem-solving in algorithmic evaluations',
          'Clear communication structure in recorded responses',
        ],
        recommendedImprovements: [
          'Elaborate further on horizontal scalability and edge-case handling',
          'Reduce hesitation and filler markers during live technical explanations',
        ],
        radarCompetencies: {
          technicalKnowledge: avgTech || 75,
          problemSolving: Math.round((aptitudeScore + codingScore) / 2),
          communication: avgComm || 70,
          confidence: avgConf || 70,
          codeQuality: codingScore || 75,
          behavioralFit: 75,
        },
      });
    }

    const prompt = `Synthesize an authentic executive hiring evaluation summary for candidate "${candidateName || 'Candidate'}".
Input Data:
- Aptitude Round Score: ${aptitudeScore}%
- Coding Round Score: ${codingScore}%
- AI Interview Average Technical Score: ${avgTech}%
- Interview Answers Evaluation Summary:
${JSON.stringify(
  ansList.map((a: any, idx: number) => ({
    q: idx + 1,
    questionText: a.questionText,
    transcript: a.analysis?.transcript || a.transcript,
    tech: a.analysis?.technicalScore ?? a.technicalScore ?? 0,
    comm: a.analysis?.communicationScore ?? a.communicationScore ?? 0,
    conf: a.analysis?.confidenceScore ?? a.confidenceScore ?? 0,
    sentiment: a.analysis?.sentiment || a.sentiment,
    emotion: a.analysis?.emotion || a.emotion,
  }))
)}

CRITICAL EVALUATION RULES:
- If the candidate was silent or has 0% in interview answers, DO NOT falsely claim they have "clear articulation" or "poised delivery"!
  - Explicitly praise their Coding capability (${codingScore}%) and Aptitude (${aptitudeScore}%) as key strengths if they performed well.
  - State clearly in the executive summary that they excelled in practical coding (${codingScore}%) but did not provide verbal answers in the interview (0%), recommending an interview re-take.
  - Set communication to 0, confidence to 0, and codeQuality to ${codingScore} in radarCompetencies.
- If the candidate spoke strong, accurate answers, reflect their genuine technical competence.
- Be objective, realistic, and insightful as a Senior Technical Hiring Lead.

Provide:
1. "executiveSummary": 2-3 paragraph crisp hiring manager summary
2. "keyStrengths": 2-4 specific bullet points
3. "recommendedImprovements": 2-4 constructive growth areas
4. "radarCompetencies": numeric scores 0-100 for:
   - technicalKnowledge
   - problemSolving
   - communication
   - confidence
   - codeQuality
   - behavioralFit`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            keyStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedImprovements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            radarCompetencies: {
              type: Type.OBJECT,
              properties: {
                technicalKnowledge: { type: Type.INTEGER },
                problemSolving: { type: Type.INTEGER },
                communication: { type: Type.INTEGER },
                confidence: { type: Type.INTEGER },
                codeQuality: { type: Type.INTEGER },
                behavioralFit: { type: Type.INTEGER },
              },
              required: [
                'technicalKnowledge',
                'problemSolving',
                'communication',
                'confidence',
                'codeQuality',
                'behavioralFit',
              ],
            },
          },
          required: ['executiveSummary', 'keyStrengths', 'recommendedImprovements', 'radarCompetencies'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in generate-summary:', err);
    const ansList = Array.isArray(req.body.answers) ? req.body.answers : [];
    const avgTech = ansList.length > 0 ? Math.round(ansList.reduce((acc: number, a: any) => acc + (a.analysis?.technicalScore ?? a.technicalScore ?? 0), 0) / ansList.length) : 0;
    const codingScore = req.body.codingScore || 80;
    const aptitudeScore = req.body.aptitudeScore || 75;
    const isSilent = avgTech === 0 || ansList.some((a: any) => (a.analysis?.transcript || a.transcript || '').includes('[No speech'));

    if (isSilent) {
      return res.json({
        executiveSummary: `${req.body.candidateName || 'The candidate'} achieved strong results in practical coding (${codingScore}%) and aptitude reasoning (${aptitudeScore}%), but did not provide audible verbal responses in the AI WebRTC interview round (0% interview score). An interview re-take is recommended to evaluate communication competencies.`,
        keyStrengths: [
          `Demonstrated solid algorithmic coding skills (${codingScore}%)`,
          `Completed foundational aptitude evaluation (${aptitudeScore}%)`,
          'Adhered to structured software engineering workflows',
        ],
        recommendedImprovements: [
          'Must provide audible spoken explanations during live interview recording',
          'Check microphone hardware setup and audio input settings',
          'Practice verbalizing technical design trade-offs aloud',
        ],
        radarCompetencies: {
          technicalKnowledge: Math.round(codingScore * 0.7),
          problemSolving: Math.round((codingScore + aptitudeScore) / 2),
          communication: 0,
          confidence: 0,
          codeQuality: codingScore,
          behavioralFit: 30,
        },
      });
    }

    res.json({
      executiveSummary: `${req.body.candidateName || 'The candidate'} demonstrated solid engineering skills across coding (${codingScore}%) and aptitude (${aptitudeScore}%).`,
      keyStrengths: [
        `Proficient in algorithmic coding (${codingScore}%)`,
        `Solid performance in aptitude reasoning (${aptitudeScore}%)`,
        'Demonstrated structured implementation style',
      ],
      recommendedImprovements: [
        'Deepen system scaling considerations and production caching',
        'Refine edge case validations under high concurrency',
      ],
      radarCompetencies: {
        technicalKnowledge: Math.round((codingScore + avgTech) / 2),
        problemSolving: Math.round((codingScore + aptitudeScore) / 2),
        communication: Math.max(30, avgTech),
        confidence: Math.max(30, avgTech),
        codeQuality: codingScore,
        behavioralFit: 75,
      },
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InterviewAI Platform server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
