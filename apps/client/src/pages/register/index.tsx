import React, { useState } from 'react';
import { View, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import request from '../../utils/request';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const res = await request({
        url: '/auth/register',
        method: 'POST',
        data: {
          username,
          password,
          role: 'user' // ⚡️ 核心：强制标记为普通用户
        }
      });

      Taro.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack(); // 返回登录页
      }, 1000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ padding: '20px' }}>
      <View style={{ fontSize: '24px', textAlign: 'center', marginBottom: '30px' }}>新用户注册</View>
      <Input 
        placeholder="设置用户名" 
        onInput={(e) => setUsername(e.detail.value)}
        style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}
      />
      <Input 
        placeholder="设置密码" 
        password
        onInput={(e) => setPassword(e.detail.value)}
        style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}
      />
      <Button type="warn" onClick={handleRegister}>立即注册</Button>
    </View>
  );
}