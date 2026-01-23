# LLM Providers

## Overview

Turbo Carnival supports multiple LLM (Large Language Model) providers through a unified provider system. Providers are first-class objects that encapsulate API keys, endpoints, and provider-specific configurations, making it easy to switch between different AI services or use custom/local LLMs.

## Supported Providers

### OpenAI
- **Type**: `openai`
- **Default Base URL**: `https://api.openai.com/v1`
- **Configuration**:
  - API Key (required)
  - Base URL (optional, defaults to OpenAI's endpoint)
- **Tool Support**: Yes
- **Use Cases**: GPT-4, GPT-3.5, and OpenAI-compatible models

### GLM (Zhipu AI)
- **Type**: `glm`
- **Default Base URL**: `https://open.bigmodel.cn/api/paas/v4`
- **Configuration**:
  - API Key (required)
  - Base URL (required)
- **Tool Support**: Yes
- **Use Cases**: GLM-4, GLM-3-Turbo, and other Zhipu AI models

### Custom Providers
- **Type**: `custom`
- **Configuration**:
  - API Key (required)
  - Base URL (required)
  - Custom headers (optional, via future extensions)
- **Tool Support**: Yes (if compatible with OpenAI format)
- **Use Cases**: Local LLMs (Ollama, LM Studio), enterprise deployments, custom endpoints

## Provider Configuration Structure

Each provider has the following structure:

```typescript
interface LLMProvider {
  id: string;                    // Unique identifier (e.g., "openai-main")
  type: LLMProviderType;         // Provider type discriminator
  name: string;                  // Display name
  apiKey: string;                // API key/secret
  baseURL?: string;              // Custom endpoint (overrides default)
  createdAt: number;             // Timestamp when created
  updatedAt?: number;            // Timestamp when last updated
}
```

### Provider Types

```typescript
type LLMProviderType = 'openai' | 'glm' | 'azure' | 'anthropic' | 'custom';
```

## Managing Providers

### Creating a Provider

1. Open the application
2. Go to **Settings → Providers** (or click "Manage Providers" when creating/editing an agent)
3. Click **"Add Provider"**
4. Fill in the required fields:
   - **Provider Type**: Select from dropdown (OpenAI, GLM)
   - **Provider ID**: Unique identifier (letters, numbers, hyphens, underscores only)
   - **Display Name**: Human-readable name
   - **API Key**: Your API key for the provider
   - **Base URL**: Required for GLM/custom, optional for OpenAI
5. Click **"Add Provider"**

### Editing a Provider

1. Go to **Settings → Providers**
2. Click the **edit icon** (pencil) next to the provider
3. Modify the configuration
   - Note: Provider ID cannot be changed after creation
4. Click **"Update Provider"**

### Deleting a Provider

1. Go to **Settings → Providers**
2. Click the **delete icon** (trash can) next to the provider
3. Confirm deletion
4. **Warning**: Any agents using this provider will fail to execute

## Using Providers in Agents

### Creating an Agent with a Provider

1. Create or edit an agent
2. In the **"LLM Provider"** section, select a provider from the dropdown
3. The dropdown shows all configured providers with their type badges:
   ```
   OpenAI Production (OPENAI)
   GLM Development (GLM)
   ```
4. Save the agent

### Agent Configuration

Agents reference providers by ID in their configuration:

```json
{
  "name": "My Chat Agent",
  "type": "chat",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "providerId": "openai-main"
  }
}
```

When the agent executes a request, the system:
1. Looks up the provider by `providerId`
2. Extracts the API key and base URL from the provider
3. Makes API calls with the provider's configuration

## Migration from API Keys

### Automatic Migration

When you first run the updated application:
- Existing API keys are automatically converted to OpenAI providers
- Provider IDs are generated from API key names (sanitized format)
- Original `api-keys.json` is backed up to `api-keys.json.backup`
- Agent configurations are NOT automatically updated (see below)

### Manual Agent Migration

After API keys are migrated to providers, you must update each agent:

1. **Edit the agent** - The provider dropdown will show the migrated provider as selected
2. **Save the agent** - This updates the agent config to use `providerId`
3. **Verify** - Try sending a message to confirm it works

### Migration Rollback

If migration causes issues:
1. Close the application
2. Delete `providers.json` from your user data directory
3. Rename `api-keys.json.backup` back to `api-keys.json`
4. Restart the application

### Finding User Data Directory

- **macOS**: `~/Library/Application Support/Turbo Carnival/`
- **Windows**: `%APPDATA%/Turbo Carnival/`
- **Linux**: `~/.config/Turbo Carnival/`

## Provider Validation Rules

### ID Validation
- Must contain only letters, numbers, hyphens, and underscores
- Must be unique across all providers
- Cannot be empty

### Type-Specific Validation

**OpenAI**:
- API Key: Required
- Base URL: Optional (defaults to `https://api.openai.com/v1`)

**GLM**:
- API Key: Required
- Base URL: Required

**Custom**:
- API Key: Required
- Base URL: Required

## Default Base URLs

| Provider Type | Default URL |
|--------------|-------------|
| `openai` | `https://api.openai.com/v1` |
| `glm` | `https://open.bigmodel.cn/api/paas/v4` |
| `custom` | None (must be specified) |

## Adding New Providers

To add support for a new provider type:

### 1. Update Type Definition

In `src/global.d.ts`:

```typescript
export type LLMProviderType = 'openai' | 'glm' | 'your-provider' | 'custom';
```

### 2. Add Validation

In `src/main/provider-management.ts`, update `validateProvider()`:

```typescript
case 'your-provider':
  if (!provider.baseURL || provider.baseURL.trim().length === 0) {
    return { valid: false, error: 'Base URL is required for YourProvider' };
  }
  // Add provider-specific validation
  break;
```

### 3. Add Default URL

In `src/main/provider-management.ts`, update `getDefaultBaseURL()`:

```typescript
case 'your-provider':
  return 'https://api.your-provider.com/v1';
```

### 4. Update UI

In `src/components/provider-dialog.ts`, add option to the type dropdown:

```html
<option value="your-provider">Your Provider</option>
```

### 5. Handle Provider-Specific Logic

In `src/main/openai-client.ts`, extend `getProviderConfig()` if needed:

```typescript
if (provider.type === 'your-provider') {
  // Add custom headers, auth, etc.
}
```

## Troubleshooting

### "Provider not found" Error

**Cause**: Agent references a provider ID that doesn't exist

**Solution**:
1. Check `providers.json` in user data directory
2. Update the agent to use an existing provider
3. Or recreate the missing provider

### "Agent does not have a provider configured" Error

**Cause**: Agent has no `providerId` in its config

**Solution**:
1. Edit the agent
2. Select a provider from the dropdown
3. Save the agent

### API Call Failures

**Check**:
1. Provider's API key is correct
2. Base URL is accessible (test with curl or Postman)
3. Model name is supported by the provider
4. Rate limits haven't been exceeded
5. Network connectivity

### Migration Issues

**If API keys didn't migrate**:
1. Check if `api-keys.json.backup` exists
2. Verify backup has your API keys
3. Manually create providers with the same API keys

**If agents don't work after migration**:
1. Edit each agent to re-select the provider
2. Save the agent to update its configuration

## Architecture

### Main Process Modules

- **`src/main/provider-management.ts`**: Provider CRUD operations, validation, storage helpers
- **`src/main/migration.ts`**: Migration utility from API keys to providers
- **`src/main/openai-client.ts`**: Provider-aware API client with config extraction
- **`src/main/chat-agent-management.ts`**: Uses providers for chat agents
- **`src/main/app-agent-management.ts`**: Uses providers for app agents

### UI Components

- **`src/components/provider-dialog.ts`**: Provider management interface
- **`src/components/agent-form-dialog.ts`**: Agent creation with provider selection

### IPC Channels

- `providers:get` - Get all providers
- `providers:add` - Add new provider
- `providers:update` - Update existing provider
- `providers:remove` - Delete provider
- `providers:getById` - Get single provider by ID

### Storage

- **Location**: `{userData}/providers.json`
- **Format**: JSON with `providers` array
- **Backup**: `api-keys.json.backup` created during migration

## Security Considerations

### API Key Storage

- API keys are stored in plain text in `providers.json`
- User data directory is protected by OS-level permissions
- **Warning**: Do not commit `providers.json` to version control

### Best Practices

1. Use environment-specific providers (dev vs. production)
2. Rotate API keys regularly
3. Use read-only API keys when possible
4. Monitor provider usage logs for suspicious activity
5. Keep API keys in dedicated secrets management for production deployments

## Future Enhancements

Planned provider support:

### Azure OpenAI
- Deployment ID selection
- API version configuration
- Azure-specific authentication

### Anthropic Claude
- Different API format
- Claude-specific headers
- Model versioning

### Local Models
- Health checks (Ollama, LM Studio)
- Model listing
- Automatic endpoint discovery
- Timeout configuration for slower local models

### Advanced Features
- Provider health monitoring
- Usage tracking per provider
- Cost estimation
- Rate limiting per provider
- Provider priority/failover
- API key rotation without reconfiguring agents
