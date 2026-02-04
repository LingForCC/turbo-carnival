import type { LLMProviderType } from '../../api/provider-management.d';
import { OpenAITransformer } from './openai-transformer';
import { GLMTransformer } from './glm-transformer';

/**
 * Factory function to create a message transformer based on provider type
 */
export function createTransformer(providerType: LLMProviderType) {
  switch (providerType) {
    case 'openai':
    case 'azure':
    case 'custom':
      return new OpenAITransformer();
    case 'glm':
      return new GLMTransformer();
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

// Re-export transformers for direct access if needed
export { OpenAITransformer } from './openai-transformer';
export { GLMTransformer } from './glm-transformer';
