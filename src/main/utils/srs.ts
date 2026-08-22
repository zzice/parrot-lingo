export interface SRSCalculationResult {
  stageAfter: number
  intervalAfter: number
  nextReviewAt: number
  isGraduated: boolean
  graduatedAt?: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Calculate the next SRS review interval, stage, and schedule
 * @param currentStage 0: new, 1~3: learning, 4: consolidating, 5: graduated
 * @param rating 1: Hard (还不熟), 2: Good (差不多), 3: Easy (已掌握)
 */
export function calculateSRS(currentStage: number, rating: 1 | 2 | 3): SRSCalculationResult {
  const now = Date.now()

  if (rating === 1) {
    // 还不熟：明天再来，stage 不变或回退 1
    const stageAfter = Math.max(0, currentStage - 1)
    const intervalAfter = 1
    return {
      stageAfter,
      intervalAfter,
      nextReviewAt: now + ONE_DAY_MS,
      isGraduated: false
    }
  }

  if (rating === 2) {
    // 差不多：3 天后，stage + 1
    const stageAfter = currentStage + 1
    const intervalAfter = 3
    const isGraduated = stageAfter >= 5
    return {
      stageAfter,
      intervalAfter,
      nextReviewAt: now + 3 * ONE_DAY_MS,
      isGraduated,
      graduatedAt: isGraduated ? now : undefined
    }
  }

  // rating === 3: 已掌握：7 天后，stage + 1 (若已达到 Stage 4+ 再评已掌握则毕业)
  const stageAfter = currentStage + 1
  const intervalAfter = 7
  const isGraduated = stageAfter >= 4
  return {
    stageAfter,
    intervalAfter,
    nextReviewAt: now + 7 * ONE_DAY_MS,
    isGraduated,
    graduatedAt: isGraduated ? now : undefined
  }
}
