import React, { useState } from 'react';
import { MessageSquare, Save, CheckCircle, AlertCircle, Plus, Trash2, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveTemplate } from '../services/sheetService';

const Settings: React.FC = () => {
  const { discordWebhook, updateWebhook, scriptUrl } = useAuth();
  
  // Webhook 狀態
  const [localWebhook, setLocalWebhook] = useState(discordWebhook);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 模板狀態
  const [templateName, setTemplateName] = useState('');
  const [segments, setSegments] = useState([{ temp: 0, time: 0 }]);
  const [templateStatus, setTemplateStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 處理 Webhook 儲存
  const handleSaveWebhook = async () => {
    setWebhookStatus('saving');
    const success = await updateWebhook(localWebhook);
    if (success) {
      setWebhookStatus('success');
      setTimeout(() => setWebhookStatus('idle'), 2000);
    } else {
      setWebhookStatus('error');
    }
  };

  // 處理模板段落
  const addSegment = () => setSegments([...segments, { temp: 0, time: 0 }]);
  const removeSegment = (index: number) => {
    if (segments.length > 1) setSegments(segments.filter((_, i) => i !== index));
  };
  const updateSegment = (index: number, field: 'temp' | 'time', value: string) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], [field]: Number(value) };
    setSegments(newSegments);
  };

  // 處理模板儲存
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return alert('請輸入模板名稱');
    if (!scriptUrl) return alert('系統未連線');

    setTemplateStatus('saving');
    const success = await saveTemplate(scriptUrl, templateName, segments);
    
    if (success) {
      setTemplateStatus('success');
      setTemplateName('');
      setSegments([{ temp: 0, time: 0 }]);
      setTimeout(() => setTemplateStatus('idle'), 3000);
    } else {
      setTemplateStatus('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      
      {/* 區塊 1: 通知設定 (保留原有功能) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 transition-colors">
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-clay-500" />
          通知設定
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
              Discord Webhook URL
            </label>
            <input
              type="text"
              value={localWebhook}
              onChange={(e) => setLocalWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-clay-500 outline-none transition-all"
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
              設定將儲存於 Google 試算表，更換裝置時會自動載入。
            </p>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <button
              onClick={handleSaveWebhook}
              disabled={webhookStatus === 'saving'}
              className="flex items-center gap-2 px-6 py-2 bg-clay-600 hover:bg-clay-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {webhookStatus === 'saving' ? '儲存中...' : <><Save className="w-4 h-4" /> 儲存設定</>}
            </button>
            {webhookStatus === 'success' && <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-sm font-bold"><CheckCircle className="w-4 h-4" /> 成功</span>}
            {webhookStatus === 'error' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1 text-sm font-bold"><AlertCircle className="w-4 h-4" /> 失敗</span>}
          </div>
        </div>
      </div>

      {/* 區塊 2: 新增模板 (新功能) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 transition-colors">
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-600" />
          新增燒製模板
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">模板名稱</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="例如：素燒 800度 慢速"
              className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">溫控行程</label>
            <div className="space-y-3">
              {segments.map((seg, index) => (
                <div key={index} className="flex gap-2 items-center bg-stone-50 dark:bg-stone-800 p-2 rounded-lg border border-stone-100 dark:border-stone-700">
                  <span className="text-stone-400 font-mono w-6 text-center">{index + 1}</span>
                  <input
                    type="number"
                    placeholder="溫度(°C)"
                    value={seg.temp || ''}
                    onChange={(e) => updateSegment(index, 'temp', e.target.value)}
                    className="flex-1 min-w-0 p-2 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="時間(分)"
                    value={seg.time || ''}
                    onChange={(e) => updateSegment(index, 'time', e.target.value)}
                    className="flex-1 min-w-0 p-2 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                  <button onClick={() => removeSegment(index)} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addSegment} className="mt-3 flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">
              <Plus className="w-4 h-4" /> 增加一段
            </button>
          </div>

          <div className="pt-2 flex items-center gap-4 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={handleSaveTemplate}
              disabled={templateStatus === 'saving'}
              className="flex items-center gap-2 px-6 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 ml-auto"
            >
              {templateStatus === 'saving' ? '傳送中...' : <><Save className="w-4 h-4" /> 新增至資料庫</>}
            </button>
            {templateStatus === 'success' && <span className="text-green-600 font-bold text-sm">已傳送</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;