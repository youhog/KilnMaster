import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginToSheet, saveSettingsToSheet } from '../services/sheetService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean; // 新增：載入中狀態
  scriptUrl: string;
  username: string;
  discordWebhook: string;
  login: (url: string, user: string, passHash: string) => Promise<boolean>;
  logout: () => void;
  updateWebhook: (url: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 預設為載入中
  const [scriptUrl, setScriptUrl] = useState('');
  const [username, setUsername] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');

  // 初始化：檢查 localStorage 是否有登入資料
  useEffect(() => {
    const storedAuth = localStorage.getItem('kiln_auth_data');
    if (storedAuth) {
      try {
        const { url, user, webhook } = JSON.parse(storedAuth);
        if (url && user) {
          setScriptUrl(url);
          setUsername(user);
          setDiscordWebhook(webhook || '');
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("解析登入資料失敗", e);
        localStorage.removeItem('kiln_auth_data');
      }
    }
    setIsLoading(false); // 檢查完畢
  }, []);

  const login = async (url: string, user: string, passHash: string) => {
    const { success, webhook } = await loginToSheet(url, user, passHash);
    if (success) {
      setScriptUrl(url);
      setUsername(user);
      const newWebhook = webhook || '';
      setDiscordWebhook(newWebhook);
      setIsAuthenticated(true);
      
      // 儲存登入資訊到 localStorage
      localStorage.setItem('kiln_auth_data', JSON.stringify({
        url,
        user,
        webhook: newWebhook
      }));
      localStorage.setItem('kiln_script_url', url); // 保留原本的 url cache
    }
    return success;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setDiscordWebhook('');
    localStorage.removeItem('kiln_auth_data'); // 清除登入資訊
  };

  const updateWebhook = async (url: string) => {
    // 樂觀更新 (Optimistic Update)
    const oldWebhook = discordWebhook;
    setDiscordWebhook(url);
    
    // 更新 localStorage
    const storedAuth = localStorage.getItem('kiln_auth_data');
    if (storedAuth) {
      const data = JSON.parse(storedAuth);
      localStorage.setItem('kiln_auth_data', JSON.stringify({ ...data, webhook: url }));
    }

    if (scriptUrl && username) {
      const success = await saveSettingsToSheet(scriptUrl, username, url);
      if (!success) {
        // 如果失敗則回滾
        setDiscordWebhook(oldWebhook);
        alert("設定儲存失敗，請檢查網路連線");
        return false;
      }
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading,
      scriptUrl, 
      username, 
      discordWebhook, 
      login, 
      logout, 
      updateWebhook 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};