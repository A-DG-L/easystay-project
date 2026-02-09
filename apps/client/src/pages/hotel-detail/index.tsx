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
  status: string
  images: string[]
  createdAt: string
  score?: number
  merchantId?: any
  rejectReason?: string
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

interface ApiResponse {
  code: number
  data: any
  msg: string
}

// 评论相关接口
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
  const BASE_URL = 'http://localhost:3000/api';
  
  return async (options: any) => {
    const { url, method = 'GET', data, needAuth = true } = options;
    const token = Taro.getStorageSync('token');
    
    console.log('本地request调用，URL:', BASE_URL + url, '方法:', method);
    
    // 处理文件上传 - 使用 Taro.uploadFile
    if (method === 'POST' && url === '/upload') {
      const header: any = {};
      if (needAuth && token) {
        header['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
      
      console.log('执行文件上传，文件路径:', data.filePath);
      
      return new Promise((resolve, reject) => {
        Taro.uploadFile({
          url: BASE_URL + url,
          filePath: data.filePath,
          name: 'file',
          header: header,
          success: (res) => {
            console.log('文件上传成功:', res);
            try {
              const result = JSON.parse(res.data) as ApiResponse;
              if (result.code === 200) {
                resolve(result);
              } else {
                console.error('上传接口返回错误:', result);
                reject(new Error(result.msg || '上传失败'));
              }
            } catch (error) {
              console.error('解析上传响应失败:', error, '原始响应:', res.data);
              reject(new Error('上传响应解析失败'));
            }
          },
          fail: (err) => {
            console.error('上传文件失败:', err);
            reject(new Error('上传失败: ' + err.errMsg));
          }
        });
      });
    }
    
    // 普通请求
    const header: any = {
      'Content-Type': 'application/json'
    };
    
    if (needAuth && token) {
      header['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    
    return new Promise((resolve, reject) => {
      Taro.request({
        url: BASE_URL + url,
        method: method,
        data: data,
        header: header,
        success: (res) => {
          const response = res.data as ApiResponse;
          
          if (response.code === 200) {
            resolve(response);
          } else {
            reject(response);
          }
        },
        fail: (err) => {
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

// 图片上传函数 - 使用您提供的接口
const uploadImage = async (filePath: string): Promise<string> => {
  try {
    console.log('开始上传图片:', filePath);
    
    // 调用上传接口 POST /api/upload
    const response = await localRequest({
      url: '/upload',
      method: 'POST',
      data: { filePath },
      needAuth: true
    }) as any;
    
    console.log('上传接口响应:', response);
    
    if (response.code === 200) {
      // 根据您提供的接口说明，返回格式为 { url: "http://.../" }
      const imageUrl = response.data?.url || response.url;
      if (!imageUrl) {
        throw new Error('上传成功但未返回图片URL');
      }
      console.log('上传成功，图片URL:', imageUrl);
      return imageUrl;
    }
    throw new Error(response.msg || '上传失败');
  } catch (error: any) {
    console.error('上传图片失败:', error);
    throw new Error(error.message || '图片上传失败');
  }
};

// 批量上传图片
const uploadImages = async (filePaths: string[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  
  for (const filePath of filePaths) {
    try {
      console.log('上传第', uploadedUrls.length + 1, '张图片:', filePath);
      const url = await uploadImage(filePath);
      uploadedUrls.push(url);
      console.log('图片上传成功，URL:', url);
    } catch (error: any) {
      console.error(`上传图片 ${filePath} 失败:`, error);
      throw error; // 如果一张失败，整个上传就失败
    }
  }
  
  console.log('批量上传完成，成功上传', uploadedUrls.length, '张图片');
  return uploadedUrls;
};

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
    orderId: ''
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const [userOrders, setUserOrders] = useState<any[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  // 处理图片加载错误
  const handleImageError = (e: any, imageType: 'hotel' | 'room' = 'hotel') => {
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
      // 1. 首先尝试获取酒店详情（这是最重要的）
      let hotelResponse: any;
      try {
        hotelResponse = await localRequest({ 
          url: `/hotels/${hotelId}`, 
          method: 'GET',
          needAuth: false 
        }) as any;
      } catch (hotelError: any) {
        console.error('获取酒店详情失败:', hotelError);
        throw new Error('加载酒店信息失败，请稍后重试');
      }
      
      if (hotelResponse && hotelResponse.code === 200) {
        const data = hotelResponse.data;
        
        // 清理图片URL
        let validImages: string[] = [];
        if (data.images && Array.isArray(data.images)) {
          validImages = data.images.filter((img: string) => 
            img && img.startsWith('http')
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
          isLiked: false
        };
        
        setHotel(hotelData);
        
        // 2. 立即保存到浏览记录（不等待其他请求）
        saveCompleteHotelToHistory(hotelData);
        
        // 3. 设置加载完成，让用户先看到页面
        setLoading(false);
        
        // 4. 并行加载其他数据（静默处理错误）
        Promise.allSettled([
          loadRooms(hotelId),
          loadCommentsSilent(),
          checkLikeStatus(),
          recordViewHistorySilent()
        ]).then(() => {
          console.log('所有并行任务完成');
        });
        
      } else {
        throw new Error('酒店信息不存在');
      }
    } catch (err: any) {
      console.error('加载酒店详情异常:', err);
      
      // 创建默认数据
      const defaultHotel: Hotel = {
        _id: hotelId,
        name: '酒店',
        address: '地址信息加载中...',
        starLevel: 3,
        description: '暂无介绍',
        facilities: [],
        minPrice: 0,
        status: 'published',
        images: [DEFAULT_HOTEL_IMAGE],
        createdAt: new Date().toISOString(),
        isLiked: false
      };
      
      setHotel(defaultHotel);
      saveCompleteHotelToHistory(defaultHotel);
      setLoading(false);
    }
  }

  // 保存完整酒店信息到浏览记录
  const saveCompleteHotelToHistory = (hotelData: Hotel) => {
    try {
      const history: any[] = Taro.getStorageSync('hotel_view_history') || [];
      
      // 移除重复的（如果有）
      const filteredHistory = history.filter(item => item._id !== hotelData._id);
      
      // 添加新的记录（保存完整信息）
      const newHistory = [{
        _id: hotelData._id,
        name: hotelData.name,
        address: hotelData.address,
        starLevel: hotelData.starLevel,
        minPrice: hotelData.minPrice,
        images: hotelData.images,
        description: hotelData.description,
        facilities: hotelData.facilities,
        viewedAt: new Date().toISOString()
      }, ...filteredHistory].slice(0, 50);
      
      Taro.setStorageSync('hotel_view_history', newHistory);
      console.log('保存完整酒店信息到浏览记录成功:', hotelData._id, hotelData.name);
    } catch (error) {
      console.error('保存浏览记录失败:', error);
    }
  };

  // 静默记录浏览足迹
  const recordViewHistorySilent = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) return;
      
      await localRequest({
        url: '/history',
        method: 'POST',
        data: { hotelId: hotelId }
      }).catch(err => {
        console.log('静默记录足迹失败，不影响主要功能:', err);
      });
      
    } catch (error) {
      console.log('记录浏览足迹异常，不影响主要功能:', error);
    }
  }

  // 加载房型数据
  const loadRooms = async (id: string) => {
    try {
      const response = await localRequest({
        url: `/rooms?hotelId=${id}`,
        method: 'GET',
        needAuth: false
      }) as any;
      
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

  // 检查收藏状态
  const checkLikeStatus = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setHotel(prev => prev ? { ...prev, isLiked: false } : prev)
        return
      }
      
      const likesResponse = await localRequest({
        url: '/likes',
        method: 'GET'
      }) as any;
      
      if (likesResponse.code === 200) {
        const likedHotels = likesResponse.data || []
        const isLiked = likedHotels.some((hotel: any) => hotel._id === hotelId || hotel.hotelId === hotelId)
        
        setHotel(prev => prev ? { ...prev, isLiked } : prev)
        
        // 同时更新本地存储
        const collections = Taro.getStorageSync('hotel_collections') || []
        const isCollected = collections.some((item: any) => item._id === hotelId)
        
        if (isLiked && !isCollected && hotel) {
          collections.unshift({
            ...hotel,
            collectedAt: new Date().toISOString()
          })
          Taro.setStorageSync('hotel_collections', collections)
        }
      }
      
    } catch (error) {
      console.error('检查收藏状态失败:', error)
      const collections = Taro.getStorageSync('hotel_collections') || []
      const isCollected = collections.some((item: any) => item._id === hotelId)
      setHotel(prev => prev ? { ...prev, isLiked: isCollected } : prev)
    }
  }

  // 静默加载评论
  const loadCommentsSilent = async () => {
    try {
      setCommentsLoading(true);
      const response = await localRequest({
        url: `/comments?hotelId=${hotelId}`,
        method: 'GET',
        needAuth: false
      }) as any;
      
      if (response.code === 200) {
        const commentList = response.data?.list || response.data || [];
        const formattedComments = commentList.map((comment: any) => ({
          _id: comment._id || comment.id,
          userId: comment.userId,
          username: comment.username || comment.user?.username || '用户',
          avatar: comment.avatar || comment.user?.avatar || 'https://via.placeholder.com/40',
          orderId: comment.orderId,
          content: comment.content,
          rating: comment.rating,
          images: comment.images || [],
          createdAt: comment.createdAt || comment.createdTime,
          hotelId: comment.hotelId
        }));
        setComments(formattedComments);
      }
    } catch (error) {
      console.log('加载评论失败，不影响主要功能');
    } finally {
      setCommentsLoading(false);
    }
  };

  // 切换收藏状态
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
      
      if (!hotel) return;
      
      // 调用收藏接口
      const response = await localRequest({
        url: '/likes/toggle',
        method: 'POST',
        data: { hotelId: hotelId }
      }) as any;
      
      if (response.code === 200) {
        const isLiked = response.data.isLiked
        
        setHotel(prev => prev ? { ...prev, isLiked } : prev)
        
        // 更新本地存储
        const collections = Taro.getStorageSync('hotel_collections') || []
        
        if (isLiked) {
          // 添加到收藏
          collections.unshift({
            ...hotel,
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
      }
      
    } catch (error: any) {
      console.error('切换收藏失败:', error)
      showToast({
        title: error.msg || '操作失败',
        icon: 'none',
        duration: 1500
      })
    }
  }

  // 获取用户可评论的订单
  const loadUserOrders = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setUserOrders([])
        return
      }
      
      const response = await localRequest({
        url: '/orders',
        method: 'GET'
      }) as any;
      
      if (response.code === 200) {
        const orders = response.data || []
        
        // 过滤出已支付或已完成且属于当前酒店的订单
        const commentableOrders = orders.filter((order: any) => {
          return (order.status === 'paid' || order.status === 'completed') && 
                 order.hotelId === hotelId
        });
        
        setUserOrders(commentableOrders)
        
        if (commentableOrders.length > 0) {
          setCommentForm(prev => ({
            ...prev,
            orderId: commentableOrders[0]._id
          }))
        }
      }
    } catch (error) {
      console.error('获取用户订单失败:', error)
      setUserOrders([])
    }
  }

  // 显示评论弹窗
  const showCommentDialog = async () => {
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
    
    // 加载用户可评论的订单
    await loadUserOrders();
    
    if (userOrders.length === 0) {
      showModal({
        title: '提示',
        content: '您还没有可以评论的订单。需要先预订并完成入住才能发表评价。',
        showCancel: false
      })
      return
    }
    
    if (userOrders.length === 1) {
      setShowCommentModal(true)
    } else {
      showActionSheet({
        itemList: userOrders.map((order: any) => `订单 ${order.orderNumber || order._id.slice(-8)}`),
        success: (res) => {
          const selectedOrder = userOrders[res.tapIndex]
          setCommentForm(prev => ({
            ...prev,
            orderId: selectedOrder._id
          }))
          setShowCommentModal(true)
        }
      })
    }
  }

  // 处理图片上传 - 使用您提供的接口
  const handleImageUpload = async () => {
    try {
      const maxCount = 3 - commentForm.images.length;
      if (maxCount <= 0) {
        showToast({
          title: '最多只能上传3张图片',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      const res = await Taro.chooseImage({
        count: maxCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths.length > 0) {
        setUploadingImages(true);
        showToast({
          title: '图片上传中...',
          icon: 'loading',
          duration: 3000
        });
        
        try {
          // 调用批量上传函数，使用您提供的 /api/upload 接口
          console.log('开始批量上传图片:', res.tempFilePaths);
          const uploadedUrls = await uploadImages(res.tempFilePaths);
          
          if (uploadedUrls.length > 0) {
            setCommentForm(prev => ({
              ...prev,
              images: [...prev.images, ...uploadedUrls]
            }));
            
            showToast({
              title: `成功上传 ${uploadedUrls.length} 张图片`,
              icon: 'success',
              duration: 1500
            });
          } else {
            showToast({
              title: '图片上传失败',
              icon: 'none',
              duration: 1500
            });
          }
        } catch (error: any) {
          console.error('图片上传失败:', error);
          showToast({
            title: error.message || '图片上传失败',
            icon: 'none',
            duration: 2000
          });
        } finally {
          setUploadingImages(false);
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      setUploadingImages(false);
      showToast({
        title: '选择图片失败',
        icon: 'none',
        duration: 1500
      });
    }
  }

  // 删除已选择的图片
  const removeImage = (index: number) => {
    const newImages = [...commentForm.images];
    newImages.splice(index, 1);
    setCommentForm(prev => ({
      ...prev,
      images: newImages
    }));
  };

  // 提交评论
  const submitComment = async () => {
    if (!commentForm.content.trim()) {
      showToast({
        title: '请填写评论内容',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    if (!commentForm.orderId) {
      showToast({
        title: '请选择要评论的订单',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    if (uploadingImages) {
      showToast({
        title: '图片上传中，请稍后',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    try {
      const response = await localRequest({
        url: '/comments',
        method: 'POST',
        data: {
          orderId: commentForm.orderId,
          content: commentForm.content,
          rating: commentForm.rating,
          images: commentForm.images
        }
      }) as any;
      
      if (response.code === 200) {
        showToast({
          title: '评论成功',
          icon: 'success',
          duration: 1500
        })
        
        // 刷新评论列表
        loadCommentsSilent()
        
        setShowCommentModal(false)
        setCommentForm({
          content: '',
          rating: 5,
          images: [],
          orderId: ''
        })
      }
    } catch (error: any) {
      console.error('提交评论失败:', error)
      showToast({
        title: error.msg || '评论失败',
        icon: 'none',
        duration: 1500
      })
    }
  }

  // 渲染评论星级
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

  useLoad(() => {
    console.log('酒店详情页面加载，酒店ID:', hotelId);
    
    if (hotelId) {
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

  const displayComments = showAllComments ? comments : comments.slice(0, 3)

  return (
    <View className='hotel-detail-container'>
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

          <View className='description-section'>
            <Text className='section-title'>酒店介绍</Text>
            <Text className='description-text'>{hotel.description}</Text>
          </View>

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
            
            {commentsLoading ? (
              <View className='comments-loading'>
                <Text className='loading-text'>加载评论中...</Text>
              </View>
            ) : comments.length > 0 ? (
              <View className='comments-list'>
                {displayComments.map((comment) => (
                  <View key={comment._id} className='comment-item'>
                    <View className='comment-header'>
                      <Image 
                        className='comment-avatar' 
                        src={comment.avatar || 'https://via.placeholder.com/40'}
                        onError={(e: any) => {
                         e.currentTarget.src = 'https://via.placeholder.com/40'
                        }}
                      />
                      <View className='comment-user'>
                        <Text className='comment-username'>{comment.username}</Text>
                        <Text className='comment-time'>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </Text>
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
                            onError={(e: any) => {
                              e.currentTarget.src = DEFAULT_HOTEL_IMAGE
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                
                {comments.length > 3 && (
                  <Button 
                    className={`view-all-comments-btn ${showAllComments ? 'active' : ''}`}
                    onClick={() => setShowAllComments(!showAllComments)}
                  >
                    {showAllComments ? `收起评论` : `查看全部评论 (${comments.length})`}
                  </Button>
                )}
              </View>
            ) : (
              <View className='no-comments'>
                <Text className='no-comments-text'>暂无评价</Text>
              </View>
            )}
          </View>

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
                          navigateTo({
                            url: `/pages/booking/index?hotelId=${hotelId}&roomId=${room._id}`
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

          <View className='action-buttons'>
            <Button 
              className='book-button'
              onClick={() => {
                if (rooms.length > 0) {
                  navigateTo({
                    url: `/pages/booking/index?hotelId=${hotelId}&roomId=${rooms[0]._id}`
                  })
                } else {
                  showToast({
                    title: '暂无可用房型',
                    icon: 'none'
                  })
                }
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
              
              <View className='image-upload-section'>
                <Button 
                  className='upload-image-btn'
                  onClick={handleImageUpload}
                  disabled={uploadingImages || commentForm.images.length >= 3}
                >
                  {uploadingImages ? '上传中...' : '+ 添加图片'}
                </Button>
                
                {/* 显示已选择的图片 */}
                {commentForm.images.length > 0 && (
                  <View className='selected-images'>
                    {commentForm.images.map((img, index) => (
                      <View key={index} className='selected-image-item'>
                        <Image 
                          className='selected-image'
                          src={img}
                          mode='aspectFill'
                        />
                        <Button 
                          className='remove-image-btn'
                          onClick={() => removeImage(index)}
                        >
                          ✕
                        </Button>
                      </View>
                    ))}
                  </View>
                )}
                
                <Text className='image-tips'>最多可上传3张图片</Text>
              </View>
              
              <View className='modal-actions'>
                <Button 
                  className='cancel-btn'
                  onClick={() => setShowCommentModal(false)}
                  disabled={uploadingImages}
                >
                  取消
                </Button>
                <Button 
                  className='submit-btn'
                  onClick={submitComment}
                  disabled={uploadingImages || !commentForm.content.trim()}
                >
                  {uploadingImages ? '上传中...' : '提交'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}