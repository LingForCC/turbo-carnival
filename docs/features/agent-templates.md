# Agent Templates

Agent Templates provide a way to save and reuse agent configurations. Instead of manually configuring all settings (type, model, provider, prompts) each time you create a new agent, you can create templates that encapsulate these settings and apply them with a single click.

## Overview

Agent Templates allow you to:
- Save agent configurations as reusable templates
- Quickly create new agents from templates
- Standardize agent setups across projects
- Share configurations with your team
- Maintain consistency in agent behavior

## AgentTemplate Structure

```typescript
interface AgentTemplate {
  id: string;                    // Unique identifier (e.g., "code-reviewer")
  name: string;                  // Display name (e.g., "Code Review Assistant")
  type: string;                  // Agent type: "chat", "code", "assistant", "reviewer", "app", "custom"
  description: string;           // Description of what this template creates
  config: {
    modelId?: string;            // Optional model configuration ID reference
    providerId?: string;         // Optional provider ID reference
  };
  prompts: {
    system?: string;             // Optional system prompt
    user?: string;               // Optional default user prompt
  };
  createdAt: number;             // Timestamp when created
  updatedAt?: number;            // Timestamp when last updated
}
```

## Creating Agent Templates

### Via the UI

1. Click the **Templates** button in the top navigation bar (after Settings)
2. Click **Add Template** (or **Add Your First Template** if none exist)
3. Fill in the template configuration:
   - **Template ID**: Unique identifier (letters, numbers, hyphens, underscores only)
   - **Display Name**: Human-readable name
   - **Agent Type**: Select from chat, code, assistant, reviewer, app, or custom
   - **Description**: Brief description of what this template creates
   - **Model Configuration** (optional): Select a pre-configured model
   - **Provider** (optional): Select an LLM provider
   - **System Prompt** (optional): Default system prompt for the agent
   - **Default User Prompt** (optional): Default user prompt template
4. Click **Add Template**

### Example Templates

**Code Review Assistant**
```
ID: code-reviewer
Name: Code Review Assistant
Type: reviewer
Description: Analyzes code for bugs, security issues, and best practices
Model Configuration: gpt4-code-review
Provider: openai-main
System Prompt: You are a code reviewer. Analyze the provided code for bugs, security vulnerabilities, and best practices. Provide constructive feedback.
```

**Chat Helper**
```
ID: chat-helper
Name: General Chat Helper
Type: chat
Description: General-purpose conversational AI assistant
Model Configuration: gpt4-balanced
Provider: openai-main
System Prompt: You are a helpful AI assistant. Be friendly, concise, and accurate in your responses.
User Prompt: How can I help you today?
```

**Creative Writer**
```
ID: creative-writer
Name: Creative Writing Assistant
Type: assistant
Description: Helps with creative writing, storytelling, and content creation
Model Configuration: gpt4-creative
Provider: openai-main
System Prompt: You are a creative writing assistant. Help users with storytelling, character development, and creative content. Be imaginative and engaging.
```

**Code Generator**
```
ID: code-generator
Name: Code Generator
Type: code
Description: Generates code snippets and implements features based on requirements
Model Configuration: claude-code
Provider: anthropic-main
System Prompt: You are a code generator. Write clean, well-documented code following best practices. Include comments and explain your approach.
```

## Using Templates to Create Agents

When creating a new agent:

1. Click **Add Agent** in the project-agent-dashboard
2. At the top of the **Create New Agent** form, use the **Load from Template** dropdown
3. Select a template from the list
4. The form will auto-fill with the template's settings:
   - Agent type
   - Description
   - Model configuration (if specified)
   - Provider (if specified)
   - System prompt
   - Default user prompt
5. **Agent name is intentionally left empty** - you must enter a unique name for your agent
6. Modify any fields as needed
7. Enter a unique **Agent Name** (required)
8. Click **Create Agent**

### Handling Missing References

If a template references a model configuration or provider that no longer exists:

- **Missing Model Config**: You'll see an error alert: `Model config "X" from template not found. Please select a different model.`
- **Missing Provider**: You'll see an error alert: `Provider "X" from template not found. Please select a different provider.`

In both cases, the affected field will be left empty so you can select an alternative.

## Managing Templates

### Editing Templates

1. Click the **Templates** button in the top navigation bar
2. Find the template you want to edit
3. Click the **Edit** icon (pencil) button
4. Modify the template fields
   - **Note**: Template ID cannot be changed after creation
5. Click **Update Template**

### Deleting Templates

1. Click the **Templates** button in the top navigation bar
2. Find the template you want to delete
3. Click the **Delete** icon (trash) button
4. Confirm the deletion in the dialog

**Important**: Deleting a template does NOT affect existing agents that were created from that template. Agents store their own configuration.

## Template Best Practices

### 1. Use Descriptive Names and IDs

**Good**:
- ID: `code-reviewer`
- Name: `Code Review Assistant`

**Bad**:
- ID: `template1`
- Name: `Template`

### 2. Write Clear Descriptions

The description should explain:
- What the template creates
- What the agent is designed to do
- Any special requirements or considerations

**Example**:
```
Analyzes code for bugs, security issues, and best practices.
Works best with GPT-4 models. Requires code file context for best results.
```

### 3. Use Optional Fields Wisely

- **Model Configuration**: Leave empty if you want flexibility when creating agents
- **Provider**: Leave empty to allow provider selection at agent creation time
- **System Prompt**: Always include for templates that define specific agent behavior
- **User Prompt**: Include only if there's a standard starting prompt for the agent

### 4. Create Templates by Use Case

Organize templates by how they're used:

- **Code Review**: For analyzing and reviewing code
- **Code Generation**: For writing new code
- **Documentation**: For generating and explaining documentation
- **Testing**: For writing tests and test cases
- **Chat**: For general conversation
- **Analysis**: For data analysis and insights

### 5. Document Prompt Strategies

In your system prompts, include:
- The agent's role and responsibilities
- Output format expectations
- Any constraints or guidelines
- Examples of desired behavior (for complex agents)

## Storage

Agent Templates are stored globally in:
```
~/Library/Application Support/Turbo Carnival/agent-templates.json  (macOS)
%APPDATA%/Turbo Carnival/agent-templates.json                    (Windows)
~/.config/Turbo Carnival/agent-templates.json                     (Linux)
```

Format:
```json
{
  "templates": [
    {
      "id": "code-reviewer",
      "name": "Code Review Assistant",
      "type": "reviewer",
      "description": "Analyzes code for bugs, security issues, and best practices",
      "config": {
        "modelId": "gpt4-code-review",
        "providerId": "openai-main"
      },
      "prompts": {
        "system": "You are a code reviewer. Analyze the provided code...",
        "user": "Please review this code:"
      },
      "createdAt": 1704067200000,
      "updatedAt": 1704153600000
    }
  ]
}
```

## Troubleshooting

### Template dropdown is empty

1. Ensure you have created templates via the Templates dialog
2. Check that templates are saved in `agent-templates.json`
3. Reload the agent form dialog

### Applied template shows errors

1. Check that referenced model configurations exist
2. Verify that referenced providers exist
3. Use the Models and Providers dialogs to recreate missing configurations

### Agent not behaving as expected

1. Verify the template was applied correctly
2. Check the agent's configuration after creation
3. Ensure model and provider are properly configured
4. Review system and user prompts in the agent settings

### Cannot edit template ID

Template IDs are immutable once created. This prevents breaking references. If you need a different ID:
1. Create a new template with the desired ID
2. Copy the content from the old template
3. Delete the old template

## Advanced Usage

### Creating Template Variants

Create variations of the same base template for different scenarios:

**Code Review - Strict**
```
System Prompt: Review code strictly. Flag all potential issues, minor style problems, and suggest improvements.
```

**Code Review - Quick**
```
System Prompt: Quick code review. Focus only on critical bugs and security issues. Be concise.
```

### Template Combinations

Use templates with other features:

- **Templates + Model Configs**: Define model settings in Model Configs, behavior in Templates
- **Templates + Tools**: Create templates for agents that use specific tool sets
- **Templates + File Tagging**: Templates that expect certain file types as context

### Sharing Templates

To share templates with your team:

1. Export templates from `agent-templates.json`
2. Share the JSON file
3. Team members can import by adding to their `agent-templates.json`
4. Or recreate templates manually using the documented settings

## Related Features

- **[Model Configurations](./model-configs.md)** - Reusable model settings for templates
- **[LLM Providers](./llm-providers.md)** - Provider management for templates
- **[Agent Management](../architecture.md)** - Overview of the agent system
- **[Tool Management](./tool-management.md)** - Custom tools for agents

## API Reference

### Renderer API

```typescript
import { getAgentTemplateManagementAPI } from '../api/agent-template-management';

const templateAPI = getAgentTemplateManagementAPI();

// Get all templates
const templates = await templateAPI.getTemplates();

// Add a template
await templateAPI.addTemplate({
  id: 'my-template',
  name: 'My Template',
  type: 'chat',
  description: 'A helpful assistant',
  config: {},
  prompts: { system: 'You are helpful.' },
  createdAt: Date.now()
});

// Update a template
await templateAPI.updateTemplate('my-template', updatedTemplate);

// Remove a template
await templateAPI.removeTemplate('my-template');

// Get template by ID
const template = await templateAPI.getTemplateById('my-template');
```

### IPC Channels

- `agent-templates:get` - Get all templates
- `agent-templates:add` - Add a new template
- `agent-templates:update` - Update an existing template
- `agent-templates:remove` - Remove a template
- `agent-templates:getById` - Get a template by ID

## Future Enhancements

Potential future improvements to the agent template system:

- Template export/import functionality
- Template categories/tags
- Template sharing via cloud sync
- Template versioning
- Built-in template library
- Template validation before application
- Template preview before creating agent
