// Default exercise library
// type: 'weight' | 'bodyweight' | 'cardio'
// met: only for cardio (used for calorie calculation)

export const DEFAULT_EXERCISES = [
  // 가슴
  { id: 'bench-press', name: '벤치프레스', category: '가슴', type: 'weight' },
  { id: 'incline-bench', name: '인클라인 벤치프레스', category: '가슴', type: 'weight' },
  { id: 'decline-bench', name: '디클라인 벤치프레스', category: '가슴', type: 'weight' },
  { id: 'dumbbell-fly', name: '덤벨 플라이', category: '가슴', type: 'weight' },
  { id: 'cable-crossover', name: '케이블 크로스오버', category: '가슴', type: 'weight' },
  { id: 'dips', name: '딥스', category: '가슴', type: 'bodyweight' },
  { id: 'pushup', name: '푸쉬업', category: '가슴', type: 'bodyweight' },

  // 등
  { id: 'pullup', name: '풀업', category: '등', type: 'bodyweight' },
  { id: 'lat-pulldown', name: '랫풀다운', category: '등', type: 'weight' },
  { id: 'seated-row', name: '시티드 로우', category: '등', type: 'weight' },
  { id: 'one-arm-row', name: '원암 덤벨 로우', category: '등', type: 'weight' },
  { id: 'deadlift', name: '데드리프트', category: '등', type: 'weight' },
  { id: 'tbar-row', name: '티바 로우', category: '등', type: 'weight' },
  { id: 'cable-row', name: '케이블 로우', category: '등', type: 'weight' },

  // 어깨
  { id: 'overhead-press', name: '오버헤드프레스', category: '어깨', type: 'weight' },
  { id: 'dumbbell-shoulder-press', name: '덤벨 숄더프레스', category: '어깨', type: 'weight' },
  { id: 'lateral-raise', name: '사이드 레터럴 레이즈', category: '어깨', type: 'weight' },
  { id: 'front-raise', name: '프론트 레이즈', category: '어깨', type: 'weight' },
  { id: 'face-pull', name: '페이스풀', category: '어깨', type: 'weight' },
  { id: 'upright-row', name: '업라이트 로우', category: '어깨', type: 'weight' },

  // 팔
  { id: 'barbell-curl', name: '바벨 컬', category: '팔', type: 'weight' },
  { id: 'dumbbell-curl', name: '덤벨 컬', category: '팔', type: 'weight' },
  { id: 'hammer-curl', name: '해머 컬', category: '팔', type: 'weight' },
  { id: 'preacher-curl', name: '프리처 컬', category: '팔', type: 'weight' },
  { id: 'tricep-pushdown', name: '트라이셉스 푸시다운', category: '팔', type: 'weight' },
  { id: 'overhead-extension', name: '오버헤드 트라이셉스 익스텐션', category: '팔', type: 'weight' },
  { id: 'skull-crusher', name: '스컬 크러셔', category: '팔', type: 'weight' },

  // 하체
  { id: 'squat', name: '스쿼트', category: '하체', type: 'weight' },
  { id: 'leg-press', name: '레그프레스', category: '하체', type: 'weight' },
  { id: 'lunge', name: '런지', category: '하체', type: 'weight' },
  { id: 'leg-extension', name: '레그 익스텐션', category: '하체', type: 'weight' },
  { id: 'leg-curl', name: '레그 컬', category: '하체', type: 'weight' },
  { id: 'hip-abduction', name: '힙 어브덕션', category: '하체', type: 'weight' },
  { id: 'calf-raise', name: '카프 레이즈', category: '하체', type: 'weight' },
  { id: 'romanian-deadlift', name: '루마니안 데드리프트', category: '하체', type: 'weight' },

  // 복근
  { id: 'crunch', name: '크런치', category: '복근', type: 'bodyweight' },
  { id: 'leg-raise', name: '레그 레이즈', category: '복근', type: 'bodyweight' },
  { id: 'plank', name: '플랭크', category: '복근', type: 'bodyweight' },
  { id: 'cable-crunch', name: '케이블 크런치', category: '복근', type: 'weight' },
  { id: 'hanging-leg-raise', name: '행잉 레그 레이즈', category: '복근', type: 'bodyweight' },
  { id: 'ab-wheel', name: '복근 롤러', category: '복근', type: 'bodyweight' },

  // 유산소
  { id: 'treadmill', name: '러닝머신', category: '유산소', type: 'cardio', met: 8.3 },
  { id: 'cycling', name: '자전거', category: '유산소', type: 'cardio', met: 8.0 },
  { id: 'rowing', name: '로잉머신', category: '유산소', type: 'cardio', met: 7.0 },
  { id: 'elliptical', name: '일립티컬', category: '유산소', type: 'cardio', met: 5.0 },
  { id: 'jump-rope', name: '줄넘기', category: '유산소', type: 'cardio', met: 10.0 },
  { id: 'walking', name: '걷기', category: '유산소', type: 'cardio', met: 3.5 },
  { id: 'stair-climber', name: '스텝퍼', category: '유산소', type: 'cardio', met: 9.0 },
]

export const CATEGORIES = ['가슴', '등', '어깨', '팔', '하체', '복근', '유산소']
