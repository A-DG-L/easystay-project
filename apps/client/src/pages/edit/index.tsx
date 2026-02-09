import { View, Text, Image, Input, Button } from '@tarojs/components'
import { useLoad, navigateBack, showToast } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import request from '../../utils/request' 
import './index.scss'

// 默认头像
const DEFAULT_AVATAR = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

interface UserInfo {
  username: string
  nickname: string
  avatar: string
}

interface ApiResponse {
  code: number
  data?: any
  msg?: string
}

export default function EditProfile() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo>({
    username: '',
    nickname: '',
    avatar: ''
  })
  
  const [formData, setFormData] = useState({
    nickname: '',
    avatar: ''
  })

  // 加载用户信息
  const loadUserInfo = async () => {
    try {
      setLoading(true)
      
      const response = await request({
        url: '/users/profile',
        method: 'GET'
      }) as ApiResponse
      
      console.log('获取用户信息返回:', response)
      
      if (response.code === 200 && response.data) {
        const info = response.data.userInfo || response.data
        setUserInfo({
          username: info.username || '',
          nickname: info.nickname || '',
          avatar: info.avatar || ''
        })
        setFormData({
          nickname: info.nickname || '',
          avatar: info.avatar || ''
        })
      } else if (response.code === 401) {
        // Token过期
        showToast({
          title: '请重新登录',
          icon: 'none',
          duration: 2000
        })
      } else {
        throw new Error(response.msg || '获取用户信息失败')
      }
    } catch (error: any) {
      console.error('加载用户信息失败:', error)
      
      // 如果API失败，使用本地存储的数据
      const localUserInfo = Taro.getStorageSync('userInfo') || {}
      if (localUserInfo.username) {
        setUserInfo({
          username: localUserInfo.username || '',
          nickname: localUserInfo.nickname || '',
          avatar: localUserInfo.avatar || ''
        })
        setFormData({
          nickname: localUserInfo.nickname || '',
          avatar: localUserInfo.avatar || ''
        })
      } else {
        // 如果没有本地数据，显示错误
        showToast({
          title: error.message || '加载失败',
          icon: 'none',
          duration: 2000
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // 选择头像
  const handleChooseAvatar = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths.length > 0) {
        setUploading(true)
        showToast({
          title: '上传中...',
          icon: 'loading',
          duration: 3000
        })
        
        try {
          // 获取token
          const token = Taro.getStorageSync('token')
          
          // 上传图片到服务器
          const uploadRes = await Taro.uploadFile({
            url: 'http://localhost:3000/api/upload',
            filePath: res.tempFilePaths[0],
            name: 'file',
            header: {
              'Authorization': token || ''
            }
          })
          
          const result = JSON.parse(uploadRes.data) as ApiResponse
          if (result.code === 200) {
            const avatarUrl = result.data?.url || result.data
            setFormData(prev => ({
              ...prev,
              avatar: avatarUrl
            }))
            showToast({
              title: '头像上传成功',
              icon: 'success',
              duration: 1500
            })
          } else {
            throw new Error(result.msg || '上传失败')
          }
        } catch (uploadError: any) {
          console.error('上传头像失败:', uploadError)
          showToast({
            title: uploadError.message || '上传失败',
            icon: 'none',
            duration: 2000
          })
        } finally {
          setUploading(false)
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      setUploading(false)
    }
  }

  // 保存修改
  const handleSave = async () => {
    try {
      // 检查是否有修改
      const hasNicknameChanged = formData.nickname !== userInfo.nickname && formData.nickname.trim() !== ''
      const hasAvatarChanged = formData.avatar !== userInfo.avatar && formData.avatar !== ''
      
      if (!hasNicknameChanged && !hasAvatarChanged) {
        showToast({
          title: '没有修改任何信息',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      // 构建更新数据
      const updateData: any = {}
      if (hasNicknameChanged) {
        updateData.nickname = formData.nickname.trim()
      }
      if (hasAvatarChanged) {
        updateData.avatar = formData.avatar
      }
      
      showToast({
        title: '保存中...',
        icon: 'loading',
        duration: 3000
      })
      
      try {
        // 调用 API 更新用户信息
        const response = await request({
          url: '/users/update',
          method: 'POST',
          data: updateData
        }) as ApiResponse
        
        if (response.code === 200) {
          // 更新本地存储
          const localUserInfo = Taro.getStorageSync('userInfo') || {}
          if (updateData.nickname) localUserInfo.nickname = updateData.nickname
          if (updateData.avatar) localUserInfo.avatar = updateData.avatar
          Taro.setStorageSync('userInfo', localUserInfo)
          
          // 更新当前页面的用户信息
          setUserInfo(prev => ({
            ...prev,
            nickname: updateData.nickname || prev.nickname,
            avatar: updateData.avatar || prev.avatar
          }))
          
          showToast({
            title: '修改成功',
            icon: 'success',
            duration: 1500
          })
          
          setTimeout(() => {
            navigateBack()
          }, 1500)
        } else {
          throw new Error(response.msg || '修改失败')
        }
      } catch (apiError: any) {
        console.error('API更新失败:', apiError)
        
        // 如果API失败，保存到本地存储
        const localUserInfo = Taro.getStorageSync('userInfo') || {}
        if (updateData.nickname) localUserInfo.nickname = updateData.nickname
        if (updateData.avatar) localUserInfo.avatar = updateData.avatar
        Taro.setStorageSync('userInfo', localUserInfo)
        
        // 更新当前页面的用户信息
        setUserInfo(prev => ({
          ...prev,
          nickname: updateData.nickname || prev.nickname,
          avatar: updateData.avatar || prev.avatar
        }))
        
        showToast({
          title: '已保存到本地',
          icon: 'success',
          duration: 1500
        })
        
        setTimeout(() => {
          navigateBack()
        }, 1500)
      }
      
    } catch (error: any) {
      console.error('保存失败:', error)
      showToast({
        title: error.message || '保存失败',
        icon: 'none',
        duration: 2000
      })
    }
  }

  useLoad(() => {
    loadUserInfo()
  })

  if (loading) {
    return (
      <View className='loading-container'>
        <Text className='loading-text'>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='edit-profile-container'>
      <View className='form-container'>
        {/* 头像编辑 */}
        <View className='avatar-section'>
          <Text className='section-label'>头像</Text>
          <View className='avatar-edit'>
            <Image 
              className='avatar-preview'
              src={formData.avatar || DEFAULT_AVATAR}
              mode='aspectFill'
              onError={() => {
                setFormData(prev => ({ ...prev, avatar: DEFAULT_AVATAR }))
              }}
            />
            <Button 
              className='change-avatar-btn'
              onTap={handleChooseAvatar}
              disabled={uploading}
            >
              {uploading ? '上传中...' : '更换头像'}
            </Button>
          </View>
        </View>

        {/* 昵称编辑 */}
        <View className='input-section'>
          <Text className='section-label'>昵称</Text>
          <Input
            className='nickname-input'
            value={formData.nickname}
            placeholder='请输入昵称'
            placeholderClass='placeholder'
            onInput={(e) => setFormData(prev => ({ ...prev, nickname: e.detail.value }))}
            maxlength={20}
          />
        </View>

        {/* 用户名显示（不可编辑） */}
        <View className='info-section'>
          <Text className='section-label'>用户名</Text>
          <Text className='info-value'>{userInfo.username}</Text>
          <Text className='info-hint'>用户名不可修改</Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View className='action-buttons'>
        <Button 
          className='cancel-btn'
          onTap={() => navigateBack()}
        >
          取消
        </Button>
        <Button 
          className='save-btn'
          onTap={handleSave}
          disabled={uploading}
        >
          保存修改
        </Button>
      </View>
    </View>
  )
}