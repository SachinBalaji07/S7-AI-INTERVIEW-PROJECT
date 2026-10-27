import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  deleteAptitudeQuestion,
  deleteCodingProblem,
  getAptitudeQuestions,
  getCodingProblems,
  saveAptitudeQuestion,
  saveCodingProblem,
} from '../../services/storageService';
import { AptitudeQuestion, CodingProblem, ProblemTestCase } from '../../types';
import { deleteAssessmentQuestionBankItem, loadAssessmentQuestionBanks, saveAssessmentQuestionBankItem } from '../../services/backendService';
import { Edit2, Plus, Trash2 } from 'lucide-react';

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none';
const selectClass = `${fieldClass} cursor-pointer`;

function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

function parseChartRows(value: string): Array<{ label: string; value: number }> {
  if (!value.trim()) return [];
  return value.split('\n').map((line, index) => {
    const [label, rawValue] = line.split(':');
    const numericValue = Number(rawValue?.trim());
    if (!label?.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
      throw new Error(`Pie chart row ${index + 1} must use the format Label: positive number.`);
    }
    return { label: label.trim(), value: numericValue };
  });
}

function parseTestCases(value: string): ProblemTestCase[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Test cases must be valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Add at least one test case as a JSON array.');
  }
  const valid = parsed.every((testCase) =>
    typeof testCase?.id === 'string' &&
    typeof testCase?.input === 'string' &&
    typeof testCase?.expected === 'string' &&
    typeof testCase?.callCode === 'string' &&
    testCase.callCode.includes('(') &&
    Object.prototype.hasOwnProperty.call(testCase, 'expectedValue')
  );
  if (!valid) {
    throw new Error('Each test case needs id, input, expected, callCode, and expectedValue fields.');
  }
  return parsed as ProblemTestCase[];
}

export const AptitudeQuestionBankPage: React.FC = () => {
  const { showToast } = useToast();
  const { token } = useAuth();
  const [questions, setQuestions] = useState(getAptitudeQuestions());
  const [editing, setEditing] = useState<AptitudeQuestion | null>(null);
  const [search, setSearch] = useState('');
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<AptitudeQuestion['category']>('Logical');
  const [optionsText, setOptionsText] = useState('');
  const [answerIndex, setAnswerIndex] = useState('0');
  const [explanation, setExplanation] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [chartTitle, setChartTitle] = useState('');
  const [chartRows, setChartRows] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadAssessmentQuestionBanks(token, {
      aptitudeQuestions: getAptitudeQuestions(),
      codingProblems: [],
      interviewQuestions: [],
    }).then((banks) => setQuestions(banks.aptitudeQuestions)).catch((error) => {
      console.error('Unable to load shared aptitude questions:', error);
      showToast(error instanceof Error ? error.message : 'Unable to load shared aptitude questions.', 'error');
    });
  }, [token]);

  const reset = () => {
    setEditing(null);
    setQuestion('');
    setCategory('Logical');
    setOptionsText('');
    setAnswerIndex('0');
    setExplanation('');
    setTagsText('');
    setChartTitle('');
    setChartRows('');
    setModalOpen(true);
  };

  const edit = (item: AptitudeQuestion) => {
    setEditing(item);
    setQuestion(item.question);
    setCategory(item.category);
    setOptionsText(item.options.join('\n'));
    setAnswerIndex(String(item.correctOptionIndex));
    setExplanation(item.explanation);
    setTagsText(item.skillTags?.join(', ') || '');
    setChartTitle(item.chart?.title || '');
    setChartRows(item.chart?.data.map((row) => `${row.label}: ${row.value}`).join('\n') || '');
    setModalOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const options = optionsText.split('\n').map((option) => option.trim()).filter(Boolean);
    const correctOptionIndex = Number(answerIndex);
    if (!question.trim() || !explanation.trim() || options.length < 2 || !Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      showToast('Add a question, at least two options, a valid correct answer, and an explanation.', 'error');
      return;
    }
    let chart: AptitudeQuestion['chart'];
    try {
      const chartData = parseChartRows(chartRows);
      if (chartRows.trim() && (chartData.length < 2 || !chartTitle.trim())) {
        throw new Error('Pie charts need a title and at least two data rows.');
      }
      if (chartData.length) chart = { type: 'pie', title: chartTitle.trim(), data: chartData };
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Invalid pie chart data.', 'error');
      return;
    }

    const newQuestion: AptitudeQuestion = {
      id: editing?.id || `apt-custom-${Date.now()}`,
      question: question.trim(),
      category,
      options,
      correctOptionIndex,
      explanation: explanation.trim(),
      skillTags: parseTags(tagsText),
      chart,
    };
    try {
      if (token) await saveAssessmentQuestionBankItem(token, 'aptitudeQuestions', newQuestion);
      saveAptitudeQuestion(newQuestion);
      setQuestions(getAptitudeQuestions());
      setModalOpen(false);
      showToast(editing ? 'Aptitude question updated.' : 'Aptitude question added.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save aptitude question.', 'error');
    }
  };

  const filtered = questions.filter((item) =>
    `${item.question} ${item.category} ${(item.skillTags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  );

  const remove = async (item: AptitudeQuestion) => {
    if (/^apt\d+$/.test(item.id)) {
      showToast('Built-in questions are kept in the bank. You can edit them or leave them out of a job assessment.', 'info');
      return;
    }
    if (!confirm('Remove this custom aptitude question? Existing published assessments keep their saved copy.')) return;
    try {
      if (token) await deleteAssessmentQuestionBankItem(token, 'aptitudeQuestions', item.id);
      deleteAptitudeQuestion(item.id);
      setQuestions(getAptitudeQuestions());
      showToast('Custom aptitude question removed.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to remove aptitude question.', 'error');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Round 1 · Aptitude & reasoning</h2>
          <p className="mt-1 text-xs text-slate-400">Add quantitative, logical, verbal, computer-science, and chart-based questions. Tag skills to help match them to roles.</p>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" />Add aptitude question
        </button>
      </div>

      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question, category, or role skill…" className={fieldClass} />

      <div className="grid gap-3">
        {filtered.map((item) => (
          <article key={item.id} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase text-indigo-300">{item.category}</span>
                {item.chart && <span className="ml-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">Pie chart</span>}
                <h3 className="mt-2 text-sm font-semibold text-white">{item.question}</h3>
                <p className="mt-1 text-xs text-slate-400">{item.options.length} options · key: {item.id}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => edit(item)} aria-label="Edit aptitude question" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><Edit2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(item)} aria-label="Remove aptitude question" className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(item.skillTags || []).map((tag) => <span key={tag} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300">{tag}</span>)}
            </div>
          </article>
        ))}
        {!filtered.length && <p className="rounded-xl border border-slate-800 p-6 text-center text-sm text-slate-400">No aptitude questions match this search.</p>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
            <div><h3 className="text-lg font-bold text-white">{editing ? 'Edit aptitude question' : 'Add aptitude question'}</h3><p className="mt-1 text-xs text-slate-400">Correct answers are only used for scoring, not shown during the assessment.</p></div>
            <textarea required rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Question prompt" className={fieldClass} />
            <select value={category} onChange={(event) => setCategory(event.target.value as AptitudeQuestion['category'])} className={selectClass}>
              <option>Logical</option><option>Quantitative</option><option>Data Interpretation</option><option>Verbal</option><option>Computer Science</option>
            </select>
            <div><label className="mb-1.5 block text-xs text-slate-300">Answer options (one per line)</label><textarea required rows={4} value={optionsText} onChange={(event) => setOptionsText(event.target.value)} placeholder={'Option A\nOption B\nOption C\nOption D'} className={fieldClass} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required type="number" min="0" value={answerIndex} onChange={(event) => setAnswerIndex(event.target.value)} aria-label="Correct option number starting from zero" placeholder="Correct option index (0 = first)" className={fieldClass} />
              <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Related skills (e.g. Full Stack, APIs)" className={fieldClass} />
            </div>
            <textarea required rows={2} value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Explanation for the correct answer" className={fieldClass} />
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-sm font-semibold text-slate-200">Optional pie chart data</h4>
              <input value={chartTitle} onChange={(event) => setChartTitle(event.target.value)} placeholder="Chart title" className={fieldClass} />
              <textarea rows={4} value={chartRows} onChange={(event) => setChartRows(event.target.value)} placeholder={'API failures: 40\nUI defects: 30\nDatabase issues: 20\nDeployment: 10'} className={fieldClass} />
              <p className="text-[11px] text-slate-500">Enter one category per line as <code>Label: value</code>. Values are shown as relative pie-chart slices.</p>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300">Cancel</button><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">Save question</button></div>
          </form>
        </div>
      )}
    </section>
  );
};

const defaultTestCases = JSON.stringify([
  { id: 'tc-1', name: 'Basic example', input: 'nums = [1, 2], target = 3', expected: '[0, 1]', callCode: 'solve([1, 2], 3)', expectedValue: [0, 1] },
  { id: 'tc-2', name: 'No match', input: 'nums = [1, 4], target = 5', expected: '[0, 1]', callCode: 'solve([1, 4], 5)', expectedValue: [0, 1] },
], null, 2);

export const CodingProblemBankPage: React.FC = () => {
  const { showToast } = useToast();
  const { token } = useAuth();
  const [problems, setProblems] = useState(getCodingProblems());
  const [editing, setEditing] = useState<CodingProblem | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<CodingProblem['difficulty']>('Easy');
  const [functionName, setFunctionName] = useState('solve');
  const [starterCode, setStarterCode] = useState('function solve() {\n  // Implement your solution\n}');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [hintsText, setHintsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [testCasesText, setTestCasesText] = useState(defaultTestCases);

  useEffect(() => {
    if (!token) return;
    loadAssessmentQuestionBanks(token, {
      aptitudeQuestions: [],
      codingProblems: getCodingProblems(),
      interviewQuestions: [],
    }).then((banks) => setProblems(banks.codingProblems)).catch((error) => {
      console.error('Unable to load shared coding challenges:', error);
      showToast(error instanceof Error ? error.message : 'Unable to load shared coding challenges.', 'error');
    });
  }, [token]);

  const reset = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setDifficulty('Easy');
    setFunctionName('solve');
    setStarterCode('function solve() {\n  // Implement your solution\n}');
    setExpectedOutput('');
    setHintsText('');
    setTagsText('');
    setTestCasesText(defaultTestCases);
    setModalOpen(true);
  };

  const edit = (problem: CodingProblem) => {
    setEditing(problem);
    setTitle(problem.title);
    setDescription(problem.description);
    setDifficulty(problem.difficulty);
    const matchedFunction = problem.initialCode.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
    setFunctionName(matchedFunction?.[1] || 'solve');
    setStarterCode(problem.initialCode);
    setExpectedOutput(problem.expectedOutput);
    setHintsText(problem.hints.join('\n'));
    setTagsText(problem.skillTags?.join(', ') || '');
    setTestCasesText(JSON.stringify(problem.testCases || [], null, 2));
    setModalOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !/^[A-Za-z_$][\w$]*$/.test(functionName) || !starterCode.includes(`function ${functionName}(`)) {
      showToast('Provide a title, prompt, and starter code defining the required function name.', 'error');
      return;
    }
    let testCases: ProblemTestCase[];
    try {
      testCases = parseTestCases(testCasesText);
      if (testCases.some((testCase) => !testCase.callCode.trim().startsWith(`${functionName}(`))) {
        throw new Error(`Every test case must call ${functionName}(...).`);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Invalid coding test cases.', 'error');
      return;
    }
    const problem: CodingProblem = {
      id: editing?.id || `code-custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      difficulty,
      language: 'javascript',
      initialCode: starterCode,
      expectedOutput: expectedOutput.trim(),
      hints: hintsText.split('\n').map((hint) => hint.trim()).filter(Boolean),
      skillTags: parseTags(tagsText),
      testCases,
    };
    try {
      if (token) await saveAssessmentQuestionBankItem(token, 'codingProblems', problem);
      saveCodingProblem(problem);
      setProblems(getCodingProblems());
      setModalOpen(false);
      showToast(editing ? 'Coding challenge updated.' : 'Coding challenge added.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save coding challenge.', 'error');
    }
  };

  const remove = async (problem: CodingProblem) => {
    if (/^code\d+$/.test(problem.id)) {
      showToast('Built-in challenges are kept in the bank. You can edit them or leave them out of a job assessment.', 'info');
      return;
    }
    if (!confirm('Remove this custom coding challenge? Existing published assessments keep their saved copy.')) return;
    try {
      if (token) await deleteAssessmentQuestionBankItem(token, 'codingProblems', problem.id);
      deleteCodingProblem(problem.id);
      setProblems(getCodingProblems());
      showToast('Custom coding challenge removed.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to remove coding challenge.', 'error');
    }
  };

  const filtered = problems.filter((problem) =>
    `${problem.title} ${problem.description} ${(problem.skillTags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h2 className="text-lg font-bold text-white">Round 2 · Coding challenges</h2><p className="mt-1 text-xs text-slate-400">Create JavaScript coding tasks with runnable test cases and tags matching the job skills.</p></div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"><Plus className="h-4 w-4" />Add coding challenge</button>
      </div>
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search coding challenges or role skills…" className={fieldClass} />
      <div className="grid gap-3">
        {filtered.map((problem) => (
          <article key={problem.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div><span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase text-blue-300">{problem.difficulty}</span><h3 className="mt-2 text-sm font-semibold text-white">{problem.title}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-400">{problem.description}</p><p className="mt-2 text-[11px] text-slate-500">{problem.testCases?.length || 0} runnable test cases</p><div className="mt-2 flex flex-wrap gap-1.5">{(problem.skillTags || []).map((tag) => <span key={tag} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300">{tag}</span>)}</div></div>
            <div className="flex gap-1"><button type="button" onClick={() => edit(problem)} aria-label="Edit coding challenge" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><Edit2 className="h-4 w-4" /></button><button type="button" onClick={() => remove(problem)} aria-label="Remove coding challenge" className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></div>
          </article>
        ))}
        {!filtered.length && <p className="rounded-xl border border-slate-800 p-6 text-center text-sm text-slate-400">No coding challenges match this search.</p>}
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
            <div><h3 className="text-lg font-bold text-white">{editing ? 'Edit coding challenge' : 'Add coding challenge'}</h3><p className="mt-1 text-xs text-slate-400">Use JavaScript function-style test cases; the same cases are used by the local runner and AI grader.</p></div>
            <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Challenge title" className={fieldClass} />
            <textarea required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Problem statement, examples, and constraints" className={fieldClass} />
            <div className="grid gap-3 sm:grid-cols-3">
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as CodingProblem['difficulty'])} className={selectClass}><option>Easy</option><option>Medium</option><option>Hard</option></select>
              <input required value={functionName} onChange={(event) => setFunctionName(event.target.value)} placeholder="Required function name" className={fieldClass} />
              <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Related skills, comma separated" className={fieldClass} />
            </div>
            <div><label className="mb-1.5 block text-xs text-slate-300">JavaScript starter code</label><textarea required rows={7} value={starterCode} onChange={(event) => setStarterCode(event.target.value)} className={`${fieldClass} font-mono text-xs`} /></div>
            <input value={expectedOutput} onChange={(event) => setExpectedOutput(event.target.value)} placeholder="Example expected output (optional)" className={fieldClass} />
            <textarea rows={2} value={hintsText} onChange={(event) => setHintsText(event.target.value)} placeholder="Hints (one per line)" className={fieldClass} />
            <div><label className="mb-1.5 block text-xs text-slate-300">Runnable test cases (JSON)</label><textarea required rows={10} value={testCasesText} onChange={(event) => setTestCasesText(event.target.value)} className={`${fieldClass} font-mono text-xs`} /><p className="mt-1 text-[11px] text-slate-500">Each test needs <code>id</code>, <code>input</code>, <code>expected</code>, <code>callCode</code> (for example <code>solve([1,2], 3)</code>), and <code>expectedValue</code>.</p></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300">Cancel</button><button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500">Save challenge</button></div>
          </form>
        </div>
      )}
    </section>
  );
};
