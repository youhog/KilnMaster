import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiringSchedule, FiringSegment, createEmptySegment, calculateSchedulePoints, calculateTheoreticalDuration } from '../types';

interface Props {
  onStartFiring: (schedule: FiringSchedule) => void;
  calibrationFactor: number;
  isDarkMode?: boolean;
}

const ScheduleEditor: React.FC<Props> = ({ onStartFiring, calibrationFactor, isDarkMode = false }) => {
  const [segments, setSegments] = useState<FiringSegment[]>([createEmptySegment()]);
  const [name, setName] = useState('新排程');
  const [clayWeight, setClayWeight] = useState<number>(0);

  // Use shared helper for consistency
  const rawMinutes = calculateTheoreticalDuration(segments);
  // Base calibration + Weight compensation (approx. 1.5% per kg)
  const weightFactor = 1 + (clayWeight * 0.015);
  const adjustedMinutes = Math.round(rawMinutes * calibrationFactor * weightFactor);

  // Generate chart data
  const chartData = useMemo(() => {
    const points = calculateSchedulePoints(segments);
    return points.map(p => ({
      time: Math.round((p.time / 60) * 10) / 10, // Convert minutes to hours for display
      temp: p.temp
    }));
  }, [segments]);

  const handleAddSegment = () => {
    setSegments([...segments, createEmptySegment()]);
  };

  const handleRemoveSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const handleUpdateSegment = (id: string, field: keyof FiringSegment, value: number | string) => {
    setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleStart = () => {
    onStartFiring({
      id: crypto.randomUUID(),
      name,
      segments,
      estimatedDurationMinutes: adjustedMinutes,
      clayWeight
    });
  };

  // Dark mode chart colors
  const chartGridColor = isDarkMode ? '#44403c' : '#e7e5e4';
  const chartAxisColor = isDarkMode ? '#a8a29e' : '#a8a29e';
  const chartTooltipBg = isDarkMode ? '#292524' : '#fff';
  const chartTooltipBorder = isDarkMode ? '#57534e' : '#e5e7eb';
  const chartLineColor = isDarkMode ? '#b0776b' : '#b0776b';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Editor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 transition-colors">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">手動編輯排程</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-right font-medium text-stone-600 dark:text-stone-300 bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-600 focus:border-clay-500 focus:outline-none px-2 w-48 md:w-auto transition-colors"
              />
            </div>

            <div className="space-y-4 mb-6">
              {/* Global Settings */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">全域設定</h3>
                <div className="flex items-center gap-4">
                   <div className="flex-1">
                      <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">預估陶土總重 (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={clayWeight}
                        onChange={(e) => setClayWeight(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-1 focus:ring-clay-500 focus:outline-none"
                        placeholder="0.0"
                      />
                      <p className="text-[10px] text-stone-400 mt-1">重量將影響預估燒製時間 (+1.5%/kg)</p>
                   </div>
                </div>
                
                {/* Weight Calculation Info */}
                <div className="mt-3 text-[10px] text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-800 p-3 rounded border border-stone-200 dark:border-stone-700">
                  <p className="font-bold mb-1 text-stone-600 dark:text-stone-300">時間估算公式：</p>
                  <div className="font-mono bg-stone-100 dark:bg-stone-900 p-1 rounded mb-2 text-center text-stone-600 dark:text-stone-400">
                    理論時間 × 歷史校正 × (1 + 重量 × 1.5%)
                  </div>
                  <p>
                    • <span className="font-semibold">理論時間：</span>依據升溫速率與持溫時間計算的物理基礎時間。<br/>
                    • <span className="font-semibold">歷史校正：</span>根據過去燒製紀錄自動調整的偏差係數。<br/>
                    • <span className="font-semibold">重量補償：</span>每增加 1kg 陶土，因熱容增加，燒製時間約延長 1.5%。此參數將隨歷史數據累積自動優化。
                  </p>
                </div>
              </div>

              {segments.map((seg, idx) => (
                <div key={seg.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700 transition-colors">
                  <div className="w-8 font-bold text-stone-400 text-sm pt-3">#{idx + 1}</div>
                  
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">類型</label>
                    <select
                      value={seg.type}
                      onChange={(e) => handleUpdateSegment(seg.id, 'type', e.target.value)}
                      className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-1 focus:ring-clay-500 focus:outline-none"
                    >
                      <option value="ramp">升溫 (Ramp)</option>
                      <option value="hold">持溫 (Hold)</option>
                    </select>
                  </div>

                  {seg.type === 'ramp' && (
                    <div className="flex-1 min-w-[80px]">
                      <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">速率 (°C/hr)</label>
                      <input
                        type="number"
                        value={seg.rate}
                        onChange={(e) => handleUpdateSegment(seg.id, 'rate', Number(e.target.value))}
                        className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-1 focus:ring-clay-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">目標溫 (°C)</label>
                    <input
                      type="number"
                      value={seg.targetTemp}
                      onChange={(e) => handleUpdateSegment(seg.id, 'targetTemp', Number(e.target.value))}
                      className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-1 focus:ring-clay-500 focus:outline-none"
                    />
                  </div>

                  {seg.type === 'hold' && (
                    <div className="flex-1 min-w-[80px]">
                      <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase mb-1">時間 (分)</label>
                      <input
                        type="number"
                        value={seg.holdTime}
                        onChange={(e) => handleUpdateSegment(seg.id, 'holdTime', Number(e.target.value))}
                        className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-1 focus:ring-clay-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveSegment(seg.id)}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                    title="移除區段"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddSegment}
              className="w-full py-3 border-2 border-dashed border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400 rounded-lg hover:border-clay-500 hover:text-clay-600 dark:hover:text-clay-400 transition-colors flex justify-center items-center gap-2 mb-8"
            >
              <Plus className="w-5 h-5" /> 新增區段
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Preview & Action */}
      <div className="space-y-6">
        {/* Chart Preview */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 h-64 flex flex-col transition-colors">
          <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase mb-2">溫度曲線預覽</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis 
                  dataKey="time" 
                  unit="h" 
                  fontSize={10} 
                  stroke={chartAxisColor}
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: chartAxisColor }}
                />
                <YAxis 
                  unit="°C" 
                  fontSize={10} 
                  stroke={chartAxisColor} 
                  width={35}
                  tick={{ fill: chartAxisColor }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    fontSize: '12px',
                    backgroundColor: chartTooltipBg,
                    borderColor: chartTooltipBorder,
                    color: isDarkMode ? '#f5f5f4' : '#1c1917'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f5f5f4' : '#1c1917' }}
                  formatter={(value: number) => [`${value}°C`, '溫度']}
                  labelFormatter={(label) => `${label} 小時`}
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke={chartLineColor} 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-stone-900 dark:bg-stone-950 text-white p-6 rounded-xl shadow-lg sticky top-6 border border-stone-800">
          <div className="mb-6">
            <div className="text-stone-300 dark:text-stone-400 text-sm mb-1">預估總時間</div>
            <div className="text-4xl font-bold font-mono">
              {Math.floor(adjustedMinutes / 60)}<span className="text-xl">小時</span> {adjustedMinutes % 60}<span className="text-xl">分</span>
            </div>
            {calibrationFactor !== 1 && (
              <div className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 p-2 rounded">
                *已包含 {Math.round((calibrationFactor - 1) * 100)}% 歷史校正
                {clayWeight > 0 && ` + ${Math.round(clayWeight * 1.5)}% 重量補償`}
              </div>
            )}
            {calibrationFactor === 1 && clayWeight > 0 && (
               <div className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 p-2 rounded">
                *已包含 {Math.round(clayWeight * 1.5)}% 重量補償
              </div>
            )}
          </div>
          
          <button
            onClick={handleStart}
            className="w-full bg-clay-500 hover:bg-clay-400 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
          >
            <Play className="w-6 h-6 fill-current" />
            開始燒製
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;