import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import { useLoad, useDidShow, navigateBack, navigateTo, showModal, showToast } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

import bgImg from '../../assets/images/index_bg_cny.jpg'

// 类型定义
interface HotelItem {
  _id: string
  name: string
  address: string
  starLevel: number
  minPrice: number
  images: string[]
  collectedAt?: string
  viewedAt?: string
}

// API基础配置
const API_BASE_URL = 'http://localhost:3000/api'

// 获取Token
const getToken = () => {
  return Taro.getStorageSync('token') || ''
}

// 统一的API请求函数
const request = async (options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  needAuth?: boolean
}) => {
  const { url, method = 'GET', data, needAuth = true } = options
  
  const header: any = {
    'Content-Type': 'application/json'
  }
  
  if (needAuth) {
    const token = getToken()
    if (!token) {
      throw new Error('请先登录')
    }
    header['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
  
  try {
    const response = await Taro.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header,
      timeout: 10000
    })
    
    if (response.statusCode === 200) {
      const resData = response.data
      if (resData.code === 200) {
        return resData.data
      } else if (resData.code === 401) {
        Taro.removeStorageSync('token')
        throw new Error('登录已过期，请重新登录')
      } else {
        throw new Error(resData.msg || '请求失败')
      }
    } else if (response.statusCode === 401) {
      Taro.removeStorageSync('token')
      throw new Error('登录已过期，请重新登录')
    } else {
      throw new Error(`请求失败: ${response.statusCode}`)
    }
  } catch (error: any) {
    console.error('API请求错误:', error)
    throw error
  }
}

// 获取单个酒店详情
const getHotelDetail = async (hotelId: string): Promise<HotelItem> => {
  console.log('正在获取酒店详情, hotelId:', hotelId)
  
  try {
    // 尝试从API获取单个酒店
    const data = await request({
      url: `/hotels/${hotelId}`,
      method: 'GET',
      needAuth: false
    })
    
    console.log('API返回的酒店详情:', data)
    
    return {
      _id: data._id || hotelId,
      name: data.name || '未知酒店',
      address: data.address || '地址未知',
      starLevel: data.starLevel || 0,
      minPrice: data.minPrice || 0,
      images: data.images || [],
      viewedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error(`获取酒店 ${hotelId} 详情失败:`, error)
    
    // 如果API失败，尝试从本地收藏中查找
    const savedCollections = Taro.getStorageSync('hotel_collections') || []
    const found = savedCollections.find((item: HotelItem) => item._id === hotelId)
    
    if (found) {
      console.log('从本地收藏中找到酒店:', found)
      return {
        ...found,
        viewedAt: new Date().toISOString()
      }
    } else {
      // 如果本地也没有，创建默认数据
      console.log('使用默认酒店数据')
      return {
        _id: hotelId,
        name: '酒店',
        address: '地址未知',
        starLevel: 0,
        minPrice: 0,
        images: [],
        viewedAt: new Date().toISOString()
      }
    }
  }
}

// 批量获取酒店详情（串行获取）
const getHotelDetails = async (hotelIds: string[]): Promise<HotelItem[]> => {
  const results: HotelItem[] = []
  
  // 限制并发数量，避免请求过多
  for (const hotelId of hotelIds) {
    try {
      const hotel = await getHotelDetail(hotelId)
      results.push(hotel)
    } catch (error) {
      console.error(`获取酒店 ${hotelId} 失败:`, error)
      // 添加默认数据
      results.push({
        _id: hotelId,
        name: '酒店',
        address: '地址未知',
        starLevel: 0,
        minPrice: 0,
        images: [],
        viewedAt: new Date().toISOString()
      })
    }
  }
  
  return results
}

export default function LikesHistory() {
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections')
  const [collections, setCollections] = useState<HotelItem[]>([])
  const [viewHistory, setViewHistory] = useState<HotelItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 处理Token过期的情况
  const handleTokenExpired = () => {
    Taro.removeStorageSync('token')
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
  }

  // 检查登录状态
  const checkLogin = () => {
    const token = getToken()
    if (!token) {
      showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          navigateBack()
        }
      })
      return false
    }
    setIsLoggedIn(true)
    return true
  }

  // 加载收藏列表 - 优化版本
  const loadCollections = async () => {
    try {
      setLoading(true)
      
      // 先加载本地收藏
      const savedCollections = Taro.getStorageSync('hotel_collections') || []
      if (savedCollections.length > 0) {
        setCollections(savedCollections)
      }
      
      // 然后尝试从API同步
      try {
        const apiData = await request({
          url: '/likes',
          method: 'GET'
        })
        
        if (Array.isArray(apiData)) {
          const formattedData = apiData.map((item: any) => ({
            _id: item.hotelId || item._id,
            name: item.name || item.hotelName || '未知酒店',
            address: item.address || '地址未知',
            starLevel: item.starLevel || 0,
            minPrice: item.minPrice || 0,
            images: item.images || [],
            collectedAt: item.createdAt || item.collectedAt || new Date().toISOString()
          }))
          
          // 更新状态
          setCollections(formattedData)
          
          // 同步到本地存储
          Taro.setStorageSync('hotel_collections', formattedData)
        }
      } catch (apiError: any) {
        console.log('API收藏数据加载失败，使用本地数据:', apiError)
        // 继续使用本地数据
      }
      
    } catch (error: any) {
      console.error('加载收藏列表失败:', error)
      
      if (error.message.includes('登录已过期')) {
        handleTokenExpired()
        return
      }
      
      showToast({
        title: error.message || '加载收藏失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  // 加载浏览记录 - 从后端获取
  const loadViewHistory = async () => {
    try {
      setLoading(true)
      
      const token = getToken()
      if (!token) {
        setViewHistory([])
        return
      }
      
      console.log('开始从后端获取浏览记录')
      
      // 从后端获取浏览记录
      const historyData = await request({
        url: '/history',
        method: 'GET',
        needAuth: true
      })
      
      console.log('浏览记录接口返回:', historyData)
      
      if (Array.isArray(historyData)) {
        // 格式化数据 - 根据接口文档，返回的应该是包含 hotelId 对象的数组
        const formattedHistory = historyData.map((item: any) => {
          // 从返回的数据中提取酒店信息
          const hotelInfo = item.hotelId || item
          
          return {
            _id: hotelInfo._id || hotelInfo,
            name: hotelInfo.name || '酒店',
            address: hotelInfo.address || '地址未知',
            starLevel: hotelInfo.starLevel || 0,
            minPrice: hotelInfo.minPrice || 0,
            images: hotelInfo.images || [],
            viewedAt: item.createdAt || item.viewedAt || new Date().toISOString()
          }
        })
        
        console.log('格式化后的浏览记录:', formattedHistory)
        setViewHistory(formattedHistory)
        
        // 同时保存到本地存储作为备份
        Taro.setStorageSync('hotel_view_history', formattedHistory)
      } else {
        console.log('浏览记录数据格式不正确:', historyData)
        setViewHistory([])
      }
      
    } catch (error: any) {
      console.error('加载浏览记录失败:', error)
      
      // 如果后端获取失败，尝试从本地存储读取备份
      console.log('尝试从本地存储读取备份浏览记录')
      const backupHistory = Taro.getStorageSync('hotel_view_history') || []
      setViewHistory(backupHistory)
      
      // 不显示错误提示，因为可能是用户还没有浏览记录
      if (error.message && !error.message.includes('请先登录')) {
        console.log('加载浏览记录失败，使用本地备份')
      }
    } finally {
      setLoading(false)
    }
  }

  // 切换收藏状态 - 立即更新
  const toggleCollection = async (hotelId: string, e: any) => {
    e.stopPropagation()
    
    showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await request({
              url: '/likes/toggle',
              method: 'POST',
              data: { hotelId }
            })
            
            if (!result.isLiked) {
              // 立即更新状态
              setCollections(prev => prev.filter(item => item._id !== hotelId))
              
              // 更新本地存储
              const currentCollections = Taro.getStorageSync('hotel_collections') || []
              const newCollections = currentCollections.filter((item: HotelItem) => item._id !== hotelId)
              Taro.setStorageSync('hotel_collections', newCollections)
              
              showToast({
                title: '已取消收藏',
                icon: 'success',
                duration: 1500
              })
            }
          } catch (error: any) {
            console.error('取消收藏失败:', error)
            
            if (error.message.includes('登录已过期')) {
              handleTokenExpired()
              return
            }
            
            // 即使API失败，也更新本地状态
            setCollections(prev => prev.filter(item => item._id !== hotelId))
            const currentCollections = Taro.getStorageSync('hotel_collections') || []
            const newCollections = currentCollections.filter((item: HotelItem) => item._id !== hotelId)
            Taro.setStorageSync('hotel_collections', newCollections)
            
            showToast({
              title: '已取消收藏',
              icon: 'success',
              duration: 1500
            })
          }
        }
      }
    })
  }

  // 清空浏览记录
  const handleClearHistory = () => {
    showModal({
      title: '提示',
      content: '确定要清空浏览记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            Taro.setStorageSync('hotel_view_history', [])
            setViewHistory([])
            
            showToast({
              title: '已清空浏览记录',
              icon: 'success',
              duration: 1500
            })
          } catch (err) {
            console.error('清空浏览记录失败:', err)
            showToast({
              title: '操作失败',
              icon: 'none',
              duration: 1500
            })
          }
        }
      }
    })
  }

  // 加载数据
  const loadData = () => {
    if (!checkLogin()) return
    
    if (activeTab === 'collections') {
      loadCollections()
    } else {
      loadViewHistory()
    }
  }

  useLoad(() => {
    loadData()
  })

  // 每次页面显示时重新加载数据
  useDidShow(() => {
    if (isLoggedIn) {
      if (activeTab === 'history') {
        loadViewHistory()
      } else {
        loadCollections()
      }
    }
  })

  // 切换标签时重新加载
  useEffect(() => {
    if (isLoggedIn) {
      loadData()
    }
  }, [activeTab, isLoggedIn])

  // 返回上一页
  const handleGoBack = () => {
    navigateBack()
  }

  // 跳转到酒店详情页
  const goToHotelDetail = (hotelId: string) => {
    navigateTo({
      url: `/pages/hotel-detail/index?id=${hotelId}`
    })
  }

  // 跳转到登录页
  const goToLogin = () => {
    navigateTo({
      url: '/pages/login/index'
    })
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      
      // 今天
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `今天 ${hours}:${minutes}`
      }
      
      // 昨天
      if (diff < 2 * 24 * 60 * 60 * 1000) {
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `昨天 ${hours}:${minutes}`
      }
      
      // 一周内
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000))
        return `${days}天前`
      }
      
      // 显示日期
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${month}月${day}日 ${hours}:${minutes}`
    } catch {
      return '未知时间'
    }
  }

  // 渲染星级
  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} className={`star ${i < count ? 'star-filled' : 'star-empty'}`}>
        ★
      </Text>
    ))
  }

  // 获取显示名称 - 确保有值
  const getDisplayName = (item: HotelItem) => {
    return item.name || '酒店'
  }

  // 获取显示地址 - 确保有值
  const getDisplayAddress = (item: HotelItem) => {
    return item.address || '地址未知'
  }

  // 获取显示价格 - 确保有值
  const getDisplayPrice = (item: HotelItem) => {
    return item.minPrice > 0 ? item.minPrice : 0
  }

  const currentData = activeTab === 'collections' ? collections : viewHistory
  const isEmpty = currentData.length === 0

  // 如果Token失效，显示重新登录的提示
  if (!isLoggedIn && !getToken()) {
    return (
      <View className='login-prompt-container' style={{ backgroundImage: `url(${bgImg})` }}>
        <View className='login-prompt-content'>
          <Text className='login-icon'>🔒</Text>
          <Text className='login-title'>请先登录</Text>
          <Text className='login-text'>登录后查看收藏和浏览记录</Text>
          <Button 
            className='login-btn'
            onClick={goToLogin}
          >
            立即登录
          </Button>
          <Button 
            className='back-btn'
            onClick={handleGoBack}
          >
            返回
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className='likes-history-container' style={{ backgroundImage: `url(${bgImg})` }}>
      {/* 标签切换 */}
      <View className='tab-bar'>
        <View 
          className={`tab-item ${activeTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          <Text className='tab-text'>我的收藏</Text>
          {collections.length > 0 && (
            <Text className='tab-badge'>{collections.length}</Text>
          )}
        </View>
        <View 
          className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Text className='tab-text'>浏览记录</Text>
          {viewHistory.length > 0 && (
            <Text className='tab-badge'>{viewHistory.length}</Text>
          )}
        </View>
      </View>

      <ScrollView className='content' scrollY enableBackToTop>
        {/* 加载状态 */}
        {loading && (
          <View className='loading-container'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        )}

        {/* 操作按钮 - 仅在浏览记录且有数据时显示清空按钮 */}
        {!loading && activeTab === 'history' && viewHistory.length > 0 && (
          <View className='action-bar'>
            <Button className='clear-btn' onClick={handleClearHistory}>
              <Text className='clear-text'>清空记录</Text>
            </Button>
          </View>
        )}

        {/* 列表内容 */}
        {!loading && isEmpty ? (
          <View className='empty-state'>
            <Text className='empty-icon'>
              {activeTab === 'collections' ? '🤍' : '📋'}
            </Text>
            <Text className='empty-title'>
              {activeTab === 'collections' ? '暂无收藏' : '暂无浏览记录'}
            </Text>
            <Text className='empty-text'>
              {activeTab === 'collections' 
                ? '点击酒店详情页的收藏按钮，收藏你喜欢的酒店吧！' 
                : '浏览酒店详情后，记录会在这里显示'}
            </Text>
          </View>
        ) : (
          <View className='list-container'>
            {currentData.map((item) => (
              <View 
                key={item._id} 
                className='hotel-item'
                onClick={() => goToHotelDetail(item._id)}
              >
                <Image 
                  className='hotel-image'
                  src={item.images && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80'}
                  mode='aspectFill'
                  onError={(e: any) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80'
                  }}
                />
                <View className='hotel-info'>
                  <View className='hotel-header'>
                    <Text className='hotel-name'>{getDisplayName(item)}</Text>
                    {activeTab === 'collections' && (
                      <Button 
                        className='remove-btn'
                        onClick={(e) => toggleCollection(item._id, e)}
                      >
                        <Text className='remove-icon'>✕</Text>
                      </Button>
                    )}
                  </View>
                  
                  <View className='hotel-rating'>
                    <View className='stars'>
                      {renderStars(item.starLevel)}
                    </View>
                    {item.starLevel > 0 && (
                      <Text className='star-text'>{item.starLevel}星</Text>
                    )}
                  </View>
                  
                  <Text className='hotel-address'>{getDisplayAddress(item)}</Text>
                  
                  <View className='hotel-footer'>
                    <View className='price-info'>
                      <Text className='price-label'>最低</Text>
                      <Text className='price-amount'>¥{getDisplayPrice(item)}</Text>
                      <Text className='price-unit'>起</Text>
                    </View>
                    
                    {/* 只显示浏览时间，不显示收藏时间 */}
                    {activeTab === 'history' && item.viewedAt && (
                      <Text className='time-info'>
                        浏览于 {formatTime(item.viewedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}