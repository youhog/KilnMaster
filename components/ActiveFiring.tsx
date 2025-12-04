import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FiringSchedule, calculateSchedulePoints, FiringLog } from '../types';
import { XCircle, CheckCircle, Thermometer, Zap, ZapOff, Cloud, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { sendDiscordMessage, startCloudMonitor, stopCloudMonitor } from '../services/sheetService';

interface Props {
  schedule: FiringSchedule;
  startTime: number;
  onFinish: (result: Pick<FiringLog, 'actualDuration' | 'outcome' | 'notes'>) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

const ActiveFiring: React.FC<Props> = ({ schedule, startTime, onFinish, onCancel, isDarkMode = false }) => {
  const [elapsed, setElapsed] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<FiringLog['outcome']>('perfect');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // [新增] 狀態：防止按鈕重複提交
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scriptUrl = localStorage.getItem('kiln_script_url') || '';
  const hasStartedMonitor = useRef(false);

  // 1. 啟動雲端監控 (Mount 時執行一次)
  useEffect(() => {
    if (scriptUrl && !hasStartedMonitor.current) {
      startCloudMonitor(scriptUrl, schedule, startTime);
      hasStartedMonitor.current = true;
    }
  }, [scriptUrl, schedule, startTime]);

  // 2. 本地計時 (僅更新 UI)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(now - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
        }
      } catch (err) { console.error(err); }
    };
    requestWakeLock();
    return () => { if (wakeLockRef.current) wakeLockRef.current.release(); };
  }, []);

  const getCurrentTemp = (elapsedMs: number) => {
    const elapsedMinutes = elapsedMs / 60000;
    let currentT = 25;
    let timeAccumulator = 0;
    for (const seg of schedule.segments) {
      const segDuration = seg.type === 'hold' ? seg.holdTime! : (Math.abs(seg.targetTemp - currentT) / seg.rate!) * 60;
      if (timeAccumulator + segDuration > elapsedMinutes) {
        const timeInSeg = elapsedMinutes - timeAccumulator;
        if (seg.type === 'hold') return seg.targetTemp;
        const fraction = timeInSeg / segDuration;
        return Math.round(currentT + ((seg.targetTemp - currentT) * fraction));
      }
      if (seg.type === 'ramp') currentT = seg.targetTemp;
      timeAccumulator += segDuration;
    }
    return currentT;
  };

  const handleComplete = async () => {
    if (isSubmitting) return; // 防止重複
    setIsSubmitting(true);

    try {
        const msg = `✅ **燒製完成**：${schedule.name}\n使用者已在網頁紀錄結果：${outcome}`;
        if (scriptUrl) {
          await sendDiscordMessage(scriptUrl, msg);
          await stopCloudMonitor(scriptUrl, schedule.id);
        }
        onFinish({
            actualDuration: Math.round(elapsed / 60000),
            outcome,
            notes
        });
    } catch (e) {
        console.error("Finish failed", e);
        setIsSubmitting(false);
        alert("連線錯誤，請稍後再試");
    }
  };

  const handleCancel = async () => {
    if (isSubmitting) return; // 防止重複
    
    if (confirm("確定要中止燒製嗎？")) {
        setIsSubmitting(true);
        try {
            if (scriptUrl) {
                await sendDiscordMessage(scriptUrl, `⚠️ **燒製已中止**：${schedule.name}`);
                await stopCloudMonitor(scriptUrl, schedule.id);
            }
            onCancel();
        } catch (e) {
            console.error("Cancel failed", e);
            setIsSubmitting(false);
        }
    }
  };

  const currentTemp = getCurrentTemp(elapsed);
  const chartData = useMemo(() => {
    const points = calculateSchedulePoints(schedule.segments);
    return points.map(p => ({ time: Math.round((p.time / 60) * 100) / 100, temp: p.temp }));
  }, [schedule.segments]);
  
  const progress = Math.min((elapsed / (schedule.estimatedDurationMinutes * 60000)) * 100, 100);
  const remainingMs = Math.max(0, (schedule.estimatedDurationMinutes * 60 * 1000) - elapsed);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const chartGridColor = isDarkMode ? '#44403c' : '#e5e7eb';
  const chartAxisColor = isDarkMode ? '#a8a29e' : '#9ca3af';
  const chartLineColor = isDarkMode ? '#78716c' : '#9ca3af';
  const chartTooltipBg = isDarkMode ? '#292524' : '#fff';
  const chartTooltipBorder = isDarkMode ? '#57534e' : '#e5e7eb';

  if (showFinishModal) {
    return (
        <div className="fixed inset-0 bg-stone-900/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 max-w-md w-full shadow-2xl transition-colors">
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6">燒製報告</h2>
                
                <div className="mb-6">
                    <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-2">結果判定</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {['perfect', 'underfired', 'overfired', 'failure', 'error'].map((o) => (
                            <button
                                key={o}
                                disabled={isSubmitting}
                                onClick={() => setOutcome(o as FiringLog['outcome'])}
                                className={`p-2 rounded-lg border-2 text-sm font-bold transition-all ${
                                    outcome === o 
                                    ? 'border-clay-500 bg-clay-50 dark:bg-clay-900/50 text-clay-700 dark:text-clay-300' 
                                    : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                                }`}
                            >
                                {{'perfect': '完美', 'underfired': '溫度不足', 'overfired': '過溫', 'failure': '失敗', 'error': '錯誤'}[o]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-2">備註</label>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="例如：釉藥效果很好..."
                        disabled={isSubmitting}
                        className="w-full p-3 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg h-24 focus:ring-2 focus:ring-clay-500 focus:outline-none"
                    />
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowFinishModal(false)} 
                        disabled={isSubmitting}
                        className="flex-1 py-3 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg font-bold disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleComplete} 
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-clay-600 hover:bg-clay-700 text-white rounded-lg font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> 處理中...</>
                        ) : (
                            "儲存並通知"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 max-w-4xl mx-auto w-full">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-xl w-full p-6 md:p-8 relative overflow-hidden transition-colors">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-clay-300 via-clay-500 to-clay-300 animate-pulse`} />

        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              {schedule.name}
              {wakeLockActive ? (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1 font-normal">
                  <Zap className="w-3 h-3" /> 螢幕恆亮
                </span>
              ) : (
                <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 px-2 py-1 rounded-full flex items-center gap-1 font-normal">
                  <ZapOff className="w-3 h-3" /> 一般模式
                </span>
              )}
            </h2>
            <div className="flex gap-4 text-xs text-stone-500 dark:text-stone-400 mt-1">
                <span className="flex items-center gap-1"><Cloud className="w-3 h-3" /> 雲端監控中</span>
                <span>開始：{new Date(startTime).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* 圖表區 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col items-center justify-center">
                <div className="relative w-56 h-56 mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                    <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-stone-100 dark:text-stone-800" />
                    <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 100} strokeDashoffset={2 * Math.PI * 100 * (1 - progress / 100)} className="text-clay-500 transition-all duration-1000 ease-linear" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1">剩餘時間</div>
                    <div className="text-3xl font-mono font-bold text-stone-800 dark:text-stone-100">{formatTime(remainingMs)}</div>
                    <div className="text-clay-600 dark:text-clay-400 font-bold mt-2 flex items-center gap-1 text-lg">
                        <Thermometer className="w-5 h-5" /> ~{Math.round(currentTemp)}°C
                    </div>
                    </div>
                </div>
            </div>

            <div className="h-64 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-2 transition-colors" style={{ height: '256px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="time" unit="h" fontSize={10} stroke={chartAxisColor} type="number" domain={['dataMin', 'dataMax']} tick={{ fill: chartAxisColor }} />
                        <YAxis unit="°C" fontSize={10} stroke={chartAxisColor} width={35} tick={{ fill: chartAxisColor }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, color: isDarkMode ? '#f5f5f4' : '#1c1917' }} itemStyle={{ color: isDarkMode ? '#f5f5f4' : '#1c1917' }} formatter={(val) => [`${val}°C`, '預定溫度']} />
                        <Line type="monotone" dataKey="temp" stroke={chartLineColor} strokeWidth={2} dot={false} />
                        <ReferenceDot x={Math.round((elapsed / 3600000) * 100) / 100} y={currentTemp} r={6} fill="#b0776b" stroke="#fff" strokeWidth={2} />
                        <ReferenceLine x={Math.round((elapsed / 3600000) * 100) / 100} stroke="#b0776b" strokeDasharray="3 3" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all font-bold disabled:opacity-50"
          >
            <XCircle className="w-5 h-5" /> 中止燒製
          </button>
          <button 
            onClick={() => setShowFinishModal(true)}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-lg transition-all font-bold disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" /> 結束並紀錄
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveFiring;