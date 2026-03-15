/**
 * Epley 공식 기반 1RM 계산 및 점진적 과부하 제안
 * 1RM = 무게 × (1 + 횟수 / 30)
 */

// 단일 세트로 1RM 추정
export function calcEpley1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return null
  if (reps === 1) return weight // 1RM이면 그대로
  return Math.round(weight * (1 + reps / 30))
}

/**
 * 세션 목록에서 특정 운동의 최신 1RM 계산
 * 가장 최근 세션의 가장 무거운 세트 기준
 */
export function getLatest1RM(sessions, exerciseId) {
  for (const session of sessions) {
    const ex = session.exercises?.find(e => e.exerciseId === exerciseId)
    if (!ex?.sets?.length) continue

    const best = ex.sets
      .filter(s => s.weight && s.reps && s.done)
      .reduce((max, s) => {
        const rm = calcEpley1RM(s.weight, s.reps)
        return rm > (max?.rm ?? 0) ? { rm, weight: s.weight, reps: s.reps } : max
      }, null)

    if (best) return best
  }
  return null
}

/**
 * 점진적 과부하 제안
 * 최근 3회 세션에서 같은 운동을 같은 무게로 모든 세트 완료했으면 +2.5kg 제안
 */
export function getProgressionSuggestion(sessions, exerciseId) {
  const recentSessions = sessions
    .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
    .slice(0, 3)

  if (recentSessions.length < 3) return null

  const weights = recentSessions.map(session => {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId)
    if (!ex?.sets?.length) return null
    const doneSets = ex.sets.filter(s => s.done && s.weight)
    if (doneSets.length === 0) return null
    // 모든 세트가 완료됐는지, 가장 많이 사용한 무게 반환
    return doneSets[doneSets.length - 1]?.weight ?? null
  })

  if (weights.some(w => w === null)) return null

  // 3회 모두 같은 무게로 완료
  const allSame = weights.every(w => w === weights[0])
  if (allSame) {
    return {
      currentWeight: weights[0],
      suggestedWeight: weights[0] + 2.5,
      message: `최근 3회 연속 ${weights[0]}kg 완료! +2.5kg 도전해보세요 🎯`,
    }
  }
  return null
}

/**
 * 목표별 추천 작업 무게 계산
 */
export function getWorkingWeight(oneRM, goal) {
  if (!oneRM) return null
  const pct = {
    fat_loss: 0.60,
    muscle_gain: 0.70,
    hypertrophy: 0.70,
    strength: 0.85,
  }[goal] ?? 0.70

  return Math.round((oneRM * pct) / 2.5) * 2.5
}
