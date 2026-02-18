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
    
    if (method === 'POST' && url === '/upload') {
      const header: any = {};
      if (needAuth && token) {
        header['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
      
      return new Promise((resolve, reject) => {
        Taro.uploadFile({
          url: BASE_URL + url,
          filePath: data.filePath,
          name: 'file',
          header: header,
          success: (res) => {
            try {
              const result = JSON.parse(res.data) as ApiResponse;
              if (result.code === 200) {
                resolve(result);
              } else {
                reject(new Error(result.msg || '上传失败'));
              }
            } catch (error) {
              reject(new Error('上传响应解析失败'));
            }
          },
          fail: (err) => {
            reject(new Error('上传失败: ' + err.errMsg));
          }
        });
      });
    }
    
    const header: any = { 'Content-Type': 'application/json' };
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
        fail: (err) => reject(err)
      });
    });
  };
};

const localRequest = createRequest();

const DEFAULT_HOTEL_IMAGE = 'https://picsum.photos/id/1043/400/300'; 
const DEFAULT_ROOM_IMAGE = 'https://picsum.photos/id/106/400/300';   

// 图片上传函数
const uploadImage = async (filePath: string): Promise<string> => {
  try {
    const response = await localRequest({
      url: '/upload',
      method: 'POST',
      data: { filePath },
      needAuth: true
    }) as any;
    
    if (response.code === 200) {
      let imageUrl = response.data?.url || response.url || response.data;
      if (imageUrl?.startsWith('/')) {
        imageUrl = 'http://localhost:3000' + imageUrl;
      }
      if (imageUrl && imageUrl.startsWith('http://')) {
        console.log('将图片URL从 HTTP 转为 HTTPS:', imageUrl);
        imageUrl = imageUrl.replace('http://', 'https://');// 转为 HTTPS
      }
      return imageUrl;
    }
    throw new Error(response.msg || '上传失败');
  } catch (error: any) {
    throw new Error(error.message || '图片上传失败');
  }
};

const uploadImages = async (filePaths: string[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  for (const filePath of filePaths) {
    try {
      const url = await uploadImage(filePath);
      if (url && !url.includes('null/') && url !== 'null') {
        uploadedUrls.push(url);
      }
    } catch (error) {
      throw error;
    }
  }
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
  const [uploadingImages, setUploadingImages] = useState(false)

  const handleImageError = (e: any, imageType: 'hotel' | 'room' = 'hotel') => {
    e.currentTarget.src = imageType === 'hotel' ? DEFAULT_HOTEL_IMAGE : DEFAULT_ROOM_IMAGE;
  }

  const handleImageClick = (index: number) => {
    if (!hotel?.images?.length) return;
    Taro.previewImage({ current: hotel.images[index], urls: hotel.images });
  }

  const handleRoomImageClick = (room: RoomType) => {
    if (!room.images?.length) return;
    Taro.previewImage({ current: room.images[0], urls: room.images });
  }

  const goBackToList = () => navigateBack({ delta: 1 });

  const loadHotelDetail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const hotelResponse = await localRequest({ 
        url: `/hotels/${hotelId}`, 
        method: 'GET',
        needAuth: false 
      }) as any;
      
      if (hotelResponse?.code === 200) {
        const data = hotelResponse.data;
        let validImages = data.images?.filter((img: string) => img?.startsWith('http')) || [];
        if (!validImages.length) validImages = [DEFAULT_HOTEL_IMAGE];
        
        const hotelData: Hotel = {
          _id: data._id || hotelId,
          name: data.name || '未知酒店',
          address: data.address || '地址信息缺失',
          starLevel: data.starLevel || 3,
          description: data.description || '暂无介绍',
          facilities: Array.isArray(data.facilities) ? data.facilities.map(String) : [],
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
        saveCompleteHotelToHistory(hotelData);
        
        Promise.allSettled([
          loadRooms(),
          loadCommentsSilent(),
          checkLikeStatus(),
          recordViewHistorySilent()
        ]);
      }
    } catch (err) {
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
    } finally {
      setLoading(false);
    }
  }

  const saveCompleteHotelToHistory = (hotelData: Hotel) => {
    try {
      const history = Taro.getStorageSync('hotel_view_history') || [];
      const filteredHistory = history.filter((item: any) => item._id !== hotelData._id);
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
    } catch (error) {
      console.error('保存浏览记录失败:', error);
    }
  };

  const recordViewHistorySilent = async () => {
    try {
      const token = Taro.getStorageSync('token');
      if (token) {
        await localRequest({ url: '/history', method: 'POST', data: { hotelId } });
      }
    } catch (error) {}
  }

  const loadRooms = async () => {
    try {
      const response = await localRequest({
        url: `/rooms?hotelId=${hotelId}`,
        method: 'GET',
        needAuth: false
      }) as any;
      
      if (response?.code === 200) {
        const roomsData = response.data || [];
        setRooms(roomsData.map((room: any) => ({
          ...room,
          images: room.images?.length ? [room.images[0]] : [DEFAULT_ROOM_IMAGE]
        })));
      }
    } catch (err) {
      setRooms([]);
    }
  }

  const checkLikeStatus = async () => {
    try {
      const token = Taro.getStorageSync('token');
      if (!token) {
        setHotel(prev => prev ? { ...prev, isLiked: false } : prev);
        return;
      }
      
      const likesResponse = await localRequest({ url: '/likes', method: 'GET' }) as any;
      if (likesResponse.code === 200) {
        const likedHotels = likesResponse.data || [];
        const isLiked = likedHotels.some((hotel: any) => hotel._id === hotelId || hotel.hotelId === hotelId);
        setHotel(prev => prev ? { ...prev, isLiked } : prev);
      }
    } catch (error) {
      const collections = Taro.getStorageSync('hotel_collections') || [];
      const isCollected = collections.some((item: any) => item._id === hotelId);
      setHotel(prev => prev ? { ...prev, isLiked: isCollected } : prev);
    }
  }

  // 加载评论
  const loadCommentsSilent = async () => {
    if (!hotelId) return;
    
    try {
      setCommentsLoading(true);
      
      // 调用后端获取评论列表接口
      const response = await localRequest({
        url: `/comments?hotelId=${hotelId}&page=1&limit=20`,
        method: 'GET',
        needAuth: false
      }) as any;
      
      if (response.code === 200) {
        const responseData = response.data;
        
        // 处理分页返回格式
        const commentList = responseData.list || responseData.data || responseData || [];
        
        // 格式化评论数据
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
        
        console.log(`加载到 ${formattedComments.length} 条评论`);
      } else {
        console.warn('加载评论失败:', response.msg);
        setComments([]);
      }
    } catch (error) {
      console.log('加载评论失败，不影响主要功能');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleLike = async () => {
    try {
      const token = Taro.getStorageSync('token');
      if (!token) {
        showModal({
          title: '提示',
          content: '请先登录',
          success: () => navigateTo({ url: '/pages/login/index' })
        });
        return;
      }
      if (!hotel) return;
      
      const response = await localRequest({
        url: '/likes/toggle',
        method: 'POST',
        data: { hotelId }
      }) as any;
      
      if (response.code === 200) {
        const isLiked = response.data.isLiked;
        setHotel(prev => prev ? { ...prev, isLiked } : prev);
        
        const collections = Taro.getStorageSync('hotel_collections') || [];
        if (isLiked) {
          collections.unshift({ ...hotel, collectedAt: new Date().toISOString() });
        } else {
          Taro.setStorageSync('hotel_collections', collections.filter((item: any) => item._id !== hotelId));
        }
        Taro.setStorageSync('hotel_collections', collections);
        
        showToast({ title: isLiked ? '已收藏' : '已取消收藏', icon: 'success' });
      }
    } catch (error: any) {
      showToast({ title: error.msg || '操作失败', icon: 'none' });
    }
  }

  // 显示评论弹窗
  const showCommentDialog = async () => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      showModal({
        title: '提示',
        content: '请先登录',
        success: () => navigateTo({ url: '/pages/login/index' })
      });
      return;
    }
    
    // 从本地存储获取订单（或者也可以调用后端接口获取用户的可评论订单）
    const orders = Taro.getStorageSync('orders') || [];
    console.log('所有订单:', orders);
    
    // 过滤出可评论的订单：
    // 1. status为completed（已完成）
    // 2. reviewed为false（未评价）
    // 3. hotelId匹配当前酒店
    const commentableOrders = orders.filter((order: any) => {
      const isCompleted = order.status === 'completed';
      const notReviewed = !order.reviewed;
      const matchHotel = order.hotelId === hotelId;
      
      console.log('订单检查:', { 
        id: order.id, 
        status: order.status, 
        reviewed: order.reviewed, 
        hotelId: order.hotelId,
        isCompleted, 
        notReviewed, 
        matchHotel 
      });
      
      return isCompleted && notReviewed && matchHotel;
    });
    
    console.log('可评论订单:', commentableOrders);
    
    if (!commentableOrders.length) {
      showModal({
        title: '提示',
        content: '您还没有可以评论的订单。需要先预订并完成入住才能发表评价。',
        showCancel: false
      });
      return;
    }
    
    if (commentableOrders.length === 1) {
      const orderId = commentableOrders[0].id || commentableOrders[0]._id;
      console.log('选中订单ID:', orderId);
      setCommentForm(prev => ({ ...prev, orderId: orderId }));
      setShowCommentModal(true);
    } else {
      showActionSheet({
        itemList: commentableOrders.map((order: any) => {
          const checkIn = order.checkInDate?.slice(5) || '??-??';
          const checkOut = order.checkOutDate?.slice(5) || '??-??';
          return `${checkIn}至${checkOut} · ${order.guestName || '未知'} · ${order.roomCount || 1}间`;
        }),
        success: (res) => {
          const selectedOrder = commentableOrders[res.tapIndex];
          const orderId = selectedOrder.id || selectedOrder._id;
          console.log('选中的订单ID:', orderId);
          setCommentForm(prev => ({ ...prev, orderId: orderId }));
          setShowCommentModal(true);
        }
      });
    }
  }

  // 处理图片上传
  const handleImageUpload = async () => {
    try {
      const maxCount = 3 - commentForm.images.length;
      if (maxCount <= 0) {
        showToast({ title: '最多只能上传3张图片', icon: 'none' });
        return;
      }
      
      const res = await Taro.chooseImage({ count: maxCount, sizeType: ['compressed'], sourceType: ['album', 'camera'] });
      if (!res.tempFilePaths.length) return;
      
      setUploadingImages(true);
      showToast({ title: '图片上传中...', icon: 'loading', duration: 3000 });
      
      const uploadedUrls = await uploadImages(res.tempFilePaths);
      const httpsUrls = uploadedUrls.map(url => url?.startsWith('http://') ? url.replace('http://', 'https://') : url);  // 转为 HTTPS
      const validUrls = httpsUrls.filter(url => url && !url.includes('null/'));
      
      if (validUrls.length) {
        setCommentForm(prev => ({ ...prev, images: [...prev.images, ...validUrls] }));
        showToast({ title: `成功上传 ${validUrls.length} 张图片`, icon: 'success' });
      }
    } catch (error: any) {
      showToast({ title: error.message || '图片上传失败', icon: 'none' });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...commentForm.images];
    newImages.splice(index, 1);
    setCommentForm(prev => ({ ...prev, images: newImages }));
  };

  // 提交评论
  const submitComment = async () => {
    if (!commentForm.content.trim()) {
      showToast({ title: '请填写评论内容', icon: 'none' });
      return;
    }
    if (!commentForm.orderId) {
      showToast({ title: '请选择要评论的订单', icon: 'none' });
      return;
    }
    if (uploadingImages) {
      showToast({ title: '图片上传中，请稍后', icon: 'none' });
      return;
    }
    
    try {
      showToast({ title: '提交中...', icon: 'loading' });
      
      const token = Taro.getStorageSync('token');
      if (!token) {
        showModal({
          title: '提示',
          content: '请先登录',
          success: () => navigateTo({ url: '/pages/login/index' })
        });
        return;
      }
      
      // 调用后端发布评论接口
      const response = await localRequest({
        url: '/comments',
        method: 'POST',
        data: {
          orderId: commentForm.orderId,
          content: commentForm.content,
          rating: commentForm.rating,
          images: commentForm.images
        },
        needAuth: true
      }) as any;
      
      if (response.code === 200 || response.code === 201) {
        console.log('评论发布成功:', response.data);
        
        // 1. 更新本地订单状态
        const orders = Taro.getStorageSync('orders') || [];
        const updatedOrders = orders.map((order: any) => {
          if ((order.id || order._id) === commentForm.orderId) {
            return {
              ...order,
              reviewed: true,
              reviewTime: new Date().toLocaleString(),
              reviewId: response.data?._id || response.data?.id
            };
          }
          return order;
        });
        
        Taro.setStorageSync('orders', updatedOrders);
        
        // 2. 重新加载评论列表
        await loadCommentsSilent();
        
        showToast({ title: '评价成功', icon: 'success' });
        
        // 3. 关闭弹窗并重置表单
        setShowCommentModal(false);
        setCommentForm({ content: '', rating: 5, images: [], orderId: '' });
        
      } else {
        throw new Error(response.msg || '评论发布失败');
      }
      
    } catch (error: any) {
      console.error('评价失败:', error);
      showToast({ title: error.msg || '评价失败', icon: 'none' });
    }
  }

  const renderRatingStars = (rating: number, interactive = false) => (
    <View className="rating-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Text 
          key={i} 
          className={`rating-star ${i < rating ? 'active' : ''}`}
          onClick={interactive ? () => setCommentForm(prev => ({ ...prev, rating: i + 1 })) : undefined}
        >★</Text>
      ))}
    </View>
  )

  useLoad(() => {
    if (hotelId) loadHotelDetail();
    else { setError('无效的酒店ID'); setLoading(false); }
  })

  const renderStars = (count: number) => (
    <View className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Text key={i} className={`star ${i < count ? 'star-filled' : 'star-empty'}`}>★</Text>
      ))}
    </View>
  )

  const retryLoadData = () => { setLoading(true); loadHotelDetail(); }

  if (loading) return <View className="loading-container"><View className="loading-content"><Text className="loading-text">加载中...</Text></View></View>;
  if (error || !hotel) return (
    <View className="error-container">
      <View className="error-content">
        <Text className="error-icon">😔</Text>
        <Text className="error-title">加载失败</Text>
        <Text className="error-text">{error || '酒店信息不存在'}</Text>
        <View className="error-buttons">
          <Button className="retry-button" onClick={retryLoadData}>重新加载</Button>
          <Button className="back-button" onClick={goBackToList}>返回酒店列表</Button>
        </View>
      </View>
    </View>
  )

  const displayComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <View className='hotel-detail-container'>
      <View className='carousel-section'>
        {hotel.images?.length ? (
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
                <View className='carousel-item' onClick={() => handleImageClick(index)}>
                  <Image className='carousel-image' src={img} mode='aspectFill' onError={(e) => handleImageError(e, 'hotel')} />
                  <View className='image-overlay'>
                    <Text className='image-count'>{index + 1}/{hotel.images.length}</Text>
                    <Text className='tap-hint'>点击查看大图</Text>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        ) : (
          <View className='no-image' onClick={() => handleImageClick(0)}>
            <Image className='default-image' src={DEFAULT_HOTEL_IMAGE} mode='aspectFill' />
            <Text className='no-image-text'>暂无图片</Text>
          </View>
        )}
        
        {hotel.images?.length > 1 && (
          <View className='carousel-indicator'>
            <Text className='indicator-text'>{currentImage + 1}/{hotel.images.length}</Text>
          </View>
        )}
        
        <View className='like-button-container'>
          <Button className={`like-button ${hotel?.isLiked ? 'liked' : ''}`} onClick={toggleLike}>
            <Text className='like-icon'>{hotel?.isLiked ? '♥' : '♡'}</Text>
            <Text className='like-text'>{hotel?.isLiked ? '已收藏' : '收藏'}</Text>
          </Button>
        </View>
      </View>

      <ScrollView className='hotel-content' scrollY>
        <View className='hotel-info'>
          <View className='hotel-header'>
            <View className='hotel-title-section'>
              <View className='hotel-name-row'><Text className='hotel-name'>{hotel.name}</Text></View>
              <View className='hotel-rating'>
                {renderStars(hotel.starLevel)}
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

          {hotel.facilities?.length > 0 && (
            <View className='facilities-section'>
              <Text className='section-title'>酒店设施</Text>
              <View className='facilities-grid'>
                {hotel.facilities.map((facility: string, index: number) => (
                  <View key={index} className='facility-item'><Text className='facility-name'>{facility}</Text></View>
                ))}
              </View>
            </View>
          )}

          <View className='comments-section'>
            <View className='section-header'>
              <Text className='section-title'>用户评价 ({comments.length})</Text>
              <Button className='add-comment-btn' size='mini' onClick={showCommentDialog}>我要评价</Button>
            </View>
            
            {commentsLoading ? (
              <View className='comments-loading'><Text className='loading-text'>加载评论中...</Text></View>
            ) : comments.length > 0 ? (
              <View className='comments-list'>
                {displayComments.map((comment) => (
                  <View key={comment._id} className='comment-item'>
                    <View className='comment-header'>
                      <Image className='comment-avatar' src={comment.avatar || 'https://via.placeholder.com/40'} />
                      <View className='comment-user'>
                        <Text className='comment-username'>{comment.username}</Text>
                        <Text className='comment-time'>{new Date(comment.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <Text className='comment-content'>{comment.content}</Text>
                    {comment.images && comment.images.length > 0 && (
                      <View className='comment-images'>
                        {comment.images.map((img, idx) => (
                          <Image key={idx} className='comment-image' src={img} mode='aspectFill' />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                {comments.length > 3 && (
                  <Button className={`view-all-comments-btn ${showAllComments ? 'active' : ''}`} onClick={() => setShowAllComments(!showAllComments)}>
                    {showAllComments ? '收起评论' : `查看全部评论 (${comments.length})`}
                  </Button>
                )}
              </View>
            ) : (
              <View className='no-comments'><Text className='no-comments-text'>暂无评价</Text></View>
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
                  <View className='room-image-container' onClick={() => handleRoomImageClick(room)}>
                    <Image className='room-image' src={room.images?.[0] || DEFAULT_ROOM_IMAGE} mode='aspectFill' />
                    <View className='room-image-overlay'><Text className='room-image-hint'>点击查看大图</Text></View>
                  </View>
                  <View className='room-info'>
                    <View className='room-header'>
                      <Text className='room-name'>{room.name}</Text>
                      <Text className='room-price'>¥{room.price}<Text className='price-unit-small'>/晚</Text></Text>
                    </View>
                    <Text className='room-description'>{room.description}</Text>
                    <View className='room-details'>
                      <View className='room-bed-info'><Text className='room-bed'>{room.bedType}</Text></View>
                      <Button className='book-room-button' size='mini' onClick={() => {
                        navigateTo({ url: `/pages/booking/index?hotelId=${hotelId}&roomId=${room._id}&roomName=${encodeURIComponent(room.name)}&roomPrice=${room.price}&roomImage=${encodeURIComponent(room.images?.[0] || '')}&hotelName=${encodeURIComponent(hotel?.name || '')}&hotelImage=${encodeURIComponent(hotel?.images?.[0] || '')}` })
                      }}>立即预订</Button>
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
            <Button className='contact-button' onClick={() => {
              const mockPhone = '400-888-9999';
              showModal({
                title: '联系方式',
                content: `客服电话：${mockPhone}`,
                confirmText: '复制',
                success: (res) => {
                  if (res.confirm) Taro.setClipboardData({ data: mockPhone });
                }
              });
            }}>联系酒店</Button>
          </View>
        </View>
      </ScrollView>

      {showCommentModal && (
        <View className='comment-modal'>
          <View className='comment-modal-content'>
            <View className='modal-header'>
              <Text className='modal-title'>发表评价</Text>
              <Button className='close-modal-btn' onClick={() => setShowCommentModal(false)}>✕</Button>
            </View>
            <View className='modal-body'>
              <View className='rating-selector'>
                <Text className='rating-label'>评分：</Text>
                {renderRatingStars(commentForm.rating, true)}
              </View>
              <Textarea className='comment-input' placeholder='请输入您的评价内容...' value={commentForm.content}
                onInput={(e) => setCommentForm(prev => ({ ...prev, content: e.detail.value }))} maxlength={500} autoHeight />
              <View className='image-upload-section'>
                <Button className='upload-image-btn' onClick={handleImageUpload} disabled={uploadingImages || commentForm.images.length >= 3}>
                  {uploadingImages ? '上传中...' : '+ 添加图片'}
                </Button>
                {commentForm.images.length > 0 && (
                  <View className='selected-images'>
                    {commentForm.images.map((img, index) => (
                      <View key={index} className='selected-image-item'>
                        <Image className='selected-image' src={img} mode='aspectFill' />
                        <Button className='remove-image-btn' onClick={() => removeImage(index)}>✕</Button>
                      </View>
                    ))}
                  </View>
                )}
                <Text className='image-tips'>最多可上传3张图片</Text>
              </View>
              <View className='modal-actions'>
                <Button className='cancel-btn' onClick={() => setShowCommentModal(false)} disabled={uploadingImages}>取消</Button>
                <Button className='submit-btn' onClick={submitComment} disabled={uploadingImages || !commentForm.content.trim()}>
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