import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { JobApplication, JobOpening } from '../types';
import { fetchApplication } from '../services/backendService';
import { useAuth } from './AuthContext';

interface ApplicationContextValue {
  application: JobApplication;
  job: JobOpening;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);
export const ACTIVE_APPLICATION_KEY = 'interviewai_active_application';

export const CandidateApplicationGate: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState<ApplicationContextValue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const applicationId = localStorage.getItem(ACTIVE_APPLICATION_KEY);
    if (!token || !applicationId) {
      setLoading(false);
      return () => { active = false; };
    }

    fetchApplication(token, applicationId).then((result) => {
      if (active) setValue(result);
    }).catch((error) => {
      console.error('Unable to load the active job application:', error);
      localStorage.removeItem(ACTIVE_APPLICATION_KEY);
      if (active) navigate('/candidate/jobs', { replace: true });
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [token, navigate]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading your role-specific assessment…</div>;
  }
  if (!value) return <Navigate to="/candidate/jobs" replace />;
  return (
    <ApplicationContext.Provider value={value}>
      <Outlet />
    </ApplicationContext.Provider>
  );
};

export function useCandidateApplication(): ApplicationContextValue {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('useCandidateApplication must be used within CandidateApplicationGate');
  return value;
}
