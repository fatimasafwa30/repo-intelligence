/**
 * Centralized Groq model fallback configuration.
 * 
 * Models VERIFIED available on this Groq account (from /v1/models):
 *   - qwen/qwen3.6-27b
 *   - qwen/qwen3.8-27b
 *   - openai/gpt-oss-20b
 *   - openai/gpt-oss-120b
 *   - groq/compound-mini
 *   - groq/compound
 *
 * Models confirmed NOT available / decommissioned:
 *   - llama-3.3-70b-versatile, llama-3.1-8b-instant → "does not exist"
 *   - mixtral-8x7b-32768, llama3-70b-8192, gemma2-9b-it → decommissioned
 */
export function getFallbackModels() {
  const models = [
    process.env.GROQ_MODEL,
    'groq/compound-mini',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'qwen/qwen3.6-27b'
  ].filter(Boolean)
  // Deduplicate while preserving priority order
  return Array.from(new Set(models))
}
