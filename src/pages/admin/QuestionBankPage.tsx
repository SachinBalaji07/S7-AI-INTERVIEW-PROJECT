import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { getQuestions, saveQuestion, deleteQuestion } from '../../services/storageService';
import { QuestionBankItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { deleteAssessmentQuestionBankItem, loadAssessmentQuestionBanks, saveAssessmentQuestionBankItem } from '../../services/backendService';
import { AptitudeQuestionBankPage, CodingProblemBankPage } from './AssessmentQuestionBankPage';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  X,
  BookOpen,
  Sparkles,
  Tag,
} from 'lucide-react';

const InterviewQuestionBankPage: React.FC = () => {
  const { showToast } = useToast();
  const { token } = useAuth();
  const [questions, setQuestions] = useState<QuestionBankItem[]>(getQuestions());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [formData, setFormData] = useState({
    questionText: '',
    category: 'Technical' as 'Technical' | 'HR' | 'Behavioural',
    expectedAnswer: '',
    keywordsInput: '',
    difficulty: 'Mid' as 'Junior' | 'Mid' | 'Senior',
    skillTagsInput: '',
  });

  useEffect(() => {
    if (!token) return;
    loadAssessmentQuestionBanks(token, {
      aptitudeQuestions: [],
      codingProblems: [],
      interviewQuestions: getQuestions(),
    }).then((banks) => setQuestions(banks.interviewQuestions)).catch((error) => {
      console.error('Unable to load shared interview questions:', error);
      showToast(error instanceof Error ? error.message : 'Unable to load shared interview questions.', 'error');
    });
  }, [token]);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.skillTags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = categoryFilter === 'ALL' || q.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setFormData({
      questionText: '',
      category: 'Technical',
      expectedAnswer: '',
      keywordsInput: '',
      difficulty: 'Mid',
      skillTagsInput: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: QuestionBankItem) => {
    setEditingQuestion(q);
    setFormData({
      questionText: q.questionText,
      category: q.category,
      expectedAnswer: q.expectedAnswer,
      keywordsInput: q.keywords.join(', '),
      difficulty: q.difficulty || 'Mid',
      skillTagsInput: q.skillTags?.join(', ') || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this question from the interview question bank?')) {
      try {
        if (token) await deleteAssessmentQuestionBankItem(token, 'interviewQuestions', id);
        deleteQuestion(id);
        setQuestions(getQuestions());
        showToast('Question removed successfully', 'info');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to remove the question.', 'error');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.questionText.trim() || !formData.expectedAnswer.trim()) {
      showToast('Question text and expected answer are required', 'error');
      return;
    }

    const keywords = formData.keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const newItem: QuestionBankItem = {
      id: editingQuestion ? editingQuestion.id : `q-${Date.now()}`,
      questionText: formData.questionText.trim(),
      category: formData.category,
      expectedAnswer: formData.expectedAnswer.trim(),
      keywords: keywords.length > 0 ? keywords : ['Fundamentals', 'Best Practices'],
      difficulty: formData.difficulty,
      skillTags: [...new Set(formData.skillTagsInput.split(',').map((tag) => tag.trim()).filter(Boolean))],
    };

    try {
      if (token) await saveAssessmentQuestionBankItem(token, 'interviewQuestions', newItem);
      saveQuestion(newItem);
      setQuestions(getQuestions());
      setIsModalOpen(false);
      showToast(editingQuestion ? 'Question updated successfully!' : 'New question added!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save interview question.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Interview Question Bank Management</h1>
            <p className="text-xs text-slate-400">
              Manage core technical, HR, and behavioral interview questions evaluated by Gemini NLP.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or keyword tags..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="HR">HR</option>
            <option value="Behavioural">Behavioural</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
            No questions found matching your filter criteria.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/30 backdrop-blur-xl transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      q.category === 'Technical'
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                        : q.category === 'HR'
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {q.category}
                  </span>
                  {q.difficulty && (
                    <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {q.difficulty}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Edit Question"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-slate-100">{q.questionText}</h3>

              {/* Expected Ideal Answer */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300">
                <strong className="text-purple-400 block mb-0.5">Model Reference Answer:</strong>
                <p className="leading-relaxed">{q.expectedAnswer}</p>
              </div>

              {/* Keywords Tag List */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                {q.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-[10px] text-slate-300 font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(q.skillTags || []).map((tag) => <span key={tag} className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300">{tag}</span>)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingQuestion ? 'Edit Question' : 'Add New Question to Bank'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Specify ideal answer criteria and key technical keywords for Gemini semantic comparison.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Question Prompt</label>
                <textarea
                  rows={3}
                  required
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  placeholder="e.g. Explain how indexing works in relational databases..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Technical">Technical</option>
                    <option value="HR">HR</option>
                    <option value="Behavioural">Behavioural</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid-Level</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Expected Ideal Answer (For AI Semantic Matching)
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.expectedAnswer}
                  onChange={(e) => setFormData({ ...formData, expectedAnswer: e.target.value })}
                  placeholder="Provide comprehensive conceptual points expected in candidate response..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Keywords (Comma Separated)
                </label>
                <input
                  type="text"
                  value={formData.keywordsInput}
                  onChange={(e) => setFormData({ ...formData, keywordsInput: e.target.value })}
                  placeholder="e.g. B-Tree, Logarithmic, Full Table Scan, Latency"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Related Job Skills (Comma Separated)
                </label>
                <input
                  type="text"
                  value={formData.skillTagsInput}
                  onChange={(e) => setFormData({ ...formData, skillTagsInput: e.target.value })}
                  placeholder="e.g. React, TypeScript, Backend, Full Stack"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25"
                >
                  Save to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

type BankTab = 'aptitude' | 'coding' | 'interview';

export const QuestionBankPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BankTab>('aptitude');
  const tabs: Array<{ id: BankTab; label: string; detail: string }> = [
    { id: 'aptitude', label: 'Round 1 · Aptitude', detail: 'Reasoning, quantitative, pie charts' },
    { id: 'coding', label: 'Round 2 · Coding', detail: 'Challenges with runnable tests' },
    { id: 'interview', label: 'Round 3 · Interview', detail: 'Technical, HR, behavioral' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h1 className="text-xl font-bold text-white">Assessment Question Banks</h1>
        <p className="mt-1 text-sm text-slate-400">Build reusable question pools for all three rounds, then tag questions by the job skills they assess.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-xl border p-3 text-left transition-colors ${activeTab === tab.id ? 'border-purple-500/40 bg-purple-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}>
              <span className={`block text-xs font-semibold ${activeTab === tab.id ? 'text-purple-200' : 'text-slate-300'}`}>{tab.label}</span>
              <span className="mt-1 block text-[11px] text-slate-500">{tab.detail}</span>
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'aptitude' && <AptitudeQuestionBankPage />}
      {activeTab === 'coding' && <CodingProblemBankPage />}
      {activeTab === 'interview' && <InterviewQuestionBankPage />}
    </div>
  );
};
