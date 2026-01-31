# Conversational AI Feature

The app provides a complete chat interface for interacting with AI agents through multiple LLM providers.

## Chat Features

- **Streaming responses** - Real-time token streaming with loading indicators
- **Conversation persistence** - Messages stored in agent `history` array
- **Context awareness** - System prompt + full conversation history sent with each message
- **Tool calling** - AI agents can call custom tools during conversations (chat agents only)
- **Tool call indicators** - Visual display of tool execution status, parameters, results, and errors
- **Thinking/reasoning display** - GLM models can show their reasoning process in a collapsible "Thinking Process" section
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
  - Native tool calling for OpenAI, GLM, Azure, and custom providers
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
- **Reasoning display** - Collapsible "Thinking Process" section for GLM model reasoning (purple-tinted, toggle to expand/collapse)
- **Optional file tagging** area with removable badges (configurable via `enable-file-tagging` attribute)
- **Optional autocomplete dropdown** for @mention file selection
- Send button with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Configurable placeholder text
- Empty state always shows "Start a conversation!" with chat icon
- **Event-driven**: Dispatches `message-sent` events instead of calling IPC directly
- **Injectable message renderers** - Custom rendering logic can be injected via `setRenderers()` method
- **Message factories** - Parent components inject factory functions for creating both user and assistant message Web Components
- Public methods for parent control: `handleStreamChunk()`, `handleStreamReasoning()`, `handleStreamComplete()`, `handleStreamError()`, `clearChat()`, `handleToolCallComplete()`, `handleToolCallFailed()`, `setRenderers()`, `setUserMessageFactory()`, `setAssistantMessageFactory()`

### Message Rendering System

The message rendering logic uses a hybrid approach:
- **User messages** and **assistant messages** use Web Components created via factory pattern (for chat-panel and app-panel)
- **Tool call messages** use string-based rendering via injectable renderers

**Location**: `src/components/conversation/message-render.ts`

**MessageRenderers Interface**:
```typescript
interface MessageRenderers {
  renderAssistantMessage?: (content: string, reasoning?: string) => string;  // Optional, for app-panel custom rendering
  renderToolCallMessage: (content: string, toolCall: ToolCallData, reasoning?: string) => string;
}
```

**Utility Functions** (`src/components/conversation/utils.ts`):
- **`escapeHtml(text: string)`** - Escapes HTML to prevent XSS attacks
- **`renderMarkdown(content: string)`** - Safely renders markdown with XSS protection (uses `marked` and `DOMPurify`)

**assistant-message Web Component**:
**Location**: `src/components/conversation/assistant-message.ts`

A reusable Web Component for rendering assistant messages with:
- Markdown content rendering (using `marked` and `DOMPurify` for XSS prevention)
- Optional collapsible "Thinking Process" section for reasoning content
- Save button with parent-provided handler
- Copy button with default clipboard behavior
- Dark mode support

**Factory Pattern**:
The component uses a factory pattern to allow parent components to inject custom save handlers:

```typescript
// In parent component (chat-panel):
const createAssistantMessage = (content: string, reasoning: string): AssistantMessage => {
  return AssistantMessage.createWithHandlers(
    content,
    reasoning,
    async (content) => {
      // Save handler implementation
      await window.electronAPI.saveMessageToFile(projectPath, content);
    }
  );
};
conversation.setAssistantMessageFactory(createAssistantMessage);
```

**user-message Web Component**:
**Location**: `src/components/conversation/user-message.ts`

A reusable Web Component for rendering user messages with:
- Plain text rendering (no markdown, just escaped HTML)
- Right-aligned with blue background (`bg-blue-500 dark:bg-blue-600`)
- White text color
- HTML escaping for XSS prevention
- Dark mode support

**Factory Pattern**:
The component uses a factory pattern for consistent creation:

```typescript
// In parent component (chat-panel or app-panel):
const createUserMessage = (content: string): UserMessage => {
  return UserMessage.create(content);
};
conversation.setUserMessageFactory(createUserMessage);
```

**Features**:
- **XSS Prevention**: All content is escaped via `escapeHtml()` utility function
- **Simple Rendering**: User messages are plain text with whitespace preservation (`whitespace-pre-wrap`)
- **Styling**: Blue background to distinguish from assistant messages (which have transparent background)

**Common Features (both user-message and assistant-message)**:
- **XSS Prevention**: All user-generated content is escaped via `escapeHtml()` and DOMPurify sanitization
- **Markdown Rendering**: Assistant messages rendered with `marked` and sanitized via `DOMPurify`
- **Tool Call Display**: Status-based styling (executing/completed/failed) with expandable details
- **Reasoning Display**: Collapsible "Thinking Process" section for GLM reasoning content
- **Action Buttons**: Save button with custom handler, copy button with default clipboard behavior

**String-Based Renderers** (for tool call messages and app-panel custom rendering):

**Default Renderers**: `createDefaultMessageRenderers()` returns the standard rendering implementations (only includes `renderToolCallMessage` - user and assistant messages use Web Components via factory pattern).

**Custom Renderers**:
- **`renderAppContent()`** - App-specific renderer that:
  - Extracts HTML code blocks (````html ... ````) and displays them in gray-styled, collapsible callouts labeled "App Code"
  - Removes HTML blocks from main content (they appear only in callouts)
  - Renders all other content as normal markdown
  - Supports multiple HTML code blocks (numbered as App Code, App Code 2, etc.)
  - Used by `app-panel` for app agents (uses custom string-based rendering instead of factory)

**Customization**:
- Pass custom renderers via: `conversationPanel.setRenderers(customRenderers)`
- Pass user message factory via: `conversationPanel.setUserMessageFactory(factoryFunction)`
- Pass assistant message factory via: `conversationPanel.setAssistantMessageFactory(factoryFunction)`
- Use individual renderer functions (e.g., `renderAppContent`) when creating custom MessageRenderers objects

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
   - Loads agent, validates ModelConfig and Provider
   - Builds system prompt
   - Calls `streamLLM()` from `llm/index.ts` with `filePaths`, `userMessage`, `agent`, and `enableTools: true`
6. `llm/index.ts` routes to provider-specific implementation based on `modelConfig.type`
7. Provider-specific module (`llm/openai.ts` or `llm/glm.ts`):
   - **Saves user message** to `agent.history`
   - **Builds messages** from system prompt, file contents, agent history, and user message
   - **For streaming**: Sends chunks via `chat-chunk` IPC events to renderer
   - **For GLM**: Sends reasoning chunks via `chat-reasoning` IPC events to renderer (if model outputs reasoning)
   - **Detects tool calls**: Parses native tool_calls from SSE stream
   - **Tool execution loop** (internal, up to 10 iterations):
     - Execute tools, validate parameters, send `chat-agent:toolCall` IPC events
     - Add tool results to messages (OpenAI format: `{role: 'tool', tool_call_id, content}`)
     - Make follow-up API call with tool results
   - **Saves assistant response** to `agent.history` before returning (including `reasoning_content` if present)
8. `chat-panel` listens for IPC events and calls corresponding `conversation-panel` methods:
   - `chat-chunk` → `handleStreamChunk()` - Streams content chunks
   - `chat-reasoning` → `handleStreamReasoning()` - Streams reasoning chunks (GLM only)
   - `chat-agent:toolCall` (started) → `handleToolCallStarted()` - Shows executing indicator
   - `chat-agent:toolCall` (completed) → `handleToolCallCompleted()` - Shows completed indicator with results
   - `chat-agent:toolCall` (failed) → `handleToolCallFailed()` - Shows failed indicator with error
9. `conversation-panel` updates UI in real-time, renders tool call messages and reasoning with visual indicators
10. Parent components can listen for `stream-complete` to trigger additional processing

### App Agent Flow (Files Only, No Tools)

1. User enters message in `conversation-panel` text area
2. `conversation-panel` dispatches `message-sent` event (same as chat agent)
3. Parent component (`app-panel`) listens for `message-sent` event
4. `app-panel` calls `app-agent:streamMessage` via IPC
5. `app-agent-management` module:
   - Loads agent, validates ModelConfig and Provider
   - Builds system prompt
   - Calls `streamLLM()` from `llm/index.ts` with `filePaths`, `userMessage`, `agent`, and `enableTools: false`
6. Provider-specific module (`llm/openai.ts` or `llm/glm.ts`):
   - **Saves user message** to `agent.history`
   - **Builds messages** from system prompt, file contents, agent history, and user message
   - **For streaming**: Sends chunks via `chat-chunk` IPC events to renderer
   - **Saves assistant response** to `agent.history` before returning
7. `app-panel` listens for `stream-complete` event
8. On `stream-complete`, `app-panel` parses AI response for app code blocks:
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

## LLM Module

Located in `src/main/llm/`:

### Overview
The LLM module provides a unified streaming interface for multiple LLM providers (OpenAI, GLM, Azure, custom). Each provider implementation handles its own streaming logic, native tool calling, and tool execution loop.

### `llm/index.ts` - Main Routing Interface
- **`streamLLM(options: StreamLLMOptions)`** - Main entry point that routes to provider-specific implementations
  - Routes based on `modelConfig.type` (openai, glm, azure, custom)
  - Delegates to `streamOpenAI()` or `streamGLM()`
- **`StreamLLMOptions`** - Options interface including:
  - `systemPrompt` - System prompt for the LLM
  - `filePaths` - Optional array of file paths to include as context
  - `userMessage` - Current user message
  - `agent` - Agent instance (required) for conversation history
  - `provider` - LLM provider configuration
  - `modelConfig` - Model configuration
  - `tools` - Array of available tools
  - `webContents` - WebContents for IPC events
  - `enableTools` - Whether to enable tool calling (default: true)
  - `timeout` - Request timeout in milliseconds (default: 60000)
  - `maxIterations` - Maximum tool call rounds (default: 10)
- **`StreamResult`** - Result interface with content and hasToolCalls
- **`buildFileContentMessages(filePaths)`** - Reads file contents and formats as system messages
- **`buildAllMessages(options)`** - Builds complete message array from system prompt, files, agent history, and user message

### `llm/openai.ts` - OpenAI-Compatible Streaming
- **`streamOpenAI(options)`** - Complete OpenAI streaming with tool call iteration
  - Saves user message to `agent.history` at start
  - Builds messages using `buildAllMessages()`
  - Handles up to 10 iterations of tool calls
  - Deduplicates tool calls before execution
  - Adds tool results to messages in OpenAI native format
  - Sends `chat-chunk` events during streaming
  - Saves assistant response to `agent.history` before returning
- **`streamOpenAISingle()`** - Single streaming request (no iteration)
  - Sends tools array in request body
  - Parses tool_calls from SSE delta chunks
  - Handles chunked arguments (arguments may span multiple chunks)
  - Returns tool calls with toolCallId for result mapping
- **`executeToolCalls()`** - Tool execution with IPC events
  - Validates tools, parameters, and executes them
  - Sends `chat-agent:toolCall` IPC events for status updates
  - Returns tool results with toolCallId
- **Tool helper functions** - `convertToolToOpenAIFormat()`, `handleToolSuccess()`, `handleToolError()`

### `llm/glm.ts` - GLM (Zhipu AI) Streaming
- Standalone implementation with same structure as `openai.ts`
- Uses OpenAI-compatible tool calling format
- Handles GLM-specific SSE parsing differences
- **Key difference**: Content chunks are handled independently from tool_calls (GLM can return content alongside tool_calls in the same assistant message)
- **Reasoning/Thinking support**: GLM models can output `reasoning_content` in SSE stream
  - Emits `chat-reasoning` IPC events during streaming
  - Reasoning is accumulated and displayed in a collapsible "Thinking Process" section
  - Reasoning is saved to `agent.history` with `reasoning_content` field
  - Reasoning can appear on any assistant message (with or without tool calls)
- All functions have same signatures for consistency

**GLM Reasoning Implementation:**
```typescript
// In streamGLMSingle():
if (delta?.reasoning_content) {
  fullReasoning += delta.reasoning_content;
  webContents.send('chat-reasoning', delta.reasoning_content);
}

// Request includes thinking parameter:
thinking: {
  type: 'enabled',
  clear_thinking: false  // Preserve thinking for conversation context
}
```

### Tool Execution Architecture
- **Tool validation** - Checks if tool exists, is enabled, and parameters match schema
- **Environment routing** - Routes to Node.js worker or browser renderer
- **IPC events** - Sends `chat-agent:toolCall` events (started, completed, failed)
- **Agent history** - Updates agent.history with tool call metadata
- **Error handling** - Graceful failure with error messages

## Chat Agent Management Module

Located in `src/main/chat-agent-management.ts`:

### Key Functions
- `generateChatAgentSystemPrompt(agent)` - Returns agent's system prompt

### IPC Handlers
- `chat-agent:streamMessage` - Initiates streaming via `streamLLM()`
  - LLM handlers manage conversation history (saving user/assistant messages)
  - No need to manually save agent history after streaming
- `chat-agent:clearHistory` - Clears agent conversation history and saves to disk

## App Agent Management Module

Located in `src/main/app-agent-management.ts`:

### Key Functions
- `generateAppAgentSystemPrompt(agent)` - Returns agent's system prompt (no tools)

### IPC Handlers
- `app-agent:streamMessage` - Initiates streaming via `streamLLM()` with tools disabled
  - LLM handlers manage conversation history (saving user/assistant messages)
  - No need to manually save agent history after streaming
- `app-agent:clearHistory` - Clears agent conversation history and saves to disk

## Tool Calling (Chat Agents Only)

AI agents can call custom tools during conversations using **native tool calling formats**.

### Native Tool Calling (OpenAI, GLM, Azure, Custom)

**Tool Call Format:**
- Tools sent in request body as `tools` array
- Each tool: `{type: 'function', function: {name, description, parameters}}`
- LLM returns `tool_calls` in SSE delta chunks
- Each tool call has: `id`, `index`, `function.name`, `function.arguments` (chunked)

**Tool Call Detection:**
- Parsed from SSE stream in `delta.tool_calls`
- Arguments accumulated across multiple chunks
- Deduplicated by tool name + parameters before execution

**Tool Execution Flow:**
1. Provider module detects `tool_calls` in SSE stream
2. Accumulates arguments across chunks
3. On `finish_reason`, returns tool calls to iteration loop
4. Deduplicates tool calls (same tool + parameters)
5. Executes tools via `executeToolCalls()`:
   - Validates tool exists, is enabled, parameters match schema
   - Sends `chat-agent:toolCall` IPC event with `status: 'started'`
   - Routes to Node.js worker or browser renderer
   - On success: Sends `chat-agent:toolCall` with `status: 'completed'`
   - On failure: Sends `chat-agent:toolCall` with `status: 'failed'`
6. Adds tool results to messages in OpenAI format: `{role: 'tool', tool_call_id, content}`
7. Makes follow-up API call with tool results
8. Continues until no tool calls or max iterations (10) reached

**Tool Call Indicators:**
The conversation panel displays tool calls with visual indicators showing:
- **Collapsed by default**: Tool calls show as expandable entries (click to expand)
- **Executing state**: Yellow spinner, tool name, parameters
- **Completed state**: Green checkmark, tool name, parameters, formatted result, execution time
- **Failed state**: Red X, tool name, parameters, error message

**Tool Call Messages in Conversation Panel:**
The conversation panel has special handling for tool call messages:
- **`handleToolCallStarted()`** - Shows executing indicator
- **`handleToolCallComplete()`** - Shows completed indicator with results
- **`handleToolCallFailed()`** - Shows failed indicator with error

**Important: Tool Call Message Handling**
When the final LLM response arrives after tool execution, the conversation panel must **replace** the "Executing tool" message with the actual answer, not append to it. This is handled in `conversation-panel.ts:158-187`:
- Checks if last message is an assistant message with `toolCall` property
- If yes, replaces it with new assistant message for final response
- This prevents the final answer from being appended to the tool execution message

### Iterative Tool Calling

Chat agents support **multiple rounds of tool calls** in a single conversation:

**How It Works:**
- Provider modules (`openai.ts`, `glm.ts`) handle tool call iteration internally
- Maximum of 10 iterations (safety safeguard to prevent infinite loops)
- Each iteration:
  1. Makes API call with accumulated messages
  2. Parses tool_calls from SSE stream (native format)
  3. Deduplicates tool calls (same tool name + parameters)
  4. If tool calls detected:
     - Executes all tools with IPC status updates
     - Adds tool results to messages (OpenAI format: `{role: 'tool', tool_call_id, content}`)
     - Loops back to step 1
  5. If no tool calls:
     - Returns final response
     - Saves to history
     - Sends completion event

**History Growth Across Iterations:**
- User message saved ONCE at the start by LLM handler
- Each tool execution adds history entries via `executeToolCalls()`:
  - Assistant message: "Calling tool: {toolName}" (with toolCall.start metadata)
  - User message: "Tool executed successfully" or "Tool failed" (with toolCall.result metadata)
- Final iteration: LLM handler saves the conversational assistant response before returning

**Example Multi-Round Flow:**
```
User: "What's the weather in Tokyo and Paris?"

Round 1:
  → API call detects tool call for weather Tokyo
  → Execute weather tool for Tokyo
  → IPC: { toolName: "weather", status: "completed", result: {...} }
  → Messages: adds {role: 'tool', tool_call_id: 'call_123', content: '...'}
  → History: assistant message (start) + user message (result)

Round 2:
  → API call with Tokyo weather result detects tool call for weather Paris
  → Execute weather tool for Paris
  → IPC: { toolName: "weather", status: "completed", result: {...} }
  → Messages: adds {role: 'tool', tool_call_id: 'call_456', content: '...'}
  → History: assistant message (start) + user message (result)

Round 3:
  → API call with both weather results - no tool calls detected
  → Returns final response comparing both cities
  → IPC: chat-complete event
```

**Safeguards:**
- **Maximum iterations**: 10 rounds maximum (configurable via `maxIterations` parameter)
- **Deduplication**: Duplicate tool calls with identical parameters removed before execution
- **Error handling**: Tool failures don't stop the loop - error messages added to tool results and execution continues

**Messages Array vs History Array:**
- **Messages array** (sent to API): OpenAI format with role: 'tool' messages, grows with each iteration
- **History array** (saved to disk): Structured format with toolCall metadata, used for conversation persistence and UI display

## API Integration

The chat system supports multiple LLM providers:

### Supported Providers
- **OpenAI** - GPT models (gpt-4, gpt-3.5-turbo, etc.)
- **GLM** - Zhipu AI models (glm-4, glm-4-plus, etc.)
- **Azure** - Azure OpenAI Service
- **Custom** - Any OpenAI-compatible API

### Provider Configuration
Each provider requires:
- `type` - Provider type discriminator ('openai', 'glm', 'azure', 'custom')
- `name` - Display name
- `apiKey` - API key for authentication
- `baseURL` (optional) - Override default endpoint
- Stored in `app.getPath('userData')/providers.json`

### Model Configuration
ModelConfig allows reusing model settings across agents:
- `type` - Provider type (required)
- `name` - Display name
- `model` - Model identifier (e.g., 'gpt-4', 'glm-4')
- `temperature` - Sampling temperature (0-2)
- `maxTokens` - Maximum tokens in response
- `topP` - Nucleus sampling parameter
- `extra` - Additional model-specific parameters
- Stored in `app.getPath('userData')/model-configs.json`

### Request Configuration
- Request timeout: 60 seconds (configurable)
- Server-Sent Events (SSE) for streaming responses
- Native tool calling via `tools` array in request body
- Tool choice: 'auto' (model decides when to call tools)

## Agent Configuration

Agents reference providers and model configurations:

```typescript
{
  "name": "Chat Assistant",
  "config": {
    "modelId": "gpt4-creative",  // References ModelConfig
    "providerId": "openai-main"  // References LLM Provider
  }
}
```

When `modelId` is set:
- ModelConfig.type determines which provider implementation to use
- ModelConfig.model, temperature, maxTokens, etc. are used for API requests
- Provider determined by ModelConfig → providerId → LLM Provider lookup

## Streaming Implementation

Streaming responses use Server-Sent Events (SSE) parsing:
- Response chunks parsed line-by-line for `data: ` prefix
- JSON chunks extracted and accumulated
- **Tool calls parsed from `delta.tool_calls`** in SSE stream
- **Arguments accumulated across multiple chunks**
- **GLM-specific**: Content chunks are emitted independently from tool_calls (GLM can return both in the same delta)
- Final accumulated content saved to agent history
- Real-time UI updates via `chat-chunk` IPC events
- Error handling for malformed chunks and network failures

## Message Storage

- Messages stored in agent `history` array in **native LLM format** (OpenAI-compatible)
- Each message includes:
  - `role` - Message role: 'user', 'assistant', 'system', 'tool'
  - `content` - Message text (can be null for assistant messages with tool calls, though GLM may include content alongside tool_calls)
  - `timestamp` - When message was created
  - `tool_call_id` - For tool result messages, links to the tool call
  - `tool_calls` - For assistant messages with tool calls, array of tool call objects
  - `reasoning_content` - (GLM only) Thinking/reasoning content for models that support it
- `tool_calls` array items include:
  - `id` - Unique tool call identifier
  - `type` - Always 'function'
  - `function.name` - Name of the tool being called
  - `function.arguments` - JSON stringified tool parameters
- History automatically saved after each message exchange
- Full conversation history sent with each new message for context

**Reasoning Content (GLM):**
- `reasoning_content` field stores the model's thinking process
- Displayed in a collapsible "Thinking Process" section in the UI
- Preserved across conversation loads via GLM transformer
- Can appear on any assistant message, including those with tool calls

## Message Transformation for Display

When loading conversation history in `conversation-panel`, the native LLM format is transformed to UI format:

**Transformers** (`src/components/transformers/`):
- **OpenAI Transformer** (`openai-transformer.ts`) - Converts OpenAI format messages
- **GLM Transformer** (`glm-transformer.ts`) - Converts GLM format messages (standalone implementation)
  - **Key difference**: Handles content alongside tool_calls in assistant messages
  - When an assistant message has both content and tool_calls, GLM transformer pushes the content as a separate message first, then processes tool calls
  - Handles `reasoning_content` field and includes it in the transformed message's `reasoning` property
- **Transformer Factory** (`index.ts`) - Creates appropriate transformer based on provider type

**Transformation Process:**
1. `conversation-panel.setAgent()` detects provider type from `agent.config.modelId`
2. Factory creates transformer based on provider type (openai, glm, azure, custom)
3. Transformer converts native format to UI format:
   - Filters out system messages
   - Converts user/assistant messages directly
   - Extracts `reasoning_content` (GLM) into message's `reasoning` property
   - Merges assistant messages with `tool_calls` and tool result messages
   - Extracts tool call name, parameters, result, execution time, and status
   - Creates `ChatMessage` with optional `toolCall` and `reasoning` metadata
4. Result used to populate `chatHistory` for display

**Tool Call Display:**
- Tool calls shown in conversation as collapsible indicators
- Displays tool name, parameters, result, execution time, and status
- Color-coded by status: executing (blue), completed (green), failed (red)
- Click to expand/collapse details
