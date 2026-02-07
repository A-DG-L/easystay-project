// src/components/TabBar/index.tsx
import { View, Text } from '@tarojs/components'
import { useRouter, switchTab } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.scss'

export default function TabBar() {
  const [activeTab, setActiveTab] = useState('home')
  const router = useRouter()
  
  // 根据当前路由自动设置激活的tab
  useEffect(() => {
    if (!router.path) return
    
    const path = router.path
    if (path.includes('pages/index/index')) setActiveTab('home')
    else if (path.includes('pages/likes-history/index')) setActiveTab('favorite')
    else if (path.includes('pages/order/index')) setActiveTab('orders')
    else if (path.includes('pages/my/index')) setActiveTab('profile')
  }, [router.path])
  
  // 处理tab点击
  const handleTabClick = (tab: string) => {
    const pageMap = {
      home: '/pages/index/index',
      favorite: '/pages/likes-history/index',
      orders: '/pages/order/index',
      profile: '/pages/my/index'
    }
    
    if (activeTab !== tab) {
      setActiveTab(tab)
      switchTab({ url: pageMap[tab] })
    }
  }
  
  return (
    <View className='tab-bar'>
      <View 
        className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => handleTabClick('home')}
      >
        <View className='tab-icon'>🏠</View>
        <Text className='tab-text'>首页</Text>
      </View>
      
      <View 
        className={`tab-item ${activeTab === 'favorite' ? 'active' : ''}`}
        onClick={() => handleTabClick('favorite')}
      >
        <View className='tab-icon'>❤️</View>
        <Text className='tab-text'>收藏</Text>
      </View>
      
      <View 
        className={`tab-item ${activeTab === 'orders' ? 'active' : ''}`}
        onClick={() => handleTabClick('orders')}
      >
        <View className='tab-icon'>📋</View>
        <Text className='tab-text'>订单</Text>
      </View>
      
      <View 
        className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleTabClick('profile')}
      >
        <View className='tab-icon'>👤</View>
        <Text className='tab-text'>我的</Text>
      </View>
    </View>
  )
}