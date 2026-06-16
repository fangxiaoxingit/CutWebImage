/**
 * NewsToCard - Service Worker
 * 处理截图请求 + IndexedDB 历史记录存储
 */

const NTC_DB_NAME = 'NewsToCardDB';
const NTC_DB_VERSION = 1;
const NTC_STORE_NAME = 'snapshots';

// ========== 消息监听 ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    handleCaptureVisibleTab(sender.tab).then(sendResponse);
    return true;
  }

  if (message.type === 'SAVE_SNAPSHOT') {
    handleSaveSnapshot(message.data).then(sendResponse);
    return true;
  }
});

// ========== 截图 ==========

async function handleCaptureVisibleTab(tab) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    });
    return { dataUrl, error: null };
  } catch (err) {
    console.error('[NewsToCard] captureVisibleTab failed:', err);
    return { dataUrl: null, error: err.message };
  }
}

// ========== IndexedDB 存储 ==========

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NTC_DB_NAME, NTC_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(NTC_STORE_NAME)) {
        const store = db.createObjectStore(NTC_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

async function handleSaveSnapshot(data) {
  try {
    // 将 dataURL 转为 Blob
    const blob = dataUrlToBlob(data.imageDataUrl);

    const db = await openDB();
    const record = {
      blob: blob,
      url: data.url || '',
      title: data.title || '',
      width: data.width || 0,
      height: data.height || 0,
      timestamp: Date.now()
    };

    const id = await new Promise((resolve, reject) => {
      const tx = db.transaction(NTC_STORE_NAME, 'readwrite');
      const store = tx.objectStore(NTC_STORE_NAME);
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });

    return { success: true, id };
  } catch (err) {
    console.error('[NewsToCard] save snapshot failed:', err);
    return { success: false, error: err.message };
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}
