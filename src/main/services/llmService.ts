import { ProviderRepository } from '../db/repositories/providerRepository'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import {
  TestConnectionResult,
  CheckModelResult,
  CheckModelRequest,
  FetchRemoteModelsResult,
  RemoteModelItem,
  ExplainRequest,
  ExplainResponse
} from '../../renderer/src/types'
import { Logger } from '../utils/logger'
import { buildExplainSystemPrompt, buildExplainUserContent } from '../prompts'
import { CorpusRepository } from '../db/repositories/corpusRepository'
import { parse as parsePartialJson } from 'partial-json'

export type { ExplainRequest, ExplainResponse }

export class LLMService {
  /** 解析当前请求对应的目标翻译/解释语言 */
  public static resolveTargetLanguage(request?: ExplainRequest): string {
    if (request?.targetLanguage && request.targetLanguage.trim()) {
      return request.targetLanguage.trim()
    }
    try {
      const settings = SettingsRepository.get()
      if (
        settings?.selection?.targetLanguage &&
        settings.selection.targetLanguage.trim() &&
        settings.selection.targetLanguage !== 'follow'
      ) {
        return settings.selection.targetLanguage.trim()
      }
      if (settings?.system?.language) {
        return settings.system.language
      }
    } catch {
      // ignore
    }
    return 'zh-CN'
  }

  /** 单模型/指定模型的业务探针健康度检测 */
  static async checkModel(options: CheckModelRequest): Promise<CheckModelResult> {
    const { providerId, modelId, timeout = 10000 } = options
    const provider = ProviderRepository.getById(providerId)
    if (!provider) {
      Logger.warn('LLM:CheckModel', `未找到服务商 [${providerId}]`)
      return { success: false, message: '未找到该服务商配置' }
    }

    const startTime = Date.now()

    // 2. 检查本地部署或 API Key
    const isLocal =
      provider.baseUrl.includes('localhost') ||
      provider.baseUrl.includes('127.0.0.1') ||
      provider.baseUrl.includes(':11434')

    if (!isLocal && (!provider.apiKey || provider.apiKey.trim() === '')) {
      Logger.warn('LLM:CheckModel', `[${provider.name}] 未填写 API Key`)
      return {
        success: false,
        message: '请先填写 API Key'
      }
    }

    // 确定探测的具体模型
    const targetModelId =
      modelId || provider.models.find((m) => m.isDefault)?.id || provider.models[0]?.id

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    const apiType = provider.apiType || 'openai'

    try {
      const cleanBaseUrl = provider.baseUrl.replace(/\/+$/, '')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (apiType === 'anthropic') {
        headers['anthropic-version'] = '2023-06-01'
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['x-api-key'] = provider.apiKey.trim()
        }
      } else {
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
        }
      }

      // 3. Ollama 专属轻量探测：调用 POST /api/show 查询模型元数据，避免显存占用
      if (isLocal && targetModelId && apiType === 'openai') {
        try {
          const ollamaUrl = cleanBaseUrl.endsWith('/v1')
            ? cleanBaseUrl.slice(0, -3) + '/api/show'
            : `${cleanBaseUrl}/api/show`

          Logger.info('LLM:OllamaProbe', `POST ${ollamaUrl} -> 模型: ${targetModelId}`)

          const ollamaRes = await fetch(ollamaUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model: targetModelId }),
            signal: controller.signal
          })

          if (ollamaRes.ok) {
            clearTimeout(timeoutId)
            const latency = Date.now() - startTime
            Logger.success(
              'LLM:OllamaProbe',
              `[${provider.name} / ${targetModelId}] 模型可用 · 延迟 ${latency}ms`
            )
            return {
              success: true,
              message: `Ollama 模型可用 · 延迟 ${latency}ms`,
              latency
            }
          }
        } catch (ollamaErr: any) {
          Logger.warn(
            'LLM:OllamaProbe',
            `Ollama /api/show 失败 (${ollamaErr.message})，回退至业务探针`
          )
        }
      }

      // 4. 多协议业务探针 (极小消耗真实验证鉴权与额度)
      if (targetModelId) {
        let endpoint = `${cleanBaseUrl}/chat/completions`
        let payload: any = {
          model: targetModelId,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
          stream: false
        }

        if (apiType === 'anthropic') {
          endpoint = `${cleanBaseUrl}/messages`
          payload = {
            model: targetModelId,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
          }
        } else if (apiType === 'openai-responses') {
          endpoint = `${cleanBaseUrl}/responses`
          payload = {
            model: targetModelId,
            input: 'hi',
            max_output_tokens: 1
          }
        }

        Logger.info(
          'LLM:CheckModel',
          `POST ${endpoint} [${provider.name} / ${targetModelId}] (${apiType} 业务探针)`
        )

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        const latency = Date.now() - startTime

        if (response.ok) {
          Logger.success(
            'LLM:CheckModel',
            `[${provider.name} / ${targetModelId}] HTTP ${response.status} 探针成功 · 延迟 ${latency}ms`
          )
          return {
            success: true,
            message: `可用 · 延迟 ${latency}ms`,
            latency
          }
        } else {
          const errText = await response.text()
          let parsedMsg = `HTTP ${response.status}`
          try {
            const errJson = JSON.parse(errText)
            if (errJson.error?.message) parsedMsg = errJson.error.message
            else if (errJson.message) parsedMsg = errJson.message
            else if (typeof errJson.error === 'string') parsedMsg = errJson.error
          } catch {
            // ignore
          }

          // 友好错误提示转换
          if (response.status === 401) {
            parsedMsg = `API Key 无效 (${parsedMsg})`
          } else if (response.status === 403) {
            parsedMsg = `无模型权限或被拒绝 (${parsedMsg})`
          } else if (
            response.status === 402 ||
            parsedMsg.toLowerCase().includes('quota') ||
            parsedMsg.toLowerCase().includes('insufficient') ||
            parsedMsg.toLowerCase().includes('credit')
          ) {
            parsedMsg = `额度不足或欠费 (${parsedMsg})`
          } else if (response.status === 404 || parsedMsg.toLowerCase().includes('not found')) {
            parsedMsg = `模型不存在 (${parsedMsg})`
          } else if (response.status === 429) {
            parsedMsg = `请求频次超限 (${parsedMsg})`
          }

          Logger.error(
            'LLM:CheckModel',
            `[${provider.name} / ${targetModelId}] HTTP ${response.status} 探针失败: ${parsedMsg}`
          )

          return {
            success: false,
            message: parsedMsg,
            latency
          }
        }
      }

      // 5. 若无任何具体模型可用，降级探测 /models 端点
      const endpoint = `${cleanBaseUrl}/models`
      Logger.info('LLM:CheckModel', `GET ${endpoint} [${provider.name}] (轻量端点探针)`)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const latency = Date.now() - startTime

      if (response.ok) {
        Logger.success(
          'LLM:CheckModel',
          `[${provider.name}] HTTP ${response.status} 连接正常 · 延迟 ${latency}ms`
        )
        return {
          success: true,
          message: `连接正常 · 延迟 ${latency}ms`,
          latency
        }
      } else {
        Logger.error(
          'LLM:CheckModel',
          `[${provider.name}] HTTP ${response.status} 连接失败 · 延迟 ${latency}ms`
        )
        return {
          success: false,
          message: `连接失败 (HTTP ${response.status})`,
          latency
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      const latency = Date.now() - startTime
      if (err.name === 'AbortError') {
        Logger.error(
          'LLM:CheckModel',
          `[${provider.name}] 连接超时 (${Math.round(timeout / 1000)}s)`
        )
        return {
          success: false,
          message: `连接超时 (${Math.round(timeout / 1000)}s)，请检查网络或代理`,
          latency
        }
      }
      Logger.error(
        'LLM:CheckModel',
        `[${provider.name}] 网络异常: ${err.message || '无法访问端点'}`
      )
      return {
        success: false,
        message: `网络异常: ${err.message || '无法访问端点'}`,
        latency
      }
    }
  }

  /** 连通性测试 (服务商级) */
  static async testConnection(providerId: string): Promise<TestConnectionResult> {
    const provider = ProviderRepository.getById(providerId)
    if (!provider) {
      return { success: false, message: '未找到该模型平台配置' }
    }

    Logger.info(
      'LLM:TestConnection',
      `[${provider.name}] 开始测试连通性 (BaseUrl: ${provider.baseUrl})`
    )

    const checkRes = await this.checkModel({ providerId })

    if (checkRes.success) {
      Logger.success(
        'LLM:TestConnection',
        `[${provider.name}] 连通性测试通过 · 延迟 ${checkRes.latency}ms`
      )
    } else {
      Logger.error('LLM:TestConnection', `[${provider.name}] 连通性测试未通过: ${checkRes.message}`)
    }

    return {
      success: checkRes.success,
      message: checkRes.message,
      latency: checkRes.latency,
      modelsCount: provider.models.length
    }
  }

  /** 从远程 /v1/models 拉取并同步可用模型列表 */
  static async fetchRemoteModels(providerId: string): Promise<FetchRemoteModelsResult> {
    const provider = ProviderRepository.getById(providerId)
    if (!provider) {
      Logger.warn('LLM:FetchModels', `未找到服务商 [${providerId}]`)
      return { success: false, message: '未找到该服务商', models: [] }
    }

    try {
      const isOllama =
        provider.baseUrl.includes('11434') ||
        provider.baseUrl.includes('localhost') ||
        provider.baseUrl.includes('127.0.0.1')
      const apiType = provider.apiType || 'openai'
      const endpoint = `${provider.baseUrl.replace(/\/+$/, '')}/models`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      Logger.info('LLM:FetchModels', `[${provider.name}] GET ${endpoint}`)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (apiType === 'anthropic') {
        headers['anthropic-version'] = '2023-06-01'
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['x-api-key'] = provider.apiKey.trim()
        }
      } else {
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
        }
      }

      let response = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: controller.signal
      })

      // 如果是 Ollama 且 /models 返回 404，尝试 /api/tags
      if (!response.ok && isOllama) {
        const ollamaTagsEndpoint = `${provider.baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/api/tags`
        Logger.info(
          'LLM:FetchModels',
          `[${provider.name}] 尝试 Ollama 标签端点: GET ${ollamaTagsEndpoint}`
        )
        try {
          const altRes = await fetch(ollamaTagsEndpoint, {
            method: 'GET',
            headers,
            signal: controller.signal
          })
          if (altRes.ok) {
            response = altRes
          }
        } catch {
          // ignore
        }
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        Logger.error('LLM:FetchModels', `[${provider.name}] HTTP ${response.status} 拉取失败`)
        return { success: false, message: `拉取失败: HTTP ${response.status}`, models: [] }
      }

      const json: any = await response.json()
      const rawList: any[] = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.models)
          ? json.models
          : Array.isArray(json)
            ? json
            : []

      if (rawList.length === 0) {
        Logger.warn('LLM:FetchModels', `[${provider.name}] 获取成功但模型列表为空`)
        return { success: true, message: '获取成功，但未发现可用模型', models: [] }
      }

      // 提取远程模型 ID 与名称
      const remoteModels: RemoteModelItem[] = rawList.map((item) => {
        const id = item.id || item.name || item.model || String(item)
        const name = item.name || item.id || id
        const description = item.description || ''
        return { id, name, description }
      })

      Logger.success(
        'LLM:FetchModels',
        `[${provider.name}] 成功拉取 ${remoteModels.length} 个模型 (示例: ${remoteModels
          .slice(0, 3)
          .map((m) => m.id)
          .join(', ')}...)`
      )

      return {
        success: true,
        message: `成功拉取 ${remoteModels.length} 个模型`,
        models: remoteModels
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        Logger.error('LLM:FetchModels', `[${provider.name}] 获取模型列表超时 (8s)`)
        return {
          success: false,
          message: '获取模型列表超时 (8s)，请检查网络或代理设置',
          models: []
        }
      }
      Logger.error('LLM:FetchModels', `[${provider.name}] 异常: ${err.message || '网络错误'}`)
      return {
        success: false,
        message: `获取模型列表异常: ${err.message || '网络错误'}`,
        models: []
      }
    }
  }

  /** 解析与路由目标模型 */
  private static resolveModel(request: ExplainRequest) {
    const settings = SettingsRepository.get()
    const defaultModels = settings.defaultModels
    const allProviders = ProviderRepository.getAll().filter((p) => p.enabled)

    let targetProviderId = request.providerId
    let targetModelId = request.modelId

    // 如果未指定具体模型，则根据 task 从 defaultModels 路由
    if (!targetModelId && defaultModels) {
      let taskSetting = 'follow'
      switch (request.task) {
        case 'explain':
          taskSetting = defaultModels.fastModel || 'follow'
          break
        case 'deep':
          taskSetting = defaultModels.deepModel || 'follow'
          break
        case 'collocation':
          taskSetting = defaultModels.collocationModel || 'follow'
          break
        case 'reading':
          taskSetting = defaultModels.readingModel || 'follow'
          break
        default:
          taskSetting = 'follow'
      }

      const effectiveSetting = taskSetting === 'follow' ? defaultModels.globalModel : taskSetting
      if (effectiveSetting && effectiveSetting.includes(':')) {
        const [pId, mId] = effectiveSetting.split(':')
        targetProviderId = pId
        targetModelId = mId
      } else if (effectiveSetting) {
        targetModelId = effectiveSetting
      }
    }

    // 查找对应服务商与模型
    let activeProvider = targetProviderId
      ? allProviders.find((p) => p.id === targetProviderId)
      : null

    if (!activeProvider && targetModelId) {
      activeProvider =
        allProviders.find((p) => p.models.some((m) => m.id === targetModelId)) || null
    }

    if (!activeProvider) {
      activeProvider = allProviders[0] || ProviderRepository.getById('parrotlingo')
    }

    const activeModel = (targetModelId
      ? activeProvider?.models.find((m) => m.id === targetModelId)
      : null) ||
      activeProvider?.models.find((m) => m.isDefault) ||
      activeProvider?.models[0] || {
        id: 'parrot-lingo-v1',
        name: 'ParrotLingo Fast Explain'
      }

    return { provider: activeProvider, model: activeModel }
  }

  /** 执行划词翻译与解析 */
  static async explain(request: ExplainRequest): Promise<ExplainResponse> {
    const startTime = Date.now()
    const text = request.text?.trim() || ''

    if (!text) {
      return {
        text: '',
        translation: '',
        error: '选中文本为空'
      }
    }

    const targetLang = this.resolveTargetLanguage(request)

    // 核心原则：能复用就不重复生成。若本地语料库已记录该词且目标语言一致，直接返回已有词条
    if (!request.force) {
      try {
        const canonical = text.toLowerCase().trim()
        const existing = CorpusRepository.getByCanonical(canonical)
        if (existing && existing.translation && existing.translation.trim()) {
          const lexical = CorpusRepository.getLexicalMetadata(existing)
          const cachedLang = lexical.targetLanguage || 'zh-CN'

          if (cachedLang === targetLang) {
            Logger.info(
              'AI:Translate',
              `[本地复用] 命中了已翻译语料(${targetLang}): "${text}" (0ms，跳过模型调用)`
            )
            return {
              text: existing.text || text,
              translation: existing.translation,
              targetLanguage: targetLang,
              phonetic: existing.phonetic,
              phoneticUk: lexical.phoneticUk || existing.phonetic,
              phoneticUs: lexical.phoneticUs || existing.phonetic,
              partOfSpeech: existing.partOfSpeech,
              posExplanations: lexical.posExplanations,
              contextMeaning: lexical.contextMeaning,
              explanation: existing.explanation,
              alternativeExpressions: existing.alternativeExpressions,
              bilingualExample: lexical.bilingualExample,
              difficulty: existing.difficulty,
              tags: existing.tags,
              providerName: '本地已存语料'
            }
          }
        }
      } catch (cacheErr) {
        Logger.warn('AI:Translate', `读取本地语料库缓存异常: ${cacheErr}`)
      }
    }

    try {
      const { provider, model } = this.resolveModel(request)

      if (!provider) {
        Logger.warn('AI:Translate', '未找到可用的模型服务商')
        return {
          text,
          translation: '',
          targetLanguage: targetLang,
          error: '未配置可用的模型服务商，请前往设置开启或添加服务商'
        }
      }

      const isLocal =
        provider.baseUrl.includes('localhost') ||
        provider.baseUrl.includes('127.0.0.1') ||
        provider.baseUrl.includes(':11434')

      if (!isLocal && (!provider.apiKey || provider.apiKey.trim() === '')) {
        Logger.warn('AI:Translate', `[${provider.name}] 未配置 API Key`)
        return {
          text,
          translation: '',
          targetLanguage: targetLang,
          error: `[${provider.name}] 未配置 API Key，请先在「设置 - 模型服务」中填写密钥`,
          providerName: provider.name,
          modelName: model.name
        }
      }

      const apiType = provider.apiType || 'openai'
      const cleanBaseUrl = provider.baseUrl.replace(/\/+$/, '')

      const systemPrompt = buildExplainSystemPrompt(targetLang)
      const userContent = buildExplainUserContent(text, request.context)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      let endpoint = `${cleanBaseUrl}/chat/completions`
      let payload: any = {}

      if (apiType === 'anthropic') {
        endpoint = `${cleanBaseUrl}/messages`
        headers['anthropic-version'] = '2023-06-01'
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['x-api-key'] = provider.apiKey.trim()
        }
        payload = {
          model: model.id,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          temperature: 0.3
        }
      } else if (apiType === 'openai-responses') {
        endpoint = `${cleanBaseUrl}/responses`
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
        }
        payload = {
          model: model.id,
          instructions: systemPrompt,
          input: userContent,
          max_output_tokens: 2048,
          temperature: 0.3
        }
      } else {
        // OpenAI 标准 Chat Completions 协议
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
        }
        payload = {
          model: model.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.3
        }
      }

      Logger.info(
        'AI:Translate',
        `开始翻译: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}" -> [${provider.name} / ${model.name}] (${apiType})`
      )

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const latency = Date.now() - startTime

      if (!response.ok) {
        const errText = await response.text()
        let parsedMsg = `HTTP ${response.status}`
        try {
          const errJson = JSON.parse(errText)
          if (errJson.error?.message) parsedMsg = errJson.error.message
          else if (errJson.message) parsedMsg = errJson.message
          else if (typeof errJson.error === 'string') parsedMsg = errJson.error
        } catch {
          // ignore
        }

        if (response.status === 401) {
          parsedMsg = `API Key 无效或过期 (${parsedMsg})`
        } else if (response.status === 403) {
          parsedMsg = `无权限访问该模型 (${parsedMsg})`
        } else if (
          response.status === 402 ||
          parsedMsg.toLowerCase().includes('quota') ||
          parsedMsg.toLowerCase().includes('insufficient')
        ) {
          parsedMsg = `账户额度不足或欠费 (${parsedMsg})`
        } else if (response.status === 404) {
          parsedMsg = `模型不存在或端点错误 (${parsedMsg})`
        } else if (response.status === 429) {
          parsedMsg = `请求频率超限 (${parsedMsg})`
        }

        Logger.error(
          'AI:Translate',
          `[${provider.name}] HTTP ${response.status} 失败: ${parsedMsg}`
        )

        return {
          text,
          translation: '',
          error: parsedMsg,
          providerName: provider.name,
          modelName: model.name
        }
      }

      const json: any = await response.json()
      let rawOutput = ''

      if (apiType === 'anthropic') {
        if (Array.isArray(json.content)) {
          rawOutput = json.content.map((c: any) => c.text || '').join('')
        } else if (typeof json.content === 'string') {
          rawOutput = json.content
        }
      } else if (apiType === 'openai-responses') {
        rawOutput =
          json.output_text ||
          json.output?.[0]?.content?.[0]?.text ||
          (typeof json.output === 'string' ? json.output : '')
      } else {
        rawOutput = json.choices?.[0]?.message?.content || ''
      }

      const result = this.parseExplainJson(rawOutput, text, provider.name, model.name, targetLang)
      Logger.success(
        'AI:Translate',
        `翻译完成 (${latency}ms) -> "${result.translation.slice(0, 40)}${result.translation.length > 40 ? '...' : ''}" ${result.phoneticUs ? `[美: ${result.phoneticUs}]` : ''} ${result.phoneticUk ? `[英: ${result.phoneticUk}]` : ''}`
      )
      return result
    } catch (err: any) {
      const latency = Date.now() - startTime
      let errorMsg = err.message || '网络请求失败'

      if (err.name === 'AbortError') {
        errorMsg = '请求超时 (25s)，请检查网络连接或代理设置'
      }

      Logger.error('AI:Translate', `调用异常 (${latency}ms): ${errorMsg}`)

      return {
        text,
        translation: '',
        targetLanguage: targetLang,
        error: errorMsg
      }
    }
  }

  /** 格式化音标统一包含斜杠 */
  private static formatIpa(ipa: string): string {
    const trimmed = ipa.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('/') && trimmed.endsWith('/')) return trimmed
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed
    return `/${trimmed}/`
  }

  /** 实时解析 Partial JSON (容错流式片段) */
  private static parsePartialExplain(
    rawOutput: string,
    text: string,
    providerName?: string,
    modelName?: string,
    targetLanguage?: string
  ): Partial<ExplainResponse> {
    let cleanText = rawOutput.trim()
    if (cleanText.startsWith('```')) {
      cleanText = cleanText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
    }

    let translation = ''
    let detectedLanguage: string | undefined
    let phoneticUk: string | undefined
    let phoneticUs: string | undefined
    let phonetic: string | undefined
    let posExplanations: Array<{ pos: string; meaning: string }> | undefined
    let contextMeaning: string | undefined
    let alternativeExpressions: string[] | undefined
    let bilingualExample: { source?: string; target?: string; en?: string; zh?: string } | undefined
    let difficulty: string | undefined

    try {
      const parsed: any = parsePartialJson(cleanText)
      if (parsed && typeof parsed === 'object') {
        if (parsed.translation) translation = String(parsed.translation).trim()
        if (parsed.detectedLanguage) detectedLanguage = String(parsed.detectedLanguage).trim()
        if (parsed.contextMeaning && String(parsed.contextMeaning).trim()) {
          contextMeaning = String(parsed.contextMeaning).trim()
        }
        if (parsed.phoneticUk && String(parsed.phoneticUk).trim()) {
          phoneticUk = this.formatIpa(String(parsed.phoneticUk))
        }
        if (parsed.phoneticUs && String(parsed.phoneticUs).trim()) {
          phoneticUs = this.formatIpa(String(parsed.phoneticUs))
        }
        if (parsed.phonetic && String(parsed.phonetic).trim()) {
          phonetic = this.formatIpa(String(parsed.phonetic))
        }
        if (Array.isArray(parsed.posExplanations) && parsed.posExplanations.length > 0) {
          posExplanations = parsed.posExplanations
            .filter((p: any) => p && (p.pos || p.meaning))
            .map((p: any) => ({
              pos: String(p.pos || '').trim(),
              meaning: String(p.meaning || '').trim()
            }))
        }
        if (Array.isArray(parsed.alternativeExpressions)) {
          alternativeExpressions = parsed.alternativeExpressions
            .filter((item: any) => typeof item === 'string' && item.trim())
            .map((item: string) => item.trim())
        }
        if (parsed.bilingualExample && typeof parsed.bilingualExample === 'object') {
          const src = parsed.bilingualExample.source || parsed.bilingualExample.en
          const tgt = parsed.bilingualExample.target || parsed.bilingualExample.zh
          if (src || tgt) {
            bilingualExample = {
              source: src ? String(src).trim() : '',
              target: tgt ? String(tgt).trim() : '',
              en: src ? String(src).trim() : '',
              zh: tgt ? String(tgt).trim() : ''
            }
          }
        }
        if (parsed.difficulty && String(parsed.difficulty).trim()) {
          difficulty = String(parsed.difficulty).trim()
        }
      }
    } catch {
      // 头几个 token 容错忽略
    }

    const isEnglish = /^[a-zA-Z\s'’\-]+$/.test(text.trim())
    if (isEnglish && !phoneticUk && !phoneticUs && phonetic) {
      phoneticUs = phonetic
    }

    return {
      text,
      translation,
      detectedLanguage,
      phonetic: phoneticUs || phoneticUk || phonetic,
      phoneticUk,
      phoneticUs,
      posExplanations,
      contextMeaning,
      alternativeExpressions,
      bilingualExample,
      difficulty,
      targetLanguage,
      providerName,
      modelName
    }
  }

  /** 解析完整的 JSON 响应 (带正则容错) */
  private static parseExplainJson(
    rawOutput: string,
    text: string,
    providerName?: string,
    modelName?: string,
    targetLanguage?: string
  ): ExplainResponse {
    let translation = rawOutput.trim()
    let detectedLanguage: string | undefined
    let phonetic: string | undefined
    let phoneticUk: string | undefined
    let phoneticUs: string | undefined
    let posExplanations: Array<{ pos: string; meaning: string }> | undefined
    let contextMeaning: string | undefined
    let alternativeExpressions: string[] | undefined
    let bilingualExample: { source?: string; target?: string; en?: string; zh?: string } | undefined
    let difficulty: string | undefined

    try {
      let cleanText = rawOutput.trim()
      if (cleanText.startsWith('```')) {
        cleanText = cleanText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim()
      }

      const parsed = JSON.parse(cleanText)
      if (parsed && typeof parsed === 'object') {
        if (parsed.translation) translation = String(parsed.translation).trim()
        if (parsed.detectedLanguage) detectedLanguage = String(parsed.detectedLanguage).trim()
        if (parsed.contextMeaning && String(parsed.contextMeaning).trim()) {
          contextMeaning = String(parsed.contextMeaning).trim()
        }
        if (parsed.phoneticUk && String(parsed.phoneticUk).trim()) {
          phoneticUk = this.formatIpa(String(parsed.phoneticUk))
        }
        if (parsed.phoneticUs && String(parsed.phoneticUs).trim()) {
          phoneticUs = this.formatIpa(String(parsed.phoneticUs))
        }
        if (parsed.phonetic && String(parsed.phonetic).trim()) {
          phonetic = this.formatIpa(String(parsed.phonetic))
        }
        if (Array.isArray(parsed.posExplanations) && parsed.posExplanations.length > 0) {
          posExplanations = parsed.posExplanations
            .filter((p: any) => p && (p.pos || p.meaning))
            .map((p: any) => ({
              pos: String(p.pos || '').trim(),
              meaning: String(p.meaning || '').trim()
            }))
        }
        if (Array.isArray(parsed.alternativeExpressions)) {
          alternativeExpressions = parsed.alternativeExpressions
            .filter((item: any) => typeof item === 'string' && item.trim())
            .map((item: string) => item.trim())
        }
        if (parsed.bilingualExample && typeof parsed.bilingualExample === 'object') {
          const src = parsed.bilingualExample.source || parsed.bilingualExample.en
          const tgt = parsed.bilingualExample.target || parsed.bilingualExample.zh
          if (src || tgt) {
            bilingualExample = {
              source: src ? String(src).trim() : '',
              target: tgt ? String(tgt).trim() : '',
              en: src ? String(src).trim() : '',
              zh: tgt ? String(tgt).trim() : ''
            }
          }
        }
        if (parsed.difficulty && String(parsed.difficulty).trim()) {
          difficulty = String(parsed.difficulty).trim()
        }
      }
    } catch {
      const match = rawOutput.match(/\{[\s\S]*"translation"[\s\S]*\}/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          if (parsed.translation) translation = String(parsed.translation).trim()
          if (parsed.detectedLanguage) detectedLanguage = String(parsed.detectedLanguage).trim()
          if (parsed.contextMeaning) contextMeaning = String(parsed.contextMeaning).trim()
          if (parsed.phoneticUk) phoneticUk = this.formatIpa(String(parsed.phoneticUk))
          if (parsed.phoneticUs) phoneticUs = this.formatIpa(String(parsed.phoneticUs))
          if (parsed.phonetic) phonetic = this.formatIpa(String(parsed.phonetic))
          if (Array.isArray(parsed.posExplanations)) posExplanations = parsed.posExplanations
          if (Array.isArray(parsed.alternativeExpressions)) {
            alternativeExpressions = parsed.alternativeExpressions
          }
        } catch {
          // ignore
        }
      } else {
        const phoneticMatch = rawOutput.match(/(\/[^/\n\r]+\/|\[[^\]\n\r]+\])/)
        if (phoneticMatch) {
          phonetic = phoneticMatch[1].trim()
          translation = rawOutput.replace(phoneticMatch[0], '').trim()
        }
      }
    }

    const isEnglish = /^[a-zA-Z\s'’\-]+$/.test(text.trim())
    if (isEnglish && !phoneticUk && !phoneticUs && phonetic) {
      phoneticUs = phonetic
    }

    return {
      text,
      translation,
      detectedLanguage,
      phonetic: phoneticUs || phoneticUk || phonetic,
      phoneticUk,
      phoneticUs,
      posExplanations,
      contextMeaning,
      alternativeExpressions,
      bilingualExample,
      difficulty,
      targetLanguage,
      providerName,
      modelName
    }
  }

  /** 执行流式划词翻译与渐进式解析 */
  static async explainStream(
    request: ExplainRequest,
    onChunk: (data: Partial<ExplainResponse>, isDone: boolean, error?: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const startTime = Date.now()
    const text = request.text?.trim() || ''

    if (!text) {
      onChunk({ text: '', translation: '' }, true, '选中文本为空')
      return
    }

    const targetLang = this.resolveTargetLanguage(request)

    // 1. 本地语料库命中检查
    if (!request.force) {
      try {
        const canonical = text.toLowerCase().trim()
        const existing = CorpusRepository.getByCanonical(canonical)
        if (existing && existing.translation && existing.translation.trim()) {
          const lexical = CorpusRepository.getLexicalMetadata(existing)
          const cachedLang = lexical.targetLanguage || 'zh-CN'

          if (cachedLang === targetLang) {
            Logger.info(
              'AI:TranslateStream',
              `[本地复用] 命中了已翻译语料(${targetLang}): "${text}" (0ms，跳过模型调用)`
            )
            onChunk(
              {
                text: existing.text || text,
                translation: existing.translation,
                targetLanguage: targetLang,
                phonetic: existing.phonetic,
                phoneticUk: lexical.phoneticUk || existing.phonetic,
                phoneticUs: lexical.phoneticUs || existing.phonetic,
                partOfSpeech: existing.partOfSpeech,
                posExplanations: lexical.posExplanations,
                contextMeaning: lexical.contextMeaning,
                explanation: existing.explanation,
                alternativeExpressions: existing.alternativeExpressions,
                bilingualExample: lexical.bilingualExample,
                difficulty: existing.difficulty,
                tags: existing.tags,
                providerName: '本地已存语料'
              },
              true
            )
            return
          }
        }
      } catch (cacheErr) {
        Logger.warn('AI:TranslateStream', `读取本地语料库缓存异常: ${cacheErr}`)
      }
    }

    try {
      const { provider, model } = this.resolveModel(request)

      if (!provider) {
        Logger.warn('AI:TranslateStream', '未找到可用的模型服务商')
        onChunk(
          { text, translation: '', targetLanguage: targetLang },
          true,
          '未配置可用的模型服务商，请前往设置开启或添加服务商'
        )
        return
      }

      const isLocal =
        provider.baseUrl.includes('localhost') ||
        provider.baseUrl.includes('127.0.0.1') ||
        provider.baseUrl.includes(':11434')

      if (!isLocal && (!provider.apiKey || provider.apiKey.trim() === '')) {
        Logger.warn('AI:TranslateStream', `[${provider.name}] 未配置 API Key`)
        onChunk(
          {
            text,
            translation: '',
            targetLanguage: targetLang,
            providerName: provider.name,
            modelName: model.name
          },
          true,
          `[${provider.name}] 未配置 API Key，请先在「设置 - 模型服务」中填写密钥`
        )
        return
      }

      const apiType = provider.apiType || 'openai'
      const cleanBaseUrl = provider.baseUrl.replace(/\/+$/, '')
      const systemPrompt = buildExplainSystemPrompt(targetLang)
      const userContent = buildExplainUserContent(text, request.context)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      let endpoint = `${cleanBaseUrl}/chat/completions`
      let payload: any = {}

      if (apiType === 'anthropic') {
        endpoint = `${cleanBaseUrl}/messages`
        headers['anthropic-version'] = '2023-06-01'
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['x-api-key'] = provider.apiKey.trim()
        }
        payload = {
          model: model.id,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          temperature: 0.3,
          stream: true
        }
      } else {
        // OpenAI 标准 Chat Completions 协议
        if (provider.apiKey && provider.apiKey.trim()) {
          headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
        }
        payload = {
          model: model.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.3,
          stream: true
        }
      }

      Logger.info(
        'AI:TranslateStream',
        `开始流式翻译: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}" -> [${provider.name} / ${model.name}] (${apiType})`
      )

      const internalController = new AbortController()
      const timeoutId = setTimeout(() => internalController.abort(), 30000)

      if (signal) {
        signal.addEventListener('abort', () => internalController.abort(), { once: true })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: internalController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errText = await response.text()
        let parsedMsg = `HTTP ${response.status}`
        try {
          const errJson = JSON.parse(errText)
          if (errJson.error?.message) parsedMsg = errJson.error.message
          else if (errJson.message) parsedMsg = errJson.message
          else if (typeof errJson.error === 'string') parsedMsg = errJson.error
        } catch {
          // ignore
        }

        if (response.status === 401) parsedMsg = `API Key 无效或过期 (${parsedMsg})`
        else if (response.status === 403) parsedMsg = `无权限访问该模型 (${parsedMsg})`
        else if (response.status === 402 || parsedMsg.toLowerCase().includes('quota'))
          parsedMsg = `账户额度不足或欠费 (${parsedMsg})`
        else if (response.status === 404) parsedMsg = `模型不存在或端点错误 (${parsedMsg})`
        else if (response.status === 429) parsedMsg = `请求频率超限 (${parsedMsg})`

        Logger.error(
          'AI:TranslateStream',
          `[${provider.name}] HTTP ${response.status} 失败: ${parsedMsg}`
        )
        onChunk(
          {
            text,
            translation: '',
            targetLanguage: targetLang,
            providerName: provider.name,
            modelName: model.name
          },
          true,
          parsedMsg
        )
        return
      }

      if (!response.body) {
        onChunk(
          {
            text,
            translation: '',
            targetLanguage: targetLang,
            providerName: provider.name,
            modelName: model.name
          },
          true,
          '返回的数据流为空'
        )
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedRawText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim()
            if (dataStr === '[DONE]') continue
            try {
              const json = JSON.parse(dataStr)
              let delta = ''
              if (apiType === 'anthropic') {
                if (json.type === 'content_block_delta' && json.delta?.text) {
                  delta = json.delta.text
                }
              } else {
                delta = json.choices?.[0]?.delta?.content || ''
              }

              if (delta) {
                accumulatedRawText += delta
                const partial = this.parsePartialExplain(
                  accumulatedRawText,
                  text,
                  provider.name,
                  model.name,
                  targetLang
                )
                onChunk(partial, false)
              }
            } catch {
              // ignore incomplete SSE chunk
            }
          }
        }
      }

      const finalResult = this.parseExplainJson(
        accumulatedRawText,
        text,
        provider.name,
        model.name,
        targetLang
      )
      const latency = Date.now() - startTime
      Logger.success(
        'AI:TranslateStream',
        `流式翻译完成 (${latency}ms) -> "${finalResult.translation.slice(0, 40)}"`
      )
      onChunk(finalResult, true)
    } catch (err: any) {
      const latency = Date.now() - startTime
      let errorMsg = err.message || '网络请求失败'
      if (err.name === 'AbortError') {
        errorMsg = '请求超时或已取消'
      }
      Logger.error('AI:TranslateStream', `流式异常 (${latency}ms): ${errorMsg}`)
      onChunk({ text, translation: '', targetLanguage: targetLang }, true, errorMsg)
    }
  }
}
