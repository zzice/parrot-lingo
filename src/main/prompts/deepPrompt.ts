import { getTargetLanguageSpec } from './languageConfig'

/**
 * 长难句深度语法剖析与结构拆解 Prompt
 * 动态支持多语言目标语种
 */
export function buildDeepAnalysisSystemPrompt(targetLang: string = 'zh-CN'): string {
  const spec = getTargetLanguageSpec(targetLang)

  return `You are an expert linguist and grammar instructor in ParrotLingo.
Perform deep syntactic analysis, structural breakdown, and contextual explanation for the given sentence.
All explanations, grammar notes, and core vocabulary definitions MUST be written in ${spec.nativeName} (${spec.instruction}).

Output ONLY a single valid JSON object strictly matching this schema:
{
  "translation": "Accurate, elegant translation in ${spec.nativeName}",
  "structure": {
    "mainClause": "Main subject-verb-object / predicate clause (with ${spec.nativeName} note)",
    "subordinateClauses": ["Identified relative clause, adverbial clause, noun clause, etc. in ${spec.nativeName}"],
    "keyModifiers": ["Prepositional phrases, participial modifiers, appositives, etc. in ${spec.nativeName}"]
  },
  "grammarPoints": [
    {
      "point": "Grammar rule name in ${spec.nativeName} (e.g. 非谓语动词 / 倒装句 / 分詞構文 / 가정법)",
      "explanation": "Clear explanation in ${spec.nativeName} of how it functions in this sentence"
    }
  ],
  "coreVocabulary": [
    {
      "word": "Key difficult term",
      "meaning": "Meaning in this sentence in ${spec.nativeName}"
    }
  ],
  "naturalRefinement": "A more native/polished way to express this idea in English"
}`
}

export const DEEP_ANALYSIS_SYSTEM_PROMPT = buildDeepAnalysisSystemPrompt('zh-CN')

export function buildDeepAnalysisUserContent(text: string, context?: string): string {
  if (context && context.trim() && context.trim() !== text.trim()) {
    return `Context: "${context.trim()}"\n\nTarget sentence to analyze: "${text.trim()}"`
  }
  return text.trim()
}
