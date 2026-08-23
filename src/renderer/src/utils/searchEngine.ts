export type SearchEngineType = 'google' | 'baidu' | 'bing' | 'custom'

export interface SearchEngineOption {
  id: SearchEngineType
  name: string
  urlTemplate: string
}

export const PRESET_SEARCH_ENGINES: Record<Exclude<SearchEngineType, 'custom'>, SearchEngineOption> = {
  google: {
    id: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q={{queryString}}'
  },
  baidu: {
    id: 'baidu',
    name: 'Baidu',
    urlTemplate: 'https://www.baidu.com/s?wd={{queryString}}'
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q={{queryString}}'
  }
}

/**
 * 构建搜索引擎目标 URL
 */
export function buildSearchUrl(
  engine: SearchEngineType = 'google',
  query: string,
  customUrl?: string
): string {
  const encoded = encodeURIComponent(query.trim())
  if (engine === 'custom') {
    const template = customUrl?.trim() || 'https://www.google.com/search?q={{queryString}}'
    if (template.includes('{{queryString}}')) {
      return template.replace(/\{\{queryString\}\}/g, encoded)
    }
    if (template.includes('%s')) {
      return template.replace(/%s/g, encoded)
    }
    if (template.includes('?')) {
      return `${template}&q=${encoded}`
    }
    return `${template}?q=${encoded}`
  }

  const preset = PRESET_SEARCH_ENGINES[engine] || PRESET_SEARCH_ENGINES.google
  return preset.urlTemplate.replace('{{queryString}}', encoded)
}
