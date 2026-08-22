import { sqliteDb } from '../sqliteDatabase'
import { mapRowToCorpusItem } from './corpusRepository'
import { mapRowToEncounter } from './encounterRepository'
import { TodayCard, TodayCardType } from '../../../renderer/src/types'

export class TodayRepository {
  /**
   * 获取今日待复习/学习卡片队列
   * 优先排高频遇见 (encounter_count DESC)，其次按下次复习时间与创建时间
   */
  static getQueue(limit = 15): TodayCard[] {
    const now = Date.now()
    const rows = sqliteDb
      .prepare(
        `
        SELECT * FROM corpus_items
        WHERE is_archived = 0
          AND is_graduated = 0
          AND (next_review_at IS NULL OR next_review_at <= ?)
        ORDER BY encounter_count DESC, created_at DESC
        LIMIT ?
      `
      )
      .all(now, limit)

    const cards: TodayCard[] = []

    for (const row of rows) {
      const corpusItem = mapRowToCorpusItem(row)

      // 1. 决定学习卡片形式 (SRS 阶梯递进)
      let reviewFormat: 'recognize' | 'cloze' | 'recall'
      if (corpusItem.srsStage === 0) {
        reviewFormat = 'recognize'
      } else if (corpusItem.srsStage >= 1 && corpusItem.srsStage <= 3) {
        reviewFormat = 'cloze'
      } else {
        reviewFormat = 'recall'
      }

      // 2. 获取该条目最佳的 encounter 上下文 (优先 best_context_id，其次最新一条)
      let encounterRow: any = null
      if (corpusItem.bestContextId) {
        encounterRow = sqliteDb
          .prepare('SELECT * FROM encounters WHERE id = ?')
          .get(corpusItem.bestContextId)
      }
      if (!encounterRow) {
        encounterRow = sqliteDb
          .prepare(
            'SELECT * FROM encounters WHERE corpus_item_id = ? ORDER BY seen_at DESC LIMIT 1'
          )
          .get(corpusItem.id)
      }

      const encounter = encounterRow ? mapRowToEncounter(encounterRow) : undefined
      const cardType: TodayCardType =
        corpusItem.srsStage === 0 && corpusItem.reviewCount === 0 ? 'new' : 'review'

      cards.push({
        id: `card-${corpusItem.id}-${Date.now()}`,
        corpusItem,
        encounter,
        reviewFormat,
        cardType
      })
    }

    return cards
  }

  /**
   * 今日概览统计
   */
  static getSummary() {
    const queue = this.getQueue(50)
    const newCount = queue.filter((c) => c.cardType === 'new').length
    const reviewCount = queue.filter((c) => c.cardType === 'review').length
    const total = queue.length
    const estimatedMinutes = Math.max(1, Math.ceil(total * 0.5))

    return {
      newCount,
      reviewCount,
      total,
      estimatedMinutes
    }
  }
}
