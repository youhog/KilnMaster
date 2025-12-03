import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Flame, History, LogOut, RefreshCcw, Moon, Sun } from 'lucide-react';
import ScheduleEditor from './components/ScheduleEditor';
import ActiveFiring from './components/ActiveFiring';
import HistoryLogView from './components/HistoryLog';
import Login from './components/Login';
import { FiringSchedule, FiringLog, CalibrationResult, calculateTheoreticalDuration } from './types';
import { loginToSheet, fetchSheetData, saveLogToSheet, saveCalibrationToSheet } from './services/sheetService';
import { calculateLocalCalibration } from './services/geminiService';

function App() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scriptUrl, setScriptUrl] = useState('');
  const [username, setUsername] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- App State ---
  const [activeTab, setActiveTab] = useState<'plan' | 'monitor' | 'history'>('plan');
  
  const [logs, setLogs] = useState<FiringLog[]>([]);
  const [calibration, setCalibration] = useState<CalibrationResult>({ factor: 1.0, advice: '' });

  // Active Firing State
  const [activeSchedule, setActiveSchedule] = useState<FiringSchedule | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // --- Auth & Data Loading ---
  const handleLogin = async (url: string, user: string, pass: string) => {
    const success = await loginToSheet(url, user, pass);
    if (success) {
      setScriptUrl(url);
      setUsername(user);
      setIsAuthenticated(true);
      loadCloudData(url);
    }
    return success;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setScriptUrl('');
    setUsername('');
    setLogs([]);
    setCalibration({ factor: 1.0, advice: '' });
  };

  const loadCloudData = async (url: string) => {
    setIsLoadingData(true);
    const data = await fetchSheetData(url);
    if (data) {
      setLogs(data.logs);
      
      const localAnalysis = calculateLocalCalibration(data.logs);
      
      // Use DB factor if available, otherwise local calc
      const finalFactor = data.calibration.factor || localAnalysis.factor;
      
      setCalibration({
        factor: finalFactor,
        advice: localAnalysis.advice // Recalculate advice text for display
      });
    }
    setIsLoadingData(false);
  };

  // --- Handlers ---
  const handleStartFiring = (schedule: FiringSchedule) => {
    setActiveSchedule(schedule);
    setStartTime(Date.now());
    setActiveTab('monitor');
  };

  const handleFinishFiring = async (result: Pick<FiringLog, 'actualDuration' | 'outcome' | 'notes'>) => {
    if (!activeSchedule) return;

    // Calculate theoretical duration (pure physics, no calibration) for accurate future analysis
    const theoreticalMinutes = calculateTheoreticalDuration(activeSchedule.segments);

    const newLog: FiringLog = {
      id: crypto.randomUUID(),
      scheduleName: activeSchedule.name,
      date: new Date().toISOString(),
      predictedDuration: activeSchedule.estimatedDurationMinutes,
      actualDuration: result.actualDuration,
      clayWeight: activeSchedule.clayWeight,
      notes: result.notes,
      outcome: result.outcome
    };

    // Optimistic Update
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    
    // Save to Cloud
    await saveLogToSheet(scriptUrl, newLog);

    setActiveSchedule(null);
    setStartTime(null);
    setActiveTab('history');
  };

  const handleCancelFiring = () => {
    setActiveSchedule(null);
    setStartTime(null);
    setActiveTab('plan');
  };

  const handleUpdateCalibration = async (result: CalibrationResult) => {
    setCalibration(result);
    await saveCalibrationToSheet(scriptUrl, result);
  };

  // --- Render ---
  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
         <Login 
           onLogin={handleLogin} 
           isDarkMode={isDarkMode}
           onToggleDarkMode={toggleDarkMode}
         />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-stone-900 dark:bg-black text-white pt-6 pb-16 px-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Flame className="w-64 h-64" />
        </div>
        <div className="max-w-5xl mx-auto flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-clay-100">KilnMaster AI</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-stone-400 text-sm">智慧陶藝電窯助手</span>
              <span className="bg-stone-800 dark:bg-stone-900 px-2 py-0.5 rounded text-xs text-stone-300 border border-stone-700">
                User: {username}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-xs text-stone-500 uppercase tracking-widest">目前校正參數</div>
              <div className="text-xl font-mono text-clay-400 font-bold">
                {isLoadingData ? '...' : `${calibration.factor.toFixed(3)}x`}
              </div>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-stone-400 hover:text-yellow-400 dark:hover:text-blue-300 transition-colors"
              title={isDarkMode ? "切換亮色模式" : "切換深色模式"}
            >
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => loadCloudData(scriptUrl)} 
              className="p-2 text-stone-400 hover:text-white transition-colors"
              title="重新整理數據"
            >
              <RefreshCcw className={`w-5 h-5 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={handleLogout} 
              className="p-2 text-stone-400 hover:text-red-400 transition-colors"
              title="登出"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 -mt-10 relative z-20 pb-12">
        {/* Navigation Tabs */}
        <nav className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-1.5 flex gap-1 mb-6 transition-colors">
          <button 
            onClick={() => setActiveTab('plan')}
            disabled={!!activeSchedule}
            title={!!activeSchedule ? "燒製進行中，請先結束或中止當前燒製" : ""}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'plan' 
                ? 'bg-stone-800 dark:bg-stone-700 text-white shadow-md' 
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> 排程與燒製
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            disabled={!activeSchedule}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'monitor' 
                ? 'bg-clay-600 text-white shadow-md' 
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <Flame className="w-4 h-4" /> 監控進度
            {activeSchedule && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'history' 
                ? 'bg-stone-800 dark:bg-stone-700 text-white shadow-md' 
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <History className="w-4 h-4" /> 歷史與校正
          </button>
        </nav>

        {/* Tab Content */}
        <div className="transition-opacity duration-300">
          {isLoadingData ? (
             <div className="flex justify-center items-center py-20 text-stone-400 gap-2">
                <RefreshCcw className="animate-spin w-6 h-6" /> 正在同步雲端資料...
             </div>
          ) : (
            <>
              {/* Plan Tab */}
              <div className={activeTab === 'plan' ? 'block' : 'hidden'}>
                <ScheduleEditor 
                  onStartFiring={handleStartFiring} 
                  calibrationFactor={calibration.factor}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* Monitor Tab - Persist component if running */}
              {activeSchedule && startTime && (
                <div className={activeTab === 'monitor' ? 'block' : 'hidden'}>
                  <ActiveFiring 
                    schedule={activeSchedule} 
                    startTime={startTime} 
                    onFinish={handleFinishFiring}
                    onCancel={handleCancelFiring}
                    isDarkMode={isDarkMode}
                  />
                </div>
              )}
              
              {/* Fallback msg if no active firing but tab selected (edge case) */}
              {activeTab === 'monitor' && (!activeSchedule || !startTime) && (
                 <div className="text-center py-20 text-stone-500 dark:text-stone-400 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl">無進行中的燒製</div>
              )}

              {/* History Tab */}
              <div className={activeTab === 'history' ? 'block' : 'hidden'}>
                <HistoryLogView 
                  logs={logs} 
                  calibration={calibration} 
                  onUpdateCalibration={handleUpdateCalibration} 
                  isDarkMode={isDarkMode}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-stone-400 dark:text-stone-600 text-xs transition-colors">
        &copy; {new Date().getFullYear()} KilnMaster AI. 資料同步至 Google Sheets.
      </footer>
    </div>
  );
}

export default App;