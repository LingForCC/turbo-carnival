# Conversational AI Feature

The app provides a complete chat interface for interacting with AI agents through OpenAI-compatible APIs.

## Chat Features

- **Streaming responses** - Real-time token streaming with loading indicators
- **Conversation persistence** - Messages stored in agent `history` array
- **Context awareness** - System prompt + full conversation history sent with each message
- **Tool calling** - AI agents can call custom tools during conversations (chat agents only)
- **Tool call indicators** - Visual display of tool execution status, parameters, results, and errors
- **File tagging** - Reference .txt and .md files from project folder as conversation context (see [file-tagging.md](./file-tagging.md))
- **Error handling** - Graceful timeout and error message display
- **Message management** - Clear chat with confirmation, automatic scroll to latest
- **Event-driven architecture** - `conversation-panel` dispatches events, parents handle IPC

## Agent Types

The chat system supports two distinct agent types:

### Chat Agents
- **Purpose**: General conversational AI with tool calling capabilities
- **Features**:
  - Can call custom tools during conversations
  - File context via @mention
  - Full OpenAI tool calling support
- **IPC Channel**: `chat-agent:streamMessage`
- **Module**: `src/main/chat-agent-management.ts`

### App Agents
- **Purpose**: Generate interactive JavaScript + HTML applications
- **Features**:
  - File context via @mention
  - NO tool calling (lighter weight, focused on app generation)
  - App code parsing (HTML, renderer JS, main process JS)
- **IPC Channel**: `app-agent:streamMessage`
- **Module**: `src/main/app-agent-management.ts`

## Chat UI Components

The chat functionality is built on a reusable `conversation-panel` component:

### conversation-panel
Reusable Web Component that provides:
- Message container with automatic scrolling
- User and assistant message bubbles with different styling
- Loading indicator during streaming
- **Tool call indicators** - Visual display of tool execution with status, parameters, results, and execution time
- **Optional file tagging** area with removable badges (configurable via `enable-file-tagging` attribute)
- **Optional autocomplete dropdown** for @mention file selection
- Send button with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Configurable placeholder text
- Empty state always shows "Start a conversation!" with chat icon
- **Event-driven**: Dispatches `message-sent` events instead of calling IPC directly
- Public methods for parent control: `handleStreamChunk()`, `handleStreamComplete()`, `handleStreamError()`, `clearChat()`, `handleToolCallComplete()`, `handleToolCallFailed()`

### Usage Examples

**chat-panel** (chat agent, with file tagging):
```html
<conversation-panel
  enable-file-tagging="true"
  placeholder="Type @ to mention files..."
  model-info="gpt-4">
</conversation-panel>
```

**app-panel** (app agent, without file tagging):
```html
<conversation-panel
  placeholder="Describe the app you want to build...">
</conversation-panel>
```

## Message Flow (Event-Driven Architecture)

### Chat Agent Flow (with Tools)

1. User enters message in `conversation-panel` text area (optionally tags files via @mention if enabled)
2. `conversation-panel` validates API key (if required) and dispatches `message-sent` custom event with:
   - `projectPath` - Project folder path
   - `agentName` - Agent name
   - `message` - User message
   - `filePaths` - Array of tagged file paths
3. Parent component (`chat-panel`) listens for `message-sent` event
4. `chat-panel` calls `chat-agent:streamMessage` via IPC
5. `chat-agent-management` module:
   - Loads agent and validates API key
   - Builds messages: system prompt + **tool descriptions** + file contents + conversation history + new message
   - Calls OpenAI API via `openai-client.ts`
   - **For streaming**: Adds empty assistant message, calls parent's `handleStreamChunk()` for each chunk
   - **Detects tool calls**: Emits `chat-agent:toolCall` IPC events for each tool call status update
   - **Tool execution**: Executes tools, saves tool call messages to history with `toolCall` metadata
   - Makes follow-up API call with tool results (formatted as user messages)
   - Calls parent's `handleStreamComplete()` when done
6. `chat-panel` listens for `chat-agent:toolCall` IPC events and calls corresponding `conversation-panel` methods:
   - `handleToolCallComplete()` - Shows collapsed tool call indicator with results and execution time
   - `handleToolCallFailed()` - Shows collapsed tool call indicator with error message
7. `conversation-panel` updates UI in real-time, renders tool call messages with visual indicators
8. Parent components can listen for `stream-complete` to trigger additional processing

### App Agent Flow (Files Only, No Tools)

1. User enters message in `conversation-panel` text area
2. `conversation-panel` dispatches `message-sent` event (same as chat agent)
3. Parent component (`app-panel`) listens for `message-sent` event
4. `app-panel` calls `app-agent:streamMessage` via IPC
5. `app-agent-management` module:
   - Loads agent and validates API key
   - Builds messages: system prompt + **file contents** + conversation history + new message
   - NO tool descriptions (app agents don't use tools)
   - Calls OpenAI API via `openai-client.ts`
   - Streams response to parent via `handleStreamChunk()`
   - Calls `handleStreamComplete()` when done
6. `app-panel` listens for `stream-complete` event
7. On `stream-complete`, `app-panel` parses AI response for app code blocks:
   - ````html ... ```` - HTML content
   - ````renderer-js ... ```` - Renderer process JavaScript
   - ````main-js ... ```` - Main process JavaScript
   - Saves updated app and re-renders preview

## Architecture Benefits

The new event-driven architecture provides:

1. **Separation of Concerns**:
   - `conversation-panel` - Pure UI component, no IPC logic
   - `chat-panel` / `app-panel` - Business logic and IPC routing
   - `chat-agent-management` / `app-agent-management` - Agent-specific message handling

2. **Reusability**:
   - `conversation-panel` can be used in multiple contexts (chat-panel, app-panel, future panels)
   - Parent components control IPC routing and behavior

3. **Testability**:
   - `conversation-panel` can be tested by mocking events, no IPC mocking required
   - Agent management modules can be tested independently

4. **Flexibility**:
   - Easy to add new agent types with different capabilities
   - Parent components can customize behavior (e.g., `app-panel` parsing app code)

## OpenAI Client Module

Located in `src/main/openai-client.ts`:

### API Client Functions (Exported Utilities)
- `streamOpenAICompatibleAPI()` - Makes streaming API requests with SSE parsing
- `parseToolCalls()` - Parses tool call markers from AI responses
- `executeToolWithRouting()` - Executes tools in worker or renderer based on environment

**Note:** `openai-client.ts` is now a pure API client. Business logic (system prompt generation, file loading, tool description formatting) has been moved to `chat-agent-management.ts` and `app-agent-management.ts`.

## Chat Agent Management Module

Located in `src/main/chat-agent-management.ts`:

### Key Functions
- `generateChatAgentSystemPrompt(agent)` - Builds system prompt including tool descriptions
- `formatToolDescriptions(tools)` - Formats available tools for AI consumption
- `buildFileContentMessages(filePaths)` - Loads tagged files as system messages
- `buildMessagesForChatAgent(agent, message, filePaths)` - Complete message array with tools + files

### IPC Handlers
- `chat-agent:streamMessage` - Streaming with tool detection and execution
- `chat-agent:toolCall` - Real-time tool call status updates (one-way IPC from main to renderer)
  - Sent when tool execution starts, completes, or fails
  - Includes tool name, parameters, status, result/error, and execution time

## App Agent Management Module

Located in `src/main/app-agent-management.ts`:

### Key Functions
- `generateAppAgentSystemPrompt(agent)` - Returns agent's system prompt (no tools)
- `buildFileContentMessages(filePaths)` - Loads tagged files as system messages
- `buildMessagesForAppAgent(agent, message, filePaths)` - Complete message array with files only

### IPC Handlers
- `app-agent:streamMessage` - Streaming (no tool logic)

## Tool Calling (Chat Agents Only)

AI agents can call custom tools during conversations:

**Tool Call Format:**
AI agents output tool calls as JSON objects: `{"toolname":"tool_name","arguments":{"param":"value"}}`

**Tool Call Detection:**
- Streaming detects tool calls by checking for `"toolname"` key in response chunks
- Tool call deduplication removes duplicate tool calls with same tool name and parameters before execution

**Tool Execution Flow:**
1. `chat-agent-management` detects tool call in AI response
2. Saves assistant message to history with `toolCall` metadata (type: 'start')
3. Tool call parsed via `parseToolCalls()`
4. Tool executed via `executeToolWithRouting()` (Node.js worker or browser)
5. On success:
   - Emits `chat-agent:toolCall` IPC event with `status: 'completed'` and results
   - Saves user message to history with `toolCall` metadata (type: 'result', status: 'completed', result, executionTime, parameters)
6. On failure:
   - Emits `chat-agent:toolCall` IPC event with `status: 'failed'` and error
   - Saves user message to history with `toolCall` metadata (type: 'result', status: 'failed', error, parameters)
7. Tool results formatted as user messages and sent in second API call
8. Final response delivered to renderer

**Tool Call Indicators:**
The conversation panel displays tool calls with visual indicators showing:
- **Collapsed by default**: Tool calls show as expandable entries (click to expand)
- **Completed state**: Green checkmark, tool name, parameters, formatted result, execution time
- **Failed state**: Red X, tool name, parameters, error message
- Parameters are displayed for both completed and failed tool calls

**Tool Call Messages in History:**
Messages with `toolCall` metadata are rendered differently:
- Assistant messages with `toolCall.type: 'start'` show the tool being called
- User messages with `toolCall.type: 'result'` show the tool result (completed or failed)
- Tool call results stored in `toolCall` metadata (not in message.content)
- Messages include expandable sections for parameters and results (collapsed by default)

**Streaming with Tool Calls:**
- Tool call detection pauses chunk delivery to renderer during execution
- Tools executed and status updates sent via IPC events (completed/failed)
- Tool call indicators appear in conversation panel (collapsed by default)
- Second API call made with tool results (as user messages)
- Final response streamed to renderer

## API Integration

- Supports OpenAI and compatible APIs (via custom `baseURL`)
- Configurable model, temperature, maxTokens, topP per agent
- Request timeout: 60 seconds
- Server-Sent Events (SSE) for streaming responses

## Agent Configuration

Agents can reference global API keys by name:

```typescript
{
  "name": "Chat Assistant",
  "config": {
    "model": "gpt-4",
    "apiKeyRef": "openai-main",  // References named API key
    "baseURL": "https://api.openai.com/v1"  // Optional override
  }
}
```

## Streaming Implementation

Streaming responses use Server-Sent Events (SSE) parsing:
- Response chunks parsed line-by-line for `data: ` prefix
- JSON chunks extracted and accumulated
- Final accumulated content saved to agent history
- Real-time UI updates via parent component callbacks (`handleStreamChunk()`, `handleStreamComplete()`, `handleStreamError()`)
- Error handling for malformed chunks and network failures

## Message Storage

- Messages stored in agent `history` array
- Each message includes: `role` (user/assistant), `content`, `timestamp`, and optional `toolCall` metadata
- `toolCall` metadata includes:
  - `type` - 'start' (assistant message) or 'result' (user message)
  - `toolName` - Name of the tool being called
  - `parameters` - Tool input parameters
  - `result` - Tool output (for 'result' type with 'completed' status)
  - `executionTime` - Execution time in milliseconds (for 'result' type with 'completed' status)
  - `status` - 'completed' or 'failed'
  - `error` - Error message (for 'result' type with 'failed' status)
- **Only `toolCall` metadata format supported** - backward compatibility for system message format removed
- Tool results stored in `toolCall` metadata (not in message.content)
- History automatically saved after each message exchange
- Full conversation history sent with each new message for context
- System messages and tool call messages filtered from regular display, rendered with special indicators in `conversation-panel`
