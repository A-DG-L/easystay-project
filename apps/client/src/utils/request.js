// apps/client/src/utils/request.js
import Taro from '@tarojs/taro';

// 后端 API 基础地址
export const API_BASE_URL = 'http://localhost:3000/api'; // 注意：真机调试时这里不能写 localhost，要写你电脑的局域网 IP (如 192.168.x.x)

// 静态资源基础地址（用于图片等，如 /uploads/xxx.jpg）
export const STATIC_BASE_URL = API_BASE_URL.replace(/\/?api$/, '');

export default function request(options) {
  const { url, method = 'GET', data } = options;
  
  // 获取存储在手机本地的 Token
  const token = Taro.getStorageSync('token');

  return new Promise((resolve, reject) => {
    Taro.request({
      url: API_BASE_URL + url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        // 如果有 token，自动带上
        'Authorization': token ? token : ''
      },
      success: (res) => {
        // Taro 返回的 res.data 才是我们的后端数据
        const { code, data, msg } = res.data;
        
        if (code === 200) {
          resolve(res.data);
        } else if (code === 401) {
          // Token 过期或未登录
          Taro.showToast({ title: '请先登录', icon: 'none' });
          Taro.redirectTo({ url: '/pages/login/index' });
          reject(res.data);
        } else {
          Taro.showToast({ title: msg || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail: (err) => {
        Taro.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });
  });
}