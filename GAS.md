# Google Apps Script (GAS) 更新指南

為了支援新的「陶土重量」功能，請將您的 Google Apps Script 專案中的 `Code.gs` (或主要腳本檔案) 替換為以下程式碼。

## 更新步驟

1.  開啟您的 Google Apps Script 專案。
2.  將現有的程式碼替換為下方的完整程式碼。
3.  點擊右上角的 **部署 (Deploy)** > **管理部署 (Manage deployments)**。
4.  點擊 **編輯 (Edit)** (鉛筆圖示)。
5.  在 **版本 (Version)** 下拉選單中選擇 **新版本 (New version)**。
6.  點擊 **部署 (Deploy)**。
    *   *注意：必須建立新版本，您的變更才會生效。*

---

## Code.gs

```javascript
// 設定工作表名稱
const SHEET_LOGS = 'Logs';
const SHEET_CALIBRATION = 'Calibration';
const SHEET_USERS = 'Users';
const SHEET_SETTINGS = 'Settings'; // [新增] 全域設定表

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 設定 Logs 工作表
  let logsSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(SHEET_LOGS);
    logsSheet.appendRow(['ID', 'Schedule Name', 'Date', 'Predicted Duration', 'Theoretical Duration', 'Actual Duration', 'Clay Weight', 'Outcome', 'Notes']);
  } else {
    // 欄位補全檢查
    const headers = logsSheet.getRange(1, 1, 1, logsSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('Theoretical Duration') === -1) logsSheet.getRange(1, headers.length + 1).setValue('Theoretical Duration');
    const updatedHeaders = logsSheet.getRange(1, 1, 1, logsSheet.getLastColumn()).getValues()[0];
    if (updatedHeaders.indexOf('Clay Weight') === -1) logsSheet.getRange(1, updatedHeaders.length + 1).setValue('Clay Weight');
  }

  // 2. 設定 Calibration 工作表
  let calSheet = ss.getSheetByName(SHEET_CALIBRATION);
  if (!calSheet) {
    calSheet = ss.insertSheet(SHEET_CALIBRATION);
    calSheet.appendRow(['Factor', 'Advice', 'Last Updated']);
    calSheet.appendRow([1.0, '初始設定', new Date()]);
  }

  // 3. 設定 Users 工作表
  let userSheet = ss.getSheetByName(SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(SHEET_USERS);
    userSheet.appendRow(['Username', 'PasswordHash']); 
    // 預設 admin 帳號
    userSheet.appendRow(['admin', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3']);
  }

  // 4. [新增] 設定 Settings 全域設定表
  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(['Key', 'Value']); // 標題
    settingsSheet.appendRow(['DiscordWebhook', '']); // 預設空值
  }
}

// [工具頁面]
function doGet(e) {
  const action = e.parameter.action;
  if (!action || action === 'hash') return getHashToolHtml();
  if (action === 'getData') return getCloudData();
  return responseJSON({ status: 'success', message: 'KilnMaster AI API is running' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'login') return handleLogin(data.username, data.password);
    
    if (action === 'saveLog') {
      if (!isValidLog(data.payload)) return responseJSON({ status: 'error', message: 'Invalid log data' });
      return saveLog(data.payload);
    }

    if (action === 'saveCalibration') return saveCalibration(data.payload);

    // [修改] 儲存設定改為全域
    if (action === 'saveSettings') {
      // 這裡 username 參數雖然會傳進來，但我們選擇忽略它，直接存到全域
      return saveGlobalSettings('DiscordWebhook', data.webhook);
    }

    if (action === 'sendDiscord') return sendDiscord(data.url, data.message);

    return responseJSON({ status: 'error', message: 'Invalid action' });

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

// --- Handlers ---

function handleLogin(username, passwordHash) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == passwordHash) {
      // [修改] 登入成功時，讀取全域 Webhook 設定
      const webhook = getGlobalSetting('DiscordWebhook');
      return responseJSON({ status: 'success', webhook: webhook });
    }
  }
  return responseJSON({ status: 'error', message: 'Invalid credentials' });
}

// [新增] 讀取全域設定
function getGlobalSetting(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  if (!sheet) return '';
  const data = sheet.getDataRange().getValues();
  
  // 從第2列開始搜尋 (跳過標題)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return '';
}

// [新增] 儲存全域設定
function saveGlobalSettings(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SETTINGS);
  
  // 確保工作表存在
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName(SHEET_SETTINGS);
  }

  const data = sheet.getDataRange().getValues();
  
  // 1. 嘗試尋找現有 Key 更新
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return responseJSON({ status: 'success' });
    }
  }

  // 2. 如果沒找到，新增一行
  sheet.appendRow([key, value]);
  return responseJSON({ status: 'success' });
}

function getCloudData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logsSheet = ss.getSheetByName(SHEET_LOGS);
  const calSheet = ss.getSheetByName(SHEET_CALIBRATION);
  const logsData = logsSheet.getDataRange().getValues();
  const headers = logsData[0];
  const logs = [];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);
  for (let i = 1; i < logsData.length; i++) {
    const row = logsData[i];
    if (row[colMap['Date']]) {
      logs.push({
        id: row[colMap['ID']], scheduleName: row[colMap['Schedule Name']], date: row[colMap['Date']],
        predictedDuration: Number(row[colMap['Predicted Duration']]), theoreticalDuration: Number(row[colMap['Theoretical Duration']]||0),
        actualDuration: Number(row[colMap['Actual Duration']]), clayWeight: Number(row[colMap['Clay Weight']]||0),
        outcome: row[colMap['Outcome']], notes: row[colMap['Notes']]
      });
    }
  }
  const calData = calSheet.getDataRange().getValues();
  const lastCal = calData.length > 1 ? calData[calData.length - 1] : [1.0, 'Initial'];
  return responseJSON({ status: 'success', data: { logs: logs, calibration: { factor: Number(lastCal[0]), advice: lastCal[1] } } });
}

function saveLog(log) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOGS);
  setupSpreadsheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);
  const newRow = new Array(headers.length).fill('');
  newRow[colMap['ID']] = log.id; newRow[colMap['Schedule Name']] = log.scheduleName; newRow[colMap['Date']] = log.date;
  newRow[colMap['Predicted Duration']] = log.predictedDuration; newRow[colMap['Theoretical Duration']] = log.theoreticalDuration || '';
  newRow[colMap['Actual Duration']] = log.actualDuration; newRow[colMap['Clay Weight']] = log.clayWeight || 0;
  newRow[colMap['Outcome']] = log.outcome; newRow[colMap['Notes']] = log.notes;
  sheet.appendRow(newRow);
  return responseJSON({ status: 'success' });
}

function saveCalibration(cal) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CALIBRATION);
  sheet.appendRow([cal.factor, cal.advice, new Date()]);
  return responseJSON({ status: 'success' });
}

function sendDiscord(webhookUrl, message) {
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ content: message })
    });
    return responseJSON({ status: 'success' });
  } catch (e) { return responseJSON({ status: 'error', message: e.toString() }); }
}

function getHashToolHtml() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><base target="_top"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>KilnMaster 密碼工具</title>
    <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:20px;background-color:#f5f5f4;color:#1c1917;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:white;padding:2rem;border-radius:1rem;box-shadow:0 10px 15px -3px rgb(0 0 0/0.1);width:100%;max-width:480px}h2{margin-top:0;color:#44403c}input{width:100%;padding:12px;margin:8px 0 20px 0;border:1px solid #d6d3d1;border-radius:8px;box-sizing:border-box}button{background-color:#b0776b;color:white;border:none;padding:12px 20px;border-radius:8px;cursor:pointer;width:100%;font-weight:bold}.result{background:#292524;color:#e7e5e4;padding:12px;border-radius:8px;word-break:break-all;font-family:monospace;margin-top:20px;display:none}</style>
    </head><body><div class="card"><h2>🔐 密碼雜湊產生器</h2><input type="text" id="password" placeholder="輸入密碼"><button onclick="g()">產生 Hash</button><div id="o" class="result"></div></div>
    <script>async function g(){const p=document.getElementById('password').value;if(!p)return;const d=new TextEncoder().encode(p);const h=await crypto.subtle.digest('SHA-256',d);const x=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');const o=document.getElementById('o');o.style.display='block';o.innerText=x;navigator.clipboard.writeText(x);}</script>
    </body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle('KilnMaster Password').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function isValidLog(log) {
  return log && log.scheduleName && log.date && typeof log.actualDuration === 'number';
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
```
