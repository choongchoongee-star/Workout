/**
 * 점진적 과부하 제안
 * 최근 3회 세션에서 같은 운동을 같은 무게로 모든 세트 완료했으면 +2.5kg 제안
 */
export function getProgressionSuggestion(sessions, exerciseId, excludeDate = null) {
  const recentSessions = sessions
    .filter(s => s.date !== excludeDate && s.exercises?.some(e => e.exerciseId === exerciseId))
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

