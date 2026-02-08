import { View, Text, Image, Swiper, SwiperItem, ScrollView, Button, Input, Textarea } from '@tarojs/components'
import { useLoad, useRouter, navigateTo, showModal, showToast, navigateBack } from '@tarojs/taro'
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
  status: string
  images: string[]
  createdAt: string
  score?: number
  merchantId?: any
  rejectReason?: string
  isLiked?: boolean // 新增字段
}

interface RoomType {
  _id: string
  name: string
  description: string
  price: number
  images: string[]
  bedType: string
}

interface ApiResponse {
  code: number
  data: any
  msg: string
}

// 新增评论相关接口
interface Comment {
  _id: string
  userId: string
  username: string
  avatar: string
  orderId: string
  content: string
  rating: number
  images?: string[]
  createdAt: string
  hotelId?: string
}

interface CommentForm {
  content: string
  rating: number
  images: string[]
  orderId: string
}

// 创建本地 request 函数
const createRequest = () => {
  console.log('创建本地request函数');
  const BASE_URL = 'http://localhost:3000/api';
  
  return async (options: any) => {
    const { url, method = 'GET', data } = options;
    const token = Taro.getStorageSync('token');
    
    console.log('本地request调用，URL:', BASE_URL + url);
    
    return new Promise((resolve, reject) => {
      Taro.request({
        url: BASE_URL + url,
        method: method,
        data: data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? token : ''
        },
        success: (res) => {
          console.log('本地request成功，状态码:', res.statusCode);
          console.log('响应数据:', res.data);
          
          const response = res.data as ApiResponse;
          
          if (response.code === 200) {
            resolve(response);
          } else {
            Taro.showToast({ title: response.msg || '请求失败', icon: 'none' });
            reject(response);
          }
        },
        fail: (err) => {
          console.error('本地request失败:', err);
          Taro.showToast({ title: '网络异常', icon: 'none' });
          reject(err);
        }
      });
    });
  };
};

const localRequest = createRequest();

// 默认图片URL
const DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';
const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a';

export default function HotelDetail() {
  const router = useRouter()
  const hotelId = router.params?.id || ''
  const [currentImage, setCurrentImage] = useState(0)
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 新增状态
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [commentForm, setCommentForm] = useState<CommentForm>({
    content: '',
    rating: 5,
    images: [],
    orderId: 'temp_order_' + Date.now() // 设置虚拟订单ID
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [commentPage, setCommentPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false) // 新增：控制是否显示所有评论

  // 处理图片加载错误
  const handleImageError = (e: any, imageType: 'hotel' | 'room' = 'hotel') => {
    console.log('图片加载失败:', e);
    if (imageType === 'hotel') {
      e.currentTarget.src = DEFAULT_HOTEL_IMAGE;
    } else {
      e.currentTarget.src = DEFAULT_ROOM_IMAGE;
    }
  }

  // 点击图片查看大图
  const handleImageClick = (index: number) => {
    if (!hotel || !hotel.images || hotel.images.length === 0) return;
    
    Taro.previewImage({
      current: hotel.images[index],
      urls: hotel.images
    });
  }

  // 点击房型图片查看大图
  const handleRoomImageClick = (room: RoomType) => {
    if (!room.images || room.images.length === 0) return;
    
    Taro.previewImage({
      current: room.images[0],
      urls: room.images
    });
  }

  // 返回酒店列表
  const goBackToList = () => {
    navigateBack({
      delta: 1
    });
  }

  const loadHotelDetail = async () => {
    console.log('开始加载酒店详情');
    setLoading(true)
    setError('')
    
    try {
      console.log('尝试调用API，hotelId:', hotelId);
      
      const response = await localRequest({
        url: `/hotels/${hotelId}`,
        method: 'GET'
      }) as ApiResponse;
      
      console.log('API响应:', response);
      
      if (response && response.code === 200) {
        console.log('API数据加载成功');
        
        const data = response.data;
        
        // 清理图片URL
        let validImages: string[] = [];
        if (data.images && Array.isArray(data.images)) {
          validImages = data.images.filter((img: string) => 
            img && img.startsWith('http') && !img.includes('1522771753035')
          );
          
          if (validImages.length === 0) {
            validImages = [DEFAULT_HOTEL_IMAGE];
          }
        } else {
          validImages = [DEFAULT_HOTEL_IMAGE];
        }
        
        // 确保facilities是字符串数组
        const facilities: string[] = Array.isArray(data.facilities) 
          ? data.facilities.map((facility: any) => String(facility))
          : [];
        
        // 创建酒店对象
        const hotelData: Hotel = {
          _id: data._id || hotelId,
          name: data.name || '未知酒店',
          address: data.address || '地址信息缺失',
          starLevel: data.starLevel || 3,
          description: data.description || '暂无介绍',
          facilities: facilities,
          minPrice: data.minPrice || 0,
          status: data.status || 'published',
          images: validImages,
          createdAt: data.createdAt || new Date().toISOString(),
          score: data.score,
          merchantId: data.merchantId,
          rejectReason: data.rejectReason,
          isLiked: false // 初始化为false
        };
        
        setHotel(hotelData);
        
        // 加载房型数据
        await loadRooms(hotelId);
        
        // 检查收藏状态
        checkLikeStatus();
        
        // 记录浏览足迹
        recordViewHistory();
        
        // 加载评论
        loadComments(1);
        
      } else {
        console.warn('API返回非200状态');
        setError(response?.msg || '加载酒店信息失败');
      }
    } catch (err: any) {
      console.error('API请求失败:', err);
      setError('网络异常，请稍后重试');
    } finally {
      console.log('加载流程结束');
      setLoading(false);
    }
  }

  // 加载房型数据
  const loadRooms = async (id: string) => {
    try {
      console.log('加载房型数据，hotelId:', id);
      
      const response = await localRequest({
        url: `/rooms?hotelId=${id}`,
        method: 'GET'
      }) as ApiResponse;
      
      if (response && response.code === 200) {
        const roomsData = response.data || [];
        
        const validRooms = roomsData.map((room: any) => ({
          ...room,
          images: room.images && room.images.length > 0 ? 
            [room.images[0]] : [DEFAULT_ROOM_IMAGE]
        }));
        
        setRooms(validRooms);
      }
    } catch (err) {
      console.error('加载房型失败:', err);
      setRooms([]);
    }
  }

  // 新增：检查收藏状态
  const checkLikeStatus = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) return
      
      // 从本地收藏列表检查
      const collections = Taro.getStorageSync('hotel_collections') || []
      const isCollected = collections.some((item: any) => item._id === hotelId)
      
      // 更新酒店对象的收藏状态
      setHotel(prev => prev ? { ...prev, isLiked: isCollected } : prev)
      
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  // 新增：切换收藏状态
  const toggleLike = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        showModal({
          title: '提示',
          content: '请先登录',
          success: () => {
            navigateTo({ url: '/pages/login/index' })
          }
        })
        return
      }
      
      // 使用虚拟数据 - 直接切换状态
      const isLiked = !hotel?.isLiked
      
      // 更新酒店对象的收藏状态
      setHotel(prev => prev ? { ...prev, isLiked } : prev)
      
      // 更新本地存储
      const collections = Taro.getStorageSync('hotel_collections') || []
      
      if (isLiked) {
        // 添加到收藏
        const hotelInfo = hotel || {
          _id: hotelId,
          name: '酒店',
          address: '',
          starLevel: 0,
          minPrice: 0,
          images: [],
          description: '',
          facilities: []
        }
        
        collections.unshift({
          ...hotelInfo,
          collectedAt: new Date().toISOString()
        })
        Taro.setStorageSync('hotel_collections', collections)
      } else {
        // 移除收藏
        const newCollections = collections.filter((item: any) => item._id !== hotelId)
        Taro.setStorageSync('hotel_collections', newCollections)
      }
      
      showToast({
        title: isLiked ? '已收藏' : '已取消收藏',
        icon: 'success',
        duration: 1500
      })
      
    } catch (error: any) {
      console.error('切换收藏失败:', error)
      showToast({
        title: error.msg || '操作失败',
        icon: 'none',
        duration: 1500
      })
    }
  }

  // 新增：记录浏览足迹
  const recordViewHistory = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) return
      
      console.log('记录浏览足迹（虚拟）:', hotelId)
      
      // 更新本地存储
      const history = Taro.getStorageSync('hotel_view_history') || []
      const hotelInfo = hotel || {
        _id: hotelId,
        name: '酒店',
        address: '',
        starLevel: 0,
        minPrice: 0,
        images: [],
        description: '',
        facilities: []
      }
      
      const updatedHistory = [
        { ...hotelInfo, viewedAt: new Date().toISOString() },
        ...history.filter((item: any) => item._id !== hotelId)
      ].slice(0, 50)
      
      Taro.setStorageSync('hotel_view_history', updatedHistory)
    } catch (error) {
      console.error('记录浏览足迹失败:', error)
    }
  }

  // 新增：加载评论列表
  const loadComments = async (page = 1) => {
    try {
      if (page === 1) {
        setCommentsLoading(true)
      }
      
      // 使用虚拟评论数据
      const mockComments = [
        {
          _id: '1',
          userId: 'user1',
          username: '张三',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop',
          orderId: 'order1',
          content: '酒店环境很好，服务态度也很棒！房间干净整洁，下次还会再来。',
          rating: 5,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          userId: 'user2',
          username: '李四',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
          orderId: 'order2',
          content: '性价比很高，早餐种类丰富。位置也很方便，离地铁站很近。',
          rating: 4,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          _id: '3',
          userId: 'user3',
          username: '王五',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop',
          orderId: 'order3',
          content: '设施齐全，游泳池很干净。就是晚上有点吵，其他都很好。',
          rating: 3,
          createdAt: new Date(Date.now() - 172800000).toISOString()
        },
        {
          _id: '4',
          userId: 'user4',
          username: '赵六',
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop',
          orderId: 'order4',
          content: '房间隔音效果很好，床很舒服，一觉睡到天亮。',
          rating: 5,
          createdAt: new Date(Date.now() - 259200000).toISOString()
        },
        {
          _id: '5',
          userId: 'user5',
          username: '钱七',
          avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=40&h=40&fit=crop',
          orderId: 'order5',
          content: '前台服务很热情，办理入住很快。房间打扫得很干净。',
          rating: 4,
          createdAt: new Date(Date.now() - 345600000).toISOString()
        },
        {
          _id: '6',
          userId: 'user6',
          username: '孙八',
          avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005-128?w=40&h=40&fit=crop',
          orderId: 'order6',
          content: '地理位置优越，周边有很多美食店。性价比很高。',
          rating: 4,
          createdAt: new Date(Date.now() - 432000000).toISOString()
        }
      ];
      
      // 如果是第一页，设置虚拟数据
      if (page === 1) {
        setComments(mockComments)
      } else {
        // 如果是加载更多，可以添加更多虚拟数据
        const moreMockComments = [
          {
            _id: '7',
            userId: 'user7',
            username: '周九',
            avatar: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=40&h=40&fit=crop',
            orderId: 'order7',
            content: '停车场很大，停车很方便。适合自驾游的旅客。',
            rating: 5,
            createdAt: new Date(Date.now() - 518400000).toISOString()
          }
        ];
        setComments(prev => [...prev, ...moreMockComments])
      }
      
      setHasMoreComments(page < 2) // 模拟有更多数据
      setCommentPage(page)
      
    } catch (error) {
      console.error('加载评论失败:', error)
      // 即使出错也显示虚拟数据
      const fallbackComments = [
        {
          _id: 'fallback1',
          userId: 'fallback1',
          username: '虚拟用户',
          avatar: '',
          orderId: 'order1',
          content: '这是虚拟评论数据，用于测试显示效果。',
          rating: 4,
          createdAt: new Date().toISOString()
        }
      ];
      setComments(fallbackComments)
    } finally {
      setCommentsLoading(false)
    }
  }

  // 新增：显示评论弹窗
  const showCommentDialog = () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      showModal({
        title: '提示',
        content: '请先登录',
        success: () => {
          navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    setShowCommentModal(true)
  }

  // 新增：提交评论
  const submitComment = async () => {
    if (!commentForm.content.trim()) {
      showToast({
        title: '请填写评论内容',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    try {
      // 使用虚拟数据
      showToast({
        title: '评论成功（虚拟）',
        icon: 'success',
        duration: 1500
      })
      
      // 添加虚拟评论到列表
      const newComment = {
        _id: 'temp_' + Date.now(),
        userId: 'currentUser',
        username: '当前用户',
        avatar: '',
        orderId: commentForm.orderId || 'temp_order',
        content: commentForm.content,
        rating: commentForm.rating,
        images: commentForm.images,
        createdAt: new Date().toISOString()
      }
      
      setComments(prev => [newComment, ...prev])
      
      setShowCommentModal(false)
      setCommentForm({
        content: '',
        rating: 5,
        images: [],
        orderId: 'temp_order_' + Date.now() // 重置为新的虚拟订单ID
      })
      
    } catch (error: any) {
      console.error('提交评论失败:', error)
      showToast({
        title: error.msg || '评论失败',
        icon: 'none',
        duration: 1500
      })
    }
  }

  // 新增：渲染评论星级
  const renderRatingStars = (rating: number, interactive = false) => {
    return (
      <View className="rating-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <Text 
            key={i} 
            className={`rating-star ${i < rating ? 'active' : ''}`}
            onClick={interactive ? () => setCommentForm(prev => ({ ...prev, rating: i + 1 })) : undefined}
          >
            ★
          </Text>
        ))}
      </View>
    )
  }

  // 新增：格式化时间
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString)
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    } catch {
      return '未知时间'
    }
  }

  // 新增：切换显示所有评论
  const toggleShowAllComments = () => {
    setShowAllComments(!showAllComments)
  }

  useLoad(() => {
    console.log('酒店详情页面加载，酒店ID:', hotelId);
    
    if (hotelId && hotelId.length > 10) {
      loadHotelDetail();
    } else {
      setError('无效的酒店ID')
      setLoading(false)
    }
  })

  // 渲染星级
  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} className={`star ${i < count ? 'star-filled' : 'star-empty'}`}>
        ★
      </Text>
    ))
  }

  // 重新加载数据
  const retryLoadData = () => {
    setLoading(true);
    loadHotelDetail();
  }

  if (loading) {
    return (
      <View className="loading-container">
        <View className="loading-content">
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    )
  }

  if (error || !hotel) {
    return (
      <View className="error-container">
        <View className="error-content">
          <Text className="error-icon">😔</Text>
          <Text className="error-title">加载失败</Text>
          <Text className="error-text">{error || '酒店信息不存在'}</Text>
          
          <View className="error-buttons">
            <Button 
              className="retry-button"
              onClick={retryLoadData}
            >
              重新加载
            </Button>
            <Button 
              className="back-button"
              onClick={goBackToList}
            >
              返回酒店列表
            </Button>
          </View>
        </View>
      </View>
    )
  }

  console.log('渲染酒店详情，hotel:', hotel);

  // 确定要显示的评论列表
  const displayComments = showAllComments ? comments : comments.slice(0, 3)

  return (
    <View className='hotel-detail-container'>
      {/* 图片轮播区域 */}
      <View className='carousel-section'>
        {hotel.images && hotel.images.length > 0 ? (
          <Swiper
            className='carousel-swiper'
            indicatorDots={hotel.images.length > 1}
            indicatorColor='rgba(255, 255, 255, 0.5)'
            indicatorActiveColor='#ffffff'
            autoplay={hotel.images.length > 1}
            interval={5000}
            circular={hotel.images.length > 1}
            current={currentImage}
            onChange={(e) => setCurrentImage(e.detail.current)}
          >
            {hotel.images.map((img: string, index: number) => (
              <SwiperItem key={index}>
                <View 
                  className='carousel-item'
                  onClick={() => handleImageClick(index)}
                >
                  <Image 
                    className='carousel-image' 
                    src={img} 
                    mode='aspectFill'
                    onError={(e) => handleImageError(e, 'hotel')}
                  />
                  <View className='image-overlay'>
                    <Text className='image-count'>{index + 1}/{hotel.images.length}</Text>
                    <Text className='tap-hint'>点击查看大图</Text>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        ) : (
          <View 
            className='no-image'
            onClick={() => handleImageClick(0)}
          >
            <Image 
              className='default-image'
              src={DEFAULT_HOTEL_IMAGE}
              mode='aspectFill'
            />
            <Text className='no-image-text'>暂无图片</Text>
          </View>
        )}
        
        {hotel.images && hotel.images.length > 1 && (
          <View className='carousel-indicator'>
            <Text className='indicator-text'>
              {currentImage + 1}/{hotel.images.length}
            </Text>
          </View>
        )}
        
        {/* 添加收藏按钮 */}
        <View className='like-button-container'>
          <Button 
            className={`like-button ${hotel?.isLiked ? 'liked' : ''}`}
            onClick={toggleLike}
          >
            <Text className='like-icon'>{hotel?.isLiked ? '♥' : '♡'}</Text>
            <Text className='like-text'>{hotel?.isLiked ? '已收藏' : '收藏'}</Text>
          </Button>
        </View>
      </View>

      <ScrollView className='hotel-content' scrollY>
        <View className='hotel-info'>
          {/* 酒店基本信息 */}
          <View className='hotel-header'>
            <View className='hotel-title-section'>
              <View className='hotel-name-row'>
                <Text className='hotel-name'>{hotel.name}</Text>
              </View>
              
              <View className='hotel-rating'>
                <View className='stars'>
                  {renderStars(hotel.starLevel)}
                </View>
                <Text className='star-text'>{hotel.starLevel}星级酒店</Text>
              </View>
              
              <View className='hotel-address'>
                <Text className='address-icon'>📍</Text>
                <Text className='address-text'>{hotel.address}</Text>
              </View>
            </View>
            
            {hotel.minPrice > 0 && (
              <View className='price-section'>
                <Text className='price-label'>最低价格</Text>
                <Text className='price-amount'>¥{hotel.minPrice}</Text>
                <Text className='price-unit'>每晚起</Text>
              </View>
            )}
          </View>

          {/* 酒店描述 */}
          <View className='description-section'>
            <Text className='section-title'>酒店介绍</Text>
            <Text className='description-text'>{hotel.description}</Text>
          </View>

          {/* 酒店设施 */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <View className='facilities-section'>
              <Text className='section-title'>酒店设施</Text>
              <View className='facilities-grid'>
                {hotel.facilities.map((facility: string, index: number) => (
                  <View key={index} className='facility-item'>
                    <Text className='facility-name'>{facility}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 新增：评论区域 */}
          <View className='comments-section'>
            <View className='section-header'>
              <Text className='section-title'>用户评价 ({comments.length})</Text>
              <Button 
                className='add-comment-btn'
                size='mini'
                onClick={showCommentDialog}
              >
                我要评价
              </Button>
            </View>
            
            {comments.length > 0 ? (
              <View className='comments-list'>
                {displayComments.map((comment) => (
                  <View key={comment._id} className='comment-item'>
                    <View className='comment-header'>
                      <Image 
                        className='comment-avatar' 
                        src={comment.avatar || 'https://via.placeholder.com/40'}
                      />
                      <View className='comment-user'>
                        <Text className='comment-username'>{comment.username}</Text>
                        <View className='comment-rating'>
                          {renderRatingStars(comment.rating)}
                          <Text className='comment-time'>{formatTime(comment.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                    <Text className='comment-content'>{comment.content}</Text>
                    {comment.images && comment.images.length > 0 && (
                      <View className='comment-images'>
                        {comment.images.map((img, index) => (
                          <Image 
                            key={index}
                            className='comment-image'
                            src={img}
                            mode='aspectFill'
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                
                {comments.length > 3 && (
                  <Button 
                    className={`view-all-comments-btn ${showAllComments ? 'active' : ''}`}
                    onClick={toggleShowAllComments}
                  >
                    {showAllComments ? `收起评论` : `查看全部评论 (${comments.length})`}
                  </Button>
                )}
              </View>
            ) : (
              <View className='no-comments'>
                <Text className='no-comments-text'>暂无评价，快来发表第一条评价吧！</Text>
              </View>
            )}
          </View>

          {/* 房型列表 */}
          {rooms.length > 0 ? (
            <View className='rooms-section'>
              <View className='section-header'>
                <Text className='section-title'>可选房型</Text>
                <Text className='rooms-count'>共{rooms.length}种房型</Text>
              </View>
              {rooms.map((room: RoomType) => (
                <View key={room._id} className='room-card'>
                  <View 
                    className='room-image-container'
                    onClick={() => handleRoomImageClick(room)}
                  >
                    <Image 
                      className='room-image' 
                      src={room.images && room.images.length > 0 ? room.images[0] : DEFAULT_ROOM_IMAGE} 
                      mode='aspectFill'
                      onError={(e) => handleImageError(e, 'room')}
                    />
                    <View className='room-image-overlay'>
                      <Text className='room-image-hint'>点击查看大图</Text>
                    </View>
                  </View>
                  <View className='room-info'>
                    <View className='room-header'>
                      <Text className='room-name'>{room.name}</Text>
                      <Text className='room-price'>¥{room.price}<Text className='price-unit-small'>/晚</Text></Text>
                    </View>
                    <Text className='room-description'>{room.description}</Text>
                    <View className='room-details'>
                      <View className='room-bed-info'>
                        <Text className='bed-icon'>🛏️</Text>
                        <Text className='room-bed'>{room.bedType}</Text>
                      </View>
                      <Button 
                        className='book-room-button'
                        size='mini'
                        onClick={() => {
                          showToast({
                            title: '预订功能开发中',
                            icon: 'none'
                          })
                        }}
                      >
                        立即预订
                      </Button>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='no-rooms-section'>
              <Text className='section-title'>房型信息</Text>
              <Text className='no-rooms-text'>暂无房型信息</Text>
            </View>
          )}

          {/* 操作按钮 */}
          <View className='action-buttons'>
            <Button 
              className='book-button'
              onClick={() => {
                showToast({
                  title: '预订功能开发中',
                  icon: 'none'
                })
              }}
            >
              立即预订
            </Button>
            
            <Button 
              className='contact-button'
              onClick={() => {
                showToast({
                  title: '联系酒店功能开发中',
                  icon: 'none'
                })
              }}
            >
              联系酒店
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* 评论弹窗 */}
      {showCommentModal && (
        <View className='comment-modal'>
          <View className='comment-modal-content'>
            <View className='modal-header'>
              <Text className='modal-title'>发表评价</Text>
              <Button 
                className='close-modal-btn'
                onClick={() => setShowCommentModal(false)}
              >
                ✕
              </Button>
            </View>
            
            <View className='modal-body'>
              <View className='rating-selector'>
                <Text className='rating-label'>评分：</Text>
                {renderRatingStars(commentForm.rating, true)}
              </View>
              
              <Textarea
                className='comment-input'
                placeholder='请输入您的评价内容...'
                value={commentForm.content}
                onInput={(e) => setCommentForm(prev => ({ ...prev, content: e.detail.value }))}
                maxlength={500}
                autoHeight
              />
              
              <View className='modal-actions'>
                <Button 
                  className='cancel-btn'
                  onClick={() => setShowCommentModal(false)}
                >
                  取消
                </Button>
                <Button 
                  className='submit-btn'
                  onClick={submitComment}
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