const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const helperPath = path.join(__dirname, '../lib/i18n.js');

function createStorage(initial = {}, options = {}) {
  const data = { ...initial };
  const listeners = new Set();
  return {
    data,
    listeners,
    local: {
      async get(key) {
        if (options.failRead) throw new Error('Storage unavailable');
        return { [key]: data[key] };
      },
      async set(values) {
        if (options.failWrite) throw new Error('Storage unavailable');
        const changes = {};
        for (const [key, value] of Object.entries(values)) {
          changes[key] = { oldValue: data[key], newValue: value };
          data[key] = value;
        }
        for (const listener of listeners) listener(changes, 'local');
      },
    },
    onChanged: {
      addListener(listener) { listeners.add(listener); },
      removeListener(listener) { listeners.delete(listener); },
    },
    change(value, area = 'local') {
      const changes = {
        languagePreference: { oldValue: data.languagePreference, newValue: value },
      };
      if (area === 'local') data.languagePreference = value;
      for (const listener of listeners) listener(changes, area);
    },
  };
}

function loadI18n({ languages = [], language = '', uiLanguage = '', storage } = {}) {
  assert.ok(fs.existsSync(helperPath), 'The shared lib/i18n.js helper must exist');
  const backingStorage = storage || createStorage();
  const browserListeners = new Map();
  const context = vm.createContext({
    navigator: { languages, language },
    chrome: {
      storage: backingStorage,
      i18n: { getUILanguage: () => uiLanguage },
    },
    console,
    document: {
      documentElement: { lang: '', setAttribute() {} },
      querySelectorAll: () => [],
    },
    addEventListener(event, listener) { browserListeners.set(event, listener); },
    setTimeout,
    clearTimeout,
  });
  context.window = context;
  vm.runInContext(fs.readFileSync(helperPath, 'utf8'), context, { filename: helperPath });
  assert.ok(context.CutWebImageI18n, 'The helper must expose CutWebImageI18n');
  return { api: context.CutWebImageI18n, storage: backingStorage, browserListeners, context };
}

test('automatic language uses the first supported browser preference', async () => {
  const cases = [
    { languages: ['zh-HK', 'en-US'], expected: 'zh-CN' },
    { languages: ['en-US', 'zh-CN'], expected: 'en' },
    { languages: ['fr-FR', 'zh-TW', 'en'], expected: 'zh-CN' },
    { languages: ['de-DE', 'fr-FR'], expected: 'en' },
  ];
  for (const { languages, expected } of cases) {
    const { api } = loadI18n({ languages });
    await api.init();
    assert.equal(api.getPreference(), 'auto');
    assert.equal(api.getLocale(), expected, languages.join(', '));
  }
});

test('automatic language falls back to navigator.language then Chrome UI language', async () => {
  const fromNavigator = loadI18n({ languages: ['fr-FR'], language: 'zh-SG', uiLanguage: 'en-US' });
  await fromNavigator.api.init();
  assert.equal(fromNavigator.api.getLocale(), 'zh-CN');

  const fromChrome = loadI18n({ languages: ['fr-FR'], language: 'de-DE', uiLanguage: 'zh-TW' });
  await fromChrome.api.init();
  assert.equal(fromChrome.api.getLocale(), 'zh-CN');
});

test('saved manual preference overrides the browser language after initialization', async () => {
  const { api } = loadI18n({
    languages: ['zh-CN'],
    storage: createStorage({ languagePreference: 'en' }),
  });
  await api.init();
  assert.equal(api.getPreference(), 'en');
  assert.equal(api.getLocale(), 'en');
  assert.equal(api.t('captureCopied'), 'Copied to clipboard');
});

test('invalid saved preference uses automatic browser selection', async () => {
  const { api } = loadI18n({
    languages: ['zh-HK'],
    storage: createStorage({ languagePreference: 'fr-FR' }),
  });
  await api.init();
  assert.equal(api.getPreference(), 'auto');
  assert.equal(api.getLocale(), 'zh-CN');
});

test('manual language persists and returning to auto follows the browser again', async () => {
  const { api, storage } = loadI18n({ languages: ['zh-CN'] });
  await api.init();
  const changes = [];
  api.onChange(() => changes.push({ locale: api.getLocale(), preference: api.getPreference() }));

  await api.setPreference('en');
  assert.equal(storage.data.languagePreference, 'en');
  assert.equal(api.getLocale(), 'en');
  assert.equal(api.getPreference(), 'en');
  assert.ok(changes.some(change => change.locale === 'en' && change.preference === 'en'));

  await api.setPreference('auto');
  assert.equal(storage.data.languagePreference, 'auto');
  assert.equal(api.getPreference(), 'auto');
  assert.equal(api.getLocale(), 'zh-CN');
  assert.ok(changes.some(change => change.locale === 'zh-CN' && change.preference === 'auto'));
});

test('external local storage changes synchronize the active language', async () => {
  const { api, storage } = loadI18n({ languages: ['en-US'] });
  await api.init();
  const changes = [];
  api.onChange(() => changes.push(api.getLocale()));
  storage.change('zh-CN');
  assert.equal(api.getPreference(), 'zh-CN');
  assert.equal(api.getLocale(), 'zh-CN');
  assert.ok(changes.includes('zh-CN'));

  storage.change('en', 'sync');
  assert.equal(api.getLocale(), 'zh-CN');
  storage.change('auto');
  assert.equal(api.getPreference(), 'auto');
  assert.equal(api.getLocale(), 'en');
});

test('a language change in one extension context reaches another open context', async () => {
  const storage = createStorage();
  const first = loadI18n({ languages: ['en-US'], storage });
  const second = loadI18n({ languages: ['en-US'], storage });
  await Promise.all([first.api.init(), second.api.init()]);
  await first.api.setPreference('zh-CN');
  assert.equal(second.api.getPreference(), 'zh-CN');
  assert.equal(second.api.getLocale(), 'zh-CN');
  assert.equal(second.api.t('captureCopied'), '已复制到剪贴板');
});

test('a browser language change refreshes automatic selection and notifies the open UI', async () => {
  const { api, context, browserListeners } = loadI18n({ languages: ['en-US'] });
  await api.init();
  const changes = [];
  api.onChange(() => changes.push(api.getLocale()));
  context.navigator.languages = ['fr-FR', 'zh-HK'];
  assert.equal(typeof browserListeners.get('languagechange'), 'function');
  browserListeners.get('languagechange')();
  assert.equal(api.getPreference(), 'auto');
  assert.equal(api.getLocale(), 'zh-CN');
  assert.deepEqual(changes, ['zh-CN']);
});

test('a browser language change preserves a manual selection without notifying the UI', async () => {
  const { api, context, browserListeners } = loadI18n({ languages: ['en-US'] });
  await api.init();
  await api.setPreference('en');
  let calls = 0;
  api.onChange(() => { calls += 1; });
  context.navigator.languages = ['zh-HK'];
  browserListeners.get('languagechange')();
  assert.equal(api.getPreference(), 'en');
  assert.equal(api.getLocale(), 'en');
  assert.equal(calls, 0);
});

test('a pending initial storage read cannot overwrite a newer storage change', async () => {
  const storage = createStorage({ languagePreference: 'en' });
  let completeRead;
  storage.local.get = () => new Promise(resolve => { completeRead = resolve; });
  const { api } = loadI18n({ languages: ['en-US'], storage });
  const initialization = api.init();
  storage.change('zh-CN');
  assert.equal(api.getLocale(), 'zh-CN');
  completeRead({ languagePreference: 'en' });
  await initialization;
  assert.equal(api.getPreference(), 'zh-CN');
  assert.equal(api.getLocale(), 'zh-CN');
});

test('failed storage reads still initialize using the browser language', async () => {
  const { api } = loadI18n({ languages: ['zh-CN'], storage: createStorage({}, { failRead: true }) });
  await api.init();
  assert.equal(api.getPreference(), 'auto');
  assert.equal(api.getLocale(), 'zh-CN');
});

test('failed storage writes preserve the current preference and locale', async () => {
  const { api } = loadI18n({ languages: ['zh-CN'], storage: createStorage({}, { failWrite: true }) });
  await api.init();
  let calls = 0;
  api.onChange(() => { calls += 1; });
  await Promise.resolve(api.setPreference('en')).catch(() => {});
  assert.equal(api.getPreference(), 'auto');
  assert.equal(api.getLocale(), 'zh-CN');
  assert.equal(calls, 0);
});

test('repeated or concurrent initialization does not duplicate storage listeners', async () => {
  const { api, storage } = loadI18n({ languages: ['en'] });
  await Promise.all([api.init(), api.init()]);
  await api.init();
  assert.equal(storage.listeners.size, 1);
});

test('translated error messages interpolate the supplied error in both languages', async () => {
  const { api } = loadI18n({ languages: ['zh-CN'] });
  await api.init();
  assert.equal(api.t('captureFailed', { error: 'Permission denied' }), '截图失败：Permission denied');
  await api.setPreference('en');
  assert.equal(api.t('captureFailed', { error: 'Permission denied' }), 'Screenshot failed: Permission denied');
});
