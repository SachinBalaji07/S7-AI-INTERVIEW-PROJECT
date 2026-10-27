import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/layout/Header';
import { CandidateNavBar } from './components/layout/CandidateNavBar';
import { CandidateSidebar } from './components/layout/CandidateSidebar';
import { AdminSidebar } from './components/layout/AdminSidebar';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { CandidateHome } from './pages/candidate/CandidateHome';
import { ProfilePage } from './pages/candidate/ProfilePage';
import { AptitudeRoundPage } from './pages/candidate/AptitudeRoundPage';
import { CodingRoundPage } from './pages/candidate/CodingRoundPage';
import { AIInterviewPage } from './pages/candidate/AIInterviewPage';
import { ReportPage } from './pages/candidate/ReportPage';
import { JobsPage } from './pages/candidate/JobsPage';

import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminCandidates } from './pages/admin/AdminCandidates';
import { AdminJobsPage } from './pages/admin/AdminJobsPage';
import { QuestionBankPage } from './pages/admin/QuestionBankPage';
import { AdminResponsesPage } from './pages/admin/AdminResponsesPage';
import { AdminReportsAnalytics } from './pages/admin/AdminReportsAnalytics';
import { CandidateApplicationGate } from './context/ApplicationContext';

// Protected Route Guard for Candidates
const CandidateRouteLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'candidate') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Header />
      <CandidateNavBar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <CandidateSidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Protected Route Guard for Recruiters (Admins)
const AdminRouteLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'recruiter') {
    return <Navigate to="/candidate" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Header />
      <nav className="flex gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900/50 px-4 py-2 lg:hidden">
        {[
          ['/admin', 'Overview'],
          ['/admin/jobs', 'Jobs'],
          ['/admin/candidates', 'Candidates'],
          ['/admin/questions', 'Questions'],
        ].map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <AdminSidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Root Redirect helper
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'recruiter' ? '/admin' : '/candidate'} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Candidate Portal Routes */}
            <Route path="/candidate" element={<CandidateRouteLayout />}>
              <Route index element={<CandidateHome />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<CandidateApplicationGate />}>
                <Route path="aptitude" element={<AptitudeRoundPage />} />
                <Route path="coding" element={<CodingRoundPage />} />
                <Route path="interview" element={<AIInterviewPage />} />
              </Route>
              <Route path="report" element={<ReportPage />} />
            </Route>

            {/* Recruiter / Admin Routes */}
            <Route path="/admin" element={<AdminRouteLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="candidates" element={<AdminCandidates />} />
              <Route path="questions" element={<QuestionBankPage />} />
              <Route path="responses" element={<AdminResponsesPage />} />
              <Route path="analytics" element={<AdminReportsAnalytics />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
