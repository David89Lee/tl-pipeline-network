import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NetworkDetailPage from './pages/NetworkDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/network/lyg" element={<NetworkDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
