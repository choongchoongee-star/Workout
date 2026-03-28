import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const WORKOUT_DOC = (uid) => doc(db, 'users', uid, 'data', 'workout')

/**
 * Firestore에서 운동 데이터 로드
 * @returns {{ exercises, sessions }}
 */
export async function loadWorkoutData(uid) {
  const snapshot = await getDoc(WORKOUT_DOC(uid))
  if (!snapshot.exists()) return { exercises: null, sessions: [] }
  return snapshot.data()
}

// Firestore는 undefined 값을 거부하므로 재귀적으로 제거
function sanitizeForFirestore(value) {
  if (Array.isArray(value)) return value.map(sanitizeForFirestore)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    )
  }
  return value
}

/**
 * Firestore에 운동 데이터 저장
 */
export async function saveWorkoutData(uid, data) {
  await setDoc(WORKOUT_DOC(uid), sanitizeForFirestore(data))
}
