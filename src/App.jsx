import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Login from './screens/Login'
import Home from './screens/Home'
import Session from './screens/Session'
import History from './screens/History'
import SessionDetail from './screens/SessionDetail'
import Library from './screens/Library'
import Settings from './screens/Settings'

function AppRoutes() {
  const { user } = useAuth()

  // 로딩 중 (auth 상태 확인 전)
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // 미로그인
  if (!user) return <Login />

  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session" element={<Session />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<SessionDetail />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/Workout">
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
