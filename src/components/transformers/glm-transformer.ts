import { OpenAITransformer } from './openai-transformer';
import type { ChatMessage } from '../conversation-panel';
import type { OpenAIMessage } from '../../main/llm/glm';

/**
 * Transformer for GLM message format
 * GLM uses the same OpenAI-compatible format, so we extend OpenAITransformer
 */
export class GLMTransformer extends OpenAITransformer {
  /**
   * Transform GLM messages to ChatMessage format
   * GLM uses the same format as OpenAI, so we reuse the parent logic
   */
  transform(messages: OpenAIMessage[]): ChatMessage[] {
    return super.transform(messages);
  }
}
