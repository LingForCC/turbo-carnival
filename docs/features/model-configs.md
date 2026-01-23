# Model Configurations

Model Configurations provide a reusable way to manage AI model settings across agents. Instead of configuring model parameters (temperature, max tokens, etc.) individually for each agent, you can create named Model Configurations and reference them in your agents.

## Overview

Model Configurations allow you to:
- Define reusable model settings (model, temperature, max tokens, top P)
- Add model-specific properties via the flexible `extra` field
- Share configurations across multiple agents
- Update settings in one place to affect all agents using that configuration

## ModelConfig Structure

```typescript
interface ModelConfig {
  id: string;                    // Unique identifier (e.g., "gpt4-creative")
  name: string;                  // Display name (e.g., "GPT-4 Creative")
  model: string;                 // Model identifier (e.g., "gpt-4", "claude-3.5")
  temperature?: number;          // Optional temperature (0-2)
  maxTokens?: number;            // Optional max tokens
  topP?: number;                 // Optional top_p (0-1)
  extra?: Record<string, any>;   // Model-specific properties
  createdAt: number;             // Timestamp when created
  updatedAt?: number;            // Timestamp when last updated
}
```

## Creating Model Configurations

### Via the UI

1. Click the **Models** button in the top navigation bar (between Tools and Providers)
2. Click **Add Model Configuration**
3. Fill in the configuration:
   - **Model Configuration ID**: Unique identifier (letters, numbers, hyphens, underscores only)
   - **Display Name**: Human-readable name
   - **Model**: Model identifier (e.g., `gpt-4`, `claude-3.5-sonnet`)
   - **Temperature** (optional): Controls randomness (0 = focused, 2 = creative)
   - **Max Tokens** (optional): Maximum tokens in the response
   - **Top P** (optional): Nucleus sampling (0 = focused, 1 = diverse)
   - **Extra Properties** (optional): JSON object for model-specific settings
4. Click **Add Model Configuration**

### Example Configurations

**Creative Writing Model**
```
ID: gpt4-creative
Name: GPT-4 Creative
Model: gpt-4
Temperature: 0.9
Max Tokens: 4000
Top P: 0.95
```

**Code Review Model**
```
ID: claude-code-review
Name: Claude Code Review
Model: claude-3.5-sonnet
Temperature: 0.3
Max Tokens: 2000
Top P: 0.8
```

**Thinking-Enabled Model (GPT-5.2)**
```
ID: gpt52-thinking
Name: GPT-5.2 Thinking
Model: gpt-5.2
Temperature: 0.7
Extra Properties: {"thinking": true}
```

## Using Model Configurations in Agents

When creating or editing an agent:

1. Open the **Agent Form Dialog**
2. Under **Model Configuration**, select a model from the dropdown
3. The model details will be displayed below the dropdown
4. Select a **Provider** (the provider is still selected at the agent level)
5. Save the agent

The agent will now use all the settings from the selected Model Configuration.

## Extra Properties

The `extra` field allows you to specify model-specific properties that may not be supported by all models. These are passed directly to the API as JSON.

### Common Extra Properties

**GPT-5.2 Thinking Mode**
```json
{"thinking": true}
```

**OpenAI Function Calling**
```json
{"tools": "auto"}
```

**Anthropic Extended Thinking**
```json
{"thinking": {"type": "enabled", "budget_tokens": 10000}}
```

**Claude Max Tokens**
```json
{"max_tokens": 8192}
```

## Migration from Inline Configurations

When you first launch the app after the Model Config update, existing agent configurations are automatically migrated:

1. Each unique combination of model + temperature + maxTokens + topP becomes a ModelConfig
2. Agents are updated to reference the new ModelConfig by ID
3. Legacy inline config fields are kept for backward compatibility

The migration runs only once. The `model-configs.json` file is created in your app's user data directory.

## Storage

Model Configurations are stored globally in:
```
~/Library/Application Support/Turbo Carnival/model-configs.json  (macOS)
%APPDATA%/Turbo Carnival/model-configs.json                    (Windows)
~/.config/Turbo Carnival/model-configs.json                     (Linux)
```

Format:
```json
{
  "modelConfigs": [
    {
      "id": "gpt4-creative",
      "name": "GPT-4 Creative",
      "model": "gpt-4",
      "temperature": 0.9,
      "maxTokens": 4000,
      "topP": 0.95,
      "extra": {},
      "createdAt": 1704067200000
    }
  ]
}
```

## Troubleshooting

### Agent not using the expected model settings

1. Check that the agent has a `modelId` configured
2. Verify the ModelConfig exists and has the expected settings
3. Confirm the agent is using the correct provider

### Model-specific properties not working

1. Ensure the model supports the extra property you're using
2. Check the JSON format in the Extra Properties field is valid
3. Review the API response for errors related to unsupported parameters

### Migration didn't run

If you have agents with inline configs that weren't migrated:

1. Check that `model-configs.json` doesn't already exist in your app data directory
2. Look at the console logs for migration errors
3. Manually create ModelConfigs and update agents to reference them

## Best Practices

1. **Use descriptive names**: Name your ModelConfigs descriptively (e.g., "GPT-4 Creative" instead of "Config 1")
2. **Group by use case**: Create different configs for different use cases (creative, analytical, code review)
3. **Document extra properties**: Add comments in the Extra Properties field to document what each property does
4. **Test before sharing**: Test a new ModelConfig with a simple agent before using it in production
5. **Version control**: Consider backing up your `model-configs.json` file if you have important configurations

## Related Features

- **[LLM Providers](./llm-providers.md)** - Manage API providers for AI models
- **[Agent Management](../architecture.md)** - Overview of the agent system
- **[Tool Management](./tool-management.md)** - Custom tools for AI agents
