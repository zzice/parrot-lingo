import { sqliteDb } from '../sqliteDatabase'
import { CorpusRepository } from './corpusRepository'
import { EncounterItem, CorpusItem, AddEncounterInput } from '../../../renderer/src/types'

export function mapRowToEncounter(row: any): EncounterItem {
  return {
    id: row.id,
    corpusItemId: row.corpus_item_id,
    rawText: row.raw_text,
    actionType: row.action_type || 'translate',
    context: row.context || undefined,
    contextBefore: row.context_before || undefined,
    contextAfter: row.context_after || undefined,
    sourceApp: row.source_app || undefined,
    sourceUrl: row.source_url || undefined,
    sourceTitle: row.source_title || undefined,
    isUndone: Boolean(row.is_undone),
    seenAt: row.seen_at
  }
}

export class EncounterRepository {
  static getById(id: string): EncounterItem | null {
    const row = sqliteDb.prepare('SELECT * FROM encounters WHERE id = ?').get(id)
    return row ? mapRowToEncounter(row) : null
  }

  static getByCorpusId(corpusItemId: string): EncounterItem[] {
    const rows = sqliteDb
      .prepare('SELECT * FROM encounters WHERE corpus_item_id = ? ORDER BY seen_at DESC')
      .all(corpusItemId)
    return rows.map(mapRowToEncounter)
  }

  static add(input: AddEncounterInput): {
    encounter: EncounterItem
    corpusItem: CorpusItem
    isFirstEncounter: boolean
  } {
    const now = Date.now()
    const canonical = (input.canonical || input.text).toLowerCase().trim()
    const existingCorpus = CorpusRepository.getByCanonical(canonical)
    const isFirstEncounter = !existingCorpus

    // 1. 创建或更新 corpus_item
    let corpusItem: CorpusItem
    if (existingCorpus) {
      corpusItem = CorpusRepository.add({
        ...input,
        canonical
      })
    } else {
      corpusItem = CorpusRepository.add({
        text: input.text,
        canonical,
        phonetic: input.phonetic,
        phoneticUk: input.phoneticUk,
        phoneticUs: input.phoneticUs,
        partOfSpeech: input.partOfSpeech,
        posExplanations: input.posExplanations,
        contextMeaning: input.contextMeaning,
        translation: input.translation,
        explanation: input.explanation,
        difficulty: input.difficulty,
        domain: input.domain,
        targetLanguage: input.targetLanguage,
        alternativeExpressions: input.alternativeExpressions || [],
        nativeExample: input.nativeExample || input.context,
        bilingualExample: input.bilingualExample,
        tags: input.tags || (input.sourceApp ? [input.sourceApp] : []),
        sourceApp: input.sourceApp,
        srsStage: 0,
        srsInterval: 1,
        nextReviewAt: now // 新词立即进入今日待学列表
      })
    }

    // 2. 插入 encounter 快照
    const encounterId = `enc-${now}-${Math.random().toString(36).substring(2, 7)}`
    sqliteDb
      .prepare(
        `
        INSERT INTO encounters (
          id, corpus_item_id, raw_text, action_type, context,
          context_before, context_after, source_app, source_url,
          source_title, is_undone, seen_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 0, ?
        )
      `
      )
      .run(
        encounterId,
        corpusItem.id,
        input.text,
        input.actionType || 'translate',
        input.context || null,
        input.contextBefore || null,
        input.contextAfter || null,
        input.sourceApp || null,
        input.sourceUrl || null,
        input.sourceTitle || null,
        now
      )

    // 3. 若 corpusItem 尚未指定最优上下文，将此 encounter id 关联为 bestContextId
    if (!corpusItem.bestContextId && input.context) {
      CorpusRepository.update(corpusItem.id, { bestContextId: encounterId })
      corpusItem = CorpusRepository.getById(corpusItem.id)!
    }

    const encounter = this.getById(encounterId)!
    return { encounter, corpusItem, isFirstEncounter }
  }

  static undo(id: string): boolean {
    const encounter = this.getById(id)
    if (!encounter) return false

    const corpusItemId = encounter.corpusItemId

    // 真实删除 encounter 记录
    sqliteDb.prepare('DELETE FROM encounters WHERE id = ?').run(id)

    // 检查该词条是否还有其他 encounter
    const remaining = sqliteDb
      .prepare('SELECT COUNT(*) as count FROM encounters WHERE corpus_item_id = ?')
      .get(corpusItemId) as { count: number }

    if (remaining.count === 0) {
      // 若这是该词条的唯一一次遇见，直接清理对应的 corpus_item
      CorpusRepository.delete(corpusItemId)
    } else {
      // 若仍有其他遇见，将 encounter_count - 1
      sqliteDb
        .prepare(
          'UPDATE corpus_items SET encounter_count = MAX(1, encounter_count - 1), updated_at = ? WHERE id = ?'
        )
        .run(Date.now(), corpusItemId)
    }

    return true
  }
}
