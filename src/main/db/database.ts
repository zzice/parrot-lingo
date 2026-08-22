import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { DEFAULT_PROVIDERS, DEFAULT_SETTINGS, INITIAL_CORPUS_ITEMS } from './schema'
import { ModelProvider, AppSettings, CorpusItem } from '../../renderer/src/types'

interface StorageSchema {
  version: number
  providers: ModelProvider[]
  settings: AppSettings
  corpus: CorpusItem[]
}

class DatabaseManager {
  private dbPath: string
  private data: StorageSchema

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'database')
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }
    this.dbPath = join(dbDir, 'parrot-lingo.json')
    this.data = this.initData()
  }

  public getDbPath(): string {
    return this.dbPath
  }

  private initData(): StorageSchema {
    try {
      if (existsSync(this.dbPath)) {
        const content = readFileSync(this.dbPath, 'utf-8')
        const parsed = JSON.parse(content)
        let loadedProviders: ModelProvider[] =
          parsed.providers && parsed.providers.length > 0 ? parsed.providers : DEFAULT_PROVIDERS

        // 迁移并规范化 providers
        loadedProviders = loadedProviders.filter((p) => p.id !== 'custom')
        const parrotIndex = loadedProviders.findIndex((p) => p.id === 'parrotlingo')
        if (parrotIndex !== -1) {
          const parrot = loadedProviders[parrotIndex]
          parrot.name = 'ParrotLingo AI'
          parrot.isBuiltIn = true
          parrot.isPinned = true
          if (!Array.isArray(parrot.models)) {
            parrot.models = []
          }
          // 确保 ParrotLingo AI 始终排在最首位
          if (parrotIndex !== 0) {
            loadedProviders.splice(parrotIndex, 1)
            loadedProviders.unshift(parrot)
          }
        } else {
          // 如果缺失内置 ParrotLingo AI 则补充在最前
          loadedProviders.unshift(DEFAULT_PROVIDERS[0])
        }

        // 规范化智谱 AI
        const zhipu = loadedProviders.find((p) => p.id === 'zhipu')
        if (zhipu) {
          if (zhipu.name.includes('(GLM)')) zhipu.name = '智谱 AI'
          zhipu.isBuiltIn = true
        }

        // 规范化 DeepSeek
        const deepseek = loadedProviders.find((p) => p.id === 'deepseek')
        if (deepseek) {
          deepseek.isBuiltIn = true
        }

        const mergedSettings: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
          defaultModels: {
            ...DEFAULT_SETTINGS.defaultModels!,
            ...(parsed.settings?.defaultModels || {})
          }
        }

        const schema: StorageSchema = {
          version: parsed.version || 2,
          providers: loadedProviders,
          settings: mergedSettings,
          corpus: parsed.corpus || INITIAL_CORPUS_ITEMS
        }
        this.saveDirect(schema)
        return schema
      }
    } catch (e) {
      console.error('[DB] Failed to load existing database, initializing default:', e)
    }

    const initial: StorageSchema = {
      version: 1,
      providers: DEFAULT_PROVIDERS,
      settings: DEFAULT_SETTINGS,
      corpus: INITIAL_CORPUS_ITEMS
    }
    this.saveDirect(initial)
    return initial
  }

  private saveDirect(data: StorageSchema) {
    try {
      writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[DB] Failed to write database to disk:', err)
    }
  }

  public persist() {
    this.saveDirect(this.data)
  }

  public getRaw(): StorageSchema {
    return this.data
  }
}

export const db = new DatabaseManager()
