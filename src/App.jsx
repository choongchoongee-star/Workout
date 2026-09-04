import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Session from './screens/Session'
import History from './screens/History'
import SessionDetail from './screens/SessionDetail'
import Weight from './screens/Weight'
import Library from './screens/Library'
import Settings from './screens/Settings'
import Privacy from './screens/Privacy'

function AppRoutes() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/session" replace />} />
          <Route path="/session" element={<Session />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<SessionDetail />} />
          <Route path="/weight" element={<Weight />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/session" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.MODE === 'capacitor' ? '/' : '/Workout'}>
      <AppRoutes />
    </BrowserRouter>
  )
}
