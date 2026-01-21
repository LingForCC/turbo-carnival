# Conversational AI Feature

The app provides a complete chat interface for interacting with AI agents through OpenAI-compatible APIs.

## Chat Features

- **Streaming responses** - Real-time token streaming with loading indicators
- **Non-streaming mode** - Full response at once (configurable via toggle)
- **Conversation persistence** - Messages stored in agent `history` array
- **Context awareness** - System prompt + full conversation history sent with each message
- **Tool calling** - AI agents can call custom tools during conversations (enabled via `formatToolDescriptions`)
- **File tagging** - Reference .txt and .md files from project folder as conversation context (see [file-tagging.md](./file-tagging.md))
- **Error handling** - Graceful timeout and error message display
- **Message management** - Clear chat with confirmation, automatic scroll to latest

## Chat UI Components

The chat functionality is built on a reusable `conversation-panel` component:

### conversation-panel
Reusable Web Component that provides:
- Message container with automatic scrolling
- User and assistant message bubbles with different styling
- Loading indicator during streaming
- **Optional file tagging** area with removable badges (configurable via `enable-file-tagging` attribute)
- **Optional autocomplete dropdown** for @mention file selection
- Send button with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- **Optional streaming toggle** (configurable via `show-stream-toggle` attribute)
- Configurable placeholder text
- Empty state always shows "Start a conversation!" with chat icon
- Emits events: `message-sent`, `stream-complete`, `back-clicked`, `chat-cleared`

### Usage Examples

**chat-panel** (with file tagging):
```html
<conversation-panel
  enable-file-tagging="true"
  show-stream-toggle="true"
  placeholder="Type @ to mention files..."
  model-info="gpt-4">
</conversation-panel>
```

**app-panel** (without file tagging):
```html
<conversation-panel
  placeholder="Describe the app you want to build...">
</conversation-panel>
```

## Message Flow

1. User enters message in `conversation-panel` text area (optionally tags files via @mention if enabled)
2. `conversation-panel` validates API key (if required) and calls IPC method (`streamMessage` or `sendMessage`) with file paths
3. OpenAI client module (`src/main/openai-client.ts`) validates agent and API key
4. OpenAI client compiles messages: system prompt + tool descriptions + tagged file contents + conversation history + new message
5. OpenAI client calls OpenAI-compatible API with agent's model config
6. For tool-enabled agents, OpenAI client detects tool calls, executes them via worker processes, and makes follow-up API call
7. Response chunks/events sent back via IPC events (`chat-chunk`, `chat-complete`, `chat-error`)
8. `conversation-panel` updates UI in real-time, emits `stream-complete` event
9. Parent components (e.g., `app-panel`) can listen for `stream-complete` to trigger additional processing

## API Integration

- Supports OpenAI and compatible APIs (via custom `baseURL`)
- Configurable model, temperature, maxTokens, topP per agent
- Request timeout: 60 seconds
- Server-Sent Events (SSE) for streaming responses

## Tool Calling

AI agents can call custom tools during conversations:

**Tool Call Format:**
AI agents output tool calls as JSON objects: `{"toolname":"tool_name","arguments":{"param":"value"}}`

**Tool Call Detection:**
- Streaming detects tool calls by checking for `"toolname"` key in response chunks
- Tool call deduplication removes duplicate tool calls with same tool name and parameters before execution

**Tool Execution Flow:**
1. OpenAI client detects tool call in AI response
2. Tool call parsed via `parseToolCalls()`
3. Tool executed via `executeToolInWorker()` (Node.js) or browser tool executor (Browser)
4. Tool results formatted as user message
5. Second API call made with tool results
6. Final response delivered to renderer

**Streaming with Tool Calls:**
- Tool call detection stops chunk delivery to renderer
- Tools executed
- Second API call made with tool results
- Final response streamed to renderer

## Streaming Implementation

Streaming responses use Server-Sent Events (SSE) parsing:
- Response chunks parsed line-by-line for `data: ` prefix
- JSON chunks extracted and accumulated
- Final accumulated content saved to agent history
- Real-time UI updates via IPC events sent to renderer
- Error handling for malformed chunks and network failures

## OpenAI Client Module

Located in `src/main/openai-client.ts`:

### API Client Functions
- `callOpenAICompatibleAPI()` - Makes non-streaming API requests
- `streamOpenAICompatibleAPI()` - Makes streaming API requests with SSE parsing, detects tool calls during streaming

### Tool Functions
- `formatToolDescriptions()` - Formats available tools for inclusion in system prompt with tool call marker format
- `parseToolCalls()` - Parses tool call markers from AI responses using regex pattern matching
- `executeToolInWorker()` - Executes tool code in isolated worker process for security

### Chat IPC Handlers
- `chat:sendMessage` - Handles non-streaming chat with tool support
- `chat:streamMessage` - Handles streaming chat with tool support

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

## Message Storage

- Messages stored in agent `history` array
- Each message includes: `role` (user/assistant), `content`, and `timestamp`
- History automatically saved after each message exchange
- Full conversation history sent with each new message for context
