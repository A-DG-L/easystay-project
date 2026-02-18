import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad, navigateTo } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 默认头像
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=default&size=40'
const DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945'

export default function MyComments() {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    loadMyComments()
  })

  const loadMyComments = async () => {
    try {
      setLoading(true)
      
      // 从本地存储获取评论
      const allComments = Taro.getStorageSync('comments') || []
      
      // 获取当前用户信息
      const userInfo = Taro.getStorageSync('userInfo') || {}
      const username = userInfo.nickname || userInfo.username
      
      // 过滤出当前用户的评论
      const myComments = allComments.filter((comment: any) => 
        comment.username === username || comment.userId === userInfo.id
      )
      
      // 按时间倒序排列
      myComments.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setComments(myComments)
    } catch (error) {
      console.error('加载我的评价失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 跳转到酒店详情页
  const goToHotelDetail = (hotelId: string) => {
    navigateTo({
      url: `/pages/hotel-detail/index?id=${hotelId}`
    })
  }

  // 渲染星级
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
      
      <ScrollView className='comments-list' scrollY>
        {comments.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📝</Text>
            <Text className='empty-title'>暂无评价</Text>
            <Text className='empty-desc'>去酒店预订并完成入住后发表评价吧</Text>
          </View>
        ) : (
          comments.map((comment) => (
            <View 
              key={comment._id} 
              className='comment-card'
              onClick={() => goToHotelDetail(comment.hotelId)}
            >
              <View className='comment-header'>
                <Image 
                  className='hotel-image' 
                  src={comment.hotelImage || DEFAULT_HOTEL_IMAGE}
                  mode='aspectFill'
                />
                <View className='comment-info'>
                  <Text className='hotel-name'>{comment.hotelName || '酒店'}</Text>
                  <Text className='room-name'>{comment.roomName || '房型'}</Text>
                  <View className='rating'>
                    {renderStars(comment.rating)}
                    <Text className='rating-text'>{comment.rating}分</Text>
                  </View>
                </View>
                <Text className='comment-time'>{comment.createdAt?.split(' ')[0]}</Text>
              </View>
              
              <Text className='comment-content'>{comment.content}</Text>
              
              {comment.images?.length > 0 && (
                <View className='comment-images'>
                  {comment.images.slice(0, 3).map((img: string, idx: number) => (
                    <Image key={idx} className='comment-image' src={img} mode='aspectFill' />
                  ))}
                  {comment.images.length > 3 && (
                    <View className='more-images'>+{comment.images.length - 3}</View>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}