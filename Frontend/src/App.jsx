import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from './pages/LandingPage'
import SignupPage from './pages/Signup'
import LoginPage from './pages/Login'
import Game from './pages/Game';
import MCQQuestion from './components/MCQQuestion';
import FillBlankQuestion from './components/FillBlankQuestion';
import QRScanQuestion from './components/QRScanQuestion';
import AdminMain from './pages/AdminMain';
import AdminSub from './pages/AdminSub';
import AdminLogin from './pages/AdminLogin';
import AdminGuard from './components/AdminGuard';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
       <Router>
      
  
        <Routes>
        
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/game" element={<Game />} />
          <Route path="/FillBlankQuestion" element={<FillBlankQuestion />} />
          <Route path="/QRScanQuestion" element={<QRScanQuestion />} />
          <Route path="/MCQQuestion" element={<MCQQuestion />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/main" element={<AdminGuard><AdminMain /></AdminGuard>} />
          <Route path="/admin/sub" element={<AdminGuard><AdminSub /></AdminGuard>} />
        </Routes>
  
    </Router>
    </>
  )
}

export default App
