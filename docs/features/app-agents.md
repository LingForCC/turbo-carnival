# App Agents

App agents are a specialized agent type in Turbo Carnival that enable users to generate and preview interactive HTML applications through conversational AI.

## Overview

When an App-type agent is selected, the interface changes from the standard chat panel to a conditional layout:
- **Default View**: Full-width conversation panel for guiding the AI to build the app
- **Preview View**: Full-width live preview of the generated HTML application (accessed via "View App" button in app code callouts)

## Creating an App Agent

1. Select a project from the project panel
2. Click "Create Agent" in the project-agent-dashboard
3. Fill in the agent details:
   - **Name**: Unique identifier for the agent
   - **Type**: Select "App" from the dropdown
   - **Description**: What this app does
4. Save the agent

## Chat Interface

The default view provides a full-width conversation panel for interacting with the AI:

### Features
- **Message History**: Conversation is saved in the agent's `history` array
- **Streaming Responses**: Real-time streaming of AI responses
- **Code Parsing**: Automatically detects and extracts HTML code blocks from AI responses
- **HTML Code Callouts**: HTML code blocks are displayed in indigo-styled callouts labeled "App Code"
- **View App Button**: Eye icon button in each callout to open the app preview in full-screen mode
- **Clear Chat**: Clear the chat history (does not delete from agent file)

### Message Rendering

App agents use the `app-code-message` Web Component that:
- **Extracts HTML code blocks**: Detects ````html ... ```` blocks in AI responses
- **Renders HTML callouts**: Displays HTML code in indigo-styled callouts with a "View App" button
- **Removes HTML from main content**: HTML blocks appear only in callouts, not in the main markdown content
- **Supports multiple blocks**: Multiple HTML blocks are numbered (App Code, App Code 2, etc.)
- **Renders remaining content as markdown**: All non-HTML content is rendered normally
- **Factory pattern**: Parent component (app-panel) injects save and view app handlers via closure

**Component Location**: `src/components/conversation/app-code-message.ts`

**Callout Styling:**
- Indigo background (`bg-indigo-50 dark:bg-indigo-900/30`)
- Indigo border (`border-indigo-200 dark:border-indigo-700`)
- Indigo icon and text (`text-indigo-600 dark:text-indigo-400`)
- Eye icon button to open app preview

### Code Block Format

When the AI generates app code, it should use HTML markdown code blocks:

````markdown
Here's the HTML structure for your app:

```html
<div id="app">
  <h1>Hello World</h1>
  <button id="btn">Click Me</button>
  <script>
    document.getElementById('btn').addEventListener('click', () => {
      alert('Button clicked!');
    });
  </script>
</div>
```
````

## App Preview Panel

The preview view shows a full-screen live preview of the generated HTML application, accessed by clicking the "View App" button in an app code callout.

### Opening the Preview

1. When an AI response contains HTML code blocks, they appear in indigo-styled "App Code" callouts
2. Click the eye icon button in any callout to open the app preview
3. The preview covers the entire panel, replacing the conversation view
4. Click the back arrow button in the preview header to return to the conversation

### Preview Features

1. **Live Preview**: Shows the app running in an isolated iframe
2. **Code View**: Toggle to view the underlying HTML source
3. **Refresh/Reload**: Manually reload the app preview
4. **Close Preview**: Back arrow button returns to conversation view

### Code View Sections

When "Show Code" is enabled, the panel displays:

1. **HTML**: The app's HTML structure (including any embedded JavaScript and CSS)

## App Execution

### Renderer Process Execution

App code runs in an isolated iframe within the renderer process. This provides:

- **DOM Isolation**: App code cannot interfere with the main Turbo Carnival UI
- **CSS Isolation**: App styles don't leak to the main application
- **Sandboxed Context**: Separate JavaScript execution context
- **Easy Reload**: iframe can be reloaded to reset app state

### Limitations

Apps run entirely in the browser (renderer process) and cannot:
- Access the Node.js main process
- Read/write files directly
- Make network requests to arbitrary servers (same-origin policy applies)
- Access native modules

All functionality must be implemented using standard web technologies (HTML, CSS, JavaScript).

## IPC Channels

### App Agent Streaming

| Channel | Description |
|---------|-------------|
| `app-agent:streamMessage` | Stream app agent message with files context |
| `app-agent:clearHistory` | Clear app agent conversation history |

### Usage Example

```javascript
// Stream app agent message
await window.electronAPI.streamAppAgentMessage(
  projectPath,
  agentName,
  message,
  filePaths,  // Optional: array of file paths for context
  onChunk,    // Callback for streaming text chunks
  onReasoning,// Callback for reasoning content
  onComplete, // Callback when streaming completes
  onError     // Callback for errors
);
```

## Security Considerations

⚠️ **Important**: App agents execute user-generated HTML/JavaScript with the following privileges:

- **Renderer Process**: Full DOM access within the iframe context
- **Same-Origin Policy**: Restricted to iframe origin
- **No Main Process Access**: Cannot execute Node.js code

### Recommendations

1. **Trust**: Only create App agents for trusted AI assistants
2. **Review**: Review generated code before running critical operations
3. **Isolation**: Apps run in iframes for security isolation
4. **Data Validation**: Validate all inputs from external sources

## Best Practices

### For AI Prompts

When creating an App agent, consider setting a custom system prompt:

```typescript
const defaultSystemPrompt = `You are an expert web application developer. You help users build interactive HTML applications.

When the user describes an app they want to build:
1. Ask clarifying questions if needed
2. Generate the HTML code (including embedded CSS and JavaScript)
3. Present the code in markdown code blocks with the tag:
   - \`\`\`html ... \`\`\` for HTML structure

Guidelines:
- Keep HTML semantic and accessible
- Use vanilla JavaScript (no frameworks)
- Include CSS in <style> tags within the HTML
- Include JavaScript in <script> tags within the HTML
- Add error handling where appropriate
- Comment complex logic
- Keep the UI simple and functional`;
```

### For App Development

1. **Start Simple**: Begin with basic HTML and incrementally add functionality
2. **Use Console**: Add `console.log()` statements to debug code (check browser DevTools)
3. **Test Incrementally**: Refresh the preview after each change
4. **Embedded Code**: Include CSS and JavaScript directly in the HTML file
5. **No Persistence**: Apps do not persist data between sessions (use localStorage if needed)

## Example: Simple Counter App

Here's a complete example of a simple counter app:

```html
<div id="counter-app">
  <style>
    #counter-app {
      font-family: sans-serif;
      padding: 20px;
      text-align: center;
    }
    button {
      margin: 5px;
      padding: 10px 20px;
      font-size: 16px;
    }
  </style>

  <h1>Counter: <span id="count">0</span></h1>
  <button id="increment">Increment</button>
  <button id="decrement">Decrement</button>
  <button id="reset">Reset</button>

  <script>
    // Load saved count from localStorage
    let count = parseInt(localStorage.getItem('counter') || '0');
    updateDisplay();

    document.getElementById('increment').addEventListener('click', () => {
      count++;
      updateDisplay();
      saveCount();
    });

    document.getElementById('decrement').addEventListener('click', () => {
      count--;
      updateDisplay();
      saveCount();
    });

    document.getElementById('reset').addEventListener('click', () => {
      count = 0;
      updateDisplay();
      saveCount();
    });

    function updateDisplay() {
      document.getElementById('count').textContent = count;
    }

    function saveCount() {
      localStorage.setItem('counter', count.toString());
    }
  </script>
</div>
```

## Troubleshooting

### App Preview Not Updating

1. Click the "Reload" button in the app preview header
2. Clear the chat and send a new message
3. Check that code blocks are properly formatted with `````html

### Code Not Detected

Ensure code blocks use the correct format:
- `````html` for HTML structure
- JavaScript should be embedded in `<script>` tags within the HTML
- CSS should be embedded in `<style>` tags within the HTML

### JavaScript Errors

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Check the Console tab for error messages
3. Verify JavaScript syntax is correct
4. Ensure DOM elements exist before attaching event listeners

## Related Files

- **Source Code**: `src/components/app-panel.ts`
- **Message Component**: `src/components/conversation/app-code-message.ts`
- **Type Definitions**: `src/types/agent-management.d.ts` (Agent types)
- **Routing Logic**: `src/components/app-container.ts`
- **IPC Handlers**: `src/main/app-agent-management.ts`
