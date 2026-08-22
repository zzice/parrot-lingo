import { db } from '../database'
import { ModelProvider, ModelItem } from '../../../renderer/src/types'

export class ProviderRepository {
  static getAll(): ModelProvider[] {
    const raw = db.getRaw()
    let changed = false

    // 过滤掉旧的默认 custom 模板项
    const filtered = raw.providers.filter((p) => p.id !== 'custom')
    if (filtered.length !== raw.providers.length) {
      raw.providers = filtered
      changed = true
    }

    // 规范化 parrotlingo
    const parrot = raw.providers.find((p) => p.id === 'parrotlingo')
    if (parrot) {
      if (
        parrot.name !== 'ParrotLingo AI' ||
        !parrot.isPinned ||
        !parrot.isBuiltIn ||
        !Array.isArray(parrot.models)
      ) {
        parrot.name = 'ParrotLingo AI'
        parrot.isPinned = true
        parrot.isBuiltIn = true
        if (!Array.isArray(parrot.models)) {
          parrot.models = []
        }
        changed = true
      }
      const parrotIdx = raw.providers.indexOf(parrot)
      if (parrotIdx !== 0) {
        raw.providers.splice(parrotIdx, 1)
        raw.providers.unshift(parrot)
        changed = true
      }
    }

    // 规范化 智谱 AI
    const zhipu = raw.providers.find((p) => p.id === 'zhipu')
    if (zhipu) {
      if (zhipu.name.includes('(GLM)') || !zhipu.isBuiltIn) {
        zhipu.name = '智谱 AI'
        zhipu.isBuiltIn = true
        changed = true
      }
    }

    // 规范化 DeepSeek
    const deepseek = raw.providers.find((p) => p.id === 'deepseek')
    if (deepseek) {
      if (deepseek.name !== 'DeepSeek' || !deepseek.isBuiltIn) {
        deepseek.name = 'DeepSeek'
        deepseek.isBuiltIn = true
        changed = true
      }
    }

    // 清理旧的 BYOK 徽标
    raw.providers.forEach((p) => {
      if (p.badge === 'BYOK') {
        delete p.badge
        delete p.badgeColor
        changed = true
      }
    })

    if (changed) {
      db.persist()
    }

    return raw.providers
  }

  static getById(id: string): ModelProvider | undefined {
    return db.getRaw().providers.find((p) => p.id === id)
  }

  static create(provider: ModelProvider): ModelProvider {
    const raw = db.getRaw()
    // 确保不重复
    const existingIndex = raw.providers.findIndex((p) => p.id === provider.id)
    if (existingIndex !== -1) {
      raw.providers[existingIndex] = provider
    } else {
      raw.providers.push(provider)
    }
    db.persist()
    return provider
  }

  static delete(id: string): boolean {
    const raw = db.getRaw()
    const target = raw.providers.find((p) => p.id === id)
    // 仅允许删除用户自己新增的自定义服务商
    if (
      !target ||
      !target.isCustom ||
      target.isBuiltIn ||
      target.id === 'parrotlingo' ||
      target.id === 'deepseek' ||
      target.id === 'zhipu'
    ) {
      return false
    }

    raw.providers = raw.providers.filter((p) => p.id !== id)
    db.persist()
    return true
  }

  static reorder(orderedIds: string[]): boolean {
    const raw = db.getRaw()
    const current = [...raw.providers]
    const map = new Map(current.map((p) => [p.id, p]))

    const sorted: ModelProvider[] = []
    // 始终确保 parrotlingo 在最前
    const parrot = map.get('parrotlingo')
    if (parrot) {
      sorted.push(parrot)
      map.delete('parrotlingo')
    }

    orderedIds.forEach((id) => {
      if (id !== 'parrotlingo' && map.has(id)) {
        sorted.push(map.get(id)!)
        map.delete(id)
      }
    })

    // 追加未在排序列表中的其余项
    map.forEach((p) => {
      sorted.push(p)
    })

    raw.providers = sorted
    db.persist()
    return true
  }

  static update(id: string, updates: Partial<ModelProvider>): ModelProvider | null {
    const raw = db.getRaw()
    const index = raw.providers.findIndex((p) => p.id === id)
    if (index === -1) return null

    const current = raw.providers[index]
    const safeUpdates = { ...updates }
    // 内置服务商不允许修改名称，只允许修改备注、API Key、BaseUrl 等配置
    if (current.isBuiltIn && safeUpdates.name) {
      delete safeUpdates.name
    }

    raw.providers[index] = {
      ...current,
      ...safeUpdates
    }
    db.persist()
    return raw.providers[index]
  }

  static addModel(providerId: string, model: ModelItem): boolean {
    const raw = db.getRaw()
    const provider = raw.providers.find((p) => p.id === providerId)
    if (!provider) return false

    const exists = provider.models.some((m) => m.id === model.id)
    if (!exists) {
      provider.models.push(model)
      db.persist()
      return true
    }
    return false
  }

  static deleteModel(providerId: string, modelId: string): boolean {
    const raw = db.getRaw()
    const provider = raw.providers.find((p) => p.id === providerId)
    if (!provider) return false

    provider.models = provider.models.filter((m) => m.id !== modelId)
    db.persist()
    return true
  }

  static toggleModel(providerId: string, modelId: string, enabled: boolean): boolean {
    const raw = db.getRaw()
    const provider = raw.providers.find((p) => p.id === providerId)
    if (!provider) return false

    const model = provider.models.find((m) => m.id === modelId)
    if (!model) return false

    model.enabled = enabled
    db.persist()
    return true
  }

  static setDefaultModel(providerId: string, modelId: string): boolean {
    const raw = db.getRaw()
    raw.providers.forEach((p) => {
      p.models.forEach((m) => {
        m.isDefault = p.id === providerId && m.id === modelId
      })
    })
    db.persist()
    return true
  }
}
