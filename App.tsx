import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import ScheduleEditor from './components/ScheduleEditor';
import ActiveFiring from './components/ActiveFiring';
import HistoryLogView from './components/HistoryLog';
import Settings from './components/Settings'; // 確保這裡引用正確
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { KilnProvider, useKiln } from './contexts/KilnContext';
import { FiringLog, calculateTheoreticalDuration } from './types';

// 保護路由元件
const ProtectedRoute: React.FC<{ children: React.ReactNode, isDarkMode: boolean, toggleDarkMode: () => void }> = ({ children, isDarkMode, toggleDarkMode }) => {
  const { isAuthenticated, isLoading, login } = useAuth();
  
  // 1. 如果正在從 localStorage 讀取登入資訊，顯示 Loading (避免閃爍)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-600"></div>
      </div>
    );
  }

  // 2. 如果讀取完畢確認未登入，才導向 Login
  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={login} 
        isDarkMode={isDarkMode} 
        onToggleDarkMode={toggleDarkMode} 
      />
    );
  }
  
  return <>{children}</>;
};

// 監控頁面 Wrapper
const MonitorPage = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const { activeSchedule, startTime, cancelFiring, finishFiring, addLog } = useKiln();
  const navigate = useNavigate();

  const handleFinish = async (result: Pick<FiringLog, 'actualDuration' | 'outcome' | 'notes'>) => {
    if (!activeSchedule) return;

    const newLog: FiringLog = {
      id: crypto.randomUUID(),
      scheduleName: activeSchedule.name,
      date: new Date().toISOString(),
      predictedDuration: activeSchedule.estimatedDurationMinutes,
      actualDuration: result.actualDuration,
      clayWeight: activeSchedule.clayWeight,
      notes: result.notes,
      outcome: result.outcome,
      theoreticalDuration: calculateTheoreticalDuration(activeSchedule.segments)
    };

    await addLog(newLog);
    finishFiring();
    navigate('/history');
  };

  if (!activeSchedule || !startTime) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl m-4">
        <p className="text-stone-500 dark:text-stone-400 mb-4">目前沒有進行中的燒製排程。</p>
        <button 
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-clay-600 text-white rounded-lg hover:bg-clay-700 transition-colors"
        >
          前往建立排程
        </button>
      </div>
    );
  }

  return (
    <ActiveFiring 
      schedule={activeSchedule} 
      startTime={startTime} 
      onFinish={handleFinish}
      onCancel={() => { cancelFiring(); navigate('/'); }}
      isDarkMode={isDarkMode}
    />
  );
};

const PlanPage = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const { startFiring, calibration } = useKiln();
  const navigate = useNavigate();
  return (
    <ScheduleEditor 
      onStartFiring={(schedule) => { startFiring(schedule); navigate('/monitor'); }} 
      calibrationFactor={calibration.factor}
      isDarkMode={isDarkMode}
    />
  );
};

const HistoryPage = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const { logs, calibration, updateCalibration } = useKiln();
  return (
    <HistoryLogView 
      logs={logs} 
      calibration={calibration} 
      onUpdateCalibration={updateCalibration} 
      isDarkMode={isDarkMode} 
    />
  );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

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

  return (
    <BrowserRouter>
      <AuthProvider>
        <KilnProvider>
          <Routes>
            <Route path="/" element={
                <ProtectedRoute isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>
                  <Layout isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                </ProtectedRoute>
              }
            >
              <Route index element={<PlanPage isDarkMode={isDarkMode} />} />
              <Route path="monitor" element={<MonitorPage isDarkMode={isDarkMode} />} />
              <Route path="history" element={<HistoryPage isDarkMode={isDarkMode} />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </KilnProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;