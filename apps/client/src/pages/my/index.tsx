import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import { useLoad, navigateTo, showModal, showToast, switchTab } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import request from '../../utils/request'
import './index.scss'

// 默认头像
const DEFAULT_AVATAR = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 类型定义
interface UserInfo {
  username: string
  nickname: string
  avatar: string
}

interface UserStats {
  orderCount: number
  pendingPaymentCount: number
  likeCount: number
}

interface ProfileData {
  userInfo: UserInfo
  stats: UserStats
}

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 检查登录状态
  const checkLogin = () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          navigateTo({
            url: '/pages/login/index'
          })
        }
      })
      return false
    }
    setIsLoggedIn(true)
    return true
  }

  // 加载用户信息
  const loadUserProfile = async () => {
    try {
      setLoading(true)
      
      if (!checkLogin()) return

      const response = await request({
        url: '/users/profile',
        method: 'GET'
      }) as any
      
      console.log('获取用户信息API返回:', response)
      
      if (response.code === 200) {
        setProfileData(response.data)
      } else if (response.code === 401) {
        Taro.removeStorageSync('token')
        setIsLoggedIn(false)
        showModal({
          title: '提示',
          content: '登录已过期，请重新登录',
          showCancel: false,
          success: () => {
            navigateTo({
              url: '/pages/login/index'
            })
          }
        })
      } else {
        throw new Error(response.msg || '获取个人信息失败')
      }
    } catch (error: any) {
      console.error('加载用户信息失败:', error)
      showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  // 编辑用户资料
  const handleEditProfile = () => {
    navigateTo({
      url: '/pages/edit/index'
    })
  }

  // 修改密码
  const handleChangePassword = () => {
    navigateTo({
      url: '/pages/change-pwd/index'
    })
  }

  // 查看我的评价
  const handleViewMyComments = () => {
    showToast({
      title: '查看我的评价功能开发中',
      icon: 'none',
      duration: 1500
    })
  }

  // 查看我的收藏
  const handleViewMyCollections = () => {
    switchTab({
      url: '/pages/likes-history/index?tab=collections'
    })
  }

  // 查看浏览记录
  const handleViewHistory = () => {
    switchTab({
      url: '/pages/likes-history/index?tab=history'
    })
  }

  // 查看我的订单
  const handleViewOrders = () => {
    showToast({
      title: '我的订单功能开发中',
      icon: 'none',
      duration: 1500
    })
  }

  // 退出登录
  const handleLogout = async () => {
    showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      async success(res) {
        if (res.confirm) {
          try {
          } catch (error) {
            console.error('退出登录失败:', error)
          } finally {
            // 清除本地 token
            Taro.removeStorageSync('token')
            setIsLoggedIn(false)
            
            showToast({
              title: '已退出登录',
              icon: 'success',
              duration: 1500
            })
            
            setTimeout(() => {
              navigateTo({
                url: '/pages/login/index'
              })
            }, 1500)
          }
        }
      }
    })
  }

  useLoad(() => {
    loadUserProfile()
  })

  // 监听登录状态变化
  useEffect(() => {
    const token = Taro.getStorageSync('token')
    setIsLoggedIn(!!token)
  }, [])

  if (!isLoggedIn) {
    return (
      <View className='login-prompt-container'>
        <View className='login-prompt-content'>
          <Text className='login-icon'>🔒</Text>
          <Text className='login-title'>请先登录</Text>
          <Text className='login-text'>登录后查看个人信息</Text>
          <Button 
            className='login-btn'
            onClick={() => navigateTo({ url: '/pages/login/index' })}
          >
            立即登录
          </Button>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View className='loading-container'>
        <View className='loading-content'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  const userInfo = profileData?.userInfo
  const stats = profileData?.stats

  return (
    <View className='profile-container'>
      <ScrollView className='profile-content' scrollY enableBackToTop>
        {/* 个人信息卡片 */}
        <View className='profile-card'>
          <View className='profile-header'>
            <Image 
              className='avatar'
              src={userInfo?.avatar || DEFAULT_AVATAR}
              mode='aspectFill'
              onError={(e: any) => {
                e.currentTarget.src = DEFAULT_AVATAR
              }}
            />
            <View className='user-info'>
              <Text className='nickname'>{userInfo?.nickname || userInfo?.username || '用户'}</Text>
              <Text className='username'>用户名: {userInfo?.username || '未设置'}</Text>
              <Text className='user-id'>用户ID: {userInfo?.username || '未设置'}</Text>
            </View>
          </View>
          
          <View className='profile-stats'>
            <View className='stat-item'>
              <Text className='stat-number'>{stats?.orderCount || 0}</Text>
              <Text className='stat-label'>我的订单</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{stats?.pendingPaymentCount || 0}</Text>
              <Text className='stat-label'>待支付</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{stats?.likeCount || 0}</Text>
              <Text className='stat-label'>我的收藏</Text>
            </View>
          </View>
          
          <View className='profile-actions'>
            <Button 
              className='edit-btn'
              onClick={handleEditProfile}
            >
              编辑资料
            </Button>
            <Button 
              className='change-password-btn'
              onClick={handleChangePassword}
            >
              修改密码
            </Button>
          </View>
        </View>

        {/* 功能列表 */}
        <View className='function-list'>
          <View className='section-title'>我的功能</View>
          
          <View className='function-item' onClick={handleViewMyComments}>
            <View className='function-left'>
              <Text className='function-icon'>📝</Text>
              <Text className='function-name'>我的评价</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
          
          <View className='function-item' onClick={handleViewMyCollections}>
            <View className='function-left'>
              <Text className='function-icon'>❤️</Text>
              <Text className='function-name'>我的收藏</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
          
          <View className='function-item' onClick={handleViewHistory}>
            <View className='function-left'>
              <Text className='function-icon'>📋</Text>
              <Text className='function-name'>浏览记录</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
          
          <View className='function-item' onClick={handleViewOrders}>
            <View className='function-left'>
              <Text className='function-icon'>📦</Text>
              <Text className='function-name'>我的订单</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View className='action-buttons'>
          <Button 
            className='logout-btn'
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}