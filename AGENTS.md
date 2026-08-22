# ParrotLingo Developer & Agent Guide (AGENTS.md)

This document defines the core architecture, guiding principles, development workflow, and coding conventions for **ParrotLingo** (a local-first English learning desktop application with an AI selection assistant).

---

## Guiding Principles (MUST FOLLOW)

### Mindset

How to approach any coding task in this repository:

#### Think Before Coding

- State assumptions explicitly. If uncertain about product behavior or design, clarify before implementing.
- When multiple architectural solutions exist, evaluate trade-offs and choose the cleanest, most maintainable one.
- If a simpler approach exists, propose it. Push back on unnecessary complexity.

#### Simplicity First

- Write the minimum code that solves the problem robustly. Nothing speculative.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios.
- Keep inline comments focused and concise (≤ 2 lines). Explain _why_, not _what_.

#### Surgical Changes

- Touch only what the task requires. Do not accidentally alter adjacent code, formatting, or unrelated logic.
- Do not refactor code that is working as intended unless explicitly asked.
- Match existing repository patterns and code style.
- Clean up any imports, variables, or functions that your changes orphaned.

#### Goal-Driven Execution

- Convert tasks into verifiable checkpoints before coding:
  - "Add feature X" → "Define IPC / store types, implement UI + backend handler, verify with `pnpm typecheck`."
  - "Fix bug Y" → "Identify root cause across process boundaries (Main ↔ Preload ↔ Renderer), apply fix, verify in app."
- For multi-step tasks, state a structured execution plan.

---

## Operational Rules

- **Strict 5-Language i18n**: The application supports exactly **5 languages**:
  1. 🇨🇳 简体中文 (`zh-CN`)
  2. 🇭🇰 繁體中文 (`zh-TW`)
  3. 🇺🇸 English (`en-US`)
  4. 🇯🇵 日本語 (`ja-JP`)
  5. 🇰🇷 한국어 (`ko-KR`)
     **Zero Hardcoded Strings**: All user-facing text, buttons, titles, tooltips, placeholders, and error messages MUST use `t('namespace.key')` and be maintained in all 5 locale files under `src/renderer/src/i18n/locales/`.
- **Dynamic Primary Theme System**: Color tokens are dynamically injected via CSS variables (`--color-primary`, `--color-primary-hover`, `--color-primary-subtle`, `--color-primary-border`, `--color-primary-foreground`). Always use these tokens for key highlights, active states, and interactive accents.
- **IPC Layer Separation**: Never expose raw `ipcRenderer` to renderer components. All IPC calls and listeners must be declared in `src/preload/index.ts` and typed in `src/renderer/src/types/index.ts` (`window.api.*`, `window.events.*`).
- **Local-First Data Storage**: All user corpus data and configurations are stored locally via `better-sqlite3` and JSON storage. No unexpected telemetry or remote data collection without user authorization.
- **Verification Requirement**: Always verify code changes with `pnpm typecheck` before finishing.

---

## Technology Stack

| Layer                   | Technology                                                                          |
| :---------------------- | :---------------------------------------------------------------------------------- |
| **Runtime & Shell**     | Electron 39 + Node.js 22                                                            |
| **Bundler & Tooling**   | electron-vite 5 + Vite 7 + TypeScript 5.9                                           |
| **Frontend Framework**  | React 19 + Radix UI + Lucide React                                                  |
| **Styling & Design**    | Tailwind CSS v4 + Vanilla CSS Variables (Modern desktop aesthetic)                  |
| **State Management**    | Zustand 5 (with cross-window IPC broadcast)                                         |
| **Localization (i18n)** | i18next + react-i18next (5 locales)                                                 |
| **Local Database**      | better-sqlite3 13                                                                   |
| **System Integration**  | macOS Accessibility APIs, global shortcut hooks (`uiohook-napi` / `selection-hook`) |

---

## Development Commands

```bash
# Start development server with live reload & HMR
pnpm dev

# Run TypeScript type check across Node (Main/Preload) and Web (Renderer)
pnpm typecheck

# Code formatting & linting
pnpm format
pnpm lint

# Production build and packaging
pnpm build
pnpm build:mac     # macOS DMG & Zip
pnpm build:win     # Windows NSIS Installer
pnpm build:linux   # Linux AppImage / Deb
```

---

## Architecture & Code Conventions

### 1. Multi-Window Architecture

ParrotLingo operates a decoupled multi-window system coordinated by `src/main/windows/`:

```
┌────────────────────────────────────────────────────────┐
│                      Main Process                      │
│  - selectionCoordinator.ts (Accessibility & OCR/Text)  │
│  - windowManager.ts (Window lifecycle & routing)       │
│  - registerIpc.ts (IPC Router & Database operations)   │
└──────────────┬──────────────────┬──────────────────────┘
               │                  │
      ┌────────▼────────┐   ┌─────▼───────────────┐
      │  Workbench Win  │   │  Selection Windows  │
      │  - CorpusView   │   │  - Toolbar Capsule  │
      │  - SettingsView │   │  - Action Popup     │
      │  - ReadingView  │   │    (Pinned / Blur)  │
      └─────────────────┘   └─────────────────────┘
```

1. **Main Workbench Window** (`getMainWindow()`):
   - Comprehensive dashboard, corpus management, model provider configurations, and application preferences.
   - Preserves window state when minimized or hidden to tray.
2. **Selection Floating Toolbar** (`getSelectionToolbarWindow()`):
   - Ultra-fast popup capsule hovering near cursor when text is selected.
   - Supports compact mode (icons only) and standard mode (icons + labels).
   - Prewarmed and hidden offscreen to eliminate display latency.
3. **Selection Action Popup Window** (`getSelectionWindow()`):
   - Displays AI translations, deep explanations, phonetic guides, and native expression alternatives.
   - Features pinned mode (`isPinned`), opacity adjustment (`20% - 100%`), native traffic-light padding (`style={{ paddingLeft: '78px' }}` on macOS), and smooth blur transitions.
   - Independent window instances: multiple action windows or pinned views can remain open without content crosstalk.

---

### 2. IPC & Type Safety Conventions

- **Preload Isolation**: `src/preload/index.ts` exposes safe API bridges via `contextBridge.exposeInMainWorld`:
  - `window.api.selection`: Text selection queries and toolbar control.
  - `window.api.settings`: Fetching, updating, and resetting user settings.
  - `window.api.corpus`: CRUD operations on local vocabulary items.
  - `window.api.providers`: AI provider listing, key configuration, and connection testing.
  - `window.api.windowControl`: Minimize, maximize, close, pin, opacity, and window navigation.
  - `window.events`: Event subscriptions (`settings:changed`, `selection:changed`, etc.).

---

### 3. Theme & Color Token Architecture

Follows the dynamic theme architecture (`src/renderer/src/utils/theme.ts`):

- **7 Preset Accent Colors**: Emerald (`#10B981`), Ocean Blue (`#3B82F6`), Royal Purple (`#8B5CF6`), Rose Pink (`#F43F5E`), Amber Orange (`#F59E0B`), Teal Cyan (`#14B8A6`), Slate (`#64748B`), plus custom Hex input.
- **CSS Variables Injected on Root**:
  - `--color-primary`: Main theme color.
  - `--color-primary-hover`: 10% darker / lighter variant for hover interactions.
  - `--color-primary-subtle`: 12% opacity tint for badges and selected backgrounds.
  - `--color-primary-border`: 25% opacity border.
  - `--color-primary-foreground`: Calculated contrast foreground (`#ffffff` or `#0f172a`).

---

### 4. i18n Localization Guidelines

- Locale files are organized in `src/renderer/src/i18n/locales/`:
  - `zh-CN.ts` — 简体中文
  - `zh-TW.ts` — 繁體中文
  - `en-US.ts` — English (US)
  - `ja-JP.ts` — 日本語
  - `ko-KR.ts` — 한국어
- When adding new features or UI strings:
  1. Add translation keys to `zh-CN.ts`.
  2. Provide accurate translations across `zh-TW.ts`, `en-US.ts`, `ja-JP.ts`, and `ko-KR.ts`.
  3. Reference in components via `const { t } = useTranslation();` and `t('namespace.key')`.

---

### 5. Local Database & State Persistence

- **SQLite Engine**: Powered by `better-sqlite3` (`src/main/db/sqliteStorage.ts`).
- **Data Entities**:
  - `corpus_items`: Word/phrase, phonetic, translation, context sentence, tags, native alternative collocations, source application, and timestamp.
  - `settings`: System startup, proxy settings, theme mode, theme color, selection preferences, and AI provider credentials.
- **Store Sync**: When a setting or corpus item is updated, the Main process broadcasts changes via `settings:changed` / `corpus:changed` so all open windows synchronize state immediately.

---

## Directory Structure

```text
parrot-lingo/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── db/                  # SQLite schema, migrations, and settings repository
│   │   ├── ipc/                 # IPC handlers (selection, providers, settings, windowControl)
│   │   ├── selection/           # macOS accessibility selection hook & text extraction
│   │   ├── services/            # Built-in AI provider service & LLM streaming
│   │   ├── windows/             # Window managers (workbench, selection toolbar, action popup, tray)
│   │   └── index.ts             # Application entry, lifecycle & single instance lock
│   ├── preload/                 # Electron Preload Scripts
│   │   ├── index.ts             # API and event bridge exposure
│   │   └── index.d.ts           # Global Window type declarations
│   └── renderer/                # React Frontend (Vite)
│       └── src/
│           ├── assets/          # Global styles, Tailwind CSS, icons & logo
│           ├── components/      # UI components (Radix primitives, ColorPicker, AccessibilityModal)
│           ├── i18n/            # i18n configuration and 5 locale bundles
│           ├── layouts/         # App Sidebar, TitleBar, and window containers
│           ├── pages/
│           │   ├── workbench/   # CorpusView, ReadingView, NotebookView
│           │   ├── settings/    # General, Selection, Models, Appearance, Privacy, About
│           │   └── selection/   # SelectionToolbar, SelectionPopup
│           ├── stores/          # Zustand application store (useAppStore)
│           ├── types/           # Shared TypeScript interfaces & types
│           └── utils/           # Theme manager, shortcut helper, formatting
├── AGENTS.md                    # Agent & developer guidelines (this file)
├── package.json                 # Project dependencies & build scripts
├── electron.vite.config.ts      # Electron-Vite configuration
└── tsconfig.json                # TypeScript root configuration
```
