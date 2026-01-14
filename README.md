# Turbo Carnival

**Turbo Carnival** is an Electron desktop application that provides a powerful interface for managing local projects and interacting with AI agents through conversational AI. The app combines project management, AI agent configuration, and file context awareness into a unified, intuitive workspace.

## Features

### 📁 Project Management
- **Local Folder Projects** - Add any local folder as a project through a native folder picker dialog
- **Project Organization** - All projects are listed in a collapsible left sidebar for easy access
- **Persistent Storage** - Projects persist across app restarts with metadata (path, name, addedAt)

### 🤖 AI Agent System
- **Multiple Agents per Project** - Create and manage multiple AI agents for each project
- **Agent Configuration** - Each agent has customizable settings:
  - Model selection (e.g., gpt-4, gpt-3.5-turbo)
  - Temperature, max tokens, top-p parameters
  - Custom system and user prompts
  - API key references
- **Agent Storage** - Agents are stored as `agent-{name}.json` files directly in your project folder
- **Agent Types** - Predefined types include chat, code, assistant, reviewer, and custom categories

### 💬 Conversational AI Interface
- **Interactive Chat** - Real-time chat interface with your configured AI agents
- **Streaming Responses** - Watch AI responses stream in real-time token by token
- **Non-streaming Mode** - Toggle between streaming and full-response modes
- **Conversation History** - All conversations are automatically saved to the agent's history
- **Context Awareness** - Each message includes the system prompt and full conversation history
- **Message Management** - Clear chat history with confirmation, automatic scroll to latest messages

### 📄 File Context & Tagging
- **@mention File References** - Type `@` in the chat input to autocomplete and select files from your project
- **Smart File Filtering** - Easily find files by typing after `@` to filter the list
- **Visual Feedback** - Blue tag badges show attached files with file icons
- **Context Injection** - Tagged .txt and .md files are automatically included as context in your conversations
- **Session Persistence** - Tagged files persist across messages in the same conversation
- **File Browsing** - View the complete file tree of any project in the right sidebar

### 🔑 API Key Management
- **Global Key Storage** - Securely store API keys in one place with a built-in dialog
- **Key References** - Agents reference API keys by name, keeping credentials separate from agent configs
- **Custom Base URLs** - Support for OpenAI-compatible APIs (e.g., local models, other providers)
- **Secure Storage** - Keys stored in userData directory, never exposed in agent files

### 🎨 Three-Panel Layout
- **Left Panel (Project Sidebar)** - Collapsible sidebar (264px) managing local folder projects
- **Center Panel (Main Content)** - Agent dashboard grid and chat interface
- **Right Panel (Project Details)** - Collapsible sidebar (264px) displaying project file trees
- **Responsive Design** - Panels can be collapsed/expanded with smooth transitions

## How It Works

### 1. Project Setup
Start by adding local folders as projects. Each project represents a codebase or workspace you want to work with.

### 2. Configure API Keys
Add your OpenAI API key (or any OpenAI-compatible API) via the "API Keys" button in the header. Keys are stored globally and can be referenced by any agent.

### 3. Create AI Agents
For each project, create specialized AI agents:
- **Code Assistant** - Help with code reviews and debugging
- **Chat Companion** - General-purpose conversations about your project
- **Documentation Bot** - Generate and maintain project docs
- **Custom Agents** - Create agents with specific prompts and settings

### 4. Chat with Context
Select an agent to open the chat interface. Type your messages and optionally tag files using `@`:
```
@README.md Can you help me understand this project?
```

The AI will receive:
- The agent's system prompt
- Full content of tagged files
- Conversation history
- Your new message

### 5. Explore Project Files
Use the right sidebar to browse your project's file structure. Expand/collapse folders to navigate the hierarchy.

## Technology Stack

- **Electron** - Desktop application framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool with hot module replacement
- **Web Components** - Vanilla JavaScript custom elements (no frameworks)
- **Tailwind CSS v4** - Utility-first styling
- **OpenAI API** - AI model integration

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd turbo-carnival

# Install dependencies
npm install
```

### Development

```bash
# Start the development server with hot reload
npm run dev
```

The app will launch automatically with DevTools open in development mode.

### Building for Production

```bash
# Build the app
npm run build

# Build and launch the production app
npm start
```

### Creating Distributables

```bash
# Create packages for your platform
npm run dist

# Create unpacked directory
npm run pack
```

Built applications will be in the `release/` directory.
