import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Home from './screens/Home'
import Session from './screens/Session'
import History from './screens/History'
import SessionDetail from './screens/SessionDetail'
import Library from './screens/Library'
import Settings from './screens/Settings'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/Workout">
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/session" element={<Session />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<SessionDetail />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}
