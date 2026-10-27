import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import {
  CandidateProfile,
  AssessmentQuestionBanks,
  AptitudeQuestion,
  CodingProblem,
  JobApplication,
  JobOpening,
  QuestionBankItem,
  User,
} from './src/types';

dotenv.config();
const root = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.INTERVIEWAI_DB_PATH || path.join(root, 'data', 'interviewai.sqlite');
mkdirSync(path.dirname(databasePath), { recursive: true });

export const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter')),
    joined_date TEXT NOT NULL,
    avatar TEXT,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS candidate_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS job_openings (
    id TEXT PRIMARY KEY,
    recruiter_id TEXT NOT NULL REFERENCES users(id),
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES job_openings(id),
    candidate_id TEXT NOT NULL REFERENCES users(id),
    data TEXT NOT NULL,
    UNIQUE(job_id, candidate_id)
  );
  CREATE TABLE IF NOT EXISTS assessment_bank_items (
    bank TEXT NOT NULL CHECK (bank IN ('aptitudeQuestions', 'codingProblems', 'interviewQuestions')),
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (bank, id)
  );
`);

interface StoredUser extends User {
  passwordSalt: string;
  passwordHash: string;
}

export function getUserByEmail(email: string): StoredUser | undefined {
  const row = database.prepare(`
    SELECT id, name, email, role, joined_date AS joinedDate, avatar,
      password_salt AS passwordSalt, password_hash AS passwordHash
    FROM users WHERE email = ?
  `).get(email) as StoredUser | undefined;
  return row;
}

export function getUserById(id: string): StoredUser | undefined {
  return database.prepare(`
    SELECT id, name, email, role, joined_date AS joinedDate, avatar,
      password_salt AS passwordSalt, password_hash AS passwordHash
    FROM users WHERE id = ?
  `).get(id) as StoredUser | undefined;
}

export function saveUser(user: StoredUser): void {
  database.prepare(`
    INSERT INTO users (id, name, email, role, joined_date, avatar, password_salt, password_hash)
    VALUES (@id, @name, @email, @role, @joinedDate, @avatar, @passwordSalt, @passwordHash)
  `).run(user);
}

export function updateUserName(userId: string, name: string): void {
  database.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
}

export function getCandidateProfile(userId: string): CandidateProfile | undefined {
  const row = database.prepare('SELECT data FROM candidate_profiles WHERE user_id = ?').get(userId) as { data: string } | undefined;
  return row ? JSON.parse(row.data) as CandidateProfile : undefined;
}

export function saveCandidateProfile(profile: CandidateProfile): void {
  database.prepare(`
    INSERT INTO candidate_profiles (user_id, data) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data
  `).run(profile.userId, JSON.stringify(profile));
}

export function listCandidateProfiles(): CandidateProfile[] {
  const rows = database.prepare('SELECT data FROM candidate_profiles').all() as Array<{ data: string }>;
  return rows.map(({ data }) => JSON.parse(data) as CandidateProfile);
}

export function listJobs(): JobOpening[] {
  const rows = database.prepare('SELECT data FROM job_openings').all() as Array<{ data: string }>;
  return rows.map(({ data }) => JSON.parse(data) as JobOpening);
}

export function getJob(id: string): JobOpening | undefined {
  const row = database.prepare('SELECT data FROM job_openings WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) as JobOpening : undefined;
}

export function saveJob(job: JobOpening): void {
  database.prepare(`
    INSERT INTO job_openings (id, recruiter_id, data) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data
  `).run(job.id, job.recruiterId, JSON.stringify(job));
}

export function listApplicationsForCandidate(candidateId: string): JobApplication[] {
  const rows = database.prepare('SELECT data FROM job_applications WHERE candidate_id = ?').all(candidateId) as Array<{ data: string }>;
  return rows.map(({ data }) => JSON.parse(data) as JobApplication);
}

export function listApplicationsForJob(jobId: string): JobApplication[] {
  const rows = database.prepare('SELECT data FROM job_applications WHERE job_id = ?').all(jobId) as Array<{ data: string }>;
  return rows.map(({ data }) => JSON.parse(data) as JobApplication);
}

export function saveApplication(application: JobApplication): void {
  database.prepare(`
    INSERT INTO job_applications (id, job_id, candidate_id, data)
    VALUES (?, ?, ?, ?)
  `).run(application.id, application.jobId, application.candidateId, JSON.stringify(application));
}

export function getApplicationForCandidate(id: string, candidateId: string): JobApplication | undefined {
  const row = database.prepare('SELECT data FROM job_applications WHERE id = ? AND candidate_id = ?').get(id, candidateId) as { data: string } | undefined;
  return row ? JSON.parse(row.data) as JobApplication : undefined;
}

export function updateApplication(id: string, application: JobApplication): void {
  database.prepare('UPDATE job_applications SET data = ? WHERE id = ?').run(JSON.stringify(application), id);
}

export function getAssessmentQuestionBanks(): AssessmentQuestionBanks {
  const rows = database.prepare('SELECT bank, data FROM assessment_bank_items').all() as Array<{
    bank: keyof AssessmentQuestionBanks;
    data: string;
  }>;
  const banks: AssessmentQuestionBanks = {
    aptitudeQuestions: [],
    codingProblems: [],
    interviewQuestions: [],
  };
  for (const row of rows) {
    if (row.bank === 'aptitudeQuestions') banks.aptitudeQuestions.push(JSON.parse(row.data) as AptitudeQuestion);
    if (row.bank === 'codingProblems') banks.codingProblems.push(JSON.parse(row.data) as CodingProblem);
    if (row.bank === 'interviewQuestions') banks.interviewQuestions.push(JSON.parse(row.data) as QuestionBankItem);
  }
  return banks;
}

export function saveAssessmentQuestionBankItem(
  bank: keyof AssessmentQuestionBanks,
  id: string,
  data: AptitudeQuestion | CodingProblem | QuestionBankItem
): void {
  database.prepare(`
    INSERT INTO assessment_bank_items (bank, id, data) VALUES (?, ?, ?)
    ON CONFLICT(bank, id) DO UPDATE SET data = excluded.data
  `).run(bank, id, JSON.stringify(data));
}

export function deleteAssessmentQuestionBankItem(bank: keyof AssessmentQuestionBanks, id: string): void {
  database.prepare('DELETE FROM assessment_bank_items WHERE bank = ? AND id = ?').run(bank, id);
}

export function getOrCreateAuthSecret(): string {
  const existing = database.prepare("SELECT value FROM auth_settings WHERE key = 'token_secret'").get() as { value: string } | undefined;
  if (existing) return existing.value;

  const secret = randomUUID() + randomUUID();
  database.prepare("INSERT INTO auth_settings (key, value) VALUES ('token_secret', ?)").run(secret);
  return secret;
}
