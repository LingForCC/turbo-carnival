import type { Agent, Project, APIKey, ToolCallData } from '../global.d.ts';

/**
 * ConversationPanel Web Component
 * Reusable chat interface with optional file tagging
 *
 * NOTE: This component dispatches 'message-sent' events that bubble up to parent components.
 * Parent components (chat-panel, app-panel) should listen for this event and handle IPC calls.
 */
export class ConversationPanel extends HTMLElement {
  // Core state
  private currentAgent: Agent | null = null;
  private currentProject: Project | null = null;
  private chatHistory: Array<{ role: 'user' | 'assistant'; content: string; toolCall?: ToolCallData }> = [];
  private isStreaming: boolean = false;
  private currentStreamedContent: string = '';
  private activeToolCalls: Map<string, ToolCallData> = new Map();

  // Configuration from attributes
  private enableFileTagging: boolean = false;
  private placeholder: string = 'Type a message...';
  private modelInfo: string = '';

  // API key validation (optional, for components like chat-panel)
  private apiKeys: APIKey[] = [];
  private requireAPIKeyValidation: boolean = false;

  // File tagging state (always maintained, conditionally rendered)
  private taggedFiles: Array<{ name: string; path: string }> = [];
  private availableFiles: Array<{ name: string; path: string; extension: string }> = [];
  private showAutocomplete: boolean = false;
  private autocompleteQuery: string = '';
  private autocompleteIndex: number = -1;

  constructor() {
    super();
  }

  static get observedAttributes(): string[] {
    return ['enable-file-tagging', 'placeholder', 'model-info'];
  }

  connectedCallback(): void {
    this.parseAttributes();
    this.render();
    this.attachEventListeners();

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (this.showAutocomplete) {
        const autocomplete = this.querySelector('#file-autocomplete');
        const textarea = this.querySelector('#chat-input');
        if (autocomplete && !autocomplete.contains(e.target as Node) && textarea !== e.target) {
          this.showAutocomplete = false;
          this.render();
        }
      }
    });
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue !== newValue) {
      this.parseAttributes();
      this.render();
    }
  }

  private parseAttributes(): void {
    this.enableFileTagging = this.getAttribute('enable-file-tagging') === 'true';
    this.placeholder = this.getAttribute('placeholder') || 'Type a message...';
    this.modelInfo = this.getAttribute('model-info') || '';
  }

  // ========== PUBLIC API ===========

  public setAgent(agent: Agent, project: Project): void {
    this.currentAgent = agent;
    this.currentProject = project;

    // Clear tagged files when switching agents
    this.taggedFiles = [];

    // Load conversation history from agent
    const mappedHistory = (agent.history || [])
      .map(msg => {
        // Check if message has toolCall metadata
        if (msg.toolCall) {
          const toolCall = msg.toolCall;
          // Map persisted tool call data to ToolCallData format
          const toolCallData: ToolCallData = {
            toolName: toolCall.toolName,
            parameters: toolCall.parameters || {},
            result: toolCall.result,
            executionTime: toolCall.executionTime,
            status: toolCall.status as 'executing' | 'completed' | 'failed',
            error: toolCall.error
          };

          // Return message with toolCall data
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            toolCall: toolCallData
          };
        }

        // Return user/assistant messages as-is
        if (msg.role === 'user' || msg.role === 'assistant') {
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          };
        }

        // Filter out system messages
        return null;
      })
      .filter((msg): msg is NonNullable<typeof msg> => msg !== null);

    this.chatHistory = mappedHistory as Array<{ role: 'user' | 'assistant'; content: string; toolCall?: ToolCallData }>;

    // Load available .txt and .md files if file tagging is enabled
    if (this.enableFileTagging) {
      this.loadAvailableFiles();
    }

    this.render();
    this.scrollToBottom();
  }

  public setAPIKeys(apiKeys: APIKey[]): void {
    this.apiKeys = apiKeys;
  }

  public setRequireAPIKeyValidation(require: boolean): void {
    this.requireAPIKeyValidation = require;
  }

  public clearChat(): void {
    this.chatHistory = [];
    this.activeToolCalls.clear();
    this.render();

    // Dispatch event to clear agent history in parent component
    if (this.currentAgent && this.currentProject) {
      this.dispatchEvent(new CustomEvent('clear-chat', {
        detail: {
          projectPath: this.currentProject.path,
          agentName: this.currentAgent.name
        },
        bubbles: true,
        composed: true
      }));
    }
  }

  public scrollToBottom(): void {
    const messagesContainer = this.querySelector('#chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Handle stream chunk from parent component
   * Called by parent (chat-panel/app-panel) during streaming
   */
  public handleStreamChunk(chunk: string): void {
    // If not currently streaming, start a new streaming session
    if (!this.isStreaming) {
      this.isStreaming = true;
      this.currentStreamedContent = '';
      // Add empty assistant message for streaming
      // Check if last message is already an assistant message (from first stream with tool calls)
      const lastMessage = this.chatHistory[this.chatHistory.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        // Last message is not an assistant message, add a new one
        this.chatHistory.push({
          role: 'assistant',
          content: ''
        });
      }
      // If last message IS an assistant message (e.g., from tool call start), reuse it
    }

    this.currentStreamedContent += chunk;
    this.chatHistory[this.chatHistory.length - 1].content = this.currentStreamedContent;
    this.render();
    this.scrollToBottom();
  }

  /**
   * Handle stream completion from parent component
   * Called by parent (chat-panel/app-panel) when streaming completes
   */
  public handleStreamComplete(content: string): void {
    this.isStreaming = false;
    this.currentStreamedContent = '';
    this.render();

    // Emit stream-complete event for consistency
    this.dispatchEvent(new CustomEvent('stream-complete', {
      detail: { content },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle stream error from parent component
   * Called by parent (chat-panel/app-panel) when an error occurs
   */
  public handleStreamError(error: string): void {
    this.isStreaming = false;
    this.currentStreamedContent = '';
    this.chatHistory.pop(); // Remove user message
    this.showError(error);
    this.render();
  }

  /**
   * Handle tool call started event from main process
   * Called by parent component when tool execution begins
   */
  public handleToolCallStarted(toolName: string, parameters: Record<string, any>): void {
    const toolCallData: ToolCallData = {
      toolName,
      parameters,
      status: 'executing'
    };

    // Add as assistant message (tool call details)
    this.chatHistory.push({
      role: 'assistant',
      content: `Executing tool: ${toolName}`,
      toolCall: toolCallData
    });

    // Track as active
    const key = `${toolName}|${JSON.stringify(parameters)}`;
    this.activeToolCalls.set(key, toolCallData);

    this.render();
    this.scrollToBottom();
  }

  /**
   * Handle tool call completed event from main process
   * Called by parent component when tool execution finishes
   */
  public handleToolCallCompleted(
    toolName: string,
    parameters: Record<string, any>,
    result: any,
    executionTime: number
  ): void {
    const toolCallData: ToolCallData = {
      toolName,
      parameters,
      result,
      executionTime,
      status: 'completed'
    };

    // Add as user message (tool call result)
    this.chatHistory.push({
      role: 'user',
      content: `Tool "${toolName}" executed successfully`,
      toolCall: toolCallData
    });

    // Remove from active tracking
    const key = `${toolName}|${JSON.stringify(parameters)}`;
    this.activeToolCalls.delete(key);

    this.render();
    this.scrollToBottom();
  }

  /**
   * Handle tool call failed event from main process
   * Called by parent component when tool execution fails
   */
  public handleToolCallFailed(
    toolName: string,
    parameters: Record<string, any>,
    error: string
  ): void {
    const toolCallData: ToolCallData = {
      toolName,
      parameters,
      error,
      status: 'failed'
    };

    // Add as user message (error message)
    this.chatHistory.push({
      role: 'user',
      content: `Tool "${toolName}" failed`,
      toolCall: toolCallData
    });

    // Remove from active tracking
    const key = `${toolName}|${JSON.stringify(parameters)}`;
    this.activeToolCalls.delete(key);

    this.render();
    this.scrollToBottom();
  }

  // ========== RENDERING ==========

  private render(): void {
    this.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Chat Messages Area -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
          ${this.renderChatContent()}
        </div>

        <!-- Input Area -->
        ${this.currentAgent ? `
          <div class="p-4 border-t border-gray-200 shrink-0">
            <!-- Tagged files display -->
            ${this.enableFileTagging && this.taggedFiles.length > 0 ? `
              <div id="tagged-files" class="flex flex-wrap gap-2 mb-3">
                ${this.taggedFiles.map(file => `
                  <div class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                    <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-xs text-blue-700">${this.escapeHtml(file.name)}</span>
                    <button class="remove-file-btn hover:bg-blue-100 rounded p-0.5 cursor-pointer border-0 bg-transparent" data-file-path="${this.escapeHtml(file.path)}">
                      <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                `).join('')}
                <button id="clear-all-files-btn" class="text-xs text-blue-600 hover:text-blue-700 cursor-pointer border-0 bg-transparent p-0">Clear all</button>
              </div>
            ` : ''}

            <div class="relative">
              <!-- Autocomplete dropdown -->
              ${this.enableFileTagging ? this.renderAutocomplete() : ''}

              <div class="flex gap-2">
                <textarea
                  id="chat-input"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="${this.escapeHtml(this.placeholder)}"
                  rows="2"
                  ${this.isStreaming ? 'disabled' : ''}
                ></textarea>
                <button
                  id="send-btn"
                  class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer border-0 self-end"
                  ${this.isStreaming ? 'disabled' : ''}
                >
                  ${this.isStreaming ?
                    '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>' :
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>'
                  }
                </button>
              </div>

              <!-- Model info display -->
              ${this.modelInfo ? `
                <div class="mt-2 text-xs text-gray-500">
                  ${this.escapeHtml(this.modelInfo)}
                </div>
              ` : ''}
            </div>
          </div>
        ` : `
          <div class="p-4 border-t border-gray-200 shrink-0">
            <p class="text-sm text-gray-400 text-center m-0">
              Select an agent to start chatting
            </p>
          </div>
        `}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderChatContent(): string {
    if (!this.currentAgent) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">
            Start a conversation!
          </p>
        </div>
      `;
    }

    if (this.chatHistory.length === 0 && !this.isStreaming) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">
            Start a conversation!
          </p>
        </div>
      `;
    }

    // Render chat messages
    return this.chatHistory.map(msg => this.renderMessage(msg.role, msg.content, msg.toolCall)).join('');
  }

  private renderMessage(role: 'user' | 'assistant', content: string, toolCall?: ToolCallData): string {
    // If this message has tool call data, render with special styling
    if (toolCall) {
      return this.renderToolCallMessage(role, content, toolCall);
    }

    // Regular user/assistant message rendering
    const isUser = role === 'user';
    return `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }">
          <p class="text-sm whitespace-pre-wrap break-words m-0">${this.escapeHtml(content)}</p>
        </div>
      </div>
    `;
  }

  private renderToolCallMessage(role: 'user' | 'assistant', content: string, toolCall: ToolCallData): string {
    const isExecuting = toolCall.status === 'executing';
    const isFailed = toolCall.status === 'failed';
    const isCompleted = toolCall.status === 'completed';
    const isAssistant = role === 'assistant';  // Tool call start (assistant side)

    // Background color based on role and status
    // Amber/yellow for tool call start (assistant), green/red for results (user)
    const bgColor = isAssistant
      ? 'bg-amber-50 border-amber-200'
      : (isFailed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200');

    // Status icon (hidden during execution)
    const statusIcon = isExecuting
      ? ''
      : isCompleted
        ? `<svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
           </svg>`
        : `<svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
           </svg>`;

    // Status text (hidden during execution)
    const statusText = isExecuting
      ? ''
      : isCompleted
        ? 'Completed'
        : 'Failed';

    return `
      <div class="flex ${isAssistant ? 'justify-start' : 'justify-end'} my-2">
        <div class="max-w-[85%] w-[85%] rounded-lg border ${bgColor} px-4 py-3">
          <div class="flex items-center gap-2">
            ${statusIcon}
            <span class="text-xs font-semibold text-gray-700 truncate ${isExecuting ? 'flex-1' : ''}">
              ${this.escapeHtml(toolCall.toolName)}
            </span>
            ${!isExecuting ? `
              <span class="text-xs text-gray-500 flex-shrink-0">•</span>
              <span class="text-xs text-gray-600 flex-shrink-0">${statusText}</span>
            ` : ''}
            <button
              class="tool-call-toggle-btn hover:bg-gray-200 rounded p-1 cursor-pointer border-0 bg-transparent flex-shrink-0"
            >
              <svg class="w-4 h-4 text-gray-500 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div class="tool-call-details hidden mt-3">
            ${toolCall.parameters && Object.keys(toolCall.parameters).length > 0 ? `
              <div class="text-xs text-gray-600 mb-2">
                <div class="font-semibold mb-1">Parameters:</div>
                <div class="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                  <pre class="text-xs m-0 whitespace-pre-wrap break-all">${this.escapeHtml(JSON.stringify(toolCall.parameters, null, 2))}</pre>
                </div>
              </div>
            ` : ''}

            ${isCompleted && toolCall.result ? `
              <div>
                <div class="text-xs font-semibold text-gray-700 mb-1">Result:</div>
                <div class="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                  <pre class="text-xs m-0 whitespace-pre-wrap break-all">${this.escapeHtml(JSON.stringify(toolCall.result, null, 2))}</pre>
                </div>
                ${toolCall.executionTime ? `
                  <div class="text-xs text-gray-500 mt-1">Execution time: ${toolCall.executionTime}ms</div>
                ` : ''}
              </div>
            ` : ''}

            ${isFailed && toolCall.error ? `
              <div>
                <div class="text-xs font-semibold text-gray-700 mb-1">Error:</div>
                <div class="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                  <pre class="text-xs m-0 whitespace-pre-wrap break-all text-red-700">${this.escapeHtml(toolCall.error)}</pre>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderAutocomplete(): string {
    if (!this.showAutocomplete || this.availableFiles.length === 0) {
      return '';
    }

    const filteredFiles = this.autocompleteQuery
      ? this.availableFiles.filter(file =>
          file.name.toLowerCase().includes(this.autocompleteQuery.toLowerCase())
        )
      : this.availableFiles;

    if (filteredFiles.length === 0) {
      return `
        <div id="file-autocomplete" class="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
          <div class="p-3 text-sm text-gray-500 text-center">No matching files</div>
        </div>
      `;
    }

    return `
      <div id="file-autocomplete" class="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
        ${filteredFiles.map((file, index) => `
          <div class="file-option px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 ${index === this.autocompleteIndex ? 'bg-blue-50' : ''}" data-file-path="${this.escapeHtml(file.path)}" data-file-name="${this.escapeHtml(file.name)}">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span class="text-sm text-gray-700">${this.escapeHtml(file.name)}</span>
            <span class="text-xs text-gray-400 ml-auto">${this.escapeHtml(file.extension)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ========== EVENT HANDLERS ==========

  private attachEventListeners(): void {
    // Send button and chat input
    const sendBtn = this.querySelector('#send-btn');
    const chatInput = this.querySelector('#chat-input') as HTMLTextAreaElement;

    if (sendBtn && chatInput) {
      const newBtn = sendBtn.cloneNode(true);
      sendBtn.replaceWith(newBtn);

      const newInput = chatInput.cloneNode(true);
      chatInput.replaceWith(newInput);
      const actualInput = newInput as HTMLTextAreaElement;

      // Send on button click
      (newBtn as HTMLElement).addEventListener('click', () => this.sendMessage());

      // Input handler for @mention detection
      actualInput.addEventListener('input', (e) => this.handleTextareaInput(e));

      // Keydown handler for autocomplete navigation
      actualInput.addEventListener('keydown', (e) => {
        // Handle autocomplete navigation first
        if (this.showAutocomplete) {
          this.handleTextareaKeydown(e);
          return;
        }

        // Send on Enter (Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Remove file buttons
    this.querySelectorAll('.remove-file-btn').forEach(btn => {
      const filePath = btn.getAttribute('data-file-path');
      if (!filePath) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => {
        this.taggedFiles = this.taggedFiles.filter(f => f.path !== filePath);
        this.render();
        const textarea = this.querySelector('#chat-input') as HTMLTextAreaElement;
        textarea?.focus();
      });
    });

    // Clear all files button
    const clearAllBtn = this.querySelector('#clear-all-files-btn');
    if (clearAllBtn) {
      const newBtn = clearAllBtn.cloneNode(true);
      clearAllBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => {
        this.taggedFiles = [];
        this.render();
        const textarea = this.querySelector('#chat-input') as HTMLTextAreaElement;
        textarea?.focus();
      });
    }

    // Autocomplete option clicks
    this.querySelectorAll('.file-option').forEach(option => {
      const filePath = option.getAttribute('data-file-path');
      const fileName = option.getAttribute('data-file-name');
      if (!filePath || !fileName) return;

      const newOption = option.cloneNode(true);
      option.replaceWith(newOption);
      (newOption as HTMLElement).addEventListener('click', () => {
        this.selectFileForTagging(filePath, fileName);
      });
    });

    // Tool call toggle buttons - use DOM manipulation without re-render
    this.querySelectorAll('.tool-call-toggle-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLElement;
        const icon = button.querySelector('svg');
        const details = button.parentElement?.nextElementSibling as HTMLElement;

        if (details) {
          details.classList.toggle('hidden');
          if (icon) {
            icon.style.transform = details.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
          }
        }
      });
    });
  }

  private async sendMessage(): Promise<void> {
    if (!this.currentAgent || !this.currentProject || this.isStreaming) return;

    const input = this.querySelector('#chat-input') as HTMLTextAreaElement;
    const message = input?.value.trim();

    if (!message && this.taggedFiles.length === 0) return;

    // Validate API key if required
    if (this.requireAPIKeyValidation) {
      const apiKeyName = this.currentAgent.config.apiConfig?.apiKeyRef;
      if (!apiKeyName) {
        this.showError('Agent does not have an API key configured. Please edit the agent settings.');
        return;
      }

      const apiKey = this.apiKeys.find(k => k.name === apiKeyName);
      if (!apiKey) {
        this.showError(`API key "${apiKeyName}" not found. Please add it in settings.`);
        return;
      }
    }

    // Collect file paths from tagged files
    const filePaths = this.taggedFiles.map(f => f.path);

    // Add user message to UI immediately
    this.chatHistory.push({ role: 'user', content: message || '' });
    this.render();
    this.scrollToBottom();

    // Dispatch message-sent event with all necessary data
    // Parent component (chat-panel/app-panel) will handle the actual IPC call
    this.dispatchEvent(new CustomEvent('message-sent', {
      detail: {
        projectPath: this.currentProject.path,
        agentName: this.currentAgent.name,
        message: message || '',
        filePaths
      },
      bubbles: true,   // Allow event to bubble to parent
      composed: true   // Allow event to cross shadow DOM boundaries
    }));

    // NO DIRECT IPC CALLS HERE - parent will handle them
  }

  // ========== FILE TAGGING METHODS ==========

  private async loadAvailableFiles(): Promise<void> {
    if (!window.electronAPI || !this.currentProject) {
      this.availableFiles = [];
      return;
    }

    try {
      const files = await window.electronAPI.listProjectFiles(this.currentProject.path, {
        extensions: ['.txt', '.md'],
        maxDepth: 10,
        excludeHidden: true
      });
      this.availableFiles = files;
    } catch (error) {
      console.error('Failed to load project files:', error);
      this.availableFiles = [];
    }
  }

  private handleTextareaInput(event: Event): void {
    if (!this.enableFileTagging) return;

    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        this.autocompleteQuery = textAfterAt;
        this.showAutocomplete = true;
        this.autocompleteIndex = -1;
        this.render();
        return;
      }
    }

    if (this.showAutocomplete) {
      this.showAutocomplete = false;
      this.render();
    }
  }

  private handleTextareaKeydown(event: KeyboardEvent): void {
    if (!this.showAutocomplete) return;

    const filteredFiles = this.autocompleteQuery
      ? this.availableFiles.filter(file =>
          file.name.toLowerCase().includes(this.autocompleteQuery.toLowerCase())
        )
      : this.availableFiles;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.autocompleteIndex = Math.min(this.autocompleteIndex + 1, filteredFiles.length - 1);
        this.render();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.autocompleteIndex = Math.max(this.autocompleteIndex - 1, 0);
        this.render();
        break;
      case 'Enter':
        if (this.autocompleteIndex >= 0 && this.autocompleteIndex < filteredFiles.length) {
          event.preventDefault();
          const selectedFile = filteredFiles[this.autocompleteIndex];
          this.selectFileForTagging(selectedFile.path, selectedFile.name);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.showAutocomplete = false;
        this.autocompleteIndex = -1;
        this.render();
        break;
    }
  }

  private selectFileForTagging(filePath: string, fileName: string): void {
    if (this.taggedFiles.some(f => f.path === filePath)) {
      this.showAutocomplete = false;
      this.autocompleteIndex = -1;
      this.render();
      return;
    }

    this.taggedFiles.push({ name: fileName, path: filePath });

    const textarea = this.querySelector('#chat-input') as HTMLTextAreaElement;
    if (textarea) {
      const value = textarea.value;
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        textarea.value = value.substring(0, lastAtIndex) + value.substring(cursorPosition);
        textarea.setSelectionRange(lastAtIndex, lastAtIndex);
      }
    }

    this.showAutocomplete = false;
    this.autocompleteIndex = -1;
    this.autocompleteQuery = '';
    this.render();

    const newTextarea = this.querySelector('#chat-input') as HTMLTextAreaElement;
    newTextarea?.focus();
  }

  // ========== UTILITY METHODS ==========

  private showError(message: string): void {
    alert(message);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('conversation-panel', ConversationPanel);
