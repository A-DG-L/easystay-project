import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad, useDidShow, navigateTo } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

const DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945'
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=default&size=40'
const BASE_URL = 'http://localhost:3000'

// 辅助函数：提取各种格式的ID
const extractId = (obj: any): string => {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  if (obj.$oid) return obj.$oid
  if (obj._id) return obj._id
  if (obj.id) return obj.id
  return String(obj)
}

// 获取完整图片URL
const getFullImageUrl = (url?: string): string => {
  if (!url) return DEFAULT_HOTEL_IMAGE
  if (url.startsWith('http')) return url
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// 自定义图片组件
const SafeImage = ({ src, className, defaultSrc }: { src?: string; className: string; defaultSrc: string }) => {
  const [imgSrc, setImgSrc] = useState(src || defaultSrc)
  return (
    <Image 
      src={imgSrc}
      className={className}
      mode='aspectFill'
      onError={() => setImgSrc(defaultSrc)}
    />
  )
}

export default function MyComments() {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    loadMyComments()
  })

  useLoad(() => {
    loadMyComments()
  })

  const loadMyComments = async () => {
    setLoading(true)
    
    try {
      const token = Taro.getStorageSync('token')
      const userInfo = Taro.getStorageSync('userInfo') || {}
      const userId = extractId(userInfo.id || userInfo._id)
      
      if (!token || !userId) {
        setComments([])
        return
      }

      // 1. 获取所有酒店列表（用于建立酒店信息映射）
      const hotelRes = await Taro.request({
        url: `${BASE_URL}/api/hotels?page=1&pageSize=100`,
        method: 'GET'
      })
      
      const hotelMap = new Map()
      if (hotelRes.data.code === 200) {
        const hotels = hotelRes.data.data?.list || hotelRes.data.data || []
        hotels.forEach((hotel: any) => {
          const hotelId = extractId(hotel._id)
          hotelMap.set(hotelId, {
            name: hotel.name || '酒店',
            image: hotel.images?.[0] || hotel.image || '',
            address: hotel.address || ''
          })
        })
      }

      // 2. 获取所有酒店评论（需要分页获取所有酒店）
      // 这里简化处理，只获取前50个酒店的评论
      let allUserComments: any[] = []
      
      for (const [hotelId, hotelInfo] of hotelMap.entries()) {
        try {
          const commentRes = await Taro.request({
            url: `${BASE_URL}/api/comments?hotelId=${hotelId}`,
            method: 'GET'
          })
          
          if (commentRes.data.code === 200) {
            const hotelComments = commentRes.data.data?.list || commentRes.data.data || []
            
            // 过滤出当前用户的评论
            const userComments = hotelComments.filter((c: any) => {
              const cUserId = extractId(c.userId)
              return cUserId === userId
            })
            
            // 格式化评论
            userComments.forEach((c: any) => {
              // 获取用户名
              let username = '用户'
              if (c.userId && typeof c.userId === 'object') {
                username = c.userId.nickname || c.userId.username || username
              } else if (c.username) {
                username = c.username
              }
              
              allUserComments.push({
                _id: extractId(c._id),
                hotelId: hotelId,
                hotelName: hotelInfo.name,
                hotelImage: getFullImageUrl(hotelInfo.image),
                content: c.content,
                rating: c.rating || 5,
                createdAt: c.createdAt || c.createTime || new Date().toISOString(),
                username: username
              })
            })
          }
        } catch (error) {
          console.error(`获取酒店 ${hotelId} 评论失败:`, error)
        }
      }
      
      // 按时间倒序排列
      allUserComments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setComments(allUserComments)
      
    } catch (error) {
      console.error('加载评论失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToHotelDetail = (hotelId: string) => {
    if (hotelId) {
      navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}.${month}.${day}`
    } catch {
      return dateStr
    }
  }

  const renderStars = (rating: number) => {
    return (
      <View className='stars'>
        {Array.from({ length: 5 }, (_, i) => (
          <Text key={i} className={`star ${i < rating ? 'active' : ''}`}>★</Text>
        ))}
      </View>
    )
  }

  if (loading) {
    return (
      <View className='loading-container'>
        <Text className='loading-text'>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='my-comments-container'>
      <View className='header'>
        <Text className='title'>我的评价</Text>
        <Text className='count'>{comments.length}条</Text>
      </View>
      
      <ScrollView scrollY className='comments-list'>
        {comments.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📝</Text>
            <Text className='empty-title'>暂无评价</Text>
            <Text className='empty-desc'>去酒店预订并完成入住后发表评价吧</Text>
          </View>
        ) : (
          comments.map(c => (
            <View 
              key={c._id} 
              className='comment-card'
              onClick={() => goToHotelDetail(c.hotelId)}
            >
              <View className='comment-header'>
                <SafeImage 
                  src={c.hotelImage} 
                  className='hotel-image' 
                  defaultSrc={DEFAULT_HOTEL_IMAGE}
                />
                <View className='comment-info'>
                  <Text className='hotel-name'>{c.hotelName}</Text>
                  <View className='rating'>
                    {renderStars(c.rating)}
                    <Text className='rating-text'>{c.rating}分</Text>
                  </View>
                </View>
                <Text className='comment-time'>
                  {formatDate(c.createdAt)}
                </Text>
              </View>
              
              <Text className='comment-content'>{c.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}