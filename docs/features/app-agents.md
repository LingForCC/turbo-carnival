# App Agents

App agents are a specialized agent type in Turbo Carnival that enable users to generate and execute interactive JavaScript + HTML applications through conversational AI.

## Overview

When an App-type agent is selected, the interface changes from the standard chat panel to a split-panel view:
- **Left Panel (25%)**: Chat interface for guiding the AI to build the app
- **Right Panel (75%)**: Live preview of the generated application

## Creating an App Agent

1. Select a project from the project panel
2. Click "Create Agent" in the project-agent-dashboard
3. Fill in the agent details:
   - **Name**: Unique identifier for the agent
   - **Type**: Select "App" from the dropdown
   - **Description**: What this app does
4. Save the agent

## App File Structure

Apps are stored as JSON files alongside their parent agent files:

**File Location**: `{projectFolder}/app-{agent-name}.json`

**File Structure**:
```json
{
  "name": "My App",
  "agentName": "My Agent",
  "html": "<div>App HTML here</div>",
  "rendererCode": "// JavaScript for renderer process\nconsole.log('App loaded');",
  "mainCode": "// JavaScript for main process\n",
  "data": {
    // Persistent app data
  },
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
```

### File Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | App name (matches agent name) |
| `agentName` | string | Links app to its parent agent |
| `html` | string | HTML structure of the app |
| `rendererCode` | string | JavaScript code that runs in the renderer (browser) process |
| `mainCode` | string | JavaScript code that can run in the main (Node.js) process |
| `data` | object | Persistent data storage for the app |
| `createdAt` | number | Timestamp when app was created |
| `updatedAt` | number | Timestamp when app was last modified |

## Chat Interface

The left panel provides a chat interface similar to the standard chat panel:

### Features
- **Message History**: Conversation is saved in the agent's `history` array
- **Streaming Responses**: Real-time streaming of AI responses
- **Code Parsing**: Automatically detects and extracts code blocks from AI responses
- **HTML Code Callouts**: HTML code blocks are displayed in collapsible gray-styled callouts labeled "App Code"
- **Clear Chat**: Clear the chat history (does not delete from agent file)

### Message Rendering

App agents use the `app-code-message` Web Component that:
- **Extracts HTML code blocks**: Detects ````html ... ```` blocks in AI responses
- **Renders HTML callouts**: Displays HTML code in gray-styled, collapsible callouts
- **Removes HTML from main content**: HTML blocks appear only in callouts, not in the main markdown content
- **Supports multiple blocks**: Multiple HTML blocks are numbered (App Code, App Code 2, etc.)
- **Renders remaining content as markdown**: All non-HTML content is rendered normally
- **Factory pattern**: Parent component (app-panel) injects save handler via closure

**Component Location**: `src/components/conversation/app-code-message.ts`

**Callout Styling:**
- Gray background (`bg-gray-100 dark:bg-gray-800`)
- Gray border (`border-gray-300 dark:border-gray-600`)
- Gray text (`text-gray-700 dark:text-gray-300`)
- Collapsible with rotating chevron icon

### Code Block Format

When the AI generates app code, it should use specific markdown code block tags:

````markdown
Here's the HTML structure:

```html
<div id="app">
  <h1>Hello World</h1>
  <button id="btn">Click Me</button>
</div>
```

Here's the JavaScript for the browser:

```renderer-js
document.getElementById('btn').addEventListener('click', () => {
  console.log('Button clicked!');
});
```

Here's the JavaScript for the main process:

```main-js
function saveData(data) {
  // This runs in Node.js
  return true;
}
```
````

## App Preview Panel

The right panel shows a live preview of the generated application.

### Preview Features

1. **Live Preview**: Shows the app running in an isolated iframe
2. **Code View**: Toggle to view the underlying HTML, JavaScript, and data
3. **Refresh/Reload**: Manually reload the app preview

### Code View Sections

When "Show Code" is enabled, the panel displays:

1. **HTML**: The app's HTML structure
2. **Renderer JavaScript**: Code that runs in the browser
3. **Main Process JavaScript**: Code that can execute in the Node.js main process
4. **Data**: Current persistent data stored in the app

## App Execution

### Renderer Process Execution

App code runs in an isolated iframe within the renderer process. This provides:

- **DOM Isolation**: App code cannot interfere with the main Turbo Carnival UI
- **CSS Isolation**: App styles don't leak to the main application
- **Sandboxed Context**: Separate JavaScript execution context
- **Easy Reload**: iframe can be reloaded to reset app state

### Main Process Execution

Apps can execute JavaScript code in the main process via the `window.electronAPI.executeAppMain()` method:

```javascript
// From app's rendererCode
const result = await window.electronAPI.executeAppMain(
  projectPath,
  agentName,
  'functionName',  // Name of function to call from mainCode
  [arg1, arg2]     // Arguments to pass
);
```

**Important**: Main process code has full Node.js access and can:
- Read/write files
- Make network requests
- Execute system commands
- Access native modules

### Data Persistence

Apps can persist data using the `window.electronAPI.updateAppData()` method:

```javascript
// Save data to app file
await window.electronAPI.updateAppData(
  projectPath,
  agentName,
  { key: 'value', count: 42 }
);
```

Data is stored in the app's `data` field and persists across app reloads.

## IPC Channels

### App Management

| Channel | Description |
|---------|-------------|
| `apps:get` | Load app for an agent |
| `apps:save` | Save or update app |
| `apps:delete` | Delete app file |
| `apps:executeMain` | Execute main process function |
| `apps:updateData` | Update app data |

### Usage Example

```javascript
// Get app
const app = await window.electronAPI.getApp(projectPath, agentName);

// Save app
await window.electronAPI.saveApp(projectPath, app);

// Delete app
await window.electronAPI.deleteApp(projectPath, agentName);

// Execute main process code
const result = await window.electronAPI.executeAppMain(
  projectPath,
  agentName,
  'myFunction',
  [arg1, arg2]
);

// Update app data
await window.electronAPI.updateAppData(
  projectPath,
  agentName,
  { counter: 10 }
);
```

## Security Considerations

⚠️ **Important**: App agents execute user-generated code with the following privileges:

- **Renderer Process**: Full DOM access within the iframe context
- **Main Process**: Full Node.js access including file system, network, and system commands

### Recommendations

1. **Trust**: Only create App agents for trusted AI assistants
2. **Review**: Review generated code before running critical operations
3. **Isolation**: Consider running untrusted apps in a separate environment
4. **Data Validation**: Validate all inputs from external sources

## Best Practices

### For AI Prompts

When creating an App agent, consider setting a custom system prompt:

```typescript
const defaultSystemPrompt = `You are an expert web application developer. You help users build interactive JavaScript + HTML applications.

When the user describes an app they want to build:
1. Ask clarifying questions if needed
2. Generate the HTML, JavaScript (renderer), and JavaScript (main process) code
3. Present the code in markdown code blocks with these tags:
   - \`\`\`html ... \`\`\` for HTML structure
   - \`\`\`renderer-js ... \`\`\` for JavaScript that runs in the browser
   - \`\`\`main-js ... \`\`\` for JavaScript that runs in Node.js (main process)

Guidelines:
- Keep HTML semantic and accessible
- Use vanilla JavaScript (no frameworks)
- Include error handling
- Comment complex logic
- Main process code should export functions that can be called from renderer
- Keep the UI simple and functional`;
```

### For App Development

1. **Start Simple**: Begin with basic HTML and incrementally add functionality
2. **Use Console**: Add `console.log()` statements to debug renderer code
3. **Test Incrementally**: Refresh the preview after each change
4. **Main Process**: Use main process code for file operations and network requests
5. **Data Storage**: Use the `data` field for app state persistence

## Example: Simple Counter App

Here's a complete example of a simple counter app:

**HTML**:
```html
<div id="counter-app">
  <h1>Counter: <span id="count">0</span></h1>
  <button id="increment">Increment</button>
  <button id="decrement">Decrement</button>
  <button id="save">Save</button>
</div>
```

**Renderer JavaScript**:
```javascript
let count = 0;

// Load saved count
window.electronAPI.getApp(projectPath, agentName).then(app => {
  if (app.data.count !== undefined) {
    count = app.data.count;
    updateDisplay();
  }
});

document.getElementById('increment').addEventListener('click', () => {
  count++;
  updateDisplay();
});

document.getElementById('decrement').addEventListener('click', () => {
  count--;
  updateDisplay();
});

document.getElementById('save').addEventListener('click', async () => {
  await window.electronAPI.updateAppData(projectPath, agentName, { count });
  alert('Count saved!');
});

function updateDisplay() {
  document.getElementById('count').textContent = count;
}
```

**Main Process JavaScript**:
```javascript
// Optional: Add main process functions here
function logCount(count) {
  console.log('Current count:', count);
}
```

## Troubleshooting

### App Preview Not Updating

1. Click the "Reload" button in the app preview header
2. Clear the chat and send a new message
3. Check that code blocks are properly formatted

### Code Not Detected

Ensure code blocks use the correct format:
- `````html` for HTML
- `````renderer-js` for renderer JavaScript
- `````main-js` for main process JavaScript

### Main Process Errors

1. Check the main process console (DevTools)
2. Ensure function names match between renderer and main code
3. Verify the function is properly exported in mainCode

## Related Files

- **Source Code**: `src/components/app-panel.ts`
- **Storage Module**: `src/main/app-management.ts`
- **Type Definitions**: `src/global.d.ts` (App interface)
- **Routing Logic**: `src/components/app-container.ts`
