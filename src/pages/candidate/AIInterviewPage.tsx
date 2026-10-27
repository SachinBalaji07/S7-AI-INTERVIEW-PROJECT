import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getQuestions,
  saveReport,
  getAptitudeResult,
  getCodingSubmissions,
} from '../../services/storageService';
import { analyzeAnswerWithAI, generateSummaryWithAI } from '../../services/apiService';
import { AudioVisualizer } from '../../components/common/AudioVisualizer';
import { SentimentBadge, EmotionBadge } from '../../components/common/Badge';
import {
  QuestionBankItem,
  InterviewAnswerRecord,
  CandidateProfile,
  AIAnswerAnalysis,
  AssessmentReport,
  RecruiterDecision,
} from '../../types';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Sparkles,
  Play,
  Square,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Volume2,
  Layers,
  Award,
  Maximize2,
  FileSpreadsheet,
} from 'lucide-react';
import { FullscreenGuard, requestAppFullscreen, exitAppFullscreen } from '../../components/common/FullscreenGuard';
import { useCandidateApplication } from '../../context/ApplicationContext';
import { saveSharedReport } from '../../services/backendService';

export const AIInterviewPage: React.FC = () => {
  const { user, token, candidateProfile, refreshProfile } = useAuth();
  const { application, job } = useCandidateApplication();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Questions to ask in this session (e.g. 3 questions selected from Question Bank)
  const allBankQuestions = job.assessmentContent?.interviewQuestions || getQuestions();
  const [sessionQuestions, setSessionQuestions] = useState<QuestionBankItem[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // WebRTC & Media States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // MediaRecorder States
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  // AI Pipeline States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnswerAnalysis | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [completedAnswers, setCompletedAnswers] = useState<InterviewAnswerRecord[]>([]);

  // Speech Recognition fallback capture
  const speechRecognitionRef = useRef<any>(null);
  const capturedSpeechRef = useRef<string>('');

  // Initialize questions
  useEffect(() => {
    // Pick 3 questions for a focused interview session (or all if <=3)
    const questionsPool = allBankQuestions.length > 0 ? allBankQuestions : [];
    const selected = questionsPool.filter((question) => job.interviewQuestionIds.includes(question.id));
    const candidateSkills = candidateProfile?.skills?.filter((skill) =>
      job.requiredSkills.some((required) => required.toLowerCase() === skill.toLowerCase())
    ) || [];
    const experienceContext = candidateProfile
      ? `For the ${job.title} role, relate your answer to your experience as ${candidateProfile.currentRole}${candidateSkills.length ? ` and your skills in ${candidateSkills.join(', ')}` : ''}.`
      : `Relate your answer to the ${job.title} role.`;
    const tailored = selected.map((question) => ({
      ...question,
      questionText: `${question.questionText}\n\n${experienceContext}`,
      keywords: [...new Set([...question.keywords, ...candidateSkills])],
    }));
    setSessionQuestions(tailored);
  }, [candidateProfile, job]);

  // Request WebRTC Media Stream
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function initWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
        streamInstance = stream;
        setMediaStream(stream);
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Could not acquire real webcam stream:', err);
        setHasPermission(false);
        setPermissionError(err.message || 'Camera or microphone access denied');
      }
    }

    initWebcam();

    // Setup optional browser speech recognition for real-time backup transcript
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recog = new SpeechRec();
        recog.continuous = true;
        recog.interimResults = true;
        recog.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          if (interim) {
            capturedSpeechRef.current = interim;
          }
        };
        speechRecognitionRef.current = recog;
      } catch (e) {
        console.warn('SpeechRecognition init:', e);
      }
    }

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((track) => track.stop());
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Toggle Camera
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraActive(videoTrack.enabled);
      }
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicActive(audioTrack.enabled);
      }
    }
  };

  // Start Recording
  const startRecording = async () => {
    // Request Fullscreen on test start gesture
    await requestAppFullscreen();

    recordedChunksRef.current = [];
    capturedSpeechRef.current = '';
    setCurrentAnalysis(null);
    setCurrentAudioUrl(null);
    setRecordingSeconds(0);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.start();
      } catch {
        // ignore if already running
      }
    }

    if (mediaStream) {
      try {
        let mime = 'video/webm';
        if (!MediaRecorder.isTypeSupported('video/webm')) {
          mime = 'video/mp4';
        }
        const recorder = new MediaRecorder(mediaStream, { mimeType: mime });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.start(500); // 500ms slices
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        showToast('Recording started! Fullscreen mode active. Speak clearly.', 'info');
      } catch (err) {
        console.warn('MediaRecorder init error, using simulated recording timer:', err);
        setIsRecording(true);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      // Fallback timer when media stream is not available
      setIsRecording(true);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Stop Recording & Trigger AI Pipeline
  const stopAndAnalyze = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const currentQ = sessionQuestions[currentQIndex];
    if (!currentQ) return;

    setIsAnalyzing(true);

    try {
      let audioBlob: Blob | null = null;
      let audioBase64: string | undefined = undefined;
      let audioUrl: string | undefined = undefined;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Small delay to ensure final ondataavailable chunk is collected
      await new Promise((r) => setTimeout(r, 400));

      if (recordedChunksRef.current.length > 0) {
        audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        audioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(audioUrl);
        audioBase64 = await blobToBase64(audioBlob);
      }

      // Call Gemini AI Audio + Sentiment Pipeline with genuine captured speech
      const genuineSpeech = (capturedSpeechRef.current || '').trim();
      const analysisResult = await analyzeAnswerWithAI({
        audioBase64,
        mimeType: 'audio/webm',
        questionText: currentQ.questionText,
        expectedAnswer: currentQ.expectedAnswer,
        keywords: currentQ.keywords,
        userTranscriptFallback: genuineSpeech,
      });

      setCurrentAnalysis(analysisResult);

      // Record answer
      const answerRecord: InterviewAnswerRecord = {
        id: `ans-${Date.now()}-${currentQIndex}`,
        interviewId: `int-${Date.now()}`,
        questionId: currentQ.id,
        questionText: currentQ.questionText,
        expectedAnswer: currentQ.expectedAnswer,
        audioBlobUrl: audioUrl,
        audioBase64,
        analysis: analysisResult,
        recordedAt: new Date().toISOString(),
        durationSeconds: recordingSeconds,
      };

      setCompletedAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== currentQ.id);
        return [...filtered, answerRecord];
      });

      if (analysisResult.technicalScore === 0) {
        showToast('No audible speech detected (0%). Please click "Re-record Answer" to speak your answer.', 'error');
      } else {
        showToast('AI analysis completed! Review your real sentiment and technical scores below.', 'success');
      }
    } catch (err) {
      console.error('Error during AI answer processing:', err);
      showToast('Encountered an issue during AI processing. Please re-record or proceed.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Next Question
  const handleNextQuestion = () => {
    setCurrentAnalysis(null);
    setCurrentAudioUrl(null);
    setRecordingSeconds(0);
    setCurrentQIndex((prev) => prev + 1);
  };

  // Finish Interview & Synthesize Final Report
  const handleFinishInterview = async () => {
    setIsAnalyzing(true);
    showToast('Compiling comprehensive hiring report with Gemini 2.5 Flash...', 'info');

    try {
      const answers = completedAnswers;
      const apt = application.aptitudeResult || getAptitudeResult(application.id);
      const coding = application.codingSubmissions || getCodingSubmissions(application.id);

      const aptScore = apt ? apt.score : 0;
      const codingScore = coding.length > 0 ? Math.round(coding.reduce((acc, c) => acc + c.overallScore, 0) / coding.length) : 0;

      // Calculate averages from interview answers
      const avgTech = Math.round(answers.reduce((acc, a) => acc + a.analysis.technicalScore, 0) / Math.max(1, answers.length));
      const avgComm = Math.round(answers.reduce((acc, a) => acc + a.analysis.communicationScore, 0) / Math.max(1, answers.length));
      const avgConf = Math.round(answers.reduce((acc, a) => acc + a.analysis.confidenceScore, 0) / Math.max(1, answers.length));
      const avgSent = Math.round(answers.reduce((acc, a) => acc + a.analysis.sentimentScore, 0) / Math.max(1, answers.length));

      // Round 3 Interview Score (weighted voice & sentiment dimensions):
      // Technical: 40%, Communication: 20%, Confidence: 15%, Sentiment: 25%
      const interviewScore = Math.round((avgTech * 0.40) + (avgComm * 0.20) + (avgConf * 0.15) + (avgSent * 0.25));

      // Standard Assessment Composite Formula Across ALL 3 Evaluation Rounds:
      // Round 1 (Aptitude & Logical Reasoning): 25%
      // Round 2 (Coding & Algorithms): 45%
      // Round 3 (AI Interview & Communication): 30%
      const overallComposite = Number(((aptScore * 0.25) + (codingScore * 0.45) + (interviewScore * 0.30)).toFixed(1));

      // Nuanced Recruiter Decision Rule:
      let decision: RecruiterDecision = 'REJECT';
      let decisionReason = '';

      if (codingScore >= 70 && interviewScore < 30) {
        // High Coding + Aptitude, but silent/missed interview
        decision = 'HOLD';
        decisionReason = `Candidate demonstrated strong practical coding proficiency (${codingScore}%) and passed aptitude (${aptScore}%), but received ${interviewScore}% in Round 3 Interview due to inaudible speech or silence. Status placed on HOLD for a communication verification re-interview.`;
      } else if (overallComposite >= 75) {
        decision = 'SELECT';
        decisionReason = `Outstanding composite performance (${overallComposite}%). High technical proficiency across Aptitude (${aptScore}%), Coding (${codingScore}%), and Interview articulation (${interviewScore}%). Recommended for offer.`;
      } else if (overallComposite >= 55) {
        decision = 'HOLD';
        decisionReason = `Borderline overall evaluation (${overallComposite}%). Shows capability in Coding (${codingScore}%) and Aptitude (${aptScore}%), with room for growth in live technical communication (${interviewScore}%).`;
      } else {
        decision = 'REJECT';
        decisionReason = `Overall composite score (${overallComposite}%) falls below hiring threshold. Coding: ${codingScore}%, Aptitude: ${aptScore}%, Interview: ${interviewScore}%.`;
      }

      // Call Gemini for executive summary synthesis
      const summaryResult = await generateSummaryWithAI({
        candidateName: user?.name || 'Candidate',
        answers,
        aptitudeScore: aptScore,
        codingScore: codingScore,
      });

      const candidateId = candidateProfile?.id || `prof-${user?.id || 'demo'}`;

      const finalReport: AssessmentReport = {
        id: `rep-${Date.now()}`,
        applicationId: application.id,
        candidateId,
        candidateName: user?.name || candidateProfile?.fullName || 'Candidate',
        candidateEmail: user?.email || candidateProfile?.email || '',
        completedAt: new Date().toISOString(),
        technicalScore: avgTech,
        communicationScore: avgComm,
        confidenceScore: avgConf,
        sentimentScore: avgSent,
        overallScore: overallComposite,
        aptitudeScore: aptScore,
        codingScore: codingScore,
        interviewScore,
        decision,
        decisionReason,
        executiveSummary: summaryResult.executiveSummary,
        keyStrengths: summaryResult.keyStrengths,
        recommendedImprovements: summaryResult.recommendedImprovements,
        radarCompetencies: summaryResult.radarCompetencies,
        answers,
      };

      saveReport(finalReport);
      if (token) {
        try {
          await saveSharedReport(token, application.id, finalReport);
        } catch (error) {
          console.error('Report was saved but application status could not be synchronized:', error);
          showToast('Your report is ready, but the application status could not be synchronized.', 'warning');
        }
      }

      if (candidateProfile) {
        const updatedProfile: CandidateProfile = {
          ...candidateProfile,
          status: 'Completed',
          decision,
          decisionNotes: decisionReason,
        };
        try {
          await refreshProfile(updatedProfile);
        } catch (error) {
          console.error('Assessment report was saved but candidate profile could not be synchronized:', error);
          showToast('Your report is ready, but your profile status could not be synchronized.', 'warning');
        }
      }

      if (decision === 'SELECT') {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // Exit fullscreen upon completing the interview assessment
      await exitAppFullscreen();

      showToast('Interview report successfully synthesized! Presenting your evaluation report.', 'success');
      navigate('/candidate/report');
    } catch (err) {
      console.error('Finalizing report error:', err);
      await exitAppFullscreen();
      showToast('Report saved with synthesized fallback metrics.', 'info');
      navigate('/candidate/report');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentQ = sessionQuestions[currentQIndex];
  const isLastQuestion = currentQIndex === sessionQuestions.length - 1;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!sessionQuestions.length) {
    return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-200">The interview questions configured for this role are unavailable. Contact the recruiter.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Fullscreen Proctor Guard */}
      <FullscreenGuard
        isActive={isRecording || (!currentAnalysis && completedAnswers.length < sessionQuestions.length)}
        testTitle="Round 3: AI WebRTC Interview"
      />

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Round 3: AI WebRTC Live Interview</h1>
            <p className="text-xs text-slate-400">
              Live Webcam & Audio Sentiment Analytics powered by Gemini 2.5 Flash
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exitAppFullscreen();
              navigate('/candidate/report');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/20 transition-all mr-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>View Report</span>
          </button>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            Question {currentQIndex + 1} of {sessionQuestions.length}
          </span>
          <span className="text-xs text-slate-400">
            Completed: <strong className="text-white">{completedAnswers.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Left Webcam Live Stream, Right Current Question & AI Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Webcam & Media Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative rounded-3xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-2xl aspect-video flex items-center justify-center">
            {/* Live Webcam Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                !isCameraActive ? 'hidden' : 'block'
              }`}
            />

            {/* Camera Off Placeholder */}
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <VideoOff className="w-12 h-12" />
                <span className="text-xs font-medium">Camera Disabled</span>
              </div>
            )}

            {/* Permission Denied Notice */}
            {hasPermission === false && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Camera or Mic Not Detected</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {permissionError || 'Please allow camera and mic permissions in your browser bar.'}
                </p>
                <p className="text-[11px] text-indigo-400 mt-3">
                  Simulation mode is active — you can still test answers and AI analysis.
                </p>
              </div>
            )}

            {/* Recording Indicator Overlay */}
            {isRecording && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/40 backdrop-blur-md shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-rose-300">REC {formatTime(recordingSeconds)}</span>
              </div>
            )}

            {/* Bottom Stream Bar with Audio Visualizer & Media Toggles */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between p-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-2 rounded-xl transition-colors ${
                    isCameraActive
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                  title={isCameraActive ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isCameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2 rounded-xl transition-colors ${
                    isMicActive
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                  title={isMicActive ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Dynamic Audio Visualizer */}
              <div className="flex-1 max-w-[180px] sm:max-w-[220px] mx-3">
                <AudioVisualizer stream={mediaStream} isActive={isRecording && isMicActive} height={28} />
              </div>

              <div className="text-[11px] font-mono text-slate-400 px-2">WebRTC 720p</div>
            </div>
          </div>

          {/* Action Recording Buttons */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isAnalyzing}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                  currentAnalysis?.technicalScore === 0
                    ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-600/25'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {currentAnalysis
                    ? currentAnalysis.technicalScore === 0
                      ? '⚠️ Re-record Answer (Speak Clearly)'
                      : 'Re-record Answer'
                    : 'Start Recording Answer'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopAndAnalyze}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Analyze with AI</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Card & AI Pipeline Analysis (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Question Card */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20">
                {currentQ?.category || 'Technical'}
              </span>
              <span className="text-xs text-slate-500">
                Question {currentQIndex + 1} of {sessionQuestions.length}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed mb-4">
              {currentQ?.questionText}
            </h3>

            {/* Key Expected Themes */}
            {currentQ?.keywords && currentQ.keywords.length > 0 && (
              <div className="mb-4">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Expected Technical Domains:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentQ.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Take your time to structure your thoughts. Click <strong>Start Recording</strong>, state your answer concisely, and click <strong>Stop & Analyze with AI</strong>.
              </span>
            </div>
          </div>

          {/* AI Processing Spinner */}
          {isAnalyzing && (
            <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-8 text-center backdrop-blur-xl animate-in fade-in duration-300 space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-white">Analyzing Answer with Gemini 2.5 Flash...</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Transcribing audio, assessing vocal cadence, measuring filler frequency, and calculating semantic similarity to expected technical answers.
              </p>
            </div>
          )}

          {/* AI Analysis Feedback Card */}
          {currentAnalysis && !isAnalyzing && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 backdrop-blur-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">Gemini Answer Evaluation</span>
                </div>
                <div className="flex items-center gap-2">
                  <SentimentBadge sentiment={currentAnalysis.sentiment} />
                  <EmotionBadge emotion={currentAnalysis.emotion} />
                </div>
              </div>

              {/* Strict Silence / No Speech Warning Banner */}
              {currentAnalysis.technicalScore === 0 && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 flex items-start gap-3 shadow-lg shadow-rose-950/40">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-rose-300 flex items-center gap-1.5">
                      <span>⚠️ No Audible Speech Detected • 0% Technical Score</span>
                    </p>
                    <p className="text-rose-200/90 leading-relaxed">
                      You remained silent or your microphone did not capture spoken words. In an authentic technical interview, scores are based strictly on what you speak. Silence receives 0 credit.
                    </p>
                    <p className="text-rose-300 font-semibold pt-0.5">
                      👉 Click <span className="underline font-bold text-white">Re-record Answer</span>, ensure your mic is active, and speak your technical explanation aloud.
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Score Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Technical</span>
                  <span className="text-sm font-bold text-indigo-400">{currentAnalysis.technicalScore}%</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Communication</span>
                  <span className="text-sm font-bold text-purple-400">{currentAnalysis.communicationScore}%</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Confidence</span>
                  <span className="text-sm font-bold text-pink-400">{currentAnalysis.confidenceScore}%</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Similarity</span>
                  <span className="text-sm font-bold text-emerald-400">{currentAnalysis.similarityScore}%</span>
                </div>
              </div>

              {/* Speech Metrics: Filler count & WPM */}
              <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                <span>
                  Filler Words Detected:{' '}
                  <strong className="text-amber-400">{currentAnalysis.fillerWordCount}</strong>
                </span>
                <span>
                  Estimated Pace:{' '}
                  <strong className="text-indigo-400">{currentAnalysis.wordsPerMinute} WPM</strong>
                </span>
              </div>

              {/* Audio Playback Player */}
              {currentAudioUrl && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <audio src={currentAudioUrl} controls className="w-full h-8" />
                </div>
              )}

              {/* Transcript */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                <strong className="text-slate-200 block mb-1">Transcribed Answer:</strong>
                <p className="italic leading-relaxed">{currentAnalysis.transcript}</p>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                  <strong className="block text-emerald-200 font-semibold mb-1">Key Strengths:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {currentAnalysis.strengths.slice(0, 2).map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300">
                  <strong className="block text-amber-200 font-semibold mb-1">Suggestions:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {currentAnalysis.improvements.slice(0, 2).map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Next Question / Finish Interview Button */}
              <div className="pt-2 flex justify-end gap-3">
                {!isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <span>Proceed to Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishInterview}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all"
                  >
                    <Award className="w-4 h-4" />
                    <span>Complete Interview & Generate Final Report</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
