import {
  AssessmentQuestionBanks,
  AssessmentReport,
  CandidateProfile,
  CodingProblem,
  CodingSubmissionResult,
  AptitudeQuestion,
  JobApplication,
  JobOpening,
  QuestionBankItem,
  User,
  UserRole,
} from '../types';

interface AuthResponse {
  user: User;
  profile: CandidateProfile | null;
  token: string;
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
  role: UserRole,
  candidateDetails?: Omit<CandidateProfile, 'id' | 'userId' | 'fullName' | 'email' | 'status' | 'decision'>
): Promise<AuthResponse> {
  return request('/api/auth/register', undefined, {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, candidateDetails }),
  });
}

export async function loginAccount(email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function migrateLegacyAccount(
  tokenlessUser: User,
  password: string,
  profile: CandidateProfile | undefined
): Promise<AuthResponse> {
  return request('/api/auth/migrate-local', undefined, {
    method: 'POST',
    body: JSON.stringify({ legacyUser: tokenlessUser, password, legacyProfile: profile }),
  });
}

export async function restoreAccount(token: string): Promise<Omit<AuthResponse, 'token'>> {
  return request('/api/auth/me', token);
}

export async function updateCandidateProfile(token: string, profile: CandidateProfile): Promise<CandidateProfile> {
  const response = await request<{ profile: CandidateProfile }>('/api/profile', token, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return response.profile;
}

export async function fetchJobs(token: string): Promise<JobOpening[]> {
  const response = await request<{ jobs: JobOpening[] }>('/api/jobs', token);
  return response.jobs;
}

export async function createJob(token: string, job: Omit<JobOpening, 'id' | 'recruiterId' | 'createdAt' | 'status'>): Promise<JobOpening> {
  const response = await request<{ job: JobOpening }>('/api/jobs', token, {
    method: 'POST',
    body: JSON.stringify(job),
  });
  return response.job;
}

export async function applyToJob(token: string, jobId: string): Promise<JobApplication> {
  const response = await request<{ application: JobApplication }>(`/api/jobs/${encodeURIComponent(jobId)}/applications`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return response.application;
}

export async function fetchMyApplications(token: string): Promise<JobApplication[]> {
  const response = await request<{ applications: JobApplication[] }>('/api/applications/me', token);
  return response.applications;
}

export async function fetchApplication(token: string, applicationId: string): Promise<{ application: JobApplication; job: JobOpening }> {
  return request(`/api/applications/${encodeURIComponent(applicationId)}`, token);
}

export async function setApplicationStatus(
  token: string,
  applicationId: string,
  status: JobApplication['status']
): Promise<JobApplication> {
  const response = await request<{ application: JobApplication }>(
    `/api/applications/${encodeURIComponent(applicationId)}/status`,
    token,
    { method: 'PUT', body: JSON.stringify({ status }) }
  );
  return response.application;
}

export async function saveSharedAptitudeResult(
  token: string,
  applicationId: string,
  score: number,
  answersMap: Record<string, number>
): Promise<JobApplication> {
  const response = await request<{ application: JobApplication }>(
    `/api/applications/${encodeURIComponent(applicationId)}/aptitude`,
    token,
    { method: 'PUT', body: JSON.stringify({ score, answersMap }) }
  );
  return response.application;
}

export async function saveSharedCodingSubmissions(
  token: string,
  applicationId: string,
  submissions: CodingSubmissionResult[]
): Promise<JobApplication> {
  const response = await request<{ application: JobApplication }>(
    `/api/applications/${encodeURIComponent(applicationId)}/coding`,
    token,
    { method: 'PUT', body: JSON.stringify({ submissions }) }
  );
  return response.application;
}

export async function saveSharedReport(
  token: string,
  applicationId: string,
  report: AssessmentReport
): Promise<JobApplication> {
  const response = await request<{ application: JobApplication }>(
    `/api/applications/${encodeURIComponent(applicationId)}/report`,
    token,
    { method: 'PUT', body: JSON.stringify(report) }
  );
  return response.application;
}

export async function fetchApplicationsForJob(token: string, jobId: string): Promise<JobApplication[]> {
  const response = await request<{ applications: JobApplication[] }>(
    `/api/jobs/${encodeURIComponent(jobId)}/applications`,
    token
  );
  return response.applications;
}

export async function fetchCandidateProfiles(token: string): Promise<CandidateProfile[]> {
  const response = await request<{ profiles: CandidateProfile[] }>('/api/admin/profiles', token);
  return response.profiles;
}

export async function loadAssessmentQuestionBanks(
  token: string,
  initial: AssessmentQuestionBanks
): Promise<AssessmentQuestionBanks> {
  let response = await request<{ banks: AssessmentQuestionBanks }>('/api/admin/question-bank', token);
  const missing: Array<{
    bank: keyof AssessmentQuestionBanks;
    item: AptitudeQuestion | CodingProblem | QuestionBankItem;
  }> = [];
  for (const bank of ['aptitudeQuestions', 'codingProblems', 'interviewQuestions'] as const) {
    const knownIds = new Set(response.banks[bank].map((item) => item.id));
    for (const item of initial[bank]) {
      const isBuiltIn = /^(apt|code|q)\d+$/.test(item.id);
      if (!knownIds.has(item.id) && (isBuiltIn || response.banks[bank].length === 0)) {
        missing.push({ bank, item });
      }
    }
  }
  await Promise.all(missing.map((entry) => saveAssessmentQuestionBankItem(token, entry.bank, entry.item)));
  if (missing.length) {
    response = await request('/api/admin/question-bank', token);
  }
  return response.banks;
}

export async function saveAssessmentQuestionBankItem(
  token: string,
  bank: keyof AssessmentQuestionBanks,
  item: AptitudeQuestion | CodingProblem | QuestionBankItem
): Promise<void> {
  await request('/api/admin/question-bank', token, {
    method: 'POST',
    body: JSON.stringify({ bank, item }),
  });
}

export async function deleteAssessmentQuestionBankItem(
  token: string,
  bank: keyof AssessmentQuestionBanks,
  id: string
): Promise<void> {
  await request(`/api/admin/question-bank/${encodeURIComponent(bank)}/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
}

export async function updateCandidateDecision(
  token: string,
  profileId: string,
  decision: CandidateProfile['decision'],
  notes: string
): Promise<CandidateProfile> {
  const response = await request<{ profile: CandidateProfile }>(
    `/api/admin/profiles/${encodeURIComponent(profileId)}/decision`,
    token,
    { method: 'PUT', body: JSON.stringify({ decision, notes }) }
  );
  return response.profile;
}
