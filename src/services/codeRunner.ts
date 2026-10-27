import { ProblemTestCase } from '../types';

export interface ExecutedTestCaseResult {
  input: string;
  expected: string;
  passed: boolean;
  output: string;
  executionTimeMs?: number;
  error?: string;
}

export interface CodeExecutionSummary {
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  correctnessScore: number; // 0 - 100
  testCases: ExecutedTestCaseResult[];
  syntaxError?: string;
}

/**
 * Normalizes and compares returned results with expected values.
 * Handles arrays (such as Two Sum indices [0, 1] vs [1, 0]), booleans, and primitives.
 */
function isOutputMatching(actual: any, expected: any, problemId?: string): boolean {
  if (actual === undefined || expected === undefined) {
    return actual === expected;
  }

  // Handle Two Sum array comparison: indices can be returned in any order or sorted
  if (problemId === 'code1' || (Array.isArray(actual) && Array.isArray(expected))) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
    if (actual.length !== expected.length) return false;

    // Check sorted string match
    const sortedActual = [...actual].sort((a, b) => (a > b ? 1 : -1)).join(',');
    const sortedExpected = [...expected].sort((a, b) => (a > b ? 1 : -1)).join(',');
    return sortedActual === sortedExpected;
  }

  // Handle boolean check (e.g. Valid Parentheses)
  if (typeof expected === 'boolean') {
    return actual === expected;
  }

  // Deep / JSON comparison
  try {
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return actual === expected;
  }
}

function stringifyValue(val: any): string {
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

/**
 * Executes user JavaScript solution against defined problem test cases.
 * Returns true pass/fail status and output values.
 */
export function executeJavaScriptTestCases(
  userCode: string,
  problemId: string,
  testCases: ProblemTestCase[]
): CodeExecutionSummary {
  const cleanCode = (userCode || '').trim();

  // If no meaningful code entered
  if (!cleanCode) {
    const emptyResults: ExecutedTestCaseResult[] = testCases.map((tc) => ({
      input: tc.input,
      expected: tc.expected,
      passed: false,
      output: 'No code submitted / function body empty',
      error: 'EmptyCode',
    }));
    return {
      passedCount: 0,
      totalCount: testCases.length,
      allPassed: false,
      correctnessScore: 0,
      testCases: emptyResults,
      syntaxError: 'No implementation provided',
    };
  }

  // Verify syntax first
  try {
    new Function(cleanCode);
  } catch (syntaxErr: any) {
    const errorMsg = `${syntaxErr.name}: ${syntaxErr.message}`;
    const failedResults: ExecutedTestCaseResult[] = testCases.map((tc) => ({
      input: tc.input,
      expected: tc.expected,
      passed: false,
      output: errorMsg,
      error: errorMsg,
    }));
    return {
      passedCount: 0,
      totalCount: testCases.length,
      allPassed: false,
      correctnessScore: 0,
      testCases: failedResults,
      syntaxError: errorMsg,
    };
  }

  const results: ExecutedTestCaseResult[] = [];
  let passedCount = 0;

  for (const tc of testCases) {
    try {
      // Execute the user code and evaluate the test expression
      const runner = new Function(`
        "use strict";
        ${cleanCode}
        if (typeof ${tc.callCode.split('(')[0]} !== 'function') {
          throw new ReferenceError("Function '${tc.callCode.split('(')[0]}' is not defined. Please maintain the required function name.");
        }
        return (${tc.callCode});
      `);

      const t0 = performance.now();
      const actualOutput = runner();
      const t1 = performance.now();
      const executionTime = Math.round((t1 - t0) * 100) / 100;

      const passed = isOutputMatching(actualOutput, tc.expectedValue, problemId);
      if (passed) {
        passedCount++;
      }

      results.push({
        input: tc.input,
        expected: tc.expected,
        passed,
        output: stringifyValue(actualOutput),
        executionTimeMs: executionTime,
      });
    } catch (runErr: any) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        passed: false,
        output: `${runErr.name || 'RuntimeError'}: ${runErr.message || 'Error executing test case'}`,
        error: runErr.message,
      });
    }
  }

  const totalCount = testCases.length;
  const correctnessScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return {
    passedCount,
    totalCount,
    allPassed: passedCount === totalCount && totalCount > 0,
    correctnessScore,
    testCases: results,
  };
}
