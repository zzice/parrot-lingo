import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import Database, { Database as DatabaseType } from 'better-sqlite3'
import { db as jsonDb } from './database'
import { INITIAL_CORPUS_ITEMS } from './schema'

class SQLiteManager {
  private db: DatabaseType
  private dbPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'database')
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }
    this.dbPath = join(dbDir, 'parrot-lingo.db')
    this.db = new Database(this.dbPath)
    this.initDatabase()
  }

  public getDb(): DatabaseType {
    return this.db
  }

  public getDbPath(): string {
    return this.dbPath
  }

  private initDatabase() {
    // 启用 WAL 模式和外键约束
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    // 1. corpus_items 学习主档
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS corpus_items (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        canonical TEXT NOT NULL,
        phonetic TEXT,
        part_of_speech TEXT,
        translation TEXT NOT NULL,
        explanation TEXT,
        difficulty TEXT,
        domain TEXT,
        alternative_expressions TEXT,
        native_example TEXT,
        tags TEXT,
        notes TEXT,
        encounter_count INTEGER NOT NULL DEFAULT 1,
        source_app TEXT,
        best_context_id TEXT,
        srs_stage INTEGER NOT NULL DEFAULT 0,
        srs_ease_factor REAL NOT NULL DEFAULT 2.5,
        srs_interval INTEGER NOT NULL DEFAULT 1,
        next_review_at INTEGER,
        last_reviewed_at INTEGER,
        review_count INTEGER NOT NULL DEFAULT 0,
        correct_count INTEGER NOT NULL DEFAULT 0,
        is_graduated INTEGER NOT NULL DEFAULT 0,
        graduated_at INTEGER,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_corpus_canonical ON corpus_items(canonical);
      CREATE INDEX IF NOT EXISTS idx_corpus_next_review ON corpus_items(next_review_at, is_graduated);
      CREATE INDEX IF NOT EXISTS idx_corpus_created ON corpus_items(created_at);

      -- 2. encounters 原始遇见快照
      CREATE TABLE IF NOT EXISTS encounters (
        id TEXT PRIMARY KEY,
        corpus_item_id TEXT NOT NULL REFERENCES corpus_items(id) ON DELETE CASCADE,
        raw_text TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'translate',
        context TEXT,
        context_before TEXT,
        context_after TEXT,
        source_app TEXT,
        source_url TEXT,
        source_title TEXT,
        is_undone INTEGER NOT NULL DEFAULT 0,
        seen_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_encounters_corpus ON encounters(corpus_item_id, seen_at);
      CREATE INDEX IF NOT EXISTS idx_encounters_seen ON encounters(seen_at);

      -- 3. review_logs 复习历史（原子级日志）
      CREATE TABLE IF NOT EXISTS review_logs (
        id TEXT PRIMARY KEY,
        corpus_item_id TEXT NOT NULL REFERENCES corpus_items(id) ON DELETE CASCADE,
        review_format TEXT NOT NULL,
        encounter_id TEXT,
        rating INTEGER NOT NULL,
        stage_before INTEGER NOT NULL,
        stage_after INTEGER NOT NULL,
        interval_before INTEGER NOT NULL,
        interval_after INTEGER NOT NULL,
        next_review_at INTEGER NOT NULL,
        reviewed_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_review_logs_corpus ON review_logs(corpus_item_id, reviewed_at);
    `)

    this.checkAndMigrate()
  }

  private checkAndMigrate() {
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM corpus_items').get() as {
      count: number
    }
    if (countRow.count === 0) {
      console.log('[SQLite] Initializing corpus_items from JSON/Defaults...')
      const rawCorpus: any[] = jsonDb.getRaw().corpus || INITIAL_CORPUS_ITEMS
      const insert = this.db.prepare(`
        INSERT INTO corpus_items (
          id, text, canonical, phonetic, part_of_speech, translation, explanation,
          difficulty, domain, alternative_expressions, native_example, tags, notes,
          encounter_count, source_app, best_context_id, srs_stage, srs_ease_factor,
          srs_interval, next_review_at, last_reviewed_at, review_count, correct_count,
          is_graduated, graduated_at, is_archived, created_at, updated_at
        ) VALUES (
          @id, @text, @canonical, @phonetic, @partOfSpeech, @translation, @explanation,
          @difficulty, @domain, @alternativeExpressions, @nativeExample, @tags, @notes,
          @encounterCount, @sourceApp, @bestContextId, @srsStage, @srsEaseFactor,
          @srsInterval, @nextReviewAt, @lastReviewedAt, @reviewCount, @correctCount,
          @isGraduated, @graduatedAt, @isArchived, @createdAt, @updatedAt
        )
      `)

      const insertEncounter = this.db.prepare(`
        INSERT INTO encounters (
          id, corpus_item_id, raw_text, action_type, context, source_app, seen_at
        ) VALUES (
          ?, ?, ?, 'translate', ?, ?, ?
        )
      `)

      const transaction = this.db.transaction((items: any[]) => {
        for (const item of items) {
          const now = Date.now()
          const created = item.createdAt || now
          const itemToInsert = {
            id: item.id || `corpus-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            text: item.text,
            canonical: (item.canonical || item.text || '').toLowerCase().trim(),
            phonetic: item.phonetic || null,
            partOfSpeech: item.partOfSpeech || null,
            translation: item.translation || '',
            explanation: item.explanation || null,
            difficulty: item.difficulty || null,
            domain: item.domain || null,
            alternativeExpressions: JSON.stringify(item.alternativeExpressions || []),
            nativeExample: item.nativeExample || item.context || null,
            tags: JSON.stringify(item.tags || []),
            notes: item.notes || null,
            encounterCount: item.encounterCount || 1,
            sourceApp: item.sourceApp || null,
            bestContextId: item.bestContextId || null,
            srsStage: item.srsStage ?? 0,
            srsEaseFactor: item.srsEaseFactor ?? 2.5,
            srsInterval: item.srsInterval ?? 1,
            nextReviewAt: item.nextReviewAt ?? now,
            lastReviewedAt: item.lastReviewedAt ?? null,
            reviewCount: item.reviewCount ?? 0,
            correctCount: item.correctCount ?? 0,
            isGraduated: item.isGraduated ? 1 : 0,
            graduatedAt: item.graduatedAt ?? null,
            isArchived: item.isArchived ? 1 : 0,
            createdAt: created,
            updatedAt: item.updatedAt || created
          }
          insert.run(itemToInsert)

          // 如果存在初始 context，同时创建一条初始 encounter
          if (item.context || item.nativeExample) {
            const encounterId = `enc-${created}-${Math.random().toString(36).substring(2, 7)}`
            insertEncounter.run(
              encounterId,
              itemToInsert.id,
              item.text,
              item.context || item.nativeExample,
              item.sourceApp || 'Initial',
              created
            )
          }
        }
      })

      try {
        transaction(rawCorpus)
        console.log(`[SQLite] Successfully migrated ${rawCorpus.length} items`)
      } catch (err) {
        console.error('[SQLite] Migration failed:', err)
      }
    }
  }
}

export const sqliteManager = new SQLiteManager()
export const sqliteDb = sqliteManager.getDb()
