import { sqliteDb } from '../sqliteDatabase'
import { CorpusItem } from '../../../renderer/src/types'

export function mapRowToCorpusItem(row: any): CorpusItem {
  return {
    id: row.id,
    text: row.text,
    canonical: row.canonical,
    phonetic: row.phonetic || undefined,
    partOfSpeech: row.part_of_speech || undefined,
    translation: row.translation,
    explanation: row.explanation || undefined,
    difficulty: row.difficulty || undefined,
    domain: row.domain || undefined,
    alternativeExpressions: row.alternative_expressions
      ? JSON.parse(row.alternative_expressions)
      : [],
    nativeExample: row.native_example || undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    notes: row.notes || undefined,
    encounterCount: row.encounter_count,
    sourceApp: row.source_app || undefined,
    bestContextId: row.best_context_id || undefined,
    srsStage: row.srs_stage,
    srsEaseFactor: row.srs_ease_factor,
    srsInterval: row.srs_interval,
    nextReviewAt: row.next_review_at || undefined,
    lastReviewedAt: row.last_reviewed_at || undefined,
    reviewCount: row.review_count,
    correctCount: row.correct_count,
    isGraduated: Boolean(row.is_graduated),
    graduatedAt: row.graduated_at || undefined,
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class CorpusRepository {
  static getAll(): CorpusItem[] {
    const rows = sqliteDb
      .prepare('SELECT * FROM corpus_items WHERE is_archived = 0 ORDER BY created_at DESC')
      .all()
    return rows.map(mapRowToCorpusItem)
  }

  static getById(id: string): CorpusItem | null {
    const row = sqliteDb.prepare('SELECT * FROM corpus_items WHERE id = ?').get(id)
    return row ? mapRowToCorpusItem(row) : null
  }

  static getByCanonical(canonical: string): CorpusItem | null {
    const clean = canonical.toLowerCase().trim()
    const row = sqliteDb.prepare('SELECT * FROM corpus_items WHERE canonical = ?').get(clean)
    return row ? mapRowToCorpusItem(row) : null
  }

  static getLexicalMetadata(item: CorpusItem): {
    targetLanguage?: string
    phoneticUk?: string
    phoneticUs?: string
    posExplanations?: Array<{ pos: string; meaning: string }>
    contextMeaning?: string
    bilingualExample?: { source?: string; target?: string; en?: string; zh?: string }
  } {
    if (!item?.notes) return {}
    try {
      const parsed = JSON.parse(item.notes)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch {
      // notes is raw string
    }
    return {}
  }

  static add(
    item: Partial<CorpusItem> & {
      text: string
      translation: string
      targetLanguage?: string
      phoneticUk?: string
      phoneticUs?: string
      posExplanations?: any[]
      contextMeaning?: string
      bilingualExample?: any
    }
  ): CorpusItem {
    const now = Date.now()
    const canonical = (item.canonical || item.text).toLowerCase().trim()
    const existing = this.getByCanonical(canonical)

    // 构建 rich lexical notes JSON
    const lexicalPayload = {
      targetLanguage: item.targetLanguage,
      phoneticUk: item.phoneticUk,
      phoneticUs: item.phoneticUs,
      posExplanations: item.posExplanations,
      contextMeaning: item.contextMeaning,
      bilingualExample: item.bilingualExample
    }
    const hasLexical = Object.values(lexicalPayload).some(
      (v) => v !== undefined && v !== null && v !== ''
    )
    const notesJson = hasLexical ? JSON.stringify(lexicalPayload) : item.notes || null

    if (existing) {
      // 合并更新已有词条
      const mergedAlternatives = Array.from(
        new Set([...existing.alternativeExpressions, ...(item.alternativeExpressions || [])])
      )
      const mergedTags = Array.from(new Set([...existing.tags, ...(item.tags || [])]))
      const updatedCount = existing.encounterCount + 1

      sqliteDb
        .prepare(
          `
          UPDATE corpus_items SET
            encounter_count = ?,
            translation = COALESCE(?, translation),
            explanation = COALESCE(?, explanation),
            phonetic = COALESCE(?, phonetic),
            alternative_expressions = ?,
            tags = ?,
            notes = COALESCE(?, notes),
            updated_at = ?
          WHERE id = ?
        `
        )
        .run(
          updatedCount,
          item.translation || null,
          item.explanation || null,
          item.phonetic || null,
          JSON.stringify(mergedAlternatives),
          JSON.stringify(mergedTags),
          notesJson,
          now,
          existing.id
        )

      return this.getById(existing.id)!
    }

    const id = item.id || `corpus-${now}-${Math.random().toString(36).substring(2, 7)}`
    sqliteDb
      .prepare(
        `
        INSERT INTO corpus_items (
          id, text, canonical, phonetic, part_of_speech, translation, explanation,
          difficulty, domain, alternative_expressions, native_example, tags, notes,
          encounter_count, source_app, best_context_id, srs_stage, srs_ease_factor,
          srs_interval, next_review_at, last_reviewed_at, review_count, correct_count,
          is_graduated, graduated_at, is_archived, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `
      )
      .run(
        id,
        item.text,
        canonical,
        item.phonetic || null,
        item.partOfSpeech || null,
        item.translation,
        item.explanation || null,
        item.difficulty || null,
        item.domain || null,
        JSON.stringify(item.alternativeExpressions || []),
        item.nativeExample || null,
        JSON.stringify(item.tags || []),
        notesJson,
        item.encounterCount || 1,
        item.sourceApp || null,
        item.bestContextId || null,
        item.srsStage ?? 0,
        item.srsEaseFactor ?? 2.5,
        item.srsInterval ?? 1,
        item.nextReviewAt ?? now,
        item.lastReviewedAt || null,
        item.reviewCount ?? 0,
        item.correctCount ?? 0,
        item.isGraduated ? 1 : 0,
        item.graduatedAt || null,
        item.isArchived ? 1 : 0,
        item.createdAt || now,
        item.updatedAt || now
      )

    return this.getById(id)!
  }

  static update(id: string, updates: Partial<CorpusItem>): CorpusItem | null {
    const existing = this.getById(id)
    if (!existing) return null

    const now = Date.now()
    sqliteDb
      .prepare(
        `
        UPDATE corpus_items SET
          text = COALESCE(?, text),
          canonical = COALESCE(?, canonical),
          phonetic = COALESCE(?, phonetic),
          part_of_speech = COALESCE(?, part_of_speech),
          translation = COALESCE(?, translation),
          explanation = COALESCE(?, explanation),
          difficulty = COALESCE(?, difficulty),
          domain = COALESCE(?, domain),
          alternative_expressions = COALESCE(?, alternative_expressions),
          native_example = COALESCE(?, native_example),
          tags = COALESCE(?, tags),
          notes = COALESCE(?, notes),
          source_app = COALESCE(?, source_app),
          best_context_id = COALESCE(?, best_context_id),
          is_archived = COALESCE(?, is_archived),
          updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        updates.text || null,
        updates.canonical || null,
        updates.phonetic || null,
        updates.partOfSpeech || null,
        updates.translation || null,
        updates.explanation || null,
        updates.difficulty || null,
        updates.domain || null,
        updates.alternativeExpressions ? JSON.stringify(updates.alternativeExpressions) : null,
        updates.nativeExample || null,
        updates.tags ? JSON.stringify(updates.tags) : null,
        updates.notes || null,
        updates.sourceApp || null,
        updates.bestContextId || null,
        updates.isArchived !== undefined ? (updates.isArchived ? 1 : 0) : null,
        now,
        id
      )

    return this.getById(id)
  }

  static updateSRS(
    id: string,
    srs: {
      stageAfter: number
      intervalAfter: number
      nextReviewAt: number
      isGraduated: boolean
      graduatedAt?: number
      rating: 1 | 2 | 3
    }
  ): CorpusItem | null {
    const now = Date.now()
    const isCorrect = srs.rating >= 2 ? 1 : 0

    sqliteDb
      .prepare(
        `
        UPDATE corpus_items SET
          srs_stage = ?,
          srs_interval = ?,
          next_review_at = ?,
          last_reviewed_at = ?,
          review_count = review_count + 1,
          correct_count = correct_count + ?,
          is_graduated = ?,
          graduated_at = ?,
          updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        srs.stageAfter,
        srs.intervalAfter,
        srs.nextReviewAt,
        now,
        isCorrect,
        srs.isGraduated ? 1 : 0,
        srs.graduatedAt || null,
        now,
        id
      )

    return this.getById(id)
  }

  static delete(id: string): boolean {
    const res = sqliteDb.prepare('DELETE FROM corpus_items WHERE id = ?').run(id)
    return res.changes > 0
  }

  static clearAll(): void {
    sqliteDb.prepare('DELETE FROM encounters').run()
    sqliteDb.prepare('DELETE FROM review_logs').run()
    sqliteDb.prepare('DELETE FROM corpus_items').run()
  }

  static clear(): void {
    this.clearAll()
  }

  static importBatch(items: CorpusItem[]): number {
    let count = 0
    const insertTransaction = sqliteDb.transaction((itemList: CorpusItem[]) => {
      for (const item of itemList) {
        const canonical = (item.canonical || item.text).toLowerCase().trim()
        const existing = this.getByCanonical(canonical)
        if (!existing) {
          this.add(item)
          count++
        }
      }
    })
    insertTransaction(items)
    return count
  }
}
