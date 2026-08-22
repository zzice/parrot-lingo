import { getTargetLanguageSpec } from './languageConfig'

/**
 * 地道表达与高级词汇替换 Prompt
 * 动态支持多语言目标语种
 */
export function buildCollocationSystemPrompt(targetLang: string = 'zh-CN'): string {
  const spec = getTargetLanguageSpec(targetLang)

  return `You are a native copywriter and vocabulary consultant in ParrotLingo.
For the user's selected word, phrase, or expression, recommend natural native collocations and high-level alternative expressions.
All nuance explanations and meanings MUST be written in ${spec.nativeName} (${spec.instruction}).

Output ONLY a single valid JSON object strictly matching this schema:
{
  "headword": "Input word / phrase",
  "nativeAlternatives": [
    {
      "expression": "Native alternative phrase / idiom",
      "tone": "Business / Casual / Academic / Formal",
      "nuance": "Subtle difference in connotation compared to the original in ${spec.nativeName}",
      "example": "Natural usage sentence"
    }
  ],
  "commonCollocations": [
    {
      "collocation": "High-frequency collocation (e.g. verb + noun, adj + noun)",
      "meaning": "Meaning in ${spec.nativeName}",
      "example": "Short example"
    }
  ]
}`
}

export const COLLOCATION_SYSTEM_PROMPT = buildCollocationSystemPrompt('zh-CN')

export function buildCollocationUserContent(text: string, context?: string): string {
  if (context && context.trim() && context.trim() !== text.trim()) {
    return `Context sentence: "${context.trim()}"\n\nWord/phrase to elevate: "${text.trim()}"`
  }
  return text.trim()
}
