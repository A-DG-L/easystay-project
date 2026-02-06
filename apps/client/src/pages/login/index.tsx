import { useState } from 'react'
import { View, Input, Button, Text } from '@tarojs/components'
import { 
  useLoad, 
  setStorageSync, 
  getStorageSync,  // 添加获取存储的方法
  showToast, 
  switchTab, 
  navigateTo 
} from '@tarojs/taro'
import request from '../../utils/request'
import './index.scss'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // 添加页面加载时的检查
  useLoad(() => {
    // 如果已经登录，直接跳转到首页 - 使用 getStorageSync 获取token
    const token = getStorageSync('token')
    if (token) {
      switchTab({ url: '/pages/index/index' })
    }
  })

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showToast({ title: '请输入用户名和密码', icon: 'none' })
      return
    }

    try {
      // 1. 调用接口
      const res = await request({
        url: '/auth/login',
        method: 'POST',
        data: { username, password }
      })

      // 2. 检查响应结构
      if (!res.data || !res.data.token) {
        showToast({ title: '登录响应异常', icon: 'none' })
        return
      }

      // 3. 存 Token 和用户信息
      setStorageSync('token', res.data.token)
      if (res.data.user) {
        setStorageSync('userInfo', res.data.user)
      }

      // 4. 检查角色
      if (res.data.user?.role && res.data.user.role !== 'user') {
        showToast({ title: '商户请去PC端登录', icon: 'none' })
        // 清除已存储的token
        setStorageSync('token', '')
        return
      }

      showToast({ title: '登录成功', icon: 'success' })
      
      // 5. 跳转回首页
      setTimeout(() => {
        switchTab({ url: '/pages/index/index' })
      }, 1000)

    } catch (error: any) {
      console.error('登录失败:', error)
      let errorMessage = '登录失败，请重试'
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      showToast({ 
        title: errorMessage, 
        icon: 'none',
        duration: 2000
      })
    }
  }

  const gotoRegister = () => {
    navigateTo({ url: '/pages/register/index' })
  }

  return (
    <View className='login-container'>
      <View className='login-header'>
        <Text className='title'>易宿酒店 - 用户登录</Text>
      </View>
      
      <View className='login-form'>
        <Input 
          className='input-field'
          placeholder='请输入用户名' 
          value={username} 
          onInput={(e) => setUsername(e.detail.value)}
        />
        
        <Input 
          className='input-field'
          placeholder='请输入密码' 
          password 
          value={password} 
          onInput={(e) => setPassword(e.detail.value)}
        />

        <Button 
          className='login-btn'
          type='primary' 
          onClick={handleLogin}
        >
          登录
        </Button>
        
        <View className='register-link'>
          <Text onClick={gotoRegister}>没有账号？立即注册</Text>
        </View>
      </View>
    </View>
  )
}