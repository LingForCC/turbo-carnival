# Quick AI Feature

## Overview

Quick AI is a standalone conversation window that allows users to have quick AI conversations without creating agents beforehand. The feature is triggered by a global shortcut (Option+Q) and uses default model/provider settings configured in the app settings.

## Key Features

- **Global Shortcut**: Press `Option+Q` (macOS) or `Alt+Q` (Windows/Linux) to open/close the Quick AI window
- **No Agent Pre-creation**: Uses default model/provider from settings - no need to create agents first
- **Clean Conversation UI**: Simplified chat interface similar to conversation-panel
- **Error Handling**: Shows helpful error banner if default model/provider not configured
- **No Persistence**: Conversation data is lost when window closes (lightweight)
- **Dark Mode Support**: Syncs with app theme settings

## Architecture

### Main Process Modules

#### Quick AI Window Management (`src/main/quick-ai-window.ts`)

Manages the Quick AI BrowserWindow lifecycle:

- `createQuickAIWindow()`: Creates or returns existing window
- `showQuickAIWindow()`: Shows the window (creates if needed)
- `toggleQuickAIWindow()`: Toggles window visibility (used by global shortcut)
- `registerQuickAIGlobalShortcut()`: Registers Alt+Q global shortcut
- `unregisterQuickAIGlobalShortcut()`: Unregisters shortcut on app quit
- `closeQuickAIWindow()`: Destroys window on app quit

Window configuration:
- Size: 800x600
- Title: "Quick AI"
- Load: `quick-ai.html` (dev: `http://localhost:5173/quick-ai.html`, prod: `../dist-renderer/quick-ai.html`)
- Behavior: Hides on close (preserves in-memory state)

#### Quick AI Management (`src/main/quick-ai-management.ts`)

Handles IPC communication and conversation logic:

**IPC Channels:**

1. **`quick-ai:getAgent`** (invoke)
   - Returns: `Promise<Agent>` (in-memory Quick AI agent)
   - Gets or creates the in-memory Quick AI agent
   - Agent is created with empty system prompt and empty history
   - Agent config is populated from settings (providerId, modelId)

2. **`quick-ai:validateSettings`** (invoke)
   - Returns: `{ valid: boolean, error?: string }`
   - Validates default provider and model config are configured
   - Checks provider and model exist
   - Validates model type matches provider type

3. **`quick-ai:streamMessage`** (invoke)
   - Parameters: `message: string`
   - Returns: `Promise<string>` (full response)
   - Sends streaming events: `chat-chunk`, `chat-reasoning`, `chat-complete`, `chat-error`
   - Uses in-memory Agent for conversation history
   - Calls `streamLLM()` with `enableTools: false`

4. **`quick-ai:clearHistory`** (invoke)
   - Returns: `{ success: boolean }`
   - Resets in-memory agent (clears conversation history)

**In-Memory Agent:**
- Name: `'quick-ai'`
- Type: `'chat'`
- Description: 'Quick AI conversation agent'
- System prompt: Empty (for flexible conversations)
- History: In-memory only, not persisted
- Config: Loaded from settings (providerId, modelId)
- Settings: Empty object

### Preload Layer

#### Preload Module (`src/preload/quick-ai-management.ts`)

Exposes Quick AI API to renderer via `ipcRenderer`:

```typescript
export const quickAIManagement = {
  getAgent: () => ipcRenderer.invoke('quick-ai:getAgent'),
  streamMessage: (message, onChunk, onReasoning, onComplete, onError) => { ... },
  clearHistory: () => ipcRenderer.invoke('quick-ai:clearHistory'),
  validateSettings: () => ipcRenderer.invoke('quick-ai:validateSettings'),
  onWindowShown: (callback) => { ... }
};
```

Implements streaming delegates:
- Sets up IPC listeners for `chat-chunk`, `chat-reasoning`, `chat-complete`, `chat-error`
- Cleans up listeners on completion/error
- Returns promise for invoke call

### Renderer API Layer

#### Type Definitions (`src/types/quick-ai-management.d.ts`)

```typescript
export interface QuickAISettingsValidation {
  valid: boolean;
  error?: string;
}

export interface QuickAIManagementAPI {
  getAgent(): Promise<Agent>;
  streamMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: (content: string) => void,
    onError: (error: string) => void
  ): Promise<string>;
  clearHistory(): Promise<{ success: boolean }>;
  validateSettings(): Promise<QuickAISettingsValidation>;
  onWindowShown(callback: () => void): () => void;
}
```

#### API Wrapper (`src/api/quick-ai-management.ts`)

Type-safe wrapper for `window.electronAPI`:

```typescript
export function getQuickAIManagementAPI(): QuickAIManagementAPI
export const quickAIManagementAPI: QuickAIManagementAPI
```

### Renderer Components

#### Quick AI Window (`src/components/quick-ai-window.ts`)

Main UI component for Quick AI feature.

**State:**
- `settingsValid`: boolean - Whether settings are configured
- `settingsError`: string - Error message if settings invalid
- `isStreaming`: boolean - Whether currently streaming response
- `currentTheme`: 'light' | 'dark' - Current theme

**Features:**
- Loads theme from settings
- Validates settings on load and window show
- Shows error banner if settings not configured (with "Open Settings" button)
- Uses `conversation-panel` with custom message factories
- Gets in-memory Quick AI agent and passes it to conversation panel
- Handles `message-sent` events from conversation panel
- Streams responses via API with proper callback delegation
- Clear chat button to reset conversation

**Message Factories:**
- User message: Uses `UserMessage.create(content)`
- Assistant message: Uses `AssistantMessage.createWithHandlers(content, reasoning, copyHandler)`

**Agent Management:**
- Calls `api.getAgent()` to retrieve or create in-memory Quick AI agent
- Passes agent to conversation panel via `conversation.setAgent(agent, dummyProject)`
- Dummy project used since Quick AI doesn't have a real project context

#### HTML Entry Point (`quick-ai.html`)

```html
<quick-ai-window></quick-ai-window>
<script type="module" src="/src/quick-ai-renderer.ts"></script>
```

#### Renderer Entry (`src/quick-ai-renderer.ts`)

```typescript
import './styles.css';
import './components/conversation/conversation-panel';  // Required by quick-ai-window
import './components/quick-ai-window';
```

## Settings Integration

### Settings Dialog Enhancement

**File:** `src/components/settings-dialog.ts`

Added two new dropdowns after "Notepad Save Location":

1. **Default Provider Dropdown**
   - Label: "Quick AI Default Provider"
   - Populated from: `getProviderManagementAPI().getProviders()`
   - Saves to: `settings.defaultProviderId`
   - Clears model selection when changed

2. **Default Model Config Dropdown**
   - Label: "Quick AI Default Model"
   - Populated from: `getProviderManagementAPI().getModelConfigs()`
   - Saves to: `settings.defaultModelConfigId`

**Type Updates:** `src/types/settings-management.d.ts`

```typescript
export interface AppSettings {
  theme: 'light' | 'dark';
  notepadSaveLocation?: string;
  defaultModelConfigId?: string;  // NEW
  defaultProviderId?: string;     // NEW
}
```

## IPC Channel Reference

### Quick AI IPC Channels

| Channel | Type | Parameters | Returns | Events |
|---------|------|------------|---------|--------|
| `quick-ai:getAgent` | invoke | - | `Promise<Agent>` | - |
| `quick-ai:streamMessage` | invoke | `message: string` | `Promise<string>` | `chat-chunk`, `chat-reasoning`, `chat-complete`, `chat-error` |
| `quick-ai:clearHistory` | invoke | - | `{ success: boolean }` | - |
| `quick-ai:validateSettings` | invoke | - | `{ valid: boolean, error?: string }` | - |
| `quick-ai:windowShown` | send | - | - | - (one-way from main to renderer) |

### Streaming Events

Quick AI reuses existing chat streaming events:

- **`chat-chunk`**: Text chunk from AI response
- **`chat-reasoning`**: Reasoning/thinking content (if model supports it)
- **`chat-complete`**: Full response content (sent when streaming completes)
- **`chat-error`**: Error message (if streaming fails)

## Usage Flow

### First-Time Setup

1. User opens Settings dialog
2. Selects "Quick AI Default Provider" from dropdown
3. Selects "Quick AI Default Model" from dropdown
4. Settings are saved to `settings.json`

### Normal Usage

1. User presses `Option+Q` (macOS) or `Alt+Q` (Windows/Linux)
2. Quick AI window opens (or shows if already created)
3. Window validates settings:
   - If valid: Shows conversation interface
   - If invalid: Shows error banner with "Open Settings" button
4. User types message and sends
5. AI response streams in real-time
6. User can clear chat with "Clear Chat" button
7. User closes window (window hides, preserving state)
8. User presses `Option+Q` again to show window

### Settings Not Configured

1. User opens Quick AI window
2. Error banner shows at top: "Quick AI Not Configured"
3. Error message explains what's missing
4. "Open Settings" button opens settings dialog
5. After configuring settings, user closes and reopens Quick AI window

## Storage

- **Settings**: `app.getPath('userData')/settings.json`
  - `defaultProviderId`: ID of default LLM provider
  - `defaultModelConfigId`: ID of default model config
- **Conversation History**: Not stored (in-memory only)

## Global Shortcut

- **Shortcut**: `Alt+Q` (works as `Option+Q` on macOS)
- **Behavior**: Toggles Quick AI window visibility
- **Registration**: On app ready (`app.whenReady()`)
- **Unregistration**: On app will-quit
- **Conflict**: Fails silently if shortcut already registered by another app

## Error Handling

### Settings Validation Errors

1. **No provider configured**
   - Error: "Default provider not configured. Please open Settings and select a default provider for Quick AI."

2. **No model configured**
   - Error: "Default model not configured. Please open Settings and select a default model for Quick AI."

3. **Provider not found**
   - Error: "Default provider \"{id}\" not found. Please open Settings and select a valid provider."

4. **Model not found**
   - Error: "Default model \"{id}\" not found. Please open Settings and select a valid model."

5. **Model type mismatch**
   - Error: "Model type mismatch. Model \"{name}\" is of type \"{modelType}\" but provider \"{name}\" is of type \"{providerType}\". Please select a model that matches the provider type."

### Streaming Errors

- Caught by `onError` callback
- Displays error in console
- Resets `isStreaming` state
- Window remains open (user can retry)

## Dependencies

### Main Process

- `electron` (BrowserWindow, globalShortcut, ipcMain, app)
- `./main/settings-management` (loadSettings)
- `./main/provider-management` (getProviderById)
- `./main/model-config-management` (getModelConfigById)
- `./main/llm` (streamLLM)

### Renderer

- `./api/quick-ai-management` (getQuickAIManagementAPI)
- `./api/settings-management` (getSettingsManagementAPI)
- `./components/conversation/conversation-panel` (ConversationPanel)
- `./components/conversation/user-message` (UserMessage)
- `./components/conversation/assistant-message` (AssistantMessage)
