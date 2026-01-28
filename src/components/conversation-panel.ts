import type { Agent, Project, LLMProviderType } from '../global.d.ts';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { createTransformer } from './transformers';

/**
 * ConversationPanel Web Component
 * Reusable chat interface with optional file tagging
 *
 * NOTE: This component dispatches 'message-sent' events that bubble up to parent components.
 * Parent components (chat-panel, app-panel) should listen for this event and handle IPC calls.
 */

/**
 * Tool call data for conversation panel display
 */
export interface ToolCallData {
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  executionTime?: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error?: string;
}

/**
 * Chat message for UI display in conversation-panel
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCall?: ToolCallData;
}

export class ConversationPanel extends HTMLElement {
  // Core state
  private currentAgent: Agent | null = null;
  private currentProject: Project | null = null;
  private chatHistory: ChatMessage[] = [];
  private isStreaming: boolean = false;
  private currentStreamedContent: string = '';
  private activeToolCalls: Map<string, ToolCallData> = new Map();

  // Configuration from attributes
  private enableFileTagging: boolean = false;
  private placeholder: string = 'Type a message...';
  private modelInfo: string = '';

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

  public async setAgent(agent: Agent, project: Project): Promise<void> {
    this.currentAgent = agent;
    this.currentProject = project;

    // Clear tagged files when switching agents
    this.taggedFiles = [];

    // Use transformer to convert agent history based on provider type
    const providerType = await this.getProviderType(agent);
    const transformer = createTransformer(providerType);
    this.chatHistory = transformer.transform(agent.history || []);

    // Load available .txt and .md files if file tagging is enabled
    if (this.enableFileTagging) {
      this.loadAvailableFiles();
    }

    this.render();
    this.scrollToBottom();
  }

  /**
   * Get the provider type for an agent from its model config
   */
  private async getProviderType(agent: Agent): Promise<LLMProviderType> {
    if (!agent.config.modelId || !window.electronAPI) {
      return 'openai'; // Default fallback
    }

    try {
      const modelConfig = await window.electronAPI.getModelConfigById(agent.config.modelId);
      return modelConfig?.type || 'openai';
    } catch (error) {
      console.error('Failed to get provider type:', error);
      return 'openai';
    }
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

      // Check if we should reuse the last message or add a new one
      const lastMessage = this.chatHistory[this.chatHistory.length - 1];

      // Reuse the last message if it's an assistant message without a tool call
      // This preserves tool call messages while allowing continuation of streaming responses
      if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.toolCall) {
        // Reuse existing assistant message for streaming
      } else {
        // Add a new assistant message for streaming
        this.chatHistory.push({
          role: 'assistant',
          content: ''
        });
      }
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

    // Add as assistant message (tool call details) with empty content
    this.chatHistory.push({
      role: 'assistant',
      content: '',
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
    // Find the last assistant message with this tool call and update it
    const key = `${toolName}|${JSON.stringify(parameters)}`;
    const toolCallData = this.activeToolCalls.get(key);

    if (toolCallData) {
      // Update the tool call data with result
      toolCallData.result = result;
      toolCallData.executionTime = executionTime;
      toolCallData.status = 'completed';
    }

    // Remove from active tracking
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
    // Find the active tool call and update it with error
    const key = `${toolName}|${JSON.stringify(parameters)}`;
    const toolCallData = this.activeToolCalls.get(key);

    if (toolCallData) {
      // Update the tool call data with error
      toolCallData.error = error;
      toolCallData.status = 'failed';
    }

    // Remove from active tracking
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
    const isAssistant = role === 'assistant';

    // Apply markdown parsing only to assistant messages
    const renderedContent = isAssistant
      ? this.renderMarkdown(content)
      : this.escapeHtml(content);

    // Copy button for assistant messages only
    const copyButton = isAssistant ? `
      <div class="flex justify-end mt-2">
        <button
          class="copy-msg-btn p-1.5 bg-white/80 hover:bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
          data-original-content="${this.escapeHtml(content)}"
          title="Copy message"
        >
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </button>
      </div>
    ` : '';

    return `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'} group ${isAssistant ? 'relative' : ''}">
        <div class="max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }">
          <div class="text-sm ${isAssistant ? 'prose prose-sm max-w-none' : 'whitespace-pre-wrap'} break-words">${renderedContent}</div>
          ${copyButton}
        </div>
      </div>
    `;
  }

  private renderToolCallMessage(role: 'user' | 'assistant', content: string, toolCall: ToolCallData): string {
    const isExecuting = toolCall.status === 'executing';
    const isFailed = toolCall.status === 'failed';
    const isCompleted = toolCall.status === 'completed';

    // Background color based on status only (all tool calls are now assistant messages)
    const bgColor = isExecuting
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
      <div class="flex justify-start my-2">
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

    // Copy message buttons
    this.querySelectorAll('.copy-msg-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', async (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLElement;
        const originalContent = button.getAttribute('data-original-content');

        if (originalContent) {
          try {
            await navigator.clipboard.writeText(originalContent);

            // Show success feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = `
              <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            `;

            // Reset after 2 seconds
            setTimeout(() => {
              button.innerHTML = originalHTML;
            }, 2000);
          } catch (error) {
            console.error('Failed to copy text:', error);
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

  /**
   * Safely render markdown content with XSS protection
   * Only used for assistant messages (not for tool calls or user messages)
   */
  private renderMarkdown(content: string): string {
    try {
      // Parse markdown to HTML
      const html = marked.parse(content) as string;

      // Sanitize HTML to prevent XSS attacks
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ALLOWED_ATTR: ['href', 'title', 'class'],
        ALLOW_DATA_ATTR: false
      });

      return sanitized;
    } catch (error) {
      // Fallback to escaped HTML if markdown parsing fails
      console.error('Markdown parsing error:', error);
      return this.escapeHtml(content);
    }
  }
}

// Register the custom element
customElements.define('conversation-panel', ConversationPanel);
