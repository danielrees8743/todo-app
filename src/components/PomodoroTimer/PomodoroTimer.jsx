import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Briefcase,
  Volume2,
  VolumeX,
} from 'lucide-react';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Use ref to manage AudioContext to comply with browser policies
  const audioContextRef = useRef(null);

  const playSound = (type) => {
    if (!soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;

      // Resume if suspended (common browser policy requirement)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'warning') {
        // Two short beeps for 30s warning
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);

        // Second beep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

        gain2.gain.setValueAtTime(0, ctx.currentTime + 0.2);
        gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.2);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        osc2.start(ctx.currentTime + 0.2);
        osc2.stop(ctx.currentTime + 0.3);
      } else if (type === 'complete') {
        // Musical chime for completion
        const now = ctx.currentTime;

        // E5
        oscillator.frequency.setValueAtTime(659.25, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);

        // G#5
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(830.61, now + 0.2);
        gain2.gain.setValueAtTime(0.1, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.7);

        // B5
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.setValueAtTime(987.77, now + 0.4);
        gain3.gain.setValueAtTime(0.1, now + 0.4);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc3.start(now + 0.4);
        osc3.stop(now + 1.5);
      }
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            playSound('complete');
            setIsActive(false);
            return;
          }
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Warning sound check
          if (minutes === 0 && seconds === 31) {
            playSound('warning');
          }
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const toggleTimer = () => {
    // Initialize audio context on user interaction
    if (isActive === false && !audioContextRef.current) {
      try {
        audioContextRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      } catch (e) {
        console.error('Web Audio API not supported');
      }
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state === 'suspended'
    ) {
      audioContextRef.current.resume();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'work') {
      setMinutes(25);
    } else {
      setMinutes(5);
    }
    setSeconds(0);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    setSeconds(0);
    if (newMode === 'work') {
      setMinutes(25);
    } else {
      setMinutes(5);
    }
  };

  const progress =
    mode === 'work'
      ? ((25 * 60 - (minutes * 60 + seconds)) / (25 * 60)) * 100
      : ((5 * 60 - (minutes * 60 + seconds)) / (5 * 60)) * 100;

  return (
    <div className='mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30'>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-sm font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2'>
          {mode === 'work' ? <Briefcase size={16} /> : <Coffee size={16} />}
          {mode === 'work' ? 'Focus Time' : 'Break Time'}
        </h3>
        <div className='flex gap-1 items-center'>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded transition-colors mr-1 ${soundEnabled ? 'text-orange-600 dark:text-orange-300' : 'text-gray-400 dark:text-gray-500'}`}
            title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <div className='w-px h-4 bg-orange-200 dark:bg-orange-800 mx-1'></div>
          <button
            onClick={() => switchMode('work')}
            className={`p-1.5 rounded transition-colors ${mode === 'work' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100' : 'text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800/50'}`}
            title='Work Mode'
          >
            <Briefcase size={14} />
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`p-1.5 rounded transition-colors ${mode === 'break' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100' : 'text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800/50'}`}
            title='Break Mode'
          >
            <Coffee size={14} />
          </button>
        </div>
      </div>

      <div className='text-center mb-4'>
        <div
          className={`text-3xl font-mono font-bold transition-colors ${
            minutes === 0 && seconds <= 30 && isActive
              ? 'text-red-600 dark:text-red-400 animate-pulse'
              : 'text-gray-800 dark:text-gray-100'
          }`}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* Simple Progress Bar */}
        <div className='w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden'>
          <div
            className={`h-full transition-all duration-1000 ${
              minutes === 0 && seconds <= 30 ? 'bg-red-500' : 'bg-orange-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className='flex justify-center gap-3'>
        <button
          onClick={toggleTimer}
          className='flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors'
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className='flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors'
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}
