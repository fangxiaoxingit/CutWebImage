[中文](README.md) | **English**

# CutWebImage - Web Screenshot Tool

A Chrome browser extension: click the floating ball, drag to select an area, and capture screenshots to clipboard in one click.

## Features

- **Floating Ball Entry** — A green floating ball in the top-right corner of any page; draggable with auto edge-snapping
- **Rectangle Selection** — Click the ball to activate an overlay; drag to draw a rectangle with real-time size display
- **Pixel-Perfect Capture** — Uses Chrome's `captureVisibleTab` API for pixel-level accurate screenshots
- **Auto Copy to Clipboard** — Screenshots are automatically copied to clipboard for instant pasting
- **Retina Support** — Automatically handles `devicePixelRatio` for crisp screenshots on high-DPI displays
- **History Records** — All screenshots are saved automatically; view, re-copy, download, or open original URL
- **Image Preview** — Click a history card for large preview; supports copy/download/jump to source
- **Batch Management** — History list supports select all, deselect all, and batch delete
- **Lightweight & Reliable** — Zero dependencies for core features; only JSZip used for batch export; pure vanilla JS, no build step required
- **Configurable Shortcut** — Enable/disable keyboard shortcut (default `Ctrl+Shift+C`); customize the letter key; control floating ball visibility when shortcut is on
- **English and Chinese UI** — Follows your browser language by default; switch to English or Chinese in the popup, with live updates to history and capture messages

## Installation

### Direct Download (Recommended)

1. Go to the [Releases page](https://github.com/fangxiaoxingit/CutWebImage/releases) and download the latest `.zip` file

2. Extract the zip file to any local directory

3. Open Chrome and visit `chrome://extensions/`

4. Enable **Developer mode** in the top-right corner

5. Click **Load unpacked** and select the extracted directory

6. Done! A green floating ball will appear on all web pages

### Local Development

1. Clone this repository:
   ```bash
   git clone https://github.com/fangxiaoxingit/CutWebImage.git
   ```

2. Open Chrome and visit `chrome://extensions/`

3. Enable **Developer mode** in the top-right corner

4. Click **Load unpacked** and select the `CutWebImage` directory

5. Done! A green floating ball will appear on all web pages

## Usage

| Action | Description |
|--------|-------------|
| Click floating ball | Enter capture mode with a semi-transparent overlay |
| Drag mouse | Draw a rectangle selection with real-time size display |
| Release mouse | Screenshot auto-copies to clipboard with a Toast notification |
| Drag floating ball | Move the ball; auto-snaps to nearest edge on release |
| `Ctrl+Shift+C` | Keyboard shortcut to enter capture mode (must be enabled in Popup) |
| Press Esc | Cancel capture and exit capture mode |
| Click toolbar icon | Open Popup panel to manage shortcut settings and history |

### Shortcut Settings

Click the toolbar icon to open the Popup and configure:

| Setting | Description |
|---------|-------------|
| Shortcut toggle | Disabled by default; once enabled, press the shortcut on any page to enter capture mode |
| Custom letter key | Default `C`; can be changed to any letter A–Z; shortcut format: `Ctrl+Shift+[letter]` |
| Floating ball visibility | Only visible when shortcut is enabled; allows separate control of ball show/hide |

> When the shortcut is disabled, the floating ball is always shown to ensure a capture entry point is available.

### Language Settings

Click the extension's toolbar icon and use the language selector in the popup:

| Option | Behavior |
|--------|----------|
| Follow browser (default) | Uses the first supported browser language preference, then checks the browser's primary and UI language; falls back to English if none is supported |
| 中文 | Always uses Simplified Chinese for the popup, history page, and capture messages |
| English | Always uses English for the popup, history page, and capture messages |

Your manual choice is saved locally in the extension's settings for this browser and persists across popup openings and browser restarts. Select **Follow browser** to restore automatic detection. Chinese variants such as `zh-CN`, `zh-TW`, and `zh-HK` all use the Simplified Chinese interface. Switching languages preserves screenshots, selected history items, and shortcut settings. Captured page titles retain their original text.

Chrome controls the extension name and description on its extensions management page using the browser's UI language; the popup's manual language setting applies to the extension's own interface. After updating, reload the extension at `chrome://extensions/` and refresh existing web pages to load the new language module.

## Project Structure

```
CutWebImage/
├── manifest.json                  # Chrome Extension Manifest V3 config
├── _locales/                      # English and Chinese extension name and description
├── .github/
│   └── workflows/
│       └── package.yml            # GitHub Actions auto-package workflow
├── background/
│   └── service-worker.js          # Service Worker (screenshot + IndexedDB storage)
├── content/
│   ├── content.js                 # Content script (floating ball, overlay, selection, crop, shortcut, toast)
│   └── content.css                # Global injected styles
├── history/
│   ├── history.html               # History records page
│   ├── history.css                # History page styles
│   └── history.js                 # History page logic
├── lib/
│   ├── i18n.js                    # Shared translations, language detection, and settings sync
│   ├── storage.js                 # IndexedDB storage module
│   └── jszip.min.js               # JSZip library (batch export)
├── popup/
│   ├── popup.html                 # Toolbar popup (with shortcut settings UI)
│   ├── popup.css                  # Popup styles
│   └── popup.js                   # Popup logic (history + shortcut settings)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Technical Highlights

- **Manifest V3** — Uses the latest Chrome extension specification
- **Shadow DOM** — Floating ball and Toast use Shadow DOM encapsulation to prevent CSS conflicts with host pages
- **captureVisibleTab** — Chrome native screenshot API; pixel-accurate, no third-party libraries required
- **IndexedDB** — Stores screenshot Blob data; supports large-scale image storage without localStorage limits
- **Event-based scroll prevention** — Capture mode blocks scrolling via wheel/touch/keyboard event interception without modifying `overflow`, compatible with all page layouts

## Privacy

CutWebImage respects and protects your privacy:

- **Local-only storage** — All screenshot data is saved only in your browser's IndexedDB; **never uploaded to any server**
- **Zero data collection** — The extension collects no user data and does not track behavior
- **No external communication** — The extension does not access any external services or third-party APIs
- **Full data control** — Screenshot history is stored locally only; uninstalling the extension or clearing browser data removes all records

### Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Only used to capture the visible area of the current page |
| `clipboardWrite` | Only used to write screenshot images to the system clipboard |
| `unlimitedStorage` | Used for local IndexedDB storage of screenshot history |
| `storage` | Used to store user settings: interface language, shortcut toggle, custom letter key, floating ball visibility |
| `<all_urls>` | Used to inject the floating ball and capture functionality on all web pages |

## Development Checks

No build step is required. Run the automated checks for browser language detection, saved preferences, cross-page updates, and storage failure fallback with Node.js:

```bash
node --test tests/*.test.cjs
```

After loading the extension in Chrome, check the popup, shortcut editor, empty history page, image preview, batch actions, and capture messages in both English and Chinese.

## License

MIT
