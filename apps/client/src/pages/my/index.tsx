import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import { useLoad, useDidShow, navigateTo, showModal, showToast, switchTab } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import request from '../../utils/request'
import './index.scss'

// 默认头像
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=default&size=40'
const BASE_URL = 'http://localhost:3000'

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
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    completed: 0,
    cancelled: 0
  })

  // 清理头像路径，移除null前缀
  const cleanAvatarPath = (path: string): string => {
    if (!path) return ''
    if (path.startsWith('null/')) return path.substring(5)
    if (path.includes('/null/')) return path.replace('/null/', '/')
    return path
  }

  // 获取完整的头像URL
  const getFullAvatarUrl = (avatarPath?: string): string => {
    console.log('个人中心 - 原始头像路径:', avatarPath)
    
    if (!avatarPath) {
      console.log('个人中心 - 头像路径为空，使用默认头像')
      return DEFAULT_AVATAR
    }
    
    // 如果已经是完整URL，直接返回
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    
    // 清理路径中的null
    const cleanedPath = cleanAvatarPath(avatarPath)
    console.log('个人中心 - 清理后的路径:', cleanedPath)
    
    // 移除开头的斜杠
    const finalPath = cleanedPath.startsWith('/') ? cleanedPath.substring(1) : cleanedPath
    
    if (!finalPath) {
      return DEFAULT_AVATAR
    }
    
    // 拼接完整URL
    const fullUrl = `${BASE_URL}/${finalPath}`
    console.log('个人中心 - 完整头像URL:', fullUrl)
    
    return fullUrl
  }

  // 检查登录状态
  const checkLogin = () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          navigateTo({ url: '/pages/login/index' })
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
        const userData = response.data.userInfo || response.data
        const statsFromApi = response.data.stats || {}
        
        // 处理头像URL
        const processedAvatar = getFullAvatarUrl(userData.avatar)
        
        setProfileData({
          userInfo: {
            username: userData.username || '',
            nickname: userData.nickname || '',
            avatar: processedAvatar
          },
          stats: {
            orderCount: statsFromApi.orderCount || 0,
            pendingPaymentCount: statsFromApi.pendingPaymentCount || 0,
            likeCount: statsFromApi.likeCount || 0
          }
        })

        // 同步部分订单统计（顶部卡片 total/pending）
        setOrderStats(prev => ({
          ...prev,
          total: statsFromApi.orderCount || 0,
          pending: statsFromApi.pendingPaymentCount || 0
        }))
      } else if (response.code === 401) {
        Taro.removeStorageSync('token')
        setIsLoggedIn(false)
        showModal({
          title: '提示',
          content: '登录已过期，请重新登录',
          showCancel: false,
          success: () => navigateTo({ url: '/pages/login/index' })
        })
      } else {
        throw new Error(response.msg || '获取个人信息失败')
      }
    } catch (error: any) {
      console.error('加载用户信息失败:', error)

      // 尝试从本地存储加载用户信息
      const localUserInfo = Taro.getStorageSync('userInfo') || {}
      if (localUserInfo.username) {
        setProfileData({
          userInfo: {
            username: localUserInfo.username || '',
            nickname: localUserInfo.nickname || '',
            avatar: getFullAvatarUrl(localUserInfo.avatar)
          },
          stats: {
            orderCount: 0,
            pendingPaymentCount: 0,
            likeCount: 0
          }
        })
      }
      
      showToast({ title: error.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 编辑用户资料
  const handleEditProfile = () => {
    navigateTo({ url: '/pages/edit/index' })
  }

  // 修改密码
  const handleChangePassword = () => {
    navigateTo({ url: '/pages/change-pwd/index' })
  }

  // 查看我的评价
  const handleViewMyComments = () => {
    navigateTo({ url: '/pages/my-comments/index' })
  }

  // 查看我的收藏
  const handleViewMyCollections = () => {
    switchTab({ url: '/pages/likes-history/index?tab=collections' })
  }

  // 查看浏览记录
  const handleViewHistory = () => {
    switchTab({ url: '/pages/likes-history/index?tab=history' })
  }

  // 查看我的订单
  const handleViewOrders = () => {
    switchTab({ url: '/pages/order/index' })
  }

  // 查看待支付订单
  const handleViewPendingOrders = () => {
    switchTab({ url: '/pages/order/index?tab=pending' })
  }

  // 退出登录
  const handleLogout = async () => {
    showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          Taro.removeStorageSync('token')
          Taro.removeStorageSync('userInfo')
          setIsLoggedIn(false)
          
          showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500
          })
          
          setTimeout(() => {
            navigateTo({ url: '/pages/login/index' })
          }, 1500)
        }
      }
    })
  }

  // 从后端订单列表统计各状态数量
  const loadOrderStats = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setOrderStats({ total: 0, pending: 0, paid: 0, completed: 0, cancelled: 0 })
        return
      }

      const res: any = await request({
        url: '/orders',
        method: 'GET'
      })

      if (res.code === 200) {
        const list: any[] = Array.isArray(res.data) ? res.data : res.data?.list || []

        const stats = {
          total: list.length,
          pending: list.filter(o => o.status === 'pending').length,
          paid: list.filter(o => o.status === 'paid').length,
          completed: list.filter(o => o.status === 'completed').length,
          cancelled: list.filter(o => o.status === 'cancelled').length
        }

        setOrderStats(stats)
        console.log('订单统计(来自后端):', stats)
      } else {
        setOrderStats({ total: 0, pending: 0, paid: 0, completed: 0, cancelled: 0 })
      }
    } catch (error) {
      console.error('加载订单统计失败:', error)
      setOrderStats({ total: 0, pending: 0, paid: 0, completed: 0, cancelled: 0 })
    }
  }

  // 页面显示时刷新数据
  useDidShow(() => {
    console.log('个人中心页面显示，刷新数据')
    if (isLoggedIn) {
      loadUserProfile()
      loadOrderStats()
    }
  })

  useLoad(() => {
    loadUserProfile()
    loadOrderStats()
  })

  // 监听登录状态
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

  return (
    <View className='profile-container'>
      <ScrollView className='profile-content' scrollY enableBackToTop>
        {/* 个人信息卡片 */}
        <View className='profile-card'>
          <View className='profile-header'>
            <Image 
              className='avatar'
              src={userInfo?.avatar ? getFullAvatarUrl(userInfo.avatar) : DEFAULT_AVATAR}
              mode='aspectFill'
              onError={(e: any) => {
                console.error('头像加载失败:', e.detail.errMsg)
                e.currentTarget.src = DEFAULT_AVATAR
              }}
            />
            <View className='user-info'>
              <Text className='nickname'>{userInfo?.nickname || userInfo?.username || '用户'}</Text>
              <Text className='username'>用户名: {userInfo?.username || '未设置'}</Text>
            </View>
          </View>
          
          <View className='profile-stats'>
            <View className='stat-item' onClick={handleViewOrders}>
              <Text className='stat-number'>{profileData?.stats?.orderCount || 0}</Text>
              <Text className='stat-label'>全部订单</Text>
            </View>
            <View className='stat-item' onClick={handleViewPendingOrders}>
              <Text className='stat-number'>{profileData?.stats?.pendingPaymentCount || 0}</Text>
              <Text className='stat-label'>待支付</Text>
            </View>
            <View className='stat-item' onClick={handleViewMyCollections}>
              <Text className='stat-number'>{profileData?.stats?.likeCount || 0}</Text>
              <Text className='stat-label'>我的收藏</Text>
            </View>
          </View>
          
          <View className='profile-actions'>
            <Button className='edit-btn' onClick={handleEditProfile}>编辑资料</Button>
            <Button className='change-password-btn' onClick={handleChangePassword}>修改密码</Button>
          </View>
        </View>

        {/* 订单状态卡片 */}
        <View className='order-status-card'>
          <View className='section-title'>
            <Text>订单状态</Text>
            <Text className='order-total' onClick={handleViewOrders}>查看全部 ›</Text>
          </View>
          
          <View className='status-grid'>
            <View className='status-item' onClick={() => switchTab({ url: '/pages/order/index?tab=pending' })}>
              <Text className='status-count'>{orderStats.pending}</Text>
              <Text className='status-label'>待支付</Text>
            </View>
            
            <View className='status-item' onClick={() => switchTab({ url: '/pages/order/index?tab=paid' })}>
              <Text className='status-count'>{orderStats.paid}</Text>
              <Text className='status-label'>待使用</Text>
            </View>
            
            <View className='status-item' onClick={() => switchTab({ url: '/pages/order/index?tab=completed' })}>
              <Text className='status-count'>{orderStats.completed}</Text>
              <Text className='status-label'>待评价</Text>
            </View>
            
            <View className='status-item' onClick={() => switchTab({ url: '/pages/order/index?tab=cancelled' })}>
              <Text className='status-count'>{orderStats.cancelled}</Text>
              <Text className='status-label'>已取消</Text>
            </View>
          </View>
        </View>

        {/* 功能列表 */}
        <View className='function-list'>
          <View className='section-title'>我的功能</View>
          
          <View className='function-item' onClick={handleViewMyComments}>
            <View className='function-left'>
              <Text className='function-name'>我的评价</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
          
          <View className='function-item' onClick={handleViewMyCollections}>
            <View className='function-left'>
              <Text className='function-name'>我的收藏</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
          
          <View className='function-item' onClick={handleViewHistory}>
            <View className='function-left'>
              <Text className='function-name'>浏览记录</Text>
            </View>
            <Text className='function-arrow'>›</Text>
          </View>
        </View>

        {/* 退出登录按钮 */}
        <View className='action-buttons'>
          <Button className='logout-btn' onClick={handleLogout}>退出登录</Button>
        </View>
      </ScrollView>
    </View>
  )
}