import axios from 'axios';
import { message } from 'antd';

// 创建 axios 实例
const service = axios.create({
  baseURL: 'http://localhost:3000/api', // 指向你的后端地址
  timeout: 5000,
});

// 请求拦截器：每次请求自动带上 Token
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = token; 
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一处理错误
service.interceptors.response.use(
  (response) => {
    return response.data; // 只返回后端的数据部分 (code, data, msg)
  },
  (error) => {
    message.error(error.message || '网络异常');
    return Promise.reject(error);
  }
);

export default service;