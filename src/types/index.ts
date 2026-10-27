export type UserRole = 'candidate' | 'recruiter';

export type CandidateStatus = 'In Progress' | 'Completed' | 'Under Review';

export type RecruiterDecision = 'SELECT' | 'HOLD' | 'REJECT' | 'PENDING';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type EmotionType = 'confident' | 'nervous' | 'enthusiastic' | 'neutral' | 'hesitant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedDate: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  dob: string;
  education: string;
  graduationYear: string;
  currentRole: string;
  experienceYears: number;
  skills?: string[];
  resume?: {
    name: string;
    size: string;
    uploadedAt: string;
    dataUrl?: string; // base64 representation
  };
  status: CandidateStatus;
  decision: RecruiterDecision;
  decisionNotes?: string;
  decisionOverridden?: boolean;
}

export type CandidateRegistrationDetails = Pick<
  CandidateProfile,
  'phone' | 'location' | 'dob' | 'education' | 'graduationYear' | 'currentRole' | 'experienceYears'
> & { skills: string[] };

export interface JobOpening {
  id: string;
  recruiterId: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  description: string;
  requiredSkills: string[];
  minimumExperienceYears: number;
  aptitudeQuestionIds: string[];
  codingProblemIds: string[];
  interviewQuestionIds: string[];
  assessmentContent?: {
    aptitudeQuestions: AptitudeQuestion[];
    codingProblems: CodingProblem[];
    interviewQuestions: QuestionBankItem[];
  };
  createdAt: string;
  status: 'Open' | 'Closed';
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateProfile: CandidateProfile;
  appliedAt: string;
  status: 'Applied' | 'In Progress' | 'Completed' | 'Under Review';
  aptitudeResult?: {
    score: number;
    answersMap: Record<string, number>;
    completedAt: string;
  };
  codingSubmissions?: CodingSubmissionResult[];
  report?: AssessmentReport;
}

export interface AptitudeQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  category: 'Quantitative' | 'Logical' | 'Verbal' | 'Computer Science' | 'Data Interpretation';
  skillTags?: string[];
  chart?: {
    type: 'pie';
    title: string;
    data: Array<{ label: string; value: number }>;
  };
}

export interface ProblemTestCase {
  id: string;
  name?: string;
  input: string;
  expected: string;
  callCode: string;
  expectedValue: any;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  initialCode: string;
  referenceSolution?: string;
  language: string;
  expectedOutput: string;
  hints: string[];
  skillTags?: string[];
  testCases?: ProblemTestCase[];
}

export interface AssessmentQuestionBanks {
  aptitudeQuestions: AptitudeQuestion[];
  codingProblems: CodingProblem[];
  interviewQuestions: QuestionBankItem[];
}

export interface CodingSubmissionResult {
  problemId: string;
  code: string;
  correctnessScore: number;
  efficiencyScore: number;
  styleScore: number;
  overallScore: number;
  timeComplexity: string;
  spaceComplexity: string;
  feedback: string;
  testCases: Array<{
    input: string;
    expected: string;
    passed: boolean;
    output: string;
    executionTimeMs?: number;
    error?: string;
  }>;
  submittedAt: string;
}

export interface QuestionBankItem {
  id: string;
  questionText: string;
  category: 'Technical' | 'HR' | 'Behavioural';
  expectedAnswer: string;
  keywords: string[];
  difficulty?: 'Junior' | 'Mid' | 'Senior';
  skillTags?: string[];
}

export interface AIAnswerAnalysis {
  transcript: string;
  sentiment: SentimentType;
  sentimentScore: number; // 0-100
  emotion: EmotionType;
  similarityScore: number; // 0-100
  technicalScore: number; // 0-100
  communicationScore: number; // 0-100
  confidenceScore: number; // 0-100
  fillerWordCount: number;
  wordsPerMinute: number;
  strengths: string[];
  improvements: string[];
}

export interface InterviewAnswerRecord {
  id: string;
  interviewId: string;
  questionId: string;
  questionText: string;
  expectedAnswer: string;
  audioBlobUrl?: string; // in-memory playback URL
  audioBase64?: string; // for storage
  videoBlobUrl?: string;
  analysis: AIAnswerAnalysis;
  recordedAt: string;
  durationSeconds: number;
}

export interface AssessmentReport {
  id: string;
  applicationId?: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  completedAt: string;
  // Weighted Scores
  technicalScore: number; // 40% weight
  communicationScore: number; // 20% weight
  confidenceScore: number; // 15% weight
  sentimentScore: number; // 25% weight
  overallScore: number; // Weighted composite 0-100
  
  // Specific round scores
  aptitudeScore: number; // Round 1
  codingScore: number; // Round 2
  interviewScore: number; // Round 3
  
  // Decision
  decision: RecruiterDecision;
  decisionReason: string;
  
  // Executive Insights
  executiveSummary: string;
  keyStrengths: string[];
  recommendedImprovements: string[];
  
  // Radar Competencies
  radarCompetencies: {
    technicalKnowledge: number;
    problemSolving: number;
    communication: number;
    confidence: number;
    codeQuality: number;
    behavioralFit: number;
  };
  
  answers: InterviewAnswerRecord[];
}
