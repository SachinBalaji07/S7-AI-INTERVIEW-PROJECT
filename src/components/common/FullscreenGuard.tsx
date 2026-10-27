import React, { useState, useEffect } from 'react';
import { Maximize2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface FullscreenGuardProps {
  isActive: boolean;
  onExitFullscreen?: () => void;
  testTitle?: string;
}

export const requestAppFullscreen = async (): Promise<boolean> => {
  try {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      return true;
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
      return true;
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
      return true;
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request blocked or not permitted in current frame:', err);
  }
  return false;
};

export const exitAppFullscreen = async (): Promise<void> => {
  try {
    if (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement
    ) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      }
    }
  } catch (err) {
    console.warn('Exit fullscreen error:', err);
  }
};

export const FullscreenGuard: React.FC<FullscreenGuardProps> = ({
  isActive,
  testTitle = 'Assessment',
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement
    );
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const current = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // If test is not active, don't show warning
  if (!isActive) return null;

  // If in fullscreen, show subtle proctored indicator badge at top
  if (isFullscreen) {
    return (
      <div className="fixed top-2 right-4 z-50 pointer-events-none print:hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-[11px] uppercase tracking-wider">Proctored Fullscreen Active</span>
        </div>
      </div>
    );
  }

  // If test is active and NOT in fullscreen: show non-intrusive yet prominent modal to re-enter fullscreen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
      <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-8 text-center shadow-2xl shadow-black/80 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">
          Fullscreen Required for {testTitle}
        </h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          To maintain assessment integrity and prevent tab navigation during testing, this assessment must remain in Full Screen mode until submitted.
        </p>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={async () => {
              await requestAppFullscreen();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Return to Full Screen</span>
          </button>
          <span className="text-[11px] text-slate-500">
            Your progress and timer continue safely in the background.
          </span>
        </div>
      </div>
    </div>
  );
};
