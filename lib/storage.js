/**
 * NewsToCard - IndexedDB 历史记录存储模块
 * 用于存储截图图片（Blob）、原始网址等数据
 */

const NTC_DB_NAME = 'NewsToCardDB';
const NTC_DB_VERSION = 1;
const NTC_STORE_NAME = 'snapshots';

/**
 * 打开 IndexedDB 数据库
 */
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

/**
 * 添加一条历史记录
 * @param {Object} record - 记录对象
 * @param {Blob} record.blob - 截图 Blob 数据
 * @param {string} record.url - 原始页面 URL
 * @param {string} record.title - 页面标题
 * @param {number} record.width - 截图宽度
 * @param {number} record.height - 截图高度
 * @returns {Promise<number>} 新记录的 ID
 */
async function addSnapshot(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NTC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(NTC_STORE_NAME);

    const data = {
      blob: record.blob,
      url: record.url || '',
      title: record.title || '',
      width: record.width || 0,
      height: record.height || 0,
      timestamp: Date.now()
    };

    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 获取所有历史记录（按时间倒序）
 * @returns {Promise<Array>}
 */
async function getAllSnapshots() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NTC_STORE_NAME, 'readonly');
    const store = tx.objectStore(NTC_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // 按时间倒序
      const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 删除指定 ID 的记录
 * @param {number} id
 */
async function deleteSnapshot(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NTC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(NTC_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 批量删除记录
 * @param {Array<number>} ids
 */
async function deleteSnapshots(ids) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NTC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(NTC_STORE_NAME);

    ids.forEach(id => store.delete(id));

    tx.oncomplete = () => {
      resolve();
      db.close();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取记录数量
 * @returns {Promise<number>}
 */
async function getSnapshotCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NTC_STORE_NAME, 'readonly');
    const store = tx.objectStore(NTC_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
