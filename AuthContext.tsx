import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginToSheet, saveSettingsToSheet } from '../services/sheetService';

interface AuthContextType {
  isAuthenticated: boolean;
  scriptUrl: string;
  username: string;
  discordWebhook: string; // [新增] Webhook 狀態
  login: (url: string, user: string, passHash: string) => Promise<boolean>;
  logout: () => void;
  updateWebhook: (url: string) => Promise<boolean>; // [新增] 更新方法
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scriptUrl, setScriptUrl] = useState('');
  const [username, setUsername] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');

  useEffect(() => {
    const cachedUrl = localStorage.getItem('kiln_script_url');
    if (cachedUrl) setScriptUrl(cachedUrl);
  }, []);

  const login = async (url: string, user: string, passHash: string) => {
    // 呼叫 API 登入並取得 webhook
    const { success, webhook } = await loginToSheet(url, user, passHash);
    if (success) {
      setScriptUrl(url);
      setUsername(user);
      setDiscordWebhook(webhook || ''); // 存入 Context
      setIsAuthenticated(true);
      localStorage.setItem('kiln_script_url', url);
    }
    return success;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setDiscordWebhook('');
  };

  // [新增] 更新 Webhook 並同步到 Sheet
  const updateWebhook = async (url: string) => {
    setDiscordWebhook(url);
    if (scriptUrl && username) {
      return await saveSettingsToSheet(scriptUrl, username, url);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, scriptUrl, username, discordWebhook, login, logout, updateWebhook }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};