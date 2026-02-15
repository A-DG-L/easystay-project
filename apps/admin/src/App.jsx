import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';
import './index.css';


import HotelPublish from './pages/Hotel/HotelPublish';
import HotelList from './pages/Hotel/HotelList';

import AppLayout from './components/Layout';

import RoomList from './pages/Hotel/RoomList';
import { HomeOutlined, PlusOutlined } from '@ant-design/icons';


// 一个简单的 Dashboard 占位页面
const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return (
    <div >
      <h1 style={{ marginTop: 0 }}>欢迎回来, {user.username} ({user.role === 'merchant' ? '商户' : '管理员'})</h1>
      <p>这里是管理后台主页，左侧是导航栏。</p>
    </div>
  );
};



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppLayout />}>

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hotel/publish" element={<HotelPublish />} />
          <Route path="/hotel/list" element={<HotelList />} />
          <Route path="/hotel/:hotelId/rooms" element={<RoomList />} />
        </Route>
        
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;