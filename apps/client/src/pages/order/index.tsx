import { View, Text, Button } from '@tarojs/components'
import { useLoad, useDidShow, showModal, showToast, navigateTo } from '@tarojs/taro'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

import bgImg from '../../assets/images/index_bg_cny.jpg'

// 定义订单状态类型（保持与后端一致）
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
  reviewed: boolean  // 标记是否已评价
  [key: string]: any
}

export default function Order() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<any[]>([]) // 本地评论缓存

  // 每次页面显示时重新加载订单
  useDidShow(() => {
    console.log('订单页面显示，重新加载')
    loadOrders()
  })

  useLoad(() => {
    loadOrders()
  })

  // 加载本地评论
  const loadLocalComments = () => {
    const localComments = Taro.getStorageSync('comments') || []
    setComments(localComments)
    return localComments
  }

  // 加载订单
  const loadOrders = async () => {
    try {
      setLoading(true)
      const latestComments = loadLocalComments()
      
      let orderList: any[] = []
      const token = Taro.getStorageSync('token')
      
      if (token) {
        try {
          const res = await Taro.request({
            url: 'http://localhost:3000/api/orders',
            method: 'GET',
            header: { 'Authorization': token }
          })
          if (res.data.code === 200) {
            orderList = Array.isArray(res.data.data) ? res.data.data : res.data.data.list || []
            if (orderList.length) Taro.setStorageSync('orders', orderList)
          }
        } catch {
          console.warn('后端获取失败，使用本地缓存')
        }
      }

      if (!orderList.length) orderList = Taro.getStorageSync('orders') || []

      // 处理订单数据
      const validOrders: Order[] = orderList.map((order: any) => {
        let hotelName = '未知酒店'
        let roomName = '未知房型'
        let roomPrice = 0
        
        // 处理酒店信息
        if (order.hotelId && typeof order.hotelId === 'object') {
          hotelName = order.hotelId.name || '未知酒店'
        } else {
          hotelName = order.hotelName || order.hotel_name || '未知酒店'
        }

        // 处理房型信息
        if (order.roomId && typeof order.roomId === 'object') {
          roomName = order.roomId.name || '未知房型'
          roomPrice = order.roomId.price || 0
        } else {
          roomName = order.roomName || order.room_name || '未知房型'
          roomPrice = order.roomPrice || order.room_price || 0
        }

        // 处理日期格式（处理MongoDB的特殊日期格式）
        const formatDateStr = (dateStr: any) => {
          if (!dateStr) return ''
          if (typeof dateStr === 'object' && dateStr.$date) {
            return new Date(dateStr.$date).toISOString().split('T')[0]
          }
          return dateStr
        }

        return {
          id: order.id || order._id || '',
          _id: order._id || order.id,
          hotelId: order.hotelId?._id || order.hotelId || '',
          hotelName,
          roomName,
          roomPrice,
          checkInDate: formatDateStr(order.checkInDate || order.check_in_date),
          checkOutDate: formatDateStr(order.checkOutDate || order.check_out_date),
          nights: order.nights || order.nightCount || 1,
          roomCount: order.roomCount || order.room_count || 1,
          totalPrice: order.totalPrice || order.total_price || 0,
          guestName: order.guestName || order.guest_name || '',
          guestPhone: order.guestPhone || order.guest_phone || '',
          orderTime: order.orderTime || order.createdAt || order.create_time || '',
          status: order.status as OrderStatus,
          reviewed: false // 初始设为 false，后面会根据评论缓存更新
        }
      })

      // 根据最新的评论缓存更新 reviewed 状态
      const updatedOrders = validOrders.map(order => ({
        ...order,
        reviewed: latestComments.some(c => c.orderId === order.id)
      }))

      console.log('处理后的订单数据:', updatedOrders)
      setOrders(updatedOrders)
    } catch (error) {
      console.error('加载订单失败:', error)
      showToast({ title: '加载订单失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 过滤订单（根据选中的标签页）
  const filterOrders = (): Order[] => {
    switch (activeTab) {
      case 'pending': 
        return orders.filter(o => o.status === 'pending')
      case 'paid': 
        // 待使用：只显示状态为 paid 且未评价的订单
        return orders.filter(o => o.status === 'paid' && !o.reviewed)
      case 'pending-review': 
        // 待评价：后端状态是 completed 且未评价
        return orders.filter(o => o.status === 'completed' && !o.reviewed)
      case 'completed': 
        // 已完成：已评价的订单（无论后端状态）
        return orders.filter(o => o.reviewed)
      case 'cancelled': 
        return orders.filter(o => o.status === 'cancelled')
      default: 
        return orders
    }
  }

  // 获取状态显示信息
  const getStatusInfo = (order: Order) => {
    // 已评价的状态显示"已完成"
    if (order.reviewed) {
      return { text: '已完成', className: 'completed' }
    }
    
    // 普通状态映射
    const map = {
      pending: { text: '待支付', className: 'pending' },
      paid: { text: '待使用', className: 'paid' },
      completed: { text: '待评价', className: 'pending-review' }, // 后端的 completed 在前端显示为"待评价"
      cancelled: { text: '已取消', className: 'cancelled' }
    }
    
    return map[order.status] || { text: '未知', className: 'unknown' }
  }

  // 处理支付
  const handlePay = (order: Order) => {
    showModal({
      title: '确认支付',
      content: `确认支付 ¥${order.totalPrice}？`,
      confirmText: '去支付',
      confirmColor: '#F9BE3E',
      success: async (res) => {
        if (res.confirm) {
          const token = Taro.getStorageSync('token')

          if (!token) {
            showModal({
              title: '提示',
              content: '请先登录后再支付',
              success: () => {
                navigateTo({ url: '/pages/login/index' })
              }
            })
            return
          }

          try {
            showToast({ title: '支付中...', icon: 'loading', duration: 10000 })

            const payRes = await Taro.request({
              url: `http://localhost:3000/api/orders/${order.id}/pay`,
              method: 'POST',
              header: {
                Authorization: token
              }
            })

            Taro.hideToast()

            if (payRes.data && payRes.data.code === 200) {
              const updatedOrders = orders.map(o =>
                o.id === order.id
                  ? { ...o, status: 'paid' as OrderStatus }
                  : o
              )
              setOrders(updatedOrders)
              Taro.setStorageSync('orders', updatedOrders)
              showToast({ title: '支付成功', icon: 'success' })
            } else {
              showToast({
                title: payRes.data?.msg || '支付失败，请稍后重试',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('支付失败:', error)
            Taro.hideToast()
            showToast({ title: '网络错误，支付失败', icon: 'none' })
          }
        }
      }
    })
  }

  // 处理评价
  const handleReview = (order: Order) => {
    navigateTo({ 
      url: `/pages/hotel-detail/index?id=${order.hotelId}&tab=comment&orderId=${order.id}` 
    })
  }

  // 处理入住确认
  const handleUse = (order: Order) => {
    showModal({
      title: '确认入住',
      content: '确认已办理入住？',
      confirmText: '确认入住',
      confirmColor: '#F9BE3E',
      success: async (res) => {
        if (res.confirm) {
          const token = Taro.getStorageSync('token')

          try {
            showToast({ title: '处理中...', icon: 'loading' })

            // 调用后端 API 更新订单状态为 completed
            if (token) {
              await Taro.request({
                url: `http://localhost:3000/api/orders/${order.id}/checkin`,
                method: 'POST',
                header: { Authorization: token }
              })
            }

            Taro.hideToast()

            // 更新本地状态
            const updatedOrders = orders.map(o => 
              o.id === order.id ? { ...o, status: 'completed' as OrderStatus } : o
            )
            setOrders(updatedOrders)
            Taro.setStorageSync('orders', updatedOrders)
            
            // 提示是否评价
            showModal({
              title: '入住成功',
              content: '是否立即评价？',
              confirmText: '去评价',
              cancelText: '稍后评价',
              confirmColor: '#F9BE3E',
              success: modalRes => {
                if (modalRes.confirm) handleReview(order)
              }
            })
          } catch (error) {
            console.error('入住确认失败:', error)
            Taro.hideToast()
            showToast({ title: '操作失败，请重试', icon: 'none' })
          }
        }
      }
    })
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  const filteredOrders = filterOrders()

  return (
    <View className='order-container' style={{ backgroundImage: `url(${bgImg})` }}>
      {/* 标签页 */}
      <View className='order-tabs'>
        {[
          { key: 'all', text: '全部' },
          { key: 'pending', text: '待支付' },
          { key: 'paid', text: '待使用' },
          { key: 'pending-review', text: '待评价' },
          { key: 'completed', text: '已完成' },
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
          <View className='loading-state'>
            <Text>加载中...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📦</Text>
            <Text className='empty-text'>暂无订单</Text>
          </View>
        ) : (
          filteredOrders.map(order => {
            const statusInfo = getStatusInfo(order)
            return (
              <View key={order.id} className='order-card'>
                {/* 酒店信息 */}
                <View className='hotel-info'>
                  <View className='hotel-name-row'>
                    <Text className='hotel-name'>{order.hotelName}</Text>
                    <Text className={`status-badge ${statusInfo.className}`}>{statusInfo.text}</Text>
                  </View>
                  <Text className='room-name'>{order.roomName}</Text>
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

                {/* 操作按钮 - 根据状态显示 */}
                <View className='action-buttons'>
                  {/* 已评价的订单不显示任何操作按钮，只显示"已完成" */}
                  {!order.reviewed ? (
                    <>
                      {/* 待支付 - 显示去支付按钮 */}
                      {order.status === 'pending' && (
                        <Button 
                          className='pay-btn' 
                          onClick={() => handlePay(order)}
                        >
                          去支付
                        </Button>
                      )}

                      {/* 待使用 - 显示确认入住按钮 */}
                      {order.status === 'paid' && (
                        <Button 
                          className='use-btn' 
                          onClick={() => handleUse(order)}
                        >
                          确认入住
                        </Button>
                      )}

                      {/* 待评价 - 显示去评价按钮（后端状态为 completed 且未评价） */}
                      {order.status === 'completed' && !order.reviewed && (
                        <Button 
                          className='review-btn' 
                          onClick={() => handleReview(order)}
                        >
                          去评价
                        </Button>
                      )}
                    </>
                  ) : (
                    /* 已评价 - 显示已完成按钮（禁用） */
                    <Button 
                      className='reviewed-btn' 
                      disabled
                    >
                      已完成
                    </Button>
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