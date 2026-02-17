// apps/admin/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Audit from './pages/Audit';
import BasicLayout from './layouts/BasicLayout'; // 假设你已经创建了这个文件
import './App.css';

import HotelPublish from './pages/Hotel/HotelPublish';
import HotelList from './pages/Hotel/HotelList';

import RoomList from './pages/Hotel/RoomList';
import { HomeOutlined, PlusOutlined } from '@ant-design/icons';

// 简单的路由守卫
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// 角色重定向组件 (通常只用于 / 根路径或 dashboard)
const RoleRedirect = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'admin') return <Navigate to="/audit" replace />;
  //if (user.role === 'merchant') return <div>商户后台开发中...</div>; // 后续替换为商户首页
  if (user.role === 'merchant') return <Navigate to="/hotel/list" replace />; 
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开页面 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* --- 核心修改开始 --- */}
        {/* 将 Layout 作为父路由。
            只要路径匹配 "/" 下的子路径，都会先渲染 BasicLayout，
            然后再在 Layout 的 Outlet 位置渲染子组件 
        */}
        <Route path="/" element={
          <PrivateRoute>
            <BasicLayout />
          </PrivateRoute>
        }>
          {/* 默认跳转：访问 / 时，自动判断角色跳转 */}
          <Route index element={<RoleRedirect />} />
          <Route path="dashboard" element={<RoleRedirect />} />

          {/* 管理员的子路由 */}
          <Route path="audit" element={<Audit />} />
          
          {/* 以后添加商户页面可以直接加在这里，例如： */}
          {/* <Route path="my-hotels" element={<MyHotels />} /> */}
          <Route path="/hotel/publish" element={<HotelPublish />} />
          <Route path="/hotel/list" element={<HotelList />} />
          <Route path="/hotel/:hotelId/rooms" element={<RoomList />} />
          
        </Route>
        {/* --- 核心修改结束 --- */}

        {/* 404 处理 (可选) */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;