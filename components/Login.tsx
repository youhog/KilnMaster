
import React, { useState } from 'react';
import { Flame, Lock, User, Link2, Loader2, Moon, Sun } from 'lucide-react';

interface Props {
  onLogin: (scriptUrl: string, username: string, password: string) => Promise<boolean>;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const Login: React.FC<Props> = ({ onLogin, isDarkMode = false, onToggleDarkMode }) => {
  // Check local storage for previous script URL to save typing
  const [scriptUrl, setScriptUrl] = useState(import.meta.env.VITE_API_URL || localStorage.getItem('kiln_script_url') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!scriptUrl.includes('script.google.com')) {
      setError('請輸入有效的 Google Apps Script 網址');
      setIsLoading(false);
      return;
    }

    try {
      const success = await onLogin(scriptUrl, username, password);
      if (success) {
        localStorage.setItem('kiln_script_url', scriptUrl);
      } else {
        setError('登入失敗：帳號、密碼錯誤或網址無效');
      }
    } catch (err) {
      setError('連線錯誤，請檢查網路或網址');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-4 transition-colors relative">
      {/* Dark Mode Toggle */}
      {onToggleDarkMode && (
        <button
          onClick={onToggleDarkMode}
          className="absolute top-4 right-4 p-2 bg-white dark:bg-stone-900 rounded-full shadow-md text-stone-400 hover:text-clay-500 dark:text-stone-500 dark:hover:text-clay-400 transition-colors"
          title={isDarkMode ? "切換亮色模式" : "切換深色模式"}
        >
          {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      )}

      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-stone-900 dark:bg-black p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
              <Flame className="w-32 h-32 text-white" />
           </div>
           <Flame className="w-12 h-12 text-clay-400 mx-auto mb-4" />
           <h1 className="text-2xl font-bold text-white">KilnMaster AI</h1>
           <p className="text-stone-400 text-sm mt-1">請先登入以存取雲端資料庫</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!import.meta.env.VITE_API_URL && (
              <div>
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">
                  後台 API 網址 (Google Apps Script)
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    required
                    className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg focus:ring-2 focus:ring-clay-500 focus:outline-none text-sm"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1 ml-1">
                  請輸入您部署的 Web App URL
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">
                使用者帳號
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg focus:ring-2 focus:ring-clay-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">
                密碼
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg focus:ring-2 focus:ring-clay-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-clay-600 hover:bg-clay-700 text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登入系統'}
          </button>
        </form>
      </div>
      <div className="mt-8 text-stone-400 dark:text-stone-500 text-xs text-center max-w-sm">
        資料將安全儲存於您的 Google 試算表中。<br/>
        請確保 Apps Script 已部署為「任何人皆可存取」。
      </div>
    </div>
  );
};

export default Login;
