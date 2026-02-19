// pages/hotel-detail/index.tsx
import { View, Text, Image, Swiper, SwiperItem, ScrollView, Button, Textarea } from '@tarojs/components'
import { useLoad, useRouter, navigateTo, showModal, showToast, navigateBack, showActionSheet } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 类型定义
interface Hotel {
  _id: string
  name: string
  address: string
  starLevel: number
  description: string
  facilities: string[]
  minPrice: number
  images: string[]
  isLiked?: boolean
}

interface RoomType {
  _id: string
  name: string
  description: string
  price: number
  images: string[]
  bedType: string
}

interface Comment {
  _id: string
  username: string
  avatar: string
  content: string
  rating: number
  images?: string[]
  createdAt: string
}

// 常量配置
const BASE_URL = 'http://localhost:3000'
const DEFAULT_IMAGE = 'https://picsum.photos/id/1043/400/300'
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=default&size=40'

// 自定义图片组件，处理加载失败的情况
const SafeImage = ({ src, className, mode = 'aspectFill', defaultSrc }: { 
  src?: string; 
  className: string; 
  mode?: string;
  defaultSrc: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src || defaultSrc)
  
  return (
    <Image 
      src={imgSrc}
      className={className}
      mode={mode as any}
      onError={() => {
        console.log('图片加载失败，使用默认图片')
        setImgSrc(defaultSrc)
      }}
    />
  )
}

// 请求工具
const request = async (options: any) => {
  const token = Taro.getStorageSync('token')
  const header: any = { 'Content-Type': 'application/json' }
  if (options.needAuth && token) {
    header['Authorization'] = token
  }
  
  try {
    const res = await Taro.request({
      url: `${BASE_URL}/api${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header
    })
    console.log(`API响应 [${options.url}]:`, res.data)
    return res.data
  } catch (error) {
    console.error(`API请求失败 [${options.url}]:`, error)
    throw error
  }
}

// 获取完整图片URL
const getFullImageUrl = (url?: string): string => {
  if (!url) return DEFAULT_IMAGE
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${BASE_URL}${url}`
  return `${BASE_URL}/${url}`
}

export default function HotelDetail() {
  const router = useRouter()
  const hotelId = router.params?.id || ''
  
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  
  // 评论相关
  const [comments, setComments] = useState<Comment[]>([])
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [commentForm, setCommentForm] = useState({
    content: '',
    rating: 5,
    images: [] as string[],
    orderId: ''
  })
  const [uploading, setUploading] = useState(false)

  // 加载酒店详情
  const loadHotelDetail = async () => {
    try {
      setLoading(true)
      const res = await request({ url: `/hotels/${hotelId}`, needAuth: false })
      
      if (res.code === 200) {
        const data = res.data
        console.log('酒店详情数据:', data)
        
        // 处理酒店图片
        let hotelImages = [DEFAULT_IMAGE]
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          hotelImages = data.images.map((img: string) => getFullImageUrl(img))
        } else if (data.image) {
          hotelImages = [getFullImageUrl(data.image)]
        }
        
        setHotel({
          _id: data._id,
          name: data.name || '未知酒店',
          address: data.address || '地址未知',
          starLevel: data.starLevel || 3,
          description: data.description || '暂无介绍',
          facilities: data.facilities || [],
          minPrice: data.minPrice || 0,
          images: hotelImages,
          isLiked: false
        })
        
        // 并行加载其他数据
        Promise.all([
          loadRooms(),
          loadComments(),
          checkLikeStatus()
        ])
      }
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRooms = async () => {
    try {
      const res = await request({ url: `/rooms?hotelId=${hotelId}`, needAuth: false })
      console.log('房型数据:', res)
      
      if (res.code === 200) {
        const roomsData = res.data || []
        setRooms(roomsData.map((r: any) => {
          console.log('单个房型数据:', r)
          
          // 处理房型图片
          let roomImage = DEFAULT_IMAGE
          if (r.images && Array.isArray(r.images) && r.images.length > 0) {
            roomImage = getFullImageUrl(r.images[0])
          } else if (r.image) {
            roomImage = getFullImageUrl(r.image)
          }
          
          return {
            _id: r._id,
            name: r.name || '未知房型',
            description: r.description || '',
            price: r.price || 0,
            bedType: r.bedType || '大床',
            images: [roomImage]
          }
        }))
      }
    } catch (error) {
      console.error('加载房型失败:', error)
      setRooms([])
    }
  }

  const loadComments = async () => {
    try {
      const res = await request({ url: `/comments?hotelId=${hotelId}&limit=20`, needAuth: false })
      console.log('评论数据:', res)
      
      if (res.code === 200) {
        const list = res.data?.list || res.data || []
        console.log('评论列表原始数据:', list)
        
        const formattedComments = list.map((c: any) => {
          console.log('单条评论原始数据:', c)
          
          // 获取用户名 - 处理嵌套结构
          let username = '用户'
          if (c.username) username = c.username
          else if (c.user?.username) username = c.user.username
          else if (c.user?.nickname) username = c.user.nickname
          else if (c.nickname) username = c.nickname
          
          // 获取头像
          let avatar = DEFAULT_AVATAR
          if (c.avatar) avatar = getFullImageUrl(c.avatar)
          else if (c.user?.avatar) avatar = getFullImageUrl(c.user.avatar)
          
          // 处理评论图片
          let commentImages: string[] = []
          if (c.images && Array.isArray(c.images)) {
            commentImages = c.images.map((img: string) => getFullImageUrl(img))
          }
          
          return {
            _id: c._id || c.id,
            username,
            avatar,
            content: c.content || '',
            rating: c.rating || 5,
            images: commentImages,
            createdAt: c.createdAt || c.createTime || new Date().toISOString()
          }
        })
        
        console.log('格式化后的评论:', formattedComments)
        setComments(formattedComments)
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  const checkLikeStatus = async () => {
    const token = Taro.getStorageSync('token')
    if (!token) return
    
    try {
      const res = await request({ url: '/likes', needAuth: true })
      if (res.code === 200) {
        const liked = res.data.some((h: any) => h._id === hotelId || h.hotelId === hotelId)
        setHotel(prev => prev ? { ...prev, isLiked: liked } : prev)
      }
    } catch (error) {
      // 忽略错误
    }
  }

  const toggleLike = async () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      showModal({ title: '提示', content: '请先登录', success: () => navigateTo({ url: '/pages/login/index' }) })
      return
    }
    
    try {
      const res = await request({ url: '/likes/toggle', method: 'POST', data: { hotelId }, needAuth: true })
      if (res.code === 200) {
        setHotel(prev => prev ? { ...prev, isLiked: res.data.isLiked } : prev)
        showToast({ title: res.data.isLiked ? '已收藏' : '已取消', icon: 'success' })
      }
    } catch (error) {
      showToast({ title: '操作失败', icon: 'none' })
    }
  }

  // 评论相关
  const showCommentDialog = () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      showModal({ title: '提示', content: '请先登录', success: () => navigateTo({ url: '/pages/login/index' }) })
      return
    }

    const orders = Taro.getStorageSync('orders') || []
    const commentableOrders = orders.filter((o: any) => 
      o.status === 'completed' && !o.reviewed && o.hotelId === hotelId
    )

    if (!commentableOrders.length) {
      showModal({ title: '提示', content: '暂无可以评论的订单', showCancel: false })
      return
    }

    if (commentableOrders.length === 1) {
      setCommentForm(prev => ({ ...prev, orderId: commentableOrders[0].id }))
      setShowCommentModal(true)
    } else {
      showActionSheet({
        itemList: commentableOrders.map((o: any) => 
          `${o.checkInDate?.slice(5)} 至 ${o.checkOutDate?.slice(5)}`
        ),
        success: (res) => {
          setCommentForm(prev => ({ ...prev, orderId: commentableOrders[res.tapIndex].id }))
          setShowCommentModal(true)
        }
      })
    }
  }

  const handleImageUpload = async () => {
    if (commentForm.images.length >= 3) {
      showToast({ title: '最多上传3张', icon: 'none' })
      return
    }

    try {
      const res = await Taro.chooseImage({ count: 3 - commentForm.images.length })
      if (!res.tempFilePaths.length) return

      setUploading(true)
      showToast({ title: '上传中...', icon: 'loading' })

      const uploadPromises = res.tempFilePaths.map(async (filePath) => {
        const token = Taro.getStorageSync('token')
        return new Promise<string>((resolve, reject) => {
          Taro.uploadFile({
            url: `${BASE_URL}/api/upload`,
            filePath,
            name: 'file',
            header: { 'Authorization': token },
            success: (res) => {
              try {
                const result = JSON.parse(res.data)
                if (result.code === 200) {
                  let url = result.data?.url || result.data
                  if (url?.startsWith('/')) url = BASE_URL + url
                  resolve(url)
                } else {
                  reject(new Error(result.msg))
                }
              } catch {
                reject(new Error('上传失败'))
              }
            },
            fail: reject
          })
        })
      })

      const urls = await Promise.all(uploadPromises)
      setCommentForm(prev => ({ ...prev, images: [...prev.images, ...urls] }))
      showToast({ title: '上传成功', icon: 'success' })
    } catch (error) {
      showToast({ title: '上传失败', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  const submitComment = async () => {
    if (!commentForm.content.trim()) {
      showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    try {
      showToast({ title: '提交中...', icon: 'loading' })
      
      const res = await request({
        url: '/comments',
        method: 'POST',
        data: commentForm,
        needAuth: true
      })

      if (res.code === 200) {
        // 更新订单状态
        const orders = Taro.getStorageSync('orders') || []
        Taro.setStorageSync('orders', orders.map((o: any) => 
          o.id === commentForm.orderId ? { ...o, reviewed: true } : o
        ))

        await loadComments()
        setShowCommentModal(false)
        setCommentForm({ content: '', rating: 5, images: [], orderId: '' })
        showToast({ title: '评价成功', icon: 'success' })
      }
    } catch (error) {
      showToast({ title: '提交失败', icon: 'none' })
    }
  }

  useLoad(() => {
    if (hotelId) loadHotelDetail()
  })

  if (loading) {
    return (
      <View className='loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!hotel) {
    return (
      <View className='error'>
        <Text>酒店不存在</Text>
        <Button onClick={() => navigateBack()}>返回</Button>
      </View>
    )
  }

  return (
    <View className='hotel-detail'>
      {/* 轮播图 */}
      <View className='carousel'>
        <Swiper
          autoplay
          interval={3000}
          circular
          onChange={(e) => setCurrentImage(e.detail.current)}
        >
          {hotel.images.map((img, idx) => (
            <SwiperItem key={idx}>
              <SafeImage 
                src={img}
                className='carousel-image'
                mode='aspectFill'
                defaultSrc={DEFAULT_IMAGE}
              />
            </SwiperItem>
          ))}
        </Swiper>
        <View className='carousel-indicator'>
          {currentImage + 1}/{hotel.images.length}
        </View>
        <Button 
          className={`like-btn ${hotel.isLiked ? 'liked' : ''}`} 
          onClick={toggleLike}
        >
          <Image 
            src={hotel.isLiked 
              ? 'https://img.icons8.com/ios-filled/50/FA5252/like--v1.png'
              : 'https://img.icons8.com/ios/50/000000/like--v1.png'
            } 
            className='like-icon'
            mode='aspectFit'
          />
        </Button>
      </View>

      <ScrollView className='content' scrollY>
        {/* 酒店信息 */}
        <View className='info-card'>
          <Text className='hotel-name'>{hotel.name}</Text>
          <View className='rating'>
            {'⭐'.repeat(hotel.starLevel)}
            <Text className='rating-text'>{hotel.starLevel}星级</Text>
          </View>
          <Text className='address'>📍 {hotel.address}</Text>
          {hotel.minPrice > 0 && (
            <Text className='price'>¥{hotel.minPrice} 起</Text>
          )}
        </View>

        {/* 酒店介绍 */}
        <View className='section'>
          <Text className='section-title'>酒店介绍</Text>
          <Text className='description'>{hotel.description}</Text>
        </View>

        {/* 设施 */}
        {hotel.facilities?.length > 0 && (
          <View className='section'>
            <Text className='section-title'>酒店设施</Text>
            <View className='facilities'>
              {hotel.facilities.map((f, i) => (
                <Text key={i} className='facility'>{f}</Text>
              ))}
            </View>
          </View>
        )}

        {/* 评论 */}
        <View className='section'>
          <View className='section-header'>
            <Text className='section-title'>用户评价 ({comments.length})</Text>
            <Button className='add-comment' onClick={showCommentDialog}>写评价</Button>
          </View>

          {comments.length === 0 ? (
            <Text className='empty-text'>暂无评价</Text>
          ) : (
            <View className='comments'>
              {comments.slice(0, 3).map(comment => (
                <View key={comment._id} className='comment'>
                  <View className='comment-header'>
                    <SafeImage 
                      src={comment.avatar}
                      className='comment-avatar'
                      mode='aspectFill'
                      defaultSrc={DEFAULT_AVATAR}
                    />
                    <View className='comment-user-info'>
                      <Text className='comment-user'>{comment.username}</Text>
                      <Text className='comment-time'>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className='comment-rating'>{'⭐'.repeat(comment.rating)}</Text>
                  </View>
                  <Text className='comment-content'>{comment.content}</Text>
                  {comment.images && comment.images.length > 0 && (
                    <ScrollView className='comment-images' scrollX>
                      {comment.images.map((img, idx) => (
                        <SafeImage 
                          key={idx}
                          src={img}
                          className='comment-image'
                          mode='aspectFill'
                          defaultSrc={DEFAULT_IMAGE}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
              {comments.length > 3 && (
                <Button className='more-btn' onClick={() => {}}>
                  查看全部 {comments.length} 条评价
                </Button>
              )}
            </View>
          )}
        </View>

        {/* 房型 */}
        <View className='section'>
          <Text className='section-title'>可选房型</Text>
          {rooms.length === 0 ? (
            <Text className='empty-text'>暂无房型</Text>
          ) : (
            rooms.map(room => (
              <View key={room._id} className='room-card'>
                <SafeImage 
                  src={room.images[0]}
                  className='room-image'
                  mode='aspectFill'
                  defaultSrc={DEFAULT_IMAGE}
                />
                <View className='room-info'>
                  <Text className='room-name'>{room.name}</Text>
                  <Text className='room-desc'>{room.description}</Text>
                  <View className='room-footer'>
                    <Text className='room-price'>¥{room.price}<Text className='unit'>/晚</Text></Text>
                    <Button 
                      className='book-btn'
                      onClick={() => navigateTo({ 
                        url: `/pages/booking/index?hotelId=${hotelId}&roomId=${room._id}&roomName=${encodeURIComponent(room.name)}&roomPrice=${room.price}&hotelName=${encodeURIComponent(hotel.name)}&hotelImage=${encodeURIComponent(hotel.images[0])}`
                      })}
                    >
                      预订
                    </Button>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 联系按钮 */}
        <Button className='contact-btn' onClick={() => {
          showModal({
            title: '联系方式',
            content: '客服电话：400-888-9999',
            confirmText: '复制',
            success: (res) => {
              if (res.confirm) Taro.setClipboardData({ data: '400-888-9999' })
            }
          })
        }}>
          联系酒店
        </Button>
      </ScrollView>

      {/* 评价弹窗 */}
      {showCommentModal && (
        <View className='modal'>
          <View className='modal-content'>
            <View className='modal-header'>
              <Text className='modal-title'>写评价</Text>
              <Button className='close' onClick={() => setShowCommentModal(false)}>✕</Button>
            </View>
            
            <View className='modal-body'>
              <View className='rating-select'>
                {[1,2,3,4,5].map(i => (
                  <Text 
                    key={i}
                    className={`star ${i <= commentForm.rating ? 'active' : ''}`}
                    onClick={() => setCommentForm(prev => ({ ...prev, rating: i }))}
                  >★</Text>
                ))}
              </View>

              <Textarea
                className='input'
                placeholder='分享您的入住体验...'
                value={commentForm.content}
                onInput={(e) => setCommentForm(prev => ({ ...prev, content: e.detail.value }))}
                maxlength={500}
              />

              <View className='upload-area'>
                <Button 
                  className='upload-btn' 
                  onClick={handleImageUpload}
                  disabled={uploading}
                >
                  {uploading ? '上传中' : '+ 添加图片'}
                </Button>
                <View className='image-list'>
                  {commentForm.images.map((img, idx) => (
                    <View key={idx} className='image-item'>
                      <SafeImage 
                        src={img}
                        className=''
                        mode='aspectFill'
                        defaultSrc={DEFAULT_IMAGE}
                      />
                      <Button className='remove' onClick={() => {
                        const newImages = [...commentForm.images]
                        newImages.splice(idx, 1)
                        setCommentForm(prev => ({ ...prev, images: newImages }))
                      }}>×</Button>
                    </View>
                  ))}
                </View>
              </View>

              <View className='modal-footer'>
                <Button className='cancel' onClick={() => setShowCommentModal(false)}>取消</Button>
                <Button 
                  className='submit' 
                  onClick={submitComment}
                  disabled={!commentForm.content.trim()}
                >
                  提交
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}