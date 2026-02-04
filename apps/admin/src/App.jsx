import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';
import './index.css';

// 一个简单的 Dashboard 占位页面
const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return (
    <div style={{ padding: 20 }}>
      <h1>欢迎回来, {user.username} ({user.role === 'merchant' ? '商户' : '管理员'})</h1>
      <p>这里是管理后台主页，左侧应该放导航栏。</p>
      <button onClick={() => {
        localStorage.clear();
        window.location.href = '/login';
      }}>退出登录</button>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;