import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const WORKOUT_DOC = (uid) => doc(db, 'users', uid, 'data', 'workout')

/**
 * Firestore에서 운동 데이터 로드
 * @returns {{ exercises, sessions, inbody }}
 */
export async function loadWorkoutData(uid) {
  const snapshot = await getDoc(WORKOUT_DOC(uid))
  if (!snapshot.exists()) return { exercises: null, sessions: [], inbody: [] }
  return snapshot.data()
}

/**
 * Firestore에 운동 데이터 저장
 */
export async function saveWorkoutData(uid, data) {
  await setDoc(WORKOUT_DOC(uid), data)
}
