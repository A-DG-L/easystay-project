import { useState } from 'react'
import { View, Input, Button, Text } from '@tarojs/components'
import { 
  useLoad, 
  setStorageSync, 
  getStorageSync,
  showToast, 
  switchTab, 
  navigateTo 
} from '@tarojs/taro'
import request from '../../utils/request'
import './index.scss'

// ⚡️ 1. 引入同款背景图 (请确保路径和你实际存放的位置一致)
import bgImg from '../../assets/images/register_bg_cny.jpg'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useLoad(() => {
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
      const res = await request({
        url: '/auth/login',
        method: 'POST',
        data: { username, password }
      })

      if (!res.data || !res.data.token) {
        showToast({ title: '登录响应异常', icon: 'none' })
        return
      }

      setStorageSync('token', res.data.token)
      if (res.data.user) {
        setStorageSync('userInfo', res.data.user)
      }

      if (res.data.user?.role && res.data.user.role !== 'user') {
        showToast({ title: '商户请去PC端登录', icon: 'none' })
        setStorageSync('token', '')
        return
      }

      showToast({ title: '登录成功', icon: 'success' })
      
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
    /* ⚡️ 2. 将背景图应用到最外层容器 */
    <View className='login-container' style={{ backgroundImage: `url(${bgImg})` }}>
      
      {/* ⚡️ 3. 被挤到卷轴中央的内容区 */}
      <View className="scroll-content-area">
        
        <View>
          <Text className="main-title">易宿酒店</Text>
          <Text className="sub-title">甲辰马年 · 迎新纳福</Text>
        </View>
        
        <View className="cny-input-group-scroll">
          <Input 
            className='cny-input-scroll'
            placeholder='请输入用户名' 
            value={username} 
            onInput={(e) => setUsername(e.detail.value)}
            placeholderStyle="color: #998A7A;"
          />
        </View>
        
        <View className="cny-input-group-scroll">
          <Input 
            className='cny-input-scroll'
            placeholder='请输入密码' 
            password 
            value={password} 
            onInput={(e) => setPassword(e.detail.value)}
            placeholderStyle="color: #998A7A;"
          />
        </View>

        <View className="login-btn-area">
          <Button 
            className='cny-btn-primary' /* 复用 app.scss 中的胭脂红按钮 */
            hoverClass="cny-btn-hover"
            onClick={handleLogin}
          >
            立即登录
          </Button>
        </View>
        
        <View className='register-link'>
          <Text onClick={gotoRegister}>没有账号？立即注册</Text>
        </View>

      </View>
    </View>
  )
}