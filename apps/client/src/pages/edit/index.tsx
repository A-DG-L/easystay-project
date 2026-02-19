import { View, Text, Image, Input, Button } from '@tarojs/components'
import { useLoad, navigateBack, showToast, navigateTo } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import request from '../../utils/request' 
import './index.scss'

// 默认头像
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=default&size=40'
const BASE_URL = 'http://localhost:3000' // 后端基础URL

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

  // 清理头像路径，移除null前缀
  const cleanAvatarPath = (path: string): string => {
    if (!path) return ''
    if (path.startsWith('null/')) return path.substring(5)
    if (path.includes('/null/')) return path.replace('/null/', '/')
    return path
  }

  // 获取完整的头像URL（用于显示）
  const getFullAvatarUrl = (avatarPath: string): string => {
    console.log('编辑页 - 原始头像路径:', avatarPath)
    
    if (!avatarPath) {
      return DEFAULT_AVATAR
    }
    
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    
    const cleanedPath = cleanAvatarPath(avatarPath)
    const finalPath = cleanedPath.startsWith('/') ? cleanedPath.substring(1) : cleanedPath
    
    if (!finalPath) {
      return DEFAULT_AVATAR
    }
    
    const fullUrl = `${BASE_URL}/${finalPath}`
    console.log('编辑页 - 完整头像URL:', fullUrl)
    
    return fullUrl
  }

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
        console.log('用户信息中的头像原始值:', info.avatar)
        
        const avatar = getFullAvatarUrl(info.avatar || '')
        
        setUserInfo({
          username: info.username || '',
          nickname: info.nickname || '',
          avatar: avatar
        })
        setFormData({
          nickname: info.nickname || '',
          avatar: avatar
        })
      } else if (response.code === 401) {
        showToast({
          title: '请重新登录',
          icon: 'none',
          duration: 2000
        })
        setTimeout(() => {
          navigateTo({ url: '/pages/login/index' })
        }, 2000)
      } else {
        throw new Error(response.msg || '获取用户信息失败')
      }
    } catch (error: any) {
      console.error('加载用户信息失败:', error)
      
      const localUserInfo = Taro.getStorageSync('userInfo') || {}
      const avatar = getFullAvatarUrl(localUserInfo.avatar || '')
      
      if (localUserInfo.username) {
        setUserInfo({
          username: localUserInfo.username || '',
          nickname: localUserInfo.nickname || '',
          avatar: avatar
        })
        setFormData({
          nickname: localUserInfo.nickname || '',
          avatar: avatar
        })
      } else {
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
          const token = Taro.getStorageSync('token')
          
          if (!token) {
            showToast({
              title: '请先登录',
              icon: 'none'
            })
            return
          }
          
          const uploadRes = await Taro.uploadFile({
            url: 'http://localhost:3000/api/upload',
            filePath: res.tempFilePaths[0],
            name: 'file',
            header: {
              'Authorization': token
            }
          })
          
          console.log('上传响应:', uploadRes)
          
          const result = JSON.parse(uploadRes.data) as ApiResponse
          if (result.code === 200) {
            let avatarUrl = result.data?.url || result.data
            console.log('上传返回的原始URL:', avatarUrl)
            
            if (!avatarUrl) {
              showToast({
                title: '上传失败，返回无效地址',
                icon: 'none'
              })
              return
            }
            
            // 清理路径中的null
            avatarUrl = cleanAvatarPath(avatarUrl)
            console.log('清理null后的URL:', avatarUrl)
            
            // 转换为完整URL用于显示
            const fullUrl = avatarUrl.startsWith('http') 
              ? avatarUrl 
              : `${BASE_URL}/${avatarUrl.startsWith('/') ? avatarUrl.substring(1) : avatarUrl}`
            
            console.log('处理后的头像URL:', fullUrl)
            
            setFormData(prev => ({ ...prev, avatar: fullUrl }))
            
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
            icon: 'none'
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
      
      const updateData: any = {}
      if (hasNicknameChanged) {
        updateData.nickname = formData.nickname.trim()
      }
      if (hasAvatarChanged) {
        // 保存相对路径，去掉基础URL
        let avatarPath = formData.avatar
        
        if (avatarPath.startsWith(BASE_URL)) {
          avatarPath = avatarPath.replace(BASE_URL, '')
        }
        
        if (avatarPath.startsWith('/')) {
          avatarPath = avatarPath.substring(1)
        }
        
        avatarPath = cleanAvatarPath(avatarPath)
        
        // 确保保存的是相对路径
        const fileName = avatarPath.split('/').pop() || avatarPath
        updateData.avatar = `uploads/${fileName}`
        console.log('保存的头像路径:', updateData.avatar)
      }
      
      showToast({
        title: '保存中...',
        icon: 'loading',
        duration: 3000
      })
      
      try {
        const response = await request({
          url: '/users/update',
          method: 'POST',
          data: updateData
        }) as ApiResponse
        
        console.log('更新用户信息返回:', response)
        
        if (response.code === 200) {
          // 更新本地存储
          const localUserInfo = Taro.getStorageSync('userInfo') || {}
          if (updateData.nickname) localUserInfo.nickname = updateData.nickname
          if (updateData.avatar) localUserInfo.avatar = formData.avatar
          Taro.setStorageSync('userInfo', localUserInfo)
          
          // 更新当前页面的用户信息
          setUserInfo(prev => ({
            ...prev,
            nickname: updateData.nickname || prev.nickname,
            avatar: formData.avatar || prev.avatar
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
        if (updateData.avatar) localUserInfo.avatar = formData.avatar
        Taro.setStorageSync('userInfo', localUserInfo)
        
        setUserInfo(prev => ({
          ...prev,
          nickname: updateData.nickname || prev.nickname,
          avatar: formData.avatar || prev.avatar
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
        icon: 'none'
      })
    }
  }

  // 头像加载失败处理
  const handleAvatarError = () => {
    console.log('头像加载失败，使用默认头像')
    setFormData(prev => ({ ...prev, avatar: DEFAULT_AVATAR }))
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
              onError={handleAvatarError}
            />
            <Button 
              className='change-avatar-btn'
              onClick={handleChooseAvatar}
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
        <Button className='cancel-btn' onClick={() => navigateBack()}>取消</Button>
        <Button className='save-btn' onClick={handleSave} disabled={uploading}>保存修改</Button>
      </View>
    </View>
  )
}