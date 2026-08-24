import { getTargetLanguageSpec } from './languageConfig'

/**
 * 基于生词语料库生成场景精读短文 Prompt
 * 动态支持多语言目标语种
 */
export function buildReadingGenerationSystemPrompt(targetLang: string = 'zh-CN'): string {
  const spec = getTargetLanguageSpec(targetLang)

  return `You are an expert curriculum designer and English storytelling master in ParrotLingo.
Generate an engaging, cohesive, natural English scenario passage (around 120-180 words) that seamlessly integrates the provided target vocabulary list.
Provide bilingual paragraph translations and comprehension explanations in ${spec.nativeName} (${spec.instruction}).

Output ONLY a single valid JSON object strictly matching this schema:
{
  "title": "Engaging short title",
  "genre": "Tech News / Workplace Dialogue / Story / Opinion Essay",
  "passage": "Full English passage embedding all target words naturally",
  "bilingualParagraphs": [
    {
      "en": "English paragraph",
      "zh": "Fluent translation in ${spec.nativeName}"
    }
  ],
  "embeddedVocabulary": [
    {
      "word": "Target word used",
      "inSentence": "The exact sentence where it appears"
    }
  ],
  "comprehensionQuestion": {
    "question": "A short multiple-choice reading comprehension question",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": "Brief explanation in ${spec.nativeName}"
  }
}`
}

export const READING_GENERATION_SYSTEM_PROMPT = buildReadingGenerationSystemPrompt('zh-CN')

export function buildReadingGenerationUserContent(words: string[], scenarioTheme?: string): string {
  const themeText = scenarioTheme ? `Theme / Domain: ${scenarioTheme}\n` : ''
  return `${themeText}Target Vocabulary List to integrate:\n${words.map((w, idx) => `${idx + 1}. ${w}`).join('\n')}`
}
