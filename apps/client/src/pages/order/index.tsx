// pages/order/index.tsx
import { View, Text, Image, Button } from '@tarojs/components'
import { useLoad, useDidShow, showModal, showToast, navigateTo } from '@tarojs/taro'
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
  hotelImage?: string
  roomId: string
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
  canReview?: boolean
  usedTime?: string
  payTime?: string
  cancelTime?: string
  reviewTime?: string
  reviewId?: string
  [key: string]: any // 允许其他字段
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
  const loadOrders = () => {
    try {
      setLoading(true)
      const orderList = Taro.getStorageSync('orders') || []
      console.log('从存储加载的订单列表:', orderList)
      
      // 确保每个订单都有必要的字段，并统一ID格式
      const validOrders: Order[] = orderList.map((order: any) => ({
        ...order,
        id: order.id || order._id,
        _id: order._id || order.id,
        status: order.status || 'pending',
        reviewed: order.reviewed || false,
        nights: order.nights || 1,
        roomCount: order.roomCount || 1
      }))
      
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
    console.log('当前标签:', activeTab)
    console.log('所有订单:', orders)
    
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
    
    console.log(`标签 ${activeTab} 过滤后:`, filtered)
    return filtered
  }

  // 支付订单
  const handlePay = async (order: Order) => {
    try {
      showToast({ title: '处理支付中...', icon: 'loading' })
      
      const token = Taro.getStorageSync('token')
      
      // 调用支付接口
      if (token) {
        const response = await Taro.request({
          url: `http://localhost:3000/api/orders/${order.id}/pay`,
          method: 'POST',
          header: {
            'Authorization': token
          }
        })

        if (response.data.code !== 200 && response.data.code !== 201) {
          throw new Error(response.data.msg || '支付失败')
        }
      }
      
      // 更新本地订单状态 - 明确指定类型
      const updatedOrders: Order[] = orders.map(item => {
        if (item.id === order.id || item._id === order.id) {
          return { 
            ...item, 
            status: 'paid' as OrderStatus,
            payTime: new Date().toLocaleString()
          }
        }
        return item
      })
      
      setOrders(updatedOrders)
      Taro.setStorageSync('orders', updatedOrders)
      
      showToast({ title: '支付成功', icon: 'success' })
      
      // 刷新列表
      loadOrders()
      
    } catch (error) {
      console.error('支付失败:', error)
      showToast({ title: '支付失败', icon: 'error' })
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
            
            // 调用取消订单接口
            if (token) {
              const response = await Taro.request({
                url: `http://localhost:3000/api/orders/${order.id}/cancel`,
                method: 'POST',
                header: {
                  'Authorization': token
                }
              })

              if (response.data.code !== 200 && response.data.code !== 201) {
                throw new Error(response.data.msg || '取消失败')
              }
            }
            
            // 更新本地订单状态 - 明确指定类型
            const updatedOrders: Order[] = orders.map(item => {
              if (item.id === order.id || item._id === order.id) {
                return { 
                  ...item, 
                  status: 'cancelled' as OrderStatus,
                  cancelTime: new Date().toLocaleString()
                }
              }
              return item
            })
            
            setOrders(updatedOrders)
            Taro.setStorageSync('orders', updatedOrders)
            
            showToast({ title: '订单已取消', icon: 'success' })
            
            // 刷新列表
            loadOrders()
            
          } catch (error) {
            console.error('取消失败:', error)
            showToast({ title: '取消失败', icon: 'error' })
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
          // 更新本地订单状态 - 明确指定类型
          const updatedOrders: Order[] = orders.map(item => 
            item.id === order.id || item._id === order.id
              ? { 
                  ...item, 
                  status: 'completed' as OrderStatus,
                  canReview: true, 
                  reviewed: false, 
                  usedTime: new Date().toLocaleString() 
                }
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

  // 重新预订
  const handleRebook = (order: Order) => {
    navigateTo({ 
      url: `/pages/booking/index?hotelId=${order.hotelId}&hotelName=${encodeURIComponent(order.hotelName)}&hotelImage=${encodeURIComponent(order.hotelImage || '')}&roomId=${order.roomId}&roomName=${encodeURIComponent(order.roomName)}&roomPrice=${order.roomPrice}`
    })
  }

  // 查看酒店详情
  const viewDetail = (hotelId: string) => {
    navigateTo({ url: `/pages/hotel-detail/index?hotelId=${hotelId}` })
  }

  // 获取状态文本和样式
  const getStatusInfo = (order: Order) => {
    if (order.reviewed) {
      return { text: '已评价', className: 'reviewed' }
    }
    
    switch (order.status) {
      case 'pending':
        return { text: '待支付', className: 'pending' }
      case 'paid':
        return { text: '待使用', className: 'paid' }
      case 'completed':
        return { text: '待评价', className: 'completed' }
      case 'cancelled':
        return { text: '已取消', className: 'cancelled' }
      default:
        return { text: order.status || '未知', className: 'unknown' }
    }
  }

  // 获取操作按钮
  const renderActions = (order: Order) => {
    // 待支付订单 - 显示支付和取消按钮
    if (order.status === 'pending') {
      return (
        <View className='action-buttons'>
          <Button 
            className='cancel-btn' 
            onClick={(e) => {
              e.stopPropagation()
              handleCancel(order)
            }}
          >
            取消订单
          </Button>
          <Button 
            className='pay-btn' 
            onClick={(e) => {
              e.stopPropagation()
              handlePay(order)
            }}
          >
            立即支付
          </Button>
        </View>
      )
    }
    
    // 已支付/待使用订单 - 显示确认使用按钮
    if (order.status === 'paid') {
      return (
        <View className='action-buttons'>
          <Button 
            className='use-btn' 
            onClick={(e) => {
              e.stopPropagation()
              handleUse(order)
            }}
          >
            确认使用
          </Button>
        </View>
      )
    }
    
    // 已完成/待评价订单 - 显示评价按钮
    if (order.status === 'completed' && !order.reviewed) {
      return (
        <View className='action-buttons'>
          <Button 
            className='review-btn' 
            onClick={(e) => {
              e.stopPropagation()
              handleReview(order)
            }}
          >
            我要评价
          </Button>
        </View>
      )
    }
    
    // 已评价订单 - 显示已评价
    if (order.reviewed) {
      return (
        <View className='action-buttons'>
          <Button className='reviewed-btn' disabled>
            已评价
          </Button>
        </View>
      )
    }
    
    // 已取消订单 - 显示重新预订
    if (order.status === 'cancelled') {
      return (
        <View className='action-buttons'>
          <Button 
            className='rebook-btn'
            onClick={(e) => {
              e.stopPropagation()
              handleRebook(order)
            }}
          >
            重新预订
          </Button>
        </View>
      )
    }
    
    return null
  }

  const filteredOrders = filterOrders()

  return (
    <View className='order-container'>
      {/* 标签页 */}
      <View className='order-tabs'>
        <View 
          className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Text>全部</Text>
        </View>
        <View 
          className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Text>待支付</Text>
        </View>
        <View 
          className={`tab-item ${activeTab === 'paid' ? 'active' : ''}`}
          onClick={() => setActiveTab('paid')}
        >
          <Text>待使用</Text>
        </View>
        <View 
          className={`tab-item ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <Text>待评价</Text>
        </View>
        <View 
          className={`tab-item ${activeTab === 'reviewed' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviewed')}
        >
          <Text>已评价</Text>
        </View>
        <View 
          className={`tab-item ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          <Text>已取消</Text>
        </View>
      </View>

      {/* 订单列表 */}
      <View className='order-list'>
        {loading ? (
          <View className='loading-state'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📦</Text>
            <Text className='empty-text'>暂无订单</Text>
            {activeTab !== 'all' && (
              <Button 
                className='view-all-btn'
                onClick={() => setActiveTab('all')}
              >
                查看全部订单
              </Button>
            )}
          </View>
        ) : (
          filteredOrders.map(order => {
            const statusInfo = getStatusInfo(order)
            
            return (
              <View key={order.id || order._id} className='order-card'>
                {/* 酒店信息 */}
                <View className='hotel-header' onClick={() => viewDetail(order.hotelId)}>
                  <Image 
                    className='hotel-image' 
                    src={order.hotelImage || 'https://placehold.co/120x120/f5f5f5/999?text=Hotel'} 
                    mode='aspectFill' 
                  />
                  <View className='hotel-info'>
                    <Text className='hotel-name'>{order.hotelName}</Text>
                    <Text className='room-name'>{order.roomName}</Text>
                    <Text className='order-time'>{order.orderTime}</Text>
                  </View>
                  <View className='order-status'>
                    <Text className={`status-badge ${statusInfo.className}`}>
                      {statusInfo.text}
                    </Text>
                  </View>
                </View>

                {/* 订单详情 */}
                <View className='order-detail'>
                  <View className='detail-row'>
                    <Text className='label'>入住日期</Text>
                    <Text className='value'>{order.checkInDate}</Text>
                  </View>
                  <View className='detail-row'>
                    <Text className='label'>离店日期</Text>
                    <Text className='value'>{order.checkOutDate}</Text>
                  </View>
                  <View className='detail-row'>
                    <Text className='label'>共{order.nights || 1}晚</Text>
                    <Text className='value'>{order.roomCount || 1}间</Text>
                  </View>
                  <View className='detail-row'>
                    <Text className='label'>入住人</Text>
                    <Text className='value'>{order.guestName} {order.guestPhone}</Text>
                  </View>
                  <View className='detail-row total'>
                    <Text className='label'>实付款</Text>
                    <Text className='price'>¥{order.totalPrice}</Text>
                  </View>
                </View>

                {/* 操作按钮 */}
                {renderActions(order)}
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}