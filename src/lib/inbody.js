/**
 * InBody 체성분 분석 라이브러리
 * SMI 계산, 트레이닝 목표 제안, 운동별 추천 무게 계산
 */

// SMI (Skeletal Muscle Index) = 골격근량(kg) / 키(m)²
export function calcSMI(skeletalMuscleMass, heightCm) {
  if (!skeletalMuscleMass || !heightCm) return null
  const heightM = heightCm / 100
  return parseFloat((skeletalMuscleMass / (heightM * heightM)).toFixed(2))
}

// SMI 평가 (성별 기준치)
export function evaluateSMI(smi, gender = 'male') {
  if (smi == null) return null
  const thresholds = gender === 'female'
    ? { low: 5.7, high: 6.8 }
    : { low: 7.0, high: 8.5 }

  if (smi < thresholds.low) return { level: 'low', label: '낮음', color: 'text-red-400' }
  if (smi <= thresholds.high) return { level: 'normal', label: '보통', color: 'text-yellow-400' }
  return { level: 'high', label: '높음', color: 'text-green-400' }
}

// 체지방률 평가
export function evaluateBodyFat(bodyFatPct, gender = 'male') {
  if (bodyFatPct == null) return null
  const thresholds = gender === 'female'
    ? { low: 18, normal: 28, high: 33 }
    : { low: 10, normal: 20, high: 25 }

  if (bodyFatPct < thresholds.low) return { level: 'low', label: '낮음', color: 'text-blue-400' }
  if (bodyFatPct <= thresholds.normal) return { level: 'normal', label: '정상', color: 'text-green-400' }
  if (bodyFatPct <= thresholds.high) return { level: 'high', label: '높음', color: 'text-yellow-400' }
  return { level: 'very_high', label: '매우 높음', color: 'text-red-400' }
}

/**
 * 트레이닝 목표 제안
 * @returns { goal, label, reps, sets, restSec, description }
 */
export function recommendGoal(smi, bodyFatPct, gender = 'male') {
  const smiEval = evaluateSMI(smi, gender)
  const fatEval = evaluateBodyFat(bodyFatPct, gender)

  if (!smiEval || !fatEval) return null

  if (fatEval.level === 'very_high' || fatEval.level === 'high') {
    return {
      goal: 'fat_loss',
      label: '지방 감량',
      reps: '12–15회',
      sets: '3세트',
      restSec: 60,
      description: '체지방률이 높습니다. 고반복 저중량으로 칼로리 소모를 높이세요.',
      color: 'text-orange-400',
    }
  }
  if (smiEval.level === 'low') {
    return {
      goal: 'muscle_gain',
      label: '근육 증가',
      reps: '8–12회',
      sets: '4세트',
      restSec: 90,
      description: '근육량이 낮습니다. 중중량 고볼륨으로 근비대를 목표로 하세요.',
      color: 'text-blue-400',
    }
  }
  if (smiEval.level === 'high') {
    return {
      goal: 'strength',
      label: '근력 향상',
      reps: '4–6회',
      sets: '5세트',
      restSec: 180,
      description: '근육량이 충분합니다. 고중량 저반복으로 최대 근력을 향상하세요.',
      color: 'text-purple-400',
    }
  }
  return {
    goal: 'hypertrophy',
    label: '근비대 유지',
    reps: '8–12회',
    sets: '3–4세트',
    restSec: 90,
    description: '체성분이 균형잡혀 있습니다. 근비대 범위를 유지하세요.',
    color: 'text-green-400',
  }
}

/**
 * InBody 기반 운동별 추정 1RM 및 추천 무게 계산
 * 공식: 추정 1RM = 체중 × 기본계수 × 보정계수
 * 보정계수 = 골격근량 / (체중 × 0.45)
 */
const BASE_RATIOS = {
  'bench-press': 0.60,
  'incline-bench': 0.50,
  'overhead-press': 0.35,
  'squat': 0.90,
  'deadlift': 1.10,
  'romanian-deadlift': 0.80,
  'lat-pulldown': 0.55,
  'seated-row': 0.50,
  'barbell-curl': 0.25,
  'leg-press': 1.20,
}

export function estimateWeights(skeletalMuscleMass, bodyWeight, goal) {
  if (!skeletalMuscleMass || !bodyWeight || !goal) return {}

  const correctionFactor = skeletalMuscleMass / (bodyWeight * 0.45)

  const goalPct = {
    fat_loss: 0.60,
    muscle_gain: 0.70,
    hypertrophy: 0.70,
    strength: 0.85,
  }[goal] ?? 0.70

  const result = {}
  for (const [exerciseId, ratio] of Object.entries(BASE_RATIOS)) {
    const estimated1RM = Math.round(bodyWeight * ratio * correctionFactor)
    const workingWeight = Math.round((estimated1RM * goalPct) / 2.5) * 2.5 // 2.5 단위로 반올림
    result[exerciseId] = { estimated1RM, workingWeight }
  }
  return result
}

/**
 * 부위별 불균형 감지 (segmental 데이터 있을 때)
 * @returns Array of warning strings
 */
export function detectImbalances(segmental) {
  if (!segmental) return []
  const warnings = []

  const { left_arm, right_arm, left_leg, right_leg, trunk } = segmental

  // 좌우 팔 불균형
  if (left_arm && right_arm) {
    const diff = Math.abs(left_arm - right_arm) / Math.max(left_arm, right_arm) * 100
    if (diff > 10) warnings.push(`팔 좌우 불균형: 좌 ${left_arm}kg / 우 ${right_arm}kg (${diff.toFixed(0)}% 차이)`)
  }

  // 좌우 다리 불균형
  if (left_leg && right_leg) {
    const diff = Math.abs(left_leg - right_leg) / Math.max(left_leg, right_leg) * 100
    if (diff > 10) warnings.push(`다리 좌우 불균형: 좌 ${left_leg}kg / 우 ${right_leg}kg (${diff.toFixed(0)}% 차이)`)
  }

  // 상하체 비율 (팔+몸통 vs 다리)
  if (left_arm && right_arm && trunk && left_leg && right_leg) {
    const upper = left_arm + right_arm + trunk
    const lower = left_leg + right_leg
    const ratio = upper / lower
    if (ratio > 2.5) warnings.push(`상체 근육 비중이 높습니다. 하체 운동 비중을 늘려보세요.`)
    if (ratio < 1.5) warnings.push(`하체 근육 비중이 높습니다. 상체 운동 비중을 늘려보세요.`)
  }

  return warnings
}
