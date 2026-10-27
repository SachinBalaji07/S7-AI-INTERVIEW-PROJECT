import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, CandidateProfile, CandidateRegistrationDetails } from '../types';
import {
  getUsers,
  getProfileByUserId,
  saveUser,
  hashPassword,
  saveProfile,
  initializeStorage,
} from '../services/storageService';
import {
  loginAccount,
  migrateLegacyAccount,
  registerAccount,
  restoreAccount,
  updateCandidateProfile,
} from '../services/backendService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  candidateProfile: CandidateProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; role?: UserRole }>;
  loginAsDemo: (role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole, candidateDetails?: CandidateRegistrationDetails) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: (profile?: CandidateProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize storage seeds and restore session
  useEffect(() => {
    async function init() {
      try {
        await initializeStorage();
        const storedToken = localStorage.getItem('interviewai_jwt_token');
        if (storedToken) {
          const restored = await restoreAccount(storedToken);
          setUser(restored.user);
          setToken(storedToken);
          setCandidateProfile(restored.profile);
          saveUser(restored.user);
          if (restored.profile) saveProfile(restored.profile);
        }
      } catch (error) {
        console.error('Unable to restore the InterviewAI session:', error);
        localStorage.removeItem('interviewai_jwt_token');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const refreshProfile = async (profile = candidateProfile) => {
    if (!user || user.role !== 'candidate' || !token || !profile) return;
    const savedProfile = await updateCandidateProfile(token, profile);
    saveProfile(savedProfile);
    setCandidateProfile(savedProfile);
    setUser((current) => {
      if (!current) return null;
      const updatedUser = { ...current, name: savedProfile.fullName };
      saveUser(updatedUser);
      return updatedUser;
    });
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; role?: UserRole }> => {
    try {
      let result: Awaited<ReturnType<typeof loginAccount>>;
      try {
        result = await loginAccount(email, password);
      } catch (loginError) {
        const normalizedEmail = email.trim().toLowerCase();
        const legacyUser = getUsers().find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
        const localHash = legacyUser ? await hashPassword(password) : '';
        if (!legacyUser || !legacyUser.passwordHash || legacyUser.passwordHash !== localHash) throw loginError;
        result = await migrateLegacyAccount(legacyUser, password, getProfileByUserId(legacyUser.id));
      }
      localStorage.setItem('interviewai_jwt_token', result.token);
      saveUser(result.user);
      if (result.profile) saveProfile(result.profile);
      setUser(result.user);
      setToken(result.token);
      setCandidateProfile(result.profile);
      return { success: true, role: result.user.role };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to sign in.' };
    }
  };

  const loginAsDemo = async (role: UserRole) => {
    const email = role === 'recruiter' ? 'recruiter@interviewai.com' : 'alex.johnson@example.com';
    await login(email, 'password123');
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    candidateDetails?: CandidateRegistrationDetails
  ): Promise<{ success: boolean; message?: string }> => {
    if (
      role === 'candidate' &&
      (!candidateDetails ||
        !candidateDetails.phone.trim() ||
        !candidateDetails.location.trim() ||
        !candidateDetails.dob ||
        !candidateDetails.education.trim() ||
        !candidateDetails.graduationYear.trim() ||
        !candidateDetails.currentRole.trim() ||
        !candidateDetails.skills.length ||
        !Number.isFinite(candidateDetails.experienceYears) ||
        candidateDetails.experienceYears < 0 ||
        candidateDetails.experienceYears > 40)
    ) {
      return { success: false, message: 'Please provide all candidate profile details with valid experience' };
    }

    try {
      const result = await registerAccount(name, email, password, role, candidateDetails);
      localStorage.setItem('interviewai_jwt_token', result.token);
      saveUser(result.user);
      if (result.profile) saveProfile(result.profile);
      setUser(result.user);
      setToken(result.token);
      setCandidateProfile(result.profile);
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Registration failed.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('interviewai_jwt_token');
    setUser(null);
    setToken(null);
    setCandidateProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        candidateProfile,
        isLoading,
        login,
        loginAsDemo,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
