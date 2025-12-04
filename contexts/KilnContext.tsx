import React, { createContext, useContext, useState, useEffect } from 'react';
import { FiringLog, CalibrationResult, FiringSchedule } from '../types';
import { fetchSheetData, saveLogToSheet, saveCalibrationToSheet } from '../services/sheetService';
import { calculateLocalCalibration } from '../services/calibrationService';
import { useAuth } from './AuthContext';

interface KilnContextType {
  logs: FiringLog[];
  calibration: CalibrationResult;
  isLoadingData: boolean;
  refreshData: () => Promise<void>;
  updateCalibration: (result: CalibrationResult) => Promise<void>;
  addLog: (log: FiringLog) => Promise<void>;
  
  // Active Firing State
  activeSchedule: FiringSchedule | null;
  startTime: number | null;
  startFiring: (schedule: FiringSchedule) => void;
  cancelFiring: () => void;
  finishFiring: () => void;
}

const KilnContext = createContext<KilnContextType | undefined>(undefined);

export const KilnProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { scriptUrl, isAuthenticated } = useAuth();
  
  const [logs, setLogs] = useState<FiringLog[]>([]);
  const [calibration, setCalibration] = useState<CalibrationResult>({ factor: 1.0, advice: '' });
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Active Firing Persisted State
  // 即使切換頁面 (Route)，這些狀態也會保留在 Context 中
  const [activeSchedule, setActiveSchedule] = useState<FiringSchedule | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const refreshData = async () => {
    if (!scriptUrl || !isAuthenticated) return;
    setIsLoadingData(true);
    const data = await fetchSheetData(scriptUrl);
    if (data) {
      setLogs(data.logs);
      // 優先使用雲端參數，若無則本地計算
      const localAnalysis = calculateLocalCalibration(data.logs);
      const finalFactor = data.calibration.factor || localAnalysis.factor;
      setCalibration({
        factor: finalFactor,
        advice: localAnalysis.advice 
      });
    }
    setIsLoadingData(false);
  };

  // 當登入成功後自動撈取資料
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, scriptUrl]);

  const updateCalibration = async (result: CalibrationResult) => {
    setCalibration(result);
    if (scriptUrl) await saveCalibrationToSheet(scriptUrl, result);
  };

  const addLog = async (newLog: FiringLog) => {
    // Optimistic update
    setLogs(prev => [...prev, newLog]);
    if (scriptUrl) await saveLogToSheet(scriptUrl, newLog);
  };

  const startFiring = (schedule: FiringSchedule) => {
    setActiveSchedule(schedule);
    setStartTime(Date.now());
  };

  const cancelFiring = () => {
    setActiveSchedule(null);
    setStartTime(null);
  };

  const finishFiring = () => {
    setActiveSchedule(null);
    setStartTime(null);
  };

  return (
    <KilnContext.Provider value={{
      logs, calibration, isLoadingData, refreshData, updateCalibration, addLog,
      activeSchedule, startTime, startFiring, cancelFiring, finishFiring
    }}>
      {children}
    </KilnContext.Provider>
  );
};

export const useKiln = () => {
  const context = useContext(KilnContext);
  if (!context) throw new Error('useKiln must be used within a KilnProvider');
  return context;
};