import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { storage } from '../lib/storage'
import {
  calcSMI,
  evaluateSMI,
  evaluateBodyFat,
  recommendGoal,
  estimateWeights,
  detectImbalances,
} from '../lib/inbody'

const EXERCISE_NAMES = {
  'bench-press': '벤치 프레스',
  'incline-bench': '인클라인 벤치',
  'overhead-press': '오버헤드 프레스',
  'squat': '스쿼트',
  'deadlift': '데드리프트',
  'romanian-deadlift': '루마니안 데드리프트',
  'lat-pulldown': '랫 풀다운',
  'seated-row': '시티드 로우',
  'barbell-curl': '바벨 컬',
  'leg-press': '레그 프레스',
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  )
}

export default function InBodyAnalysis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { inbody } = useApp()

  const record = inbody.find(r => r.id === id)
  if (!record) {
    return (
      <div className="p-4 text-center pt-12">
        <p className="text-zinc-500">기록을 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/inbody')} className="text-blue-400 mt-4 text-sm block mx-auto">
          돌아가기
        </button>
      </div>
    )
  }

  // Height: prefer value stored in record, fall back to settings value
  const heightFromRecord = record.height
  const heightForCalc = heightFromRecord ?? storage.getHeight()
  const usingDefaultHeight = !heightFromRecord
  // Gender: default to 'male' (no gender setting currently)
  const gender = 'male'

  const smi = calcSMI(record.skeletal_muscle_mass, heightForCalc)
  const smiEval = evaluateSMI(smi, gender)
  const fatEval = evaluateBodyFat(record.body_fat_pct, gender)
  const goal = recommendGoal(smi, record.body_fat_pct, gender)
  const weights = goal ? estimateWeights(record.skeletal_muscle_mass, record.weight, goal.goal) : {}

  const hasSegmental = record.left_arm || record.right_arm || record.trunk || record.left_leg || record.right_leg
  const segmental = hasSegmental
    ? { left_arm: record.left_arm, right_arm: record.right_arm, trunk: record.trunk, left_leg: record.left_leg, right_leg: record.right_leg }
    : null
  const imbalances = detectImbalances(segmental)

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pt-2">
        <button
          onClick={() => navigate('/inbody')}
          className="text-zinc-400 active:text-white text-xl leading-none"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">체성분 분석</h1>
          <p className="text-zinc-500 text-sm">{record.date}</p>
        </div>
      </div>

      {/* Basic stats */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-3">
        <h2 className="text-zinc-400 text-sm font-medium mb-3">기본 수치</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="체중" value={`${record.weight}kg`} />
          <Stat label="골격근량" value={`${record.skeletal_muscle_mass}kg`} />
          {record.body_fat_mass != null && <Stat label="체지방량" value={`${record.body_fat_mass}kg`} />}
          {record.body_fat_pct != null && <Stat label="체지방률" value={`${record.body_fat_pct}%`} />}
          <Stat label="키" value={`${heightForCalc}cm`} />
          {smi != null && <Stat label="SMI" value={smi} />}
        </div>
        {usingDefaultHeight && (
          <p className="text-zinc-600 text-xs mt-2">
            * 키 정보가 없어 설정값({heightForCalc}cm)을 사용했습니다. InBody 입력 시 키를 포함하거나 설정에서 키를 등록하세요.
          </p>
        )}
      </div>

      {/* SMI evaluation */}
      {smiEval && smi != null && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-3">
          <h2 className="text-zinc-400 text-sm font-medium mb-2">SMI 평가 (골격근 지수)</h2>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-2xl font-bold ${smiEval.color}`}>{smi}</span>
            <span className={`text-sm ${smiEval.color}`}>{smiEval.label}</span>
          </div>
          <p className="text-zinc-600 text-xs">기준: 남성 정상 7.0–8.5 / 여성 정상 5.7–6.8</p>
        </div>
      )}

      {/* Body fat evaluation */}
      {fatEval && record.body_fat_pct != null && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-3">
          <h2 className="text-zinc-400 text-sm font-medium mb-2">체지방률 평가</h2>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-2xl font-bold ${fatEval.color}`}>{record.body_fat_pct}%</span>
            <span className={`text-sm ${fatEval.color}`}>{fatEval.label}</span>
          </div>
          <p className="text-zinc-600 text-xs">기준: 남성 정상 10–20% / 여성 정상 18–28%</p>
        </div>
      )}

      {/* Goal recommendation */}
      {goal && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-3">
          <h2 className="text-zinc-400 text-sm font-medium mb-2">추천 트레이닝 목표</h2>
          <p className={`text-xl font-bold ${goal.color} mb-1`}>{goal.label}</p>
          <p className="text-zinc-300 text-sm mb-3">{goal.description}</p>
          <div className="flex gap-4 text-sm bg-zinc-800 rounded-xl p-3">
            <div>
              <span className="text-zinc-500 text-xs block">세트</span>
              <span className="text-white">{goal.sets}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">횟수</span>
              <span className="text-white">{goal.reps}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">휴식</span>
              <span className="text-white">{goal.restSec}초</span>
            </div>
          </div>
        </div>
      )}

      {/* Imbalance warnings */}
      {imbalances.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-4 mb-3">
          <h2 className="text-yellow-400 text-sm font-medium mb-2">⚠ 불균형 감지</h2>
          <ul className="space-y-1">
            {imbalances.map((w, i) => (
              <li key={i} className="text-yellow-300 text-sm">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Estimated working weights */}
      {Object.keys(weights).length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-3">
          <h2 className="text-zinc-400 text-sm font-medium mb-1">운동별 추천 무게</h2>
          <p className="text-zinc-600 text-xs mb-3">* 체성분 기반 참고값. 실제 능력과 다를 수 있습니다.</p>
          <div className="space-y-2.5">
            {Object.entries(weights).map(([exerciseId, { workingWeight }]) => (
              <div key={exerciseId} className="flex items-center justify-between">
                <span className="text-zinc-300 text-sm">{EXERCISE_NAMES[exerciseId] ?? exerciseId}</span>
                <span className="text-white text-sm font-medium">{workingWeight}kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segmental muscle */}
      {segmental && (
        <div className="bg-zinc-900 rounded-2xl p-4">
          <h2 className="text-zinc-400 text-sm font-medium mb-3">부위별 근육량</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '왼팔', value: segmental.left_arm },
              { label: '오른팔', value: segmental.right_arm },
              { label: '몸통', value: segmental.trunk },
              { label: '왼다리', value: segmental.left_leg },
              { label: '오른다리', value: segmental.right_leg },
            ].filter(s => s.value != null).map(({ label, value }) => (
              <div key={label} className="bg-zinc-800 rounded-xl p-2.5">
                <p className="text-zinc-500 text-xs">{label}</p>
                <p className="text-white text-sm font-medium">{value}kg</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
