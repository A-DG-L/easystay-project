import { View, Text, Input, Button } from '@tarojs/components'
import { useLoad, showModal, showToast } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import request from '../../utils/request' 
import './index.scss'

interface ApiResponse {
  code: number
  data?: any
  msg?: string
}

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    // 验证输入
    if (!formData.oldPassword.trim()) {
      showToast({
        title: '请输入旧密码',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    if (!formData.newPassword.trim()) {
      showToast({
        title: '请输入新密码',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    if (formData.newPassword.length < 6) {
      showToast({
        title: '新密码至少6位',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      showToast({
        title: '两次输入的新密码不一致',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    if (formData.oldPassword === formData.newPassword) {
      showToast({
        title: '新密码不能与旧密码相同',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    try {
      setLoading(true)
      
      const response = await request({
        url: '/users/change-password',
        method: 'POST',
        data: {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        }
      }) as ApiResponse
      
      if (response.code === 200) {
        showModal({
          title: '提示',
          content: '密码修改成功，请重新登录',
          showCancel: false,
          success: () => {
            // 清除本地存储的 token 和用户信息
            Taro.removeStorageSync('token')
            Taro.removeStorageSync('userInfo')
            
            // 跳转到登录页
            Taro.reLaunch({
              url: '/pages/login/index'
            })
          }
        })
      } else {
        throw new Error(response.msg || '修改密码失败')
      }
      
    } catch (error: any) {
      console.error('修改密码失败:', error)
      /*网络错误和401错误已经在 request.js 中处理了
      这里只需要处理业务逻辑错误*/
      if (error.code !== 401 && !error.errMsg?.includes('request:fail')) {
        showToast({
          title: error.message || '修改失败',
          icon: 'none',
          duration: 2000
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    console.log('修改密码页面加载')
  })

  return (
    <View className='change-password-container'>
      <View className='form-container'>
        <View className='input-section'>
          <Text className='section-label'>旧密码</Text>
          <Input
            className='password-input'
            password
            value={formData.oldPassword}
            placeholder='请输入旧密码'
            placeholderClass='placeholder'
            onInput={(e) => handleInputChange('oldPassword', e.detail.value)}
            maxlength={20}
          />
        </View>
        
        <View className='input-section'>
          <Text className='section-label'>新密码</Text>
          <Input
            className='password-input'
            password
            value={formData.newPassword}
            placeholder='请输入新密码（至少6位）'
            placeholderClass='placeholder'
            onInput={(e) => handleInputChange('newPassword', e.detail.value)}
            maxlength={20}
          />
          <Text className='password-hint'>密码至少6位字符</Text>
        </View>
        
        <View className='input-section'>
          <Text className='section-label'>确认新密码</Text>
          <Input
            className='password-input'
            password
            value={formData.confirmPassword}
            placeholder='请再次输入新密码'
            placeholderClass='placeholder'
            onInput={(e) => handleInputChange('confirmPassword', e.detail.value)}
            maxlength={20}
          />
        </View>
      </View>
      
      <View className='action-buttons'>
        <Button 
          className='submit-btn'
          onTap={handleSubmit} 
          disabled={loading}
        >
          {loading ? '提交中...' : '确认修改'}
        </Button>
      </View>
    </View>
  )
}