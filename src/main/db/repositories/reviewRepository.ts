import { sqliteDb } from '../sqliteDatabase'
import { CorpusRepository } from './corpusRepository'
import { calculateSRS } from '../../utils/srs'
import { ReviewLog, SubmitReviewInput } from '../../../renderer/src/types'

export function mapRowToReviewLog(row: any): ReviewLog {
  return {
    id: row.id,
    corpusItemId: row.corpus_item_id,
    reviewFormat: row.review_format,
    encounterId: row.encounter_id || undefined,
    rating: row.rating,
    stageBefore: row.stage_before,
    stageAfter: row.stage_after,
    intervalBefore: row.interval_before,
    intervalAfter: row.interval_after,
    nextReviewAt: row.next_review_at,
    reviewedAt: row.reviewed_at
  }
}

export class ReviewRepository {
  static getByCorpusId(corpusItemId: string): ReviewLog[] {
    const rows = sqliteDb
      .prepare('SELECT * FROM review_logs WHERE corpus_item_id = ? ORDER BY reviewed_at DESC')
      .all(corpusItemId)
    return rows.map(mapRowToReviewLog)
  }

  static submit(input: SubmitReviewInput): ReviewLog {
    const now = Date.now()
    const corpusItem = CorpusRepository.getById(input.corpusItemId)
    const stageBefore = input.stageBefore ?? corpusItem?.srsStage ?? 0
    const intervalBefore = corpusItem?.srsInterval ?? 1

    const srsResult = calculateSRS(stageBefore, input.rating)

    const logId = `rev-${now}-${Math.random().toString(36).substring(2, 7)}`

    // 1. 写入复习原子日志
    sqliteDb
      .prepare(
        `
        INSERT INTO review_logs (
          id, corpus_item_id, review_format, encounter_id, rating,
          stage_before, stage_after, interval_before, interval_after,
          next_review_at, reviewed_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `
      )
      .run(
        logId,
        input.corpusItemId,
        input.reviewFormat,
        input.encounterId || null,
        input.rating,
        stageBefore,
        srsResult.stageAfter,
        intervalBefore,
        srsResult.intervalAfter,
        srsResult.nextReviewAt,
        now
      )

    // 2. 更新 corpus_items 中的 SRS 进度状态
    CorpusRepository.updateSRS(input.corpusItemId, {
      ...srsResult,
      rating: input.rating
    })

    const row = sqliteDb.prepare('SELECT * FROM review_logs WHERE id = ?').get(logId)
    return mapRowToReviewLog(row)
  }
}
