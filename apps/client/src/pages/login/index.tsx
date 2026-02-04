import React, { useState } from 'react';
import { View, Input, Button, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import request from '../../utils/request';
// import './index.scss'; // 样式文件你可以让组员自己写

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) return;

    try {
      // 1. 调用接口
      const res = await request({
        url: '/auth/login',
        method: 'POST',
        data: { username, password }
      });

      // 2. 存 Token (注意：移动端不要存 user 对象，只存核心数据即可，或者存 storage)
      Taro.setStorageSync('token', res.data.token);
      Taro.setStorageSync('userInfo', res.data.user);

      // 3. 检查角色
      if (res.data.user.role !== 'user') {
        Taro.showToast({ title: '商户请去PC端登录', icon: 'none' });
        return;
      }

      Taro.showToast({ title: '登录成功', icon: 'success' });
      
      // 4. 跳转回首页
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' });
      }, 1000);

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View className="login-container" style={{ padding: '20px' }}>
      <View style={{ fontSize: '24px', textAlign: 'center', marginBottom: '30px' }}>
        易宿酒店 - 用户登录
      </View>
      
      <Input 
        placeholder="请输入用户名" 
        value={username} 
        onInput={(e) => setUsername(e.detail.value)}
        style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}
      />
      
      <Input 
        placeholder="请输入密码" 
        password 
        value={password} 
        onInput={(e) => setPassword(e.detail.value)}
        style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px', borderRadius: '5px' }}
      />

      <Button type="primary" onClick={handleLogin}>登录</Button>
      
      <View style={{ marginTop: '20px', textAlign: 'center' }}>
        <Text onClick={() => Taro.navigateTo({ url: '/pages/register/index' })} style={{ color: 'blue' }}>
          没有账号？去注册
        </Text>
      </View>
    </View>
  );
}