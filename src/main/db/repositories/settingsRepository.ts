import { db } from '../database'
import { sqliteManager } from '../sqliteDatabase'
import { AppSettings } from '../../../renderer/src/types'
import { DEFAULT_SETTINGS } from '../schema'

export class SettingsRepository {
  static get(): AppSettings {
    const raw = db.getRaw()
    return {
      ...raw.settings,
      selection: {
        ...DEFAULT_SETTINGS.selection,
        ...raw.settings.selection
      },
      system: {
        ...DEFAULT_SETTINGS.system,
        ...raw.settings.system,
        dbPath: sqliteManager.getDbPath()
      },
      defaultModels: {
        ...DEFAULT_SETTINGS.defaultModels!,
        ...(raw.settings.defaultModels || {})
      }
    }
  }

  static update(updates: Partial<AppSettings>): AppSettings {
    const raw = db.getRaw()
    raw.settings = {
      ...raw.settings,
      ...updates,
      selection: {
        ...raw.settings.selection,
        ...(updates.selection || {})
      },
      system: {
        ...raw.settings.system,
        ...(updates.system || {})
      },
      defaultModels: {
        ...(raw.settings.defaultModels || DEFAULT_SETTINGS.defaultModels!),
        ...(updates.defaultModels || {})
      }
    }
    db.persist()
    return this.get()
  }

  static reset(): AppSettings {
    const raw = db.getRaw()
    raw.settings = {
      selection: { ...DEFAULT_SETTINGS.selection },
      system: {
        ...DEFAULT_SETTINGS.system,
        dbPath: sqliteManager.getDbPath()
      },
      defaultModels: { ...DEFAULT_SETTINGS.defaultModels! }
    }
    db.persist()
    return this.get()
  }
}
