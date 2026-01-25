import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Briefcase } from 'lucide-react';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' | 'break'

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            setIsActive(false);
            // Timer finished
            return;
          }
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const toggleTimer = () => {
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

  const progress = mode === 'work' 
    ? ((25 * 60 - (minutes * 60 + seconds)) / (25 * 60)) * 100 
    : ((5 * 60 - (minutes * 60 + seconds)) / (5 * 60)) * 100;

  return (
    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
          {mode === 'work' ? <Briefcase size={16} /> : <Coffee size={16} />}
          {mode === 'work' ? 'Focus Time' : 'Break Time'}
        </h3>
        <div className="flex gap-1">
          <button 
            onClick={() => switchMode('work')}
            className={`p-1.5 rounded transition-colors ${mode === 'work' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100' : 'text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800/50'}`}
            title="Work Mode"
          >
            <Briefcase size={14} />
          </button>
          <button 
            onClick={() => switchMode('break')}
            className={`p-1.5 rounded transition-colors ${mode === 'break' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100' : 'text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800/50'}`}
            title="Break Mode"
          >
            <Coffee size={14} />
          </button>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-bold text-gray-800 dark:text-gray-100">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        
        {/* Simple Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={toggleTimer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}
