import {
  User,
  CandidateProfile,
  QuestionBankItem,
  AptitudeQuestion,
  CodingProblem,
  CodingSubmissionResult,
  AssessmentReport,
  InterviewAnswerRecord,
  RecruiterDecision,
} from '../types';

const STORAGE_KEYS = {
  USERS: 'interviewai_users',
  PROFILES: 'interviewai_profiles',
  QUESTIONS: 'interviewai_questions',
  APTITUDE_QUESTIONS: 'interviewai_aptitude_questions',
  CODING_PROBLEMS: 'interviewai_coding_problems',
  CODING_SUBMISSIONS: 'interviewai_coding_submissions',
  APTITUDE_RESULTS: 'interviewai_aptitude_results',
  REPORTS: 'interviewai_reports',
  AUTH_TOKEN: 'interviewai_jwt_token',
  AUTH_USER: 'interviewai_current_user',
};

// SHA-256 Password Hash using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate Mock JWT token
export function createMockJwt(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    })
  );
  const signature = btoa(`sig_${user.id}_${Date.now()}`);
  return `${header}.${payload}.${signature}`;
}

export function parseMockJwt(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

// Initial Question Bank: 8 High-Quality Technical Questions
const DEFAULT_QUESTIONS: QuestionBankItem[] = [
  {
    id: 'q1',
    category: 'Technical',
    difficulty: 'Mid',
    questionText: 'Explain the difference between synchronous and asynchronous JavaScript, and how the Event Loop works with the Call Stack and Microtask Queue.',
    expectedAnswer:
      'Synchronous code executes sequentially on the single main thread. Asynchronous operations (like Promises or setTimeout) are delegated to browser Web APIs. Once resolved, microtasks (Promises, queueMicrotask) enter the microtask queue, which has higher priority than macrotasks (setTimeout, setInterval). The Event Loop constantly monitors if the Call Stack is empty before executing queued tasks.',
    keywords: ['Event Loop', 'Call Stack', 'Microtask Queue', 'Promises', 'Single-threaded', 'Non-blocking'],
    skillTags: ['JavaScript', 'Full Stack', 'Frontend', 'Backend', 'Asynchronous Programming'],
  },
  {
    id: 'q2',
    category: 'Technical',
    difficulty: 'Mid',
    questionText: 'What is Database Indexing, and how do B-Tree indexes improve query performance while impacting write throughput?',
    expectedAnswer:
      'A database index is a data structure (commonly B-Trees) that speeds up data retrieval operations on a table at the cost of additional writes and storage space. B-Trees maintain balanced logarithmic lookup time O(log N). While reads are significantly faster because they avoid full table scans, inserts, updates, and deletes are slower because the B-Tree pointers must be updated and rebalanced.',
    keywords: ['B-Tree', 'Logarithmic Time', 'Full Table Scan', 'Write Throughput', 'Query Optimization', 'Foreign Keys'],
    skillTags: ['SQL', 'Databases', 'Backend', 'Full Stack'],
  },
  {
    id: 'q3',
    category: 'Technical',
    difficulty: 'Senior',
    questionText: 'How would you architect a rate-limiting mechanism for a public RESTful API to defend against DDoS attacks and brute force attempts?',
    expectedAnswer:
      'Rate limiting can be implemented at the API Gateway or reverse proxy layer (e.g., NGINX, Cloudflare) backed by a distributed cache like Redis using algorithms such as Token Bucket or Leaky Bucket. Requests are tracked by client IP, API key, or JWT session. HTTP 429 Too Many Requests is returned when the quota is exceeded, with standard headers like Retry-After and X-RateLimit-Remaining.',
    keywords: ['Token Bucket', 'Redis', 'API Gateway', 'HTTP 429', 'Leaky Bucket', 'Sliding Window', 'DDoS'],
    skillTags: ['APIs', 'Backend', 'Security', 'Full Stack'],
  },
  {
    id: 'q4',
    category: 'Technical',
    difficulty: 'Mid',
    questionText: 'Explain the principles of RESTful API design versus GraphQL. When would you choose one over the other?',
    expectedAnswer:
      'REST utilizes standard HTTP verbs (GET, POST, PUT, DELETE) with distinct resource endpoints and status codes, leveraging HTTP caching well. GraphQL uses a single endpoint with a strongly typed schema where clients query specifically the fields they need, mitigating over-fetching and under-fetching. REST is ideal for standard CRUD operations and CDN caching, while GraphQL shines for complex, nested data requirements on mobile or rich single-page applications.',
    keywords: ['Over-fetching', 'HTTP Verbs', 'Schema', 'Single Endpoint', 'Caching', 'Under-fetching'],
    skillTags: ['APIs', 'GraphQL', 'Backend', 'Full Stack'],
  },
  {
    id: 'q5',
    skillTags: ['Databases', 'Distributed Systems', 'Backend'],
    category: 'Technical',
    difficulty: 'Senior',
    questionText: 'What are ACID properties in relational databases, and how do modern distributed systems balance consistency with the CAP Theorem?',
    expectedAnswer:
      'ACID stands for Atomicity, Consistency, Isolation, and Durability. In distributed systems, the CAP Theorem asserts that a system can only guarantee at most two out of Consistency, Availability, and Partition Tolerance. When network partitions inevitably occur, systems must choose between AP (high availability with eventual consistency) or CP (strict consistency at the expense of rejecting requests during partitions).',
    keywords: ['Atomicity', 'Isolation', 'CAP Theorem', 'Partition Tolerance', 'Eventual Consistency', 'Durability'],
  },
  {
    id: 'q6',
    skillTags: ['Python', 'Concurrency', 'Backend'],
    category: 'Technical',
    difficulty: 'Mid',
    questionText: 'In Python, what is the Global Interpreter Lock (GIL), and how does it influence multithreading versus multiprocessing for CPU-bound tasks?',
    expectedAnswer:
      'The Python Global Interpreter Lock (GIL) is a mutex in CPython that allows only one native thread to execute Python bytecode at a time. Consequently, multithreading does not provide true parallel CPU execution and is mainly advantageous for I/O-bound operations. For CPU-bound tasks, multiprocessing (separate memory spaces with multiple processes) or distributed task workers must be utilized.',
    keywords: ['CPython', 'Mutex', 'Multiprocessing', 'CPU-bound', 'I/O-bound', 'Bytecode'],
  },
  {
    id: 'q7',
    skillTags: ['System Design', 'Cloud', 'Backend', 'Full Stack'],
    category: 'Technical',
    difficulty: 'Senior',
    questionText: 'How do you design a horizontal scaling strategy for a web application experiencing a 10x traffic surge during a product launch?',
    expectedAnswer:
      'Ensure stateless application tier running in containers managed by an autoscaling cluster (e.g. Kubernetes, AWS ECS) behind a redundant load balancer. Implement distributed caching (Redis/Memcached) for session state and hot queries. Offload static assets and media to a global CDN. On the database tier, introduce read-replicas, connection pooling (PgBouncer), and decouple asynchronous workloads using message queues (Kafka/RabbitMQ).',
    keywords: ['Stateless', 'Load Balancer', 'CDN', 'Read Replicas', 'Redis', 'Connection Pooling', 'Message Queue'],
  },
  {
    id: 'q8',
    category: 'Technical',
    difficulty: 'Mid',
    questionText: 'Explain how React Reconciliation works, including the Virtual DOM diffing algorithm and the importance of stable component keys in lists.',
    expectedAnswer:
      'React creates an in-memory Virtual DOM tree representation of the UI. When state or props change, React generates a new Virtual DOM tree and runs a heuristic O(n) diffing algorithm against the previous tree. Stable keys in list items allow React to identify which items have changed, been added, or removed, avoiding costly re-renderings and preventing DOM state bugs when list ordering fluctuates.',
    keywords: ['Virtual DOM', 'Reconciliation', 'Diffing Algorithm', 'Keys', 'O(n) Heuristic', 'Component Lifecycle'],
    skillTags: ['React', 'Frontend', 'Full Stack'],
  },
];

// Initial Aptitude MCQs (10 questions)
const DEFAULT_APTITUDE: AptitudeQuestion[] = [
  {
    id: 'apt1',
    category: 'Quantitative',
    skillTags: ['Quantitative Reasoning', 'Problem Solving'],
    question: 'A train 180 meters long is running at a speed of 54 km/h. How much time will it take to cross a platform 120 meters long?',
    options: ['15 seconds', '20 seconds', '25 seconds', '30 seconds'],
    correctOptionIndex: 1, // 20 seconds: Total dist = 300m, Speed = 54 * (5/18) = 15 m/s. Time = 300/15 = 20s
    explanation: 'Speed = 54 × (5/18) = 15 m/s. Total distance = 180 + 120 = 300 m. Time = Distance / Speed = 300 / 15 = 20 seconds.',
  },
  {
    id: 'apt2',
    category: 'Computer Science',
    skillTags: ['Algorithms', 'Computer Science', 'Full Stack'],
    question: 'What is the worst-case time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
    correctOptionIndex: 2,
    explanation: 'QuickSort has a worst-case time complexity of O(n²) when the pivot selection consistently results in maximally unbalanced partitions (e.g. already sorted array with first element as pivot).',
  },
  {
    id: 'apt3',
    category: 'Logical',
    skillTags: ['Logical Reasoning', 'Problem Solving'],
    question: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    options: ['(1/3)', '(1/8)', '(2/8)', '(1/16)'],
    correctOptionIndex: 1,
    explanation: 'This is a simple division series; each number is one-half of the previous number. (1/4) ÷ 2 = (1/8).',
  },
  {
    id: 'apt4',
    category: 'Computer Science',
    skillTags: ['Data Structures', 'Algorithms', 'Full Stack'],
    question: 'Which of the following data structures operates on a LIFO (Last In, First Out) principle?',
    options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
    correctOptionIndex: 1,
    explanation: 'A Stack follows the Last-In First-Out (LIFO) protocol where elements are inserted and removed from the same end.',
  },
  {
    id: 'apt5',
    category: 'Quantitative',
    skillTags: ['Quantitative Reasoning', 'Problem Solving'],
    question: 'If the price of a product increases by 25%, by what percentage must a consumer decrease their consumption so that expenditure remains unchanged?',
    options: ['20%', '25%', '15%', '30%'],
    correctOptionIndex: 0,
    explanation: 'Formula: [R / (100 + R)] × 100 = [25 / 125] × 100 = 20%.',
  },
  {
    id: 'apt6',
    category: 'Verbal',
    skillTags: ['Verbal Reasoning', 'Communication'],
    question: 'Choose the word that is most nearly OPPOSITE in meaning to the capitalized word: CANDID',
    options: ['Frank', 'Devious', 'Genuine', 'Outspoken'],
    correctOptionIndex: 1,
    explanation: 'Candid means honest, straightforward, and sincere. Its antonym is Devious (dishonest or secretive).',
  },
  {
    id: 'apt7',
    category: 'Computer Science',
    skillTags: ['Networking', 'Backend', 'Full Stack'],
    question: 'In TCP/IP networking, which layer is responsible for end-to-end communication and port addressing?',
    options: ['Network Layer', 'Transport Layer', 'Data Link Layer', 'Application Layer'],
    correctOptionIndex: 1,
    explanation: 'The Transport Layer (TCP/UDP) handles host-to-host process communication, flow control, error checking, and port addressing.',
  },
  {
    id: 'apt8',
    category: 'Logical',
    skillTags: ['Logical Reasoning', 'Problem Solving'],
    question: 'Statements: All mangoes are golden. Some golden things are rare. Conclusions: I. Some mangoes are rare. II. Some golden things are mangoes.',
    options: ['Only conclusion I follows', 'Only conclusion II follows', 'Both follow', 'Neither follows'],
    correctOptionIndex: 1,
    explanation: 'Since all mangoes are golden, it directly follows that some golden things are mangoes. We cannot conclude that mangoes are rare.',
  },
  {
    id: 'apt9',
    category: 'Quantitative',
    skillTags: ['Quantitative Reasoning'],
    question: 'A sum of money doubles itself in 5 years at simple interest. What is the annual rate of interest?',
    options: ['15%', '20%', '25%', '10%'],
    correctOptionIndex: 1,
    explanation: 'Interest = Principal in 5 years. R = (I × 100) / (P × T) = (P × 100) / (P × 5) = 20%.',
  },
  {
    id: 'apt10',
    category: 'Computer Science',
    skillTags: ['APIs', 'Backend', 'Full Stack'],
    question: 'What HTTP status code represents "401 Unauthorized" vs "403 Forbidden"?',
    options: [
      '401 means authentication is needed; 403 means authenticated but lacks permission',
      '401 means not found; 403 means gateway timeout',
      '401 means server error; 403 means client error',
      'They are interchangeable in modern web standards',
    ],
    correctOptionIndex: 0,
    explanation: '401 indicates that the request requires user authentication credentials, whereas 403 indicates the server understands the caller identity but refuses authorization.',
  },
  {
    id: 'apt11',
    category: 'Data Interpretation',
    question: 'The pie chart shows causes of 200 production incidents. How many incidents were caused by API failures?',
    options: ['40', '60', '80', '100'],
    correctOptionIndex: 2,
    explanation: 'API failures account for 40% of incidents. 40% of 200 is 80.',
    skillTags: ['Full Stack', 'Backend', 'APIs', 'Data Interpretation'],
    chart: {
      type: 'pie',
      title: 'Production incidents by cause',
      data: [
        { label: 'API failures', value: 40 },
        { label: 'UI defects', value: 30 },
        { label: 'Database issues', value: 20 },
        { label: 'Deployment', value: 10 },
      ],
    },
  },
  {
    id: 'apt12',
    category: 'Data Interpretation',
    question: 'A team selects one technology from the pie chart for a new project. If 240 projects were surveyed, how many selected React or Vue?',
    options: ['120', '132', '144', '156'],
    correctOptionIndex: 2,
    explanation: 'React and Vue together represent 40% + 20% = 60%. 60% of 240 is 144.',
    skillTags: ['Full Stack', 'Frontend', 'React', 'Data Interpretation'],
    chart: {
      type: 'pie',
      title: 'Frontend technology selected',
      data: [
        { label: 'React', value: 40 },
        { label: 'Angular', value: 25 },
        { label: 'Vue', value: 20 },
        { label: 'Other', value: 15 },
      ],
    },
  },
  {
    id: 'apt13',
    category: 'Logical',
    question: 'Three services A, B, and C are deployed in sequence. A must deploy before C, and B must deploy after C. Which service deploys second?',
    options: ['A', 'B', 'C', 'Cannot be determined'],
    correctOptionIndex: 2,
    explanation: 'The constraints require A before C and C before B, so the only valid order is A, C, B. C deploys second.',
    skillTags: ['Full Stack', 'Backend', 'Logical Reasoning', 'Deployment'],
  },
  {
    id: 'apt14',
    category: 'Quantitative',
    question: 'An API handles 1,200 requests in 2 minutes. At the same rate, how many requests will it handle in 7 minutes?',
    options: ['3,600', '4,000', '4,200', '4,800'],
    correctOptionIndex: 2,
    explanation: 'The API handles 600 requests per minute. In 7 minutes it handles 600 × 7 = 4,200 requests.',
    skillTags: ['Full Stack', 'Backend', 'APIs', 'Quantitative Reasoning'],
  },
  {
    id: 'apt15',
    category: 'Computer Science',
    question: 'A web page makes 12 independent API calls that each take 100 ms. If they run concurrently and network overhead is negligible, approximately how long does the page wait?',
    options: ['100 ms', '1,200 ms', '600 ms', '12 ms'],
    correctOptionIndex: 0,
    explanation: 'Concurrent calls overlap in time. With negligible overhead, the total wait is approximately the duration of one call: 100 ms.',
    skillTags: ['Full Stack', 'Frontend', 'Backend', 'APIs', 'Asynchronous Programming'],
  },
];

// Initial Coding Problems (2 problems with rigorous test cases)
const DEFAULT_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'code1',
    title: 'Two Sum - Target Index Pairs',
    skillTags: ['JavaScript', 'Algorithms', 'Problem Solving', 'Full Stack'],
    difficulty: 'Easy',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.

Example 1:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1] (because nums[0] + nums[1] == 9)

Example 2:
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]

Follow-up: Can you come up with an algorithm that is less than O(n²) time complexity?`,
    language: 'javascript',
    initialCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your algorithmic solution here
  
}`,
    referenceSolution: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    expectedOutput: '[0, 1]',
    hints: ['A hash map allows O(1) average lookup for the complement (target - nums[i]).'],
    testCases: [
      {
        id: 'tc1-1',
        name: 'Standard Example 1',
        input: 'nums = [2, 7, 11, 15], target = 9',
        expected: '[0, 1]',
        callCode: 'twoSum([2, 7, 11, 15], 9)',
        expectedValue: [0, 1],
      },
      {
        id: 'tc1-2',
        name: 'Unsorted Elements',
        input: 'nums = [3, 2, 4], target = 6',
        expected: '[1, 2]',
        callCode: 'twoSum([3, 2, 4], 6)',
        expectedValue: [1, 2],
      },
      {
        id: 'tc1-3',
        name: 'Duplicate Values Pair',
        input: 'nums = [3, 3], target = 6',
        expected: '[0, 1]',
        callCode: 'twoSum([3, 3], 6)',
        expectedValue: [0, 1],
      },
      {
        id: 'tc1-4',
        name: 'Negative Numbers & Boundary',
        input: 'nums = [-1, -2, -3, -4, -5], target = -8',
        expected: '[2, 4]',
        callCode: 'twoSum([-1, -2, -3, -4, -5], -8)',
        expectedValue: [2, 4],
      },
    ],
  },
  {
    id: 'code2',
    title: 'Valid Parentheses & Bracket Validation',
    skillTags: ['JavaScript', 'Algorithms', 'Problem Solving', 'Full Stack'],
    difficulty: 'Medium',
    description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
Input: s = "()[]{}"
Output: true

Example 2:
Input: s = "(]"
Output: false

Example 3:
Input: s = "([)]"
Output: false`,
    language: 'javascript',
    initialCode: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your algorithmic solution here
  
}`,
    referenceSolution: `function isValid(s) {
  const stack = [];
  const pairs = {
    ')': '(',
    '}': '{',
    ']': '['
  };
  
  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (pairs[char]) {
      if (stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}`,
    expectedOutput: 'true',
    hints: ['Use a stack to keep track of opening brackets and verify the matching closing bracket.'],
    testCases: [
      {
        id: 'tc2-1',
        name: 'Simple Single Pair',
        input: 's = "()"',
        expected: 'true',
        callCode: 'isValid("()")',
        expectedValue: true,
      },
      {
        id: 'tc2-2',
        name: 'Multiple Bracket Pairs',
        input: 's = "()[]{}"',
        expected: 'true',
        callCode: 'isValid("()[]{}")',
        expectedValue: true,
      },
      {
        id: 'tc2-3',
        name: 'Mismatched Bracket Types',
        input: 's = "(]"',
        expected: 'false',
        callCode: 'isValid("(]")',
        expectedValue: false,
      },
      {
        id: 'tc2-4',
        name: 'Interleaved / Incorrect Order',
        input: 's = "([)]"',
        expected: 'false',
        callCode: 'isValid("([)]")',
        expectedValue: false,
      },
      {
        id: 'tc2-5',
        name: 'Nested Valid Enclosures',
        input: 's = "{[]}"',
        expected: 'true',
        callCode: 'isValid("{[]}")',
        expectedValue: true,
      },
    ],
  },
];

// Seed Data
export async function initializeStorage(): Promise<void> {
  // Questions
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
  }
  // Aptitude
  if (!localStorage.getItem(STORAGE_KEYS.APTITUDE_QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.APTITUDE_QUESTIONS, JSON.stringify(DEFAULT_APTITUDE));
  }
  // Coding
  if (!localStorage.getItem(STORAGE_KEYS.CODING_PROBLEMS)) {
    localStorage.setItem(STORAGE_KEYS.CODING_PROBLEMS, JSON.stringify(DEFAULT_CODING_PROBLEMS));
  }

  // Users & Profiles Seed
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultPasswordHash = await hashPassword('password123');

    const seedUsers: Array<User & { passwordHash: string }> = [
      {
        id: 'u-recruiter-1',
        name: 'TIGER MUTHUVEL PANDIYAN',
        email: 'recruiter@interviewai.com',
        role: 'recruiter',
        passwordHash: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        joinedDate: '2026-01-10',
      },
      {
        id: 'u-candidate-alex',
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        role: 'candidate',
        passwordHash: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        joinedDate: '2026-02-14',
      },
      {
        id: 'u-candidate-priya',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        role: 'candidate',
        passwordHash: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        joinedDate: '2026-03-01',
      },
      {
        id: 'u-candidate-marcus',
        name: 'Marcus Brody',
        email: 'marcus.brody@example.com',
        role: 'candidate',
        passwordHash: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        joinedDate: '2026-03-05',
      },
      {
        id: 'u-candidate-david',
        name: 'David Kim',
        email: 'david.kim@example.com',
        role: 'candidate',
        passwordHash: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        joinedDate: '2026-03-12',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seedUsers));

    // Seed Candidate Profiles
    const seedProfiles: CandidateProfile[] = [
      {
        id: 'prof-alex',
        userId: 'u-candidate-alex',
        fullName: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        phone: '+1 (555) 234-8901',
        location: 'San Francisco, CA',
        dob: '1998-05-14',
        education: 'B.S. in Computer Science, UC Berkeley',
        graduationYear: '2020',
        currentRole: 'Full Stack Engineer',
        experienceYears: 4,
        resume: {
          name: 'Alex_Johnson_FullStack_Resume.pdf',
          size: '184 KB',
          uploadedAt: '2026-02-14',
        },
        status: 'Completed',
        decision: 'SELECT',
        decisionNotes: 'Exemplary technical articulation and structured thinking. Highly recommended for Senior Frontend/Full-Stack seat.',
      },
      {
        id: 'prof-priya',
        userId: 'u-candidate-priya',
        fullName: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '+1 (555) 345-6789',
        location: 'Seattle, WA',
        dob: '1996-11-20',
        education: 'M.S. Software Engineering, Univ. of Washington',
        graduationYear: '2019',
        currentRole: 'Frontend Architect',
        experienceYears: 6,
        resume: {
          name: 'Priya_Sharma_Staff_Frontend.pdf',
          size: '210 KB',
          uploadedAt: '2026-03-01',
        },
        status: 'Completed',
        decision: 'SELECT',
        decisionNotes: 'Flawless code architecture and exceptional confidence under system design questions.',
      },
      {
        id: 'prof-marcus',
        userId: 'u-candidate-marcus',
        fullName: 'Marcus Brody',
        email: 'marcus.brody@example.com',
        phone: '+1 (555) 456-7890',
        location: 'Austin, TX',
        dob: '2001-08-04',
        education: 'B.S. Information Systems, UT Austin',
        graduationYear: '2023',
        currentRole: 'Junior Backend Developer',
        experienceYears: 2,
        resume: {
          name: 'Marcus_Brody_Resume.pdf',
          size: '142 KB',
          uploadedAt: '2026-03-05',
        },
        status: 'Completed',
        decision: 'HOLD',
        decisionNotes: 'Solid fundamentals, but hesitated slightly on distributed system scale queries. Revisit after next team opening.',
      },
      {
        id: 'prof-david',
        userId: 'u-candidate-david',
        fullName: 'David Kim',
        email: 'david.kim@example.com',
        phone: '+1 (555) 567-8901',
        location: 'Chicago, IL',
        dob: '2002-02-17',
        education: 'B.Tech Computer Science, Northwestern',
        graduationYear: '2024',
        currentRole: 'DevOps Intern',
        experienceYears: 1,
        resume: {
          name: 'David_Kim_DevOps.pdf',
          size: '128 KB',
          uploadedAt: '2026-03-12',
        },
        status: 'Completed',
        decision: 'REJECT',
        decisionNotes: 'Gaps identified in core asynchronous concepts and database index mechanics. Suggested reapplying in 6 months.',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(seedProfiles));

    // Seed Sample Report for Alex Johnson
    const sampleAlexAnswers: InterviewAnswerRecord[] = [
      {
        id: 'ans-1',
        interviewId: 'int-alex-1',
        questionId: 'q1',
        questionText: DEFAULT_QUESTIONS[0].questionText,
        expectedAnswer: DEFAULT_QUESTIONS[0].expectedAnswer,
        recordedAt: '2026-02-15T14:10:00Z',
        durationSeconds: 48,
        analysis: {
          transcript:
            'JavaScript operates on a single thread with an event-driven loop. When asynchronous tasks like Promises or network fetches occur, they are passed to web APIs. Promises go to the microtask queue, which is evaluated before the macrotask queue whenever the call stack is cleared.',
          sentiment: 'positive',
          sentimentScore: 89,
          emotion: 'confident',
          similarityScore: 92,
          technicalScore: 94,
          communicationScore: 90,
          confidenceScore: 91,
          fillerWordCount: 1,
          wordsPerMinute: 135,
          strengths: ['Clearly distinguished microtasks vs macrotasks', 'Precise terminology and confident pace'],
          improvements: ['Could briefly mention requestAnimationFrame queue'],
        },
      },
      {
        id: 'ans-2',
        interviewId: 'int-alex-1',
        questionId: 'q2',
        questionText: DEFAULT_QUESTIONS[1].questionText,
        expectedAnswer: DEFAULT_QUESTIONS[1].expectedAnswer,
        recordedAt: '2026-02-15T14:15:00Z',
        durationSeconds: 52,
        analysis: {
          transcript:
            'A B-Tree index keeps keys sorted in a self-balancing tree structure. Reads enjoy logarithmic time complexity because the engine avoids a full table scan. The trade-off is on writes, where inserting or updating rows requires maintaining tree depth and balancing pages.',
          sentiment: 'positive',
          sentimentScore: 88,
          emotion: 'confident',
          similarityScore: 90,
          technicalScore: 92,
          communicationScore: 88,
          confidenceScore: 89,
          fillerWordCount: 2,
          wordsPerMinute: 140,
          strengths: ['Identified write penalty accurately', 'Logarithmic lookup explained concisely'],
          improvements: ['Could cite clustered vs non-clustered indexing'],
        },
      },
      {
        id: 'ans-3',
        interviewId: 'int-alex-1',
        questionId: 'q8',
        questionText: DEFAULT_QUESTIONS[7].questionText,
        expectedAnswer: DEFAULT_QUESTIONS[7].expectedAnswer,
        recordedAt: '2026-02-15T14:20:00Z',
        durationSeconds: 50,
        analysis: {
          transcript:
            'React uses a virtual DOM to diff state changes against the prior snapshot. The diffing algorithm works in O(n) heuristic time by assuming elements with different types produce different trees. Stable keys prevent unnecessary node rebuilds and state loss when reordering lists.',
          sentiment: 'positive',
          sentimentScore: 91,
          emotion: 'enthusiastic',
          similarityScore: 94,
          technicalScore: 93,
          communicationScore: 92,
          confidenceScore: 90,
          fillerWordCount: 1,
          wordsPerMinute: 138,
          strengths: ['Very crisp definition of heuristic diffing', 'Explained key stability impact on DOM state'],
          improvements: ['Could mention React Fiber scheduler fiber units of work'],
        },
      },
    ];

    const sampleAlexReport: AssessmentReport = {
      id: 'rep-alex-1',
      candidateId: 'prof-alex',
      candidateName: 'Alex Johnson',
      candidateEmail: 'alex.johnson@example.com',
      completedAt: '2026-02-15T14:30:00Z',
      aptitudeScore: 85,
      codingScore: 92,
      interviewScore: 89,
      technicalScore: 93,
      communicationScore: 90,
      confidenceScore: 90,
      sentimentScore: 89.3,
      // Formula: 40% tech + 20% comm + 15% conf + 25% sent
      // (93 * 0.40) + (90 * 0.20) + (90 * 0.15) + (89.3 * 0.25) = 37.2 + 18 + 13.5 + 22.325 = 91.0
      overallScore: 91.0,
      decision: 'SELECT',
      decisionReason: 'Exceptional composite score (91.0%). Mastered technical explanations, articulate cadence, and demonstrated senior-grade coding cleanliness.',
      executiveSummary:
        'Alex exhibited standout technical command across modern web architecture, JavaScript concurrency, and database indexing. Answers were delivered with poise, minimal hesitation, and genuine enthusiasm. Coding solutions demonstrated algorithmic mastery with optimal space-time complexities.',
      keyStrengths: [
        'Deep mastery of browser runtime concurrency, microtask queues, and event dispatching',
        'Natural, assertive delivery with steady pacing (138 WPM) and negligible filler usage',
        'Clean, robust code with strict edge-case validation and clean O(n) algorithmic design',
      ],
      recommendedImprovements: [
        'Could expand more on distributed caching and horizontal database partitioning nuances',
        'Consider elaborating on React 19 concurrent features and server components',
      ],
      radarCompetencies: {
        technicalKnowledge: 93,
        problemSolving: 91,
        communication: 90,
        confidence: 90,
        codeQuality: 92,
        behavioralFit: 88,
      },
      answers: sampleAlexAnswers,
    };

    // Also seed sample reports for Priya, Marcus, David for rich recruiter analytics
    const samplePriyaReport: AssessmentReport = {
      id: 'rep-priya-1',
      candidateId: 'prof-priya',
      candidateName: 'Priya Sharma',
      candidateEmail: 'priya.sharma@example.com',
      completedAt: '2026-03-02T10:00:00Z',
      aptitudeScore: 95,
      codingScore: 96,
      interviewScore: 92,
      technicalScore: 95,
      communicationScore: 94,
      confidenceScore: 95,
      sentimentScore: 92,
      overallScore: 94.1,
      decision: 'SELECT',
      decisionReason: 'Top percentile candidate with exceptional architectural intuition and executive communication.',
      executiveSummary: 'Priya demonstrated elite technical competency, architecting distributed rate-limiters with ease.',
      keyStrengths: ['Flawless system design', 'Polished executive presence', 'Optimal time-space coding efficiency'],
      recommendedImprovements: ['Broaden Python asyncio internals if applicable'],
      radarCompetencies: {
        technicalKnowledge: 96,
        problemSolving: 95,
        communication: 94,
        confidence: 95,
        codeQuality: 96,
        behavioralFit: 92,
      },
      answers: sampleAlexAnswers,
    };

    const sampleMarcusReport: AssessmentReport = {
      id: 'rep-marcus-1',
      candidateId: 'prof-marcus',
      candidateName: 'Marcus Brody',
      candidateEmail: 'marcus.brody@example.com',
      completedAt: '2026-03-06T11:00:00Z',
      aptitudeScore: 75,
      codingScore: 78,
      interviewScore: 68,
      technicalScore: 72,
      communicationScore: 70,
      confidenceScore: 66,
      sentimentScore: 74,
      overallScore: 71.3,
      decision: 'HOLD',
      decisionReason: 'Competent junior engineer. Good coding foundation but showed hesitation under architectural scaling queries.',
      executiveSummary: 'Marcus showed promise in core language constructs but would benefit from further experience with production databases.',
      keyStrengths: ['Practical understanding of REST endpoints', 'Enthusiastic attitude to learn'],
      recommendedImprovements: ['Work on speaking confidence and filler word reduction', 'Deepen understanding of B-Tree indexing'],
      radarCompetencies: {
        technicalKnowledge: 72,
        problemSolving: 74,
        communication: 70,
        confidence: 66,
        codeQuality: 78,
        behavioralFit: 76,
      },
      answers: sampleAlexAnswers,
    };

    const sampleDavidReport: AssessmentReport = {
      id: 'rep-david-1',
      candidateId: 'prof-david',
      candidateName: 'David Kim',
      candidateEmail: 'david.kim@example.com',
      completedAt: '2026-03-13T16:00:00Z',
      aptitudeScore: 50,
      codingScore: 58,
      interviewScore: 54,
      technicalScore: 56,
      communicationScore: 58,
      confidenceScore: 54,
      sentimentScore: 60,
      overallScore: 56.5,
      decision: 'REJECT',
      decisionReason: 'Candidate struggled with both theoretical CS concepts and practical algorithmic implementation.',
      executiveSummary: 'David needs more hands-on development time before qualifying for mid-level backend expectations.',
      keyStrengths: ['Courteous and willing to clarify questions'],
      recommendedImprovements: ['Revisit fundamental data structures and algorithmic complexity', 'Practice whiteboarding and timed problem solving'],
      radarCompetencies: {
        technicalKnowledge: 56,
        problemSolving: 54,
        communication: 58,
        confidence: 54,
        codeQuality: 58,
        behavioralFit: 65,
      },
      answers: sampleAlexAnswers,
    };

    localStorage.setItem(
      STORAGE_KEYS.REPORTS,
      JSON.stringify([sampleAlexReport, samplePriyaReport, sampleMarcusReport, sampleDavidReport])
    );
  }
}

// User & Auth storage functions
export function getUsers(): Array<User & { passwordHash: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUser(user: User & { passwordHash?: string }): void {
  const users = getUsers();
  const existingIdx = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  const storedUser = {
    ...user,
    passwordHash: user.passwordHash || (existingIdx >= 0 ? users[existingIdx].passwordHash : ''),
  };
  if (existingIdx >= 0) {
    users[existingIdx] = storedUser;
  } else {
    users.push(storedUser);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getProfiles(): CandidateProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getProfileByUserId(userId: string): CandidateProfile | undefined {
  const profiles = getProfiles();
  return profiles.find((p) => p.userId === userId);
}

export function getProfileById(profileId: string): CandidateProfile | undefined {
  const profiles = getProfiles();
  return profiles.find((p) => p.id === profileId);
}

export function saveProfile(profile: CandidateProfile): void {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
}

// Question Bank storage
export function getQuestions(): QuestionBankItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const stored: QuestionBankItem[] = raw ? JSON.parse(raw) : [];
    const merged = DEFAULT_QUESTIONS.map((question) => ({
      ...question,
      ...stored.find((item) => item.id === question.id),
    }));
    return [...merged, ...stored.filter((item) => !DEFAULT_QUESTIONS.some((question) => question.id === item.id))];
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export function saveQuestion(q: QuestionBankItem): void {
  const questions = getQuestions();
  const idx = questions.findIndex((item) => item.id === q.id);
  if (idx >= 0) {
    questions[idx] = q;
  } else {
    questions.push(q);
  }
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
}

export function deleteQuestion(id: string): void {
  const questions = getQuestions().filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
}

// Aptitude & Coding
export function getAptitudeQuestions(): AptitudeQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APTITUDE_QUESTIONS);
    const stored: AptitudeQuestion[] = raw ? JSON.parse(raw) : [];
    const merged = DEFAULT_APTITUDE.map((question) => ({
      ...question,
      ...stored.find((item) => item.id === question.id),
    }));
    return [...merged, ...stored.filter((item) => !DEFAULT_APTITUDE.some((question) => question.id === item.id))];
  } catch {
    return DEFAULT_APTITUDE;
  }
}

export function saveAptitudeQuestion(question: AptitudeQuestion): void {
  const questions = getAptitudeQuestions();
  const index = questions.findIndex((item) => item.id === question.id);
  if (index >= 0) questions[index] = question;
  else questions.push(question);
  localStorage.setItem(STORAGE_KEYS.APTITUDE_QUESTIONS, JSON.stringify(questions));
}

export function deleteAptitudeQuestion(id: string): void {
  localStorage.setItem(
    STORAGE_KEYS.APTITUDE_QUESTIONS,
    JSON.stringify(getAptitudeQuestions().filter((question) => question.id !== id))
  );
}

export function getCodingProblems(): CodingProblem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CODING_PROBLEMS);
    const parsed: CodingProblem[] = raw ? JSON.parse(raw) : [];
    const merged = DEFAULT_CODING_PROBLEMS.map((def) => {
      const existing = parsed.find((problem) => problem.id === def.id);
      return {
        ...def,
        ...existing,
        // Always ensure comprehensive test cases and starter templates are available
        testCases: existing?.testCases || def.testCases,
        referenceSolution: existing?.referenceSolution || def.referenceSolution,
        initialCode: existing?.initialCode || def.initialCode,
      };
    });
    return [...merged, ...parsed.filter((problem) => !DEFAULT_CODING_PROBLEMS.some((def) => def.id === problem.id))];
  } catch {
    return DEFAULT_CODING_PROBLEMS;
  }
}

export function saveCodingProblem(problem: CodingProblem): void {
  const problems = getCodingProblems();
  const index = problems.findIndex((item) => item.id === problem.id);
  if (index >= 0) problems[index] = problem;
  else problems.push(problem);
  localStorage.setItem(STORAGE_KEYS.CODING_PROBLEMS, JSON.stringify(problems));
}

export function deleteCodingProblem(id: string): void {
  localStorage.setItem(
    STORAGE_KEYS.CODING_PROBLEMS,
    JSON.stringify(getCodingProblems().filter((problem) => problem.id !== id))
  );
}

export function saveAptitudeResult(userId: string, scorePercentage: number, answersMap: Record<string, number>): void {
  const key = `${STORAGE_KEYS.APTITUDE_RESULTS}_${userId}`;
  localStorage.setItem(
    key,
    JSON.stringify({
      userId,
      score: scorePercentage,
      answersMap,
      completedAt: new Date().toISOString(),
    })
  );
}

export function getAptitudeResult(userId: string): { score: number; completedAt: string } | null {
  const key = `${STORAGE_KEYS.APTITUDE_RESULTS}_${userId}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function saveCodingSubmissions(userId: string, submissions: CodingSubmissionResult[]): void {
  const key = `${STORAGE_KEYS.CODING_SUBMISSIONS}_${userId}`;
  localStorage.setItem(key, JSON.stringify(submissions));
}

export function getCodingSubmissions(userId: string): CodingSubmissionResult[] {
  const key = `${STORAGE_KEYS.CODING_SUBMISSIONS}_${userId}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

// Reports
export function getReports(): AssessmentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getReportByCandidateId(candidateIdOrEmail: string): AssessmentReport | undefined {
  const reports = getReports();
  const search = candidateIdOrEmail.toLowerCase().trim();
  return reports.find(
    (r) =>
      r.candidateId.toLowerCase() === search ||
      r.candidateEmail.toLowerCase() === search ||
      r.id.toLowerCase() === search
  );
}

export function getReportForCandidate(userId: string, email: string, applicationId?: string): AssessmentReport | undefined {
  const reports = getReports();
  if (applicationId) return reports.find((report) => report.applicationId === applicationId);
  const profile = getProfileByUserId(userId);
  const normalizedEmail = email.toLowerCase().trim();

  return reports.find(
    (r) =>
      (profile && r.candidateId === profile.id) ||
      r.candidateEmail.toLowerCase() === normalizedEmail ||
      r.candidateId === userId
  );
}

export function generateInstantReportForCandidate(
  candidateId: string,
  candidateName: string,
  candidateEmail: string
): AssessmentReport {
  const aptitudeScore = 88;
  const codingScore = 90;
  const technicalScore = 92;
  const communicationScore = 89;
  const confidenceScore = 88;
  const sentimentScore = 88.5;

  const overall = Number(
    ((technicalScore * 0.4) + (communicationScore * 0.2) + (confidenceScore * 0.15) + (sentimentScore * 0.25)).toFixed(1)
  );

  const report: AssessmentReport = {
    id: `rep-${Date.now()}`,
    candidateId,
    candidateName,
    candidateEmail,
    completedAt: new Date().toISOString(),
    technicalScore,
    communicationScore,
    confidenceScore,
    sentimentScore,
    overallScore: overall,
    aptitudeScore,
    codingScore,
    interviewScore: 90,
    decision: 'SELECT',
    decisionReason: `Outstanding performance across all assessment rounds by ${candidateName}. High technical clarity, steady speaking tempo, and optimal code quality.`,
    executiveSummary: `${candidateName} demonstrated solid architectural intuition and clear technical articulation during interview rounds. Explanations were concise and code solutions followed optimal asymptotic patterns.`,
    keyStrengths: [
      'Strong grasp of distributed systems, indexing, and asynchronous design',
      'Articulate verbal cadence (136 WPM) with minimal filler words',
      'Clean algorithmic modularity with comprehensive edge-case handling',
    ],
    recommendedImprovements: [
      'Deepen horizontal database partitioning and caching invalidation strategies',
      'Elaborate on production observability and distributed tracing tools',
    ],
    radarCompetencies: {
      technicalKnowledge: 92,
      problemSolving: 90,
      communication: 89,
      confidence: 88,
      codeQuality: 90,
      behavioralFit: 87,
    },
    answers: [
      {
        id: `ans-init-1`,
        interviewId: `int-${Date.now()}`,
        questionId: 'q1',
        questionText: 'Explain the difference between synchronous and asynchronous JavaScript, and how the Event Loop works with the Call Stack and Microtask Queue.',
        expectedAnswer: 'Synchronous code executes on the single thread. Asynchronous tasks resolve via web APIs and microtasks (Promises) execute before macrotasks.',
        recordedAt: new Date().toISOString(),
        durationSeconds: 46,
        analysis: {
          transcript: `${candidateName} explained the JavaScript single-threaded concurrency model, distinguishing between the Call Stack, Microtask Queue (Promises), and Macrotask Queue (timers).`,
          sentiment: 'positive',
          sentimentScore: 90,
          emotion: 'confident',
          similarityScore: 92,
          technicalScore: 93,
          communicationScore: 90,
          confidenceScore: 89,
          fillerWordCount: 1,
          wordsPerMinute: 135,
          strengths: ['Clear definition of microtask queues', 'Articulate pacing'],
          improvements: ['Mention requestAnimationFrame scheduling'],
        },
      },
      {
        id: `ans-init-2`,
        interviewId: `int-${Date.now()}`,
        questionId: 'q2',
        questionText: 'What is Database Indexing, and how do B-Tree indexes improve query performance while impacting write throughput?',
        expectedAnswer: 'B-Trees provide logarithmic O(log N) lookup time at the cost of additional write overhead to maintain tree balance.',
        recordedAt: new Date().toISOString(),
        durationSeconds: 50,
        analysis: {
          transcript: `${candidateName} detailed B-Tree data structures, balanced search operations, and the write penalty involved with node page splits on insertion.`,
          sentiment: 'positive',
          sentimentScore: 88,
          emotion: 'confident',
          similarityScore: 91,
          technicalScore: 92,
          communicationScore: 88,
          confidenceScore: 88,
          fillerWordCount: 2,
          wordsPerMinute: 138,
          strengths: ['Identified logarithmic lookup speed', 'Accurate write trade-off analysis'],
          improvements: ['Cover clustered vs non-clustered indexing'],
        },
      },
    ],
  };

  saveReport(report);
  return report;
}

export function saveReport(report: AssessmentReport): void {
  const reports = getReports();
  const idx = reports.findIndex((r) => r.id === report.id || r.candidateId === report.candidateId);
  if (idx >= 0) {
    reports[idx] = report;
  } else {
    reports.unshift(report);
  }
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  // Also update candidate status to Completed and update decision
  const profile = getProfileById(report.candidateId);
  if (profile) {
    profile.status = 'Completed';
    profile.decision = report.decision;
    profile.decisionNotes = report.decisionReason;
    saveProfile(profile);
  }
}

export function updateRecruiterDecision(candidateId: string, decision: RecruiterDecision, notes?: string): void {
  const profile = getProfileById(candidateId);
  if (profile) {
    profile.decision = decision;
    if (notes) profile.decisionNotes = notes;
    profile.decisionOverridden = true;
    saveProfile(profile);
  }

  const reports = getReports();
  const report = reports.find((r) => r.candidateId === candidateId);
  if (report) {
    report.decision = decision;
    if (notes) report.decisionReason = notes;
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  }
}
