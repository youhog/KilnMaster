import { CalibrationResult, FiringLog, WebhookConfig, FiringSchedule } from "../types";

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

// [修改] 發送 Discord 改為呼叫後端廣播
export const sendDiscordMessage = async (scriptUrl: string, message: string): Promise<boolean> => {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'sendDiscord', message: message }),
    });
    return true;
  } catch (error) {
    console.error("Discord send failed", error);
    return false;
  }
};

// [新增] 儲存全域設定 (如網站 URL)
export const saveGlobalSetting = async (scriptUrl: string, key: string, value: string): Promise<boolean> => {
  try {
    // 為了加速 UI 顯示，同步寫入 LocalStorage
    if (key === 'WebsiteURL') localStorage.setItem('kiln_website_url', value);
    
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveSettings', 
        key: key, 
        value: value 
      }),
    });
    const result: ApiResponse = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Save setting failed", error);
    return false;
  }
};

// [新增] 讀取全域設定
export const getGlobalSetting = async (scriptUrl: string, key: string): Promise<string> => {
  try {
    // 優先讀取 LocalStorage (避免每次都等 API)
    if (key === 'WebsiteURL') {
       const cached = localStorage.getItem('kiln_website_url');
       if (cached) return cached;
    }
    
    // 如果需要從雲端獲取最新，可呼叫 getSettings API
    const url = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=getSettings`;
    const response = await fetch(url);
    const result: ApiResponse = await response.json();
    if (result.status === 'success' && result.data && result.data[key]) {
       return result.data[key];
    }
    return '';
  } catch (error) {
    console.error("Get setting failed", error);
    return '';
  }
};

// [新增] 儲存模板
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

// [新增] 啟動雲端監控
export const startCloudMonitor = async (scriptUrl: string, schedule: FiringSchedule, startTime: number): Promise<boolean> => {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'startMonitor', 
        payload: { id: schedule.id, schedule, startTime } 
      }),
    });
    return true;
  } catch (error) {
    console.error("Failed to start cloud monitor", error);
    return false;
  }
};

// [新增] 停止雲端監控
export const stopCloudMonitor = async (scriptUrl: string, id: string): Promise<boolean> => {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'stopMonitor', 
        payload: { id } 
      }),
    });
    return true;
  } catch (error) {
    console.error("Failed to stop cloud monitor", error);
    return false;
  }
};

// [新增] 獲取 Webhook 列表
export const fetchWebhooks = async (scriptUrl: string): Promise<WebhookConfig[] | null> => {
  try {
    const url = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=getWebhooks`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.status === 'success' && Array.isArray(result.data)) {
        return result.data.map((wh: any, idx: number) => ({
            id: `wh-${idx}-${Date.now()}`,
            name: wh.name,
            url: wh.url,
            enabled: wh.enabled
        }));
    }
    return null;
  } catch (error) {
    console.error("Fetch webhooks failed", error);
    return null;
  }
};

// [新增] 儲存 Webhook 列表
export const saveWebhooks = async (scriptUrl: string, webhooks: WebhookConfig[]): Promise<boolean> => {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveWebhooks', 
        webhooks: webhooks 
      }),
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Save webhooks failed", error);
    return false;
  }
};