import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, CheckCircle, AlertCircle, Plus, Trash2, Flame, Power, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveTemplate, fetchWebhooks, saveWebhooks, saveGlobalSetting, getGlobalSetting } from '../services/sheetService';
import { WebhookConfig } from '../types';

const Settings: React.FC = () => {
  const { scriptUrl } = useAuth();
  
  // Webhook 列表狀態
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 網站連結狀態
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [urlStatus, setUrlStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // 模板狀態
  const [templateName, setTemplateName] = useState('');
  const [segments, setSegments] = useState([{ temp: 0, time: 0 }]);
  const [templateStatus, setTemplateStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 載入初始資料
  useEffect(() => {
    if (scriptUrl) {
        setIsLoadingWebhooks(true);
        // 1. 載入 Webhooks
        fetchWebhooks(scriptUrl).then(data => {
            if (data) setWebhooks(data);
            setIsLoadingWebhooks(false);
        });
        // 2. 載入 網站網址
        getGlobalSetting(scriptUrl, 'WebsiteURL').then(val => setWebsiteUrl(val || ''));
    }
  }, [scriptUrl]);

  // Webhook 操作
  const handleAddWebhook = () => {
    setWebhooks([...webhooks, { id: crypto.randomUUID(), name: '新頻道', url: '', enabled: true }]);
  };

  const handleUpdateWebhook = (id: string, field: keyof WebhookConfig, value: any) => {
    setWebhooks(webhooks.map(wh => wh.id === id ? { ...wh, [field]: value } : wh));
  };

  const handleRemoveWebhook = (id: string) => {
    setWebhooks(webhooks.filter(wh => wh.id !== id));
  };

  const handleSaveWebhooks = async () => {
    if (!scriptUrl) return;
    setWebhookStatus('saving');
    const success = await saveWebhooks(scriptUrl, webhooks);
    if (success) {
      setWebhookStatus('success');
      setTimeout(() => setWebhookStatus('idle'), 2000);
    } else {
      setWebhookStatus('error');
    }
  };

  // 網址儲存操作
  const handleSaveUrl = async () => {
    if (!scriptUrl) return;
    setUrlStatus('saving');
    const success = await saveGlobalSetting(scriptUrl, 'WebsiteURL', websiteUrl);
    if (success) {
        setUrlStatus('success');
        setTimeout(() => setUrlStatus('idle'), 2000);
    }
  };

  // 模板操作
  const addSegment = () => setSegments([...segments, { temp: 0, time: 0 }]);
  const removeSegment = (index: number) => {
    if (segments.length > 1) setSegments(segments.filter((_, i) => i !== index));
  };
  const updateSegment = (index: number, field: 'temp' | 'time', value: string) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], [field]: Number(value) };
    setSegments(newSegments);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return alert('請輸入模板名稱');
    if (!scriptUrl) return alert('系統未連線');

    setTemplateStatus('saving');
    const success = await saveTemplate(scriptUrl, templateName, segments);
    
    if (success) {
      setTemplateStatus('success');
      setTemplateName('');
      setSegments([{ temp: 0, time: 0 }]);
      alert('模板已成功傳送至 Google Sheet！');
      setTimeout(() => setTemplateStatus('idle'), 3000);
    } else {
      setTemplateStatus('error');
      alert('儲存失敗，請檢查網路或 App Script 部署。');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      
      {/* 區塊 1: 雲端通知管理 */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 transition-colors">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-clay-500" />
            雲端通知設定
            </h2>
            <button onClick={() => scriptUrl && fetchWebhooks(scriptUrl).then(d => d && setWebhooks(d))} className="p-2 text-stone-400 hover:text-clay-500">
                <RefreshCw className={`w-5 h-5 ${isLoadingWebhooks ? 'animate-spin' : ''}`} />
            </button>
        </div>

        <div className="space-y-4">
          {webhooks.length === 0 && !isLoadingWebhooks && (
              <div className="text-center py-4 text-stone-400 text-sm italic border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-lg">
                  尚未設定通知頻道
              </div>
          )}

          {webhooks.map((wh) => (
              <div key={wh.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-100 dark:border-stone-700 items-start sm:items-center">
                  <button 
                    onClick={() => handleUpdateWebhook(wh.id, 'enabled', !wh.enabled)}
                    className={`p-2 rounded-full transition-colors ${wh.enabled ? 'text-green-500 bg-green-100 dark:bg-green-900/30' : 'text-stone-300 bg-stone-200 dark:bg-stone-700'}`}
                    title={wh.enabled ? "已啟用" : "已停用"}
                  >
                      <Power className="w-5 h-5" />
                  </button>
                  
                  <input 
                    type="text" 
                    value={wh.name}
                    onChange={(e) => handleUpdateWebhook(wh.id, 'name', e.target.value)}
                    placeholder="頻道名稱"
                    className="w-full sm:w-32 p-2 text-sm border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  />
                  
                  <input 
                    type="text" 
                    value={wh.url}
                    onChange={(e) => handleUpdateWebhook(wh.id, 'url', e.target.value)}
                    placeholder="Webhook URL..."
                    className="flex-1 w-full p-2 text-sm border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono"
                  />

                  <button onClick={() => handleRemoveWebhook(wh.id)} className="p-2 text-stone-400 hover:text-red-500 transition-colors self-end sm:self-auto">
                    <Trash2 className="w-5 h-5" />
                  </button>
              </div>
          ))}

          <button onClick={handleAddWebhook} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mt-2">
              <Plus className="w-4 h-4" /> 新增通知頻道
          </button>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center gap-4">
            <button
              onClick={handleSaveWebhooks}
              disabled={webhookStatus === 'saving'}
              className="flex items-center gap-2 px-6 py-2 bg-clay-600 hover:bg-clay-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {webhookStatus === 'saving' ? '同步至雲端...' : <><Save className="w-4 h-4" /> 儲存設定</>}
            </button>
            {webhookStatus === 'success' && <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-sm font-bold"><CheckCircle className="w-4 h-4" /> 已同步</span>}
            {webhookStatus === 'error' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1 text-sm font-bold"><AlertCircle className="w-4 h-4" /> 同步失敗</span>}
          </div>

          {/* 網站連結設定 */}
          <div className="mt-8 pt-6 border-t border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-clay-500" />
                Discord 通知連結設定
            </h3>
            <div className="flex gap-2">
                <input 
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="例如：https://your-kiln-app.vercel.app"
                    className="flex-1 p-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
                <button 
                    onClick={handleSaveUrl}
                    className="px-4 py-2 bg-stone-800 dark:bg-stone-700 text-white rounded-lg text-sm font-bold hover:bg-stone-700 dark:hover:bg-stone-600 transition-colors"
                >
                    {urlStatus === 'saving' ? '儲存...' : (urlStatus === 'success' ? '已儲存' : '儲存網址')}
                </button>
            </div>
            <p className="text-xs text-stone-400 mt-2">
                * 設定後，Discord 通知的標題將會變成連結，點擊即可直接打開此網站。
            </p>
          </div>
        </div>
      </div>

      {/* 區塊 2: 新增模板 */}
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
            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">溫控行程 (溫度/分鐘)</label>
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