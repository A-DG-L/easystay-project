// pages/order/index.tsx
import { View, Text, Button } from '@tarojs/components'
import { useLoad, useDidShow, showModal, showToast, navigateTo, switchTab } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 定义订单状态类型
type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled'

// 定义订单类型接口
interface Order {
  id: string
  _id?: string
  hotelId: string
  hotelName: string
  roomName: string
  roomPrice: number
  checkInDate: string
  checkOutDate: string
  nights: number
  roomCount: number
  totalPrice: number
  guestName: string
  guestPhone: string
  orderTime: string
  status: OrderStatus
  reviewed: boolean
  [key: string]: any
}

export default function Order() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  // 每次页面显示时都重新加载订单
  useDidShow(() => {
    console.log('订单页面显示，重新加载订单')
    loadOrders()
  })

  // 初始加载
  useLoad(() => {
    console.log('订单页面加载')
    loadOrders()
  })

  // 加载订单数据
  const loadOrders = async () => {
    try {
      setLoading(true)
      
      let orderList: any[] = []
      const token = Taro.getStorageSync('token')
      
      // 如果有token，优先从后端获取订单
      if (token) {
        try {
          const response = await Taro.request({
            url: 'http://localhost:3000/api/orders',
            method: 'GET',
            header: { 'Authorization': token }
          })
          
          if (response.data.code === 200) {
            if (Array.isArray(response.data.data)) {
              orderList = response.data.data
            } else if (response.data.data && response.data.data.list) {
              orderList = response.data.data.list
            }
            
            if (orderList.length > 0) {
              Taro.setStorageSync('orders', orderList)
            }
          }
        } catch (error) {
          console.warn('从后端获取订单失败，使用本地缓存')
        }
      }
      
      // 如果后端没有数据，使用本地存储
      if (!orderList || orderList.length === 0) {
        orderList = Taro.getStorageSync('orders') || []
      }
      
      // 处理订单数据
      const validOrders: Order[] = orderList.map((order: any) => {
        // 从嵌套对象中提取信息
        let hotelName = '未知酒店'
        let roomName = '未知房型'
        let roomPrice = 0
        
        if (order.hotelId && typeof order.hotelId === 'object') {
          hotelName = order.hotelId.name || '未知酒店'
        } else {
          hotelName = order.hotelName || order.hotel_name || '未知酒店'
        }
        
        if (order.roomId && typeof order.roomId === 'object') {
          roomName = order.roomId.name || '未知房型'
          roomPrice = order.roomId.price || 0
        } else {
          roomName = order.roomName || order.room_name || '未知房型'
          roomPrice = order.roomPrice || order.room_price || 0
        }
        
        return {
          id: order.id || order._id || '',
          _id: order._id || order.id,
          hotelId: order.hotelId?._id || order.hotelId || '',
          hotelName: hotelName,
          roomName: roomName,
          roomPrice: roomPrice,
          checkInDate: order.checkInDate || order.check_in_date || '',
          checkOutDate: order.checkOutDate || order.check_out_date || '',
          nights: order.nights || order.nightCount || 1,
          roomCount: order.roomCount || order.room_count || 1,
          totalPrice: order.totalPrice || order.total_price || 0,
          guestName: order.guestName || order.guest_name || '',
          guestPhone: order.guestPhone || order.guest_phone || '',
          orderTime: order.orderTime || order.createdAt || order.create_time || '',
          status: order.status || 'pending',
          reviewed: order.reviewed || false
        }
      })
      
      setOrders(validOrders)
    } catch (error) {
      console.error('加载订单失败:', error)
      showToast({ title: '加载订单失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 过滤订单
  const filterOrders = (): Order[] => {
    let filtered: Order[] = []
    switch (activeTab) {
      case 'pending':
        filtered = orders.filter(o => o.status === 'pending')
        break
      case 'paid':
        filtered = orders.filter(o => o.status === 'paid')
        break
      case 'completed':
        filtered = orders.filter(o => o.status === 'completed' && !o.reviewed)
        break
      case 'reviewed':
        filtered = orders.filter(o => o.reviewed === true)
        break
      case 'cancelled':
        filtered = orders.filter(o => o.status === 'cancelled')
        break
      default:
        filtered = orders
    }
    return filtered
  }

  // 支付订单
  const handlePay = async (order: Order) => {
    try {
      showToast({ title: '处理支付中...', icon: 'loading' })
      
      const token = Taro.getStorageSync('token')
      
      if (!token) {
        showToast({ title: '请先登录', icon: 'none' })
        return
      }
      
      const response = await Taro.request({
        url: `http://localhost:3000/api/orders/${order.id}/pay`,
        method: 'POST',
        header: { 'Authorization': token }
      })

      if (response.data.code === 200 || response.data.code === 201) {
        showToast({ title: '支付成功', icon: 'success' })
        await loadOrders()
      } else {
        throw new Error(response.data.msg || '支付失败')
      }
    } catch (error: any) {
      console.error('支付失败:', error)
      showToast({ title: error.message || '支付失败', icon: 'error' })
    }
  }

  // 取消订单
  const handleCancel = (order: Order) => {
    showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            showToast({ title: '取消中...', icon: 'loading' })
            
            const token = Taro.getStorageSync('token')
            
            if (!token) {
              showToast({ title: '请先登录', icon: 'none' })
              return
            }
            
            const response = await Taro.request({
              url: `http://localhost:3000/api/orders/${order.id}/cancel`,
              method: 'POST',
              header: { 'Authorization': token }
            })

            if (response.data.code === 200 || response.data.code === 201) {
              showToast({ title: '订单已取消', icon: 'success' })
              await loadOrders()
            } else {
              throw new Error(response.data.msg || '取消失败')
            }
          } catch (error: any) {
            console.error('取消失败:', error)
            showToast({ title: error.message || '取消失败', icon: 'error' })
          }
        }
      }
    })
  }

  // 确认使用（入住）
  const handleUse = (order: Order) => {
    showModal({
      title: '确认使用',
      content: '确认客人已办理入住？',
      confirmText: '确认入住',
      confirmColor: '#ff6600',
      success: (res) => {
        if (res.confirm) {
          // 更新本地订单状态
          const updatedOrders = orders.map(item => 
            item.id === order.id || item._id === order.id
              ? { ...item, status: 'completed' as OrderStatus, reviewed: false, usedTime: new Date().toLocaleString() }
              : item
          )
          setOrders(updatedOrders)
          Taro.setStorageSync('orders', updatedOrders)
          
          showModal({
            title: '入住成功',
            content: '订单已完成，是否现在评价？',
            confirmText: '去评价',
            cancelText: '稍后评价',
            confirmColor: '#ff6600',
            success: (modalRes) => {
              if (modalRes.confirm) {
                navigateTo({ url: `/pages/hotel-detail/index?id=${order.hotelId}&tab=comment` })
              } else {
                loadOrders()
              }
            }
          })
        }
      }
    })
  }

  // 去评价
  const handleReview = (order: Order) => {
    navigateTo({ url: `/pages/hotel-detail/index?id=${order.hotelId}&tab=comment` })
  }

  // 查看酒店详情
  const viewDetail = (hotel: any) => {
    let hotelId = ''
    if (typeof hotel === 'string') {
      hotelId = hotel
    } else if (hotel && typeof hotel === 'object') {
      hotelId = hotel._id || hotel.id || ''
    }
    
    if (!hotelId) {
      showToast({ title: '酒店ID无效', icon: 'none' })
      return
    }
    
    navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
  }

  // 重新预订
  const handleRebook = (order: Order) => {
    navigateTo({ 
      url: `/pages/booking/index?hotelId=${order.hotelId}&hotelName=${encodeURIComponent(order.hotelName)}&roomId=${order.roomId}&roomName=${encodeURIComponent(order.roomName)}&roomPrice=${order.roomPrice}`
    })
  }

  // 获取状态文本和样式
  const getStatusInfo = (order: Order) => {
    if (order.reviewed) return { text: '已评价', className: 'reviewed' }
    
    const map = {
      pending: { text: '待支付', className: 'pending' },
      paid: { text: '待使用', className: 'paid' },
      completed: { text: '待评价', className: 'completed' },
      cancelled: { text: '已取消', className: 'cancelled' }
    }
    return map[order.status] || { text: order.status || '未知', className: 'unknown' }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return dateStr.split('T')[0] || dateStr
  }

  const filteredOrders = filterOrders()

  return (
    <View className='order-container'>
      {/* 标签页 */}
      <View className='order-tabs'>
        {[
          { key: 'all', text: '全部' },
          { key: 'pending', text: '待支付' },
          { key: 'paid', text: '待使用' },
          { key: 'completed', text: '待评价' },
          { key: 'reviewed', text: '已评价' },
          { key: 'cancelled', text: '已取消' }
        ].map(tab => (
          <View
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text>{tab.text}</Text>
          </View>
        ))}
      </View>

      {/* 订单列表 */}
      <View className='order-list'>
        {loading ? (
          <View className='loading-state'><Text>加载中...</Text></View>
        ) : filteredOrders.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📦</Text>
            <Text className='empty-text'>暂无订单</Text>
            {activeTab !== 'all' && (
              <Button className='view-all-btn' onClick={() => setActiveTab('all')}>查看全部订单</Button>
            )}
          </View>
        ) : (
          filteredOrders.map(order => {
            const statusInfo = getStatusInfo(order)
            
            return (
              <View key={order.id} className='order-card'>
                {/* 酒店名称和状态 */}
                <View className='card-header' onClick={() => viewDetail(order.hotelId)}>
                  <View className='hotel-info'>
                    <Text className='hotel-name'>{order.hotelName}</Text>
                    <Text className='room-name'>{order.roomName}</Text>
                  </View>
                  <Text className={`status-badge ${statusInfo.className}`}>{statusInfo.text}</Text>
                </View>

                {/* 订单详情网格 */}
                <View className='detail-grid'>
                  <View className='detail-item'>
                    <Text className='label'>入住</Text>
                    <Text className='value'>{formatDate(order.checkInDate)}</Text>
                  </View>
                  <View className='detail-item'>
                    <Text className='label'>离店</Text>
                    <Text className='value'>{formatDate(order.checkOutDate)}</Text>
                  </View>
                  <View className='detail-item'>
                    <Text className='label'>天数</Text>
                    <Text className='value'>{order.nights}晚</Text>
                  </View>
                  <View className='detail-item'>
                    <Text className='label'>房间</Text>
                    <Text className='value'>{order.roomCount}间</Text>
                  </View>
                </View>

                {/* 入住人信息 */}
                <View className='guest-info'>
                  <Text className='guest-name'>{order.guestName}</Text>
                  <Text className='guest-phone'>{order.guestPhone}</Text>
                </View>

                {/* 订单时间和金额 */}
                <View className='order-footer'>
                  <Text className='order-time'>下单时间：{order.orderTime}</Text>
                  <View className='price-info'>
                    <Text className='price-label'>实付</Text>
                    <Text className='price-value'>¥{order.totalPrice}</Text>
                  </View>
                </View>

                {/* 操作按钮 */}
                <View className='action-buttons'>
                  {order.status === 'pending' && (
                    <>
                      <Button className='cancel-btn' onClick={() => handleCancel(order)}>取消</Button>
                      <Button className='pay-btn' onClick={() => handlePay(order)}>支付</Button>
                    </>
                  )}
                  {order.status === 'paid' && (
                    <Button className='use-btn' onClick={() => handleUse(order)}>确认入住</Button>
                  )}
                  {order.status === 'completed' && !order.reviewed && (
                    <Button className='review-btn' onClick={() => handleReview(order)}>去评价</Button>
                  )}
                  {order.reviewed && (
                    <Button className='reviewed-btn' disabled>已评价</Button>
                  )}
                  {order.status === 'cancelled' && (
                    <Button className='rebook-btn' onClick={() => handleRebook(order)}>重新预订</Button>
                  )}
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}