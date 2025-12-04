import { CalibrationResult, FiringLog } from "../types";

interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  webhook?: string;
}

export const loginToSheet = async (scriptUrl: string, username: string, password: string): Promise<{success: boolean, webhook?: string}> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username, password }),
    });
    const result: ApiResponse = await response.json();
    return { success: result.status === 'success', webhook: result.webhook };
  } catch (error) {
    console.error("Login failed", error);
    return { success: false };
  }
};

export const fetchSheetData = async (scriptUrl: string): Promise<{ logs: FiringLog[], calibration: Partial<CalibrationResult> } | null> => {
  try {
    const url = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=getData`;
    const response = await fetch(url);
    const result: ApiResponse = await response.json();
    return (result.status === 'success' && result.data) ? result.data : null;
  } catch (error) {
    console.error("Fetch data failed", error);
    return null;
  }
};

export const saveLogToSheet = async (scriptUrl: string, log: FiringLog): Promise<boolean> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveLog', payload: log }),
    });
    const result: ApiResponse = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Save log failed", error);
    return false;
  }
};

export const saveCalibrationToSheet = async (scriptUrl: string, calibration: CalibrationResult): Promise<boolean> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveCalibration', payload: calibration }),
    });
    const result: ApiResponse = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Save calibration failed", error);
    return false;
  }
};

export const sendDiscordMessage = async (scriptUrl: string, webhookUrl: string, message: string): Promise<boolean> => {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('http')) return false;
    await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'sendDiscord', url: webhookUrl, message: message }),
    });
    return true;
  } catch (error) {
    console.error("Discord send failed", error);
    return false;
  }
};

export const saveSettingsToSheet = async (scriptUrl: string, username: string, webhook: string): Promise<boolean> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveSettings', 
        username: username, 
        webhook: webhook 
      }),
    });
    const result: ApiResponse = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Save settings failed", error);
    return false;
  }
};

// [新增] 儲存燒製模板
export const saveTemplate = async (scriptUrl: string, templateName: string, segments: any[]): Promise<boolean> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveTemplate', 
        name: templateName, 
        segments: segments 
      }),
    });
    const result: ApiResponse = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Save template failed", error);
    return false;
  }
};