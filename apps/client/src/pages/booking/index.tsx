// pages/booking/index.tsx
import { View, Text, Input, Button, Picker } from '@tarojs/components'
import { useRouter, showModal, showToast, navigateTo, switchTab, navigateBack,useDidShow } from '@tarojs/taro' 
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Booking() {
  const router = useRouter()
  const params = router.params || {}

  const initialCheckInDate = params.checkInDate ? decodeURIComponent(String(params.checkInDate)) : ''
  const initialCheckOutDate = params.checkOutDate ? decodeURIComponent(String(params.checkOutDate)) : ''
  const initialRoomCount = params.roomCount ? Math.max(1, Number(params.roomCount) || 1) : 1
  
  // 从路由参数获取房间信息
  const [hotelInfo] = useState({ 
    id: (params.hotelId || '').toString().trim().replace(/↵/g, '').replace(/\s+/g, ''),
    name: decodeURIComponent(params.hotelName || '').trim().replace(/↵/g, '').replace(/\s+/g, ' '),
    image: decodeURIComponent(params.hotelImage || '').trim().replace(/↵/g, '')
  })
  
  const [roomInfo] = useState({ 
    id: (params.roomId || '').toString().trim().replace(/↵/g, '').replace(/\s+/g, ''),
    name: decodeURIComponent(params.roomName || '').trim().replace(/↵/g, '').replace(/\s+/g, ' '),
    price: Number(params.roomPrice) || 0
  })
  
  // 预订信息
  const [bookingInfo, setBookingInfo] = useState({
    checkInDate: initialCheckInDate,
    checkOutDate: initialCheckOutDate,
    roomCount: initialRoomCount,
    totalPrice: 0,
    guestName: '',
    guestPhone: ''
  })
  
  // 日期选择器
  const [dateRange, setDateRange] = useState<[string, string]>([initialCheckInDate || '', initialCheckOutDate || ''])
  
  // 房间数量选项
  const roomCounts = [1, 2, 3, 4, 5]
  const roomCountRange = roomCounts.map(String)
  
  // 计算总价
  useEffect(() => {
    const nights = calculateNights()
    const total = roomInfo.price * bookingInfo.roomCount * nights
    setBookingInfo(prev => ({ ...prev, totalPrice: total }))
  }, [bookingInfo.roomCount, bookingInfo.checkInDate, bookingInfo.checkOutDate, roomInfo.price])
  
  // 计算入住天数
  const calculateNights = () => {
    if (!bookingInfo.checkInDate || !bookingInfo.checkOutDate) return 1
    const start = new Date(bookingInfo.checkInDate)
    const end = new Date(bookingInfo.checkOutDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays || 1
  }
  
  // 选择入住日期
  const onCheckInDateChange = (e) => {
    const date = e.detail.value
    setBookingInfo(prev => ({ ...prev, checkInDate: date }))
    setDateRange([date, dateRange[1]])
  }
  
  // 选择离店日期
  const onCheckOutDateChange = (e) => {
    const date = e.detail.value
    setBookingInfo(prev => ({ ...prev, checkOutDate: date }))
    setDateRange([dateRange[0], date])
  }
  
  // 选择房间数量
  const onRoomCountChange = (e) => {
    const count = roomCounts[e.detail.value]
    setBookingInfo(prev => ({ ...prev, roomCount: count }))
  }
  
  // 输入入住人姓名
  const onGuestNameInput = (e) => {
    setBookingInfo(prev => ({ ...prev, guestName: e.detail.value }))
  }
  
  // 输入联系电话
  const onGuestPhoneInput = (e) => {
    setBookingInfo(prev => ({ ...prev, guestPhone: e.detail.value }))
  }
  
  // 生成订单ID
  const generateOrderId = () => {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000)
  }
  
  // 检查房型库存
  const checkRoomAvailability = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) return true
      
      const response = await Taro.request({
        url: `http://localhost:3000/api/rooms/${roomInfo.id}/availability`,
        method: 'GET',
        header: {
          'Authorization': token
        },
        data: {
          checkInDate: bookingInfo.checkInDate,
          checkOutDate: bookingInfo.checkOutDate,
          roomCount: bookingInfo.roomCount
        }
      })
      
      if (response.data.code === 200) {
        const availability = response.data.data
        if (availability.available) {
          return true
        } else {
          showModal({
            title: '库存不足',
            content: availability.message || '所选日期房间已满，请调整日期或减少房间数量',
            confirmText: '知道了'
          })
          return false
        }
      }
      return true
    } catch (error) {
      console.error('检查库存失败:', error)
      return true
    }
  }
  
  // 提交订单
  const handleSubmit = async () => {
    // 表单验证
    if (!bookingInfo.checkInDate || !bookingInfo.checkOutDate) {
      showToast({ title: '请选择入住日期', icon: 'none' })
      return
    }
    if (!bookingInfo.guestName.trim()) {
      showToast({ title: '请输入入住人姓名', icon: 'none' })
      return
    }
    if (!bookingInfo.guestPhone.trim()) {
      showToast({ title: '请输入联系电话', icon: 'none' })
      return
    }

    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        showModal({
          title: '提示',
          content: '请先登录',
          success: () => navigateTo({ url: '/pages/login/index' })
        })
        return
      }
      const isAvailable = await checkRoomAvailability()
      if (!isAvailable) return

      showToast({ title: '创建订单中...', icon: 'loading', duration: 10000 })
      
      // 计算入住天数
      const nights = calculateNights()
      
      // 调用后端创建订单接口
      const response = await Taro.request({
        url: 'http://localhost:3000/api/orders',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        data: {
          hotelId: hotelInfo.id,
          roomId: roomInfo.id,
          checkInDate: bookingInfo.checkInDate,
          checkOutDate: bookingInfo.checkOutDate,
          totalPrice: bookingInfo.totalPrice,
          guestName: bookingInfo.guestName.trim(),
          guestPhone: bookingInfo.guestPhone.trim(),
          roomCount: bookingInfo.roomCount,
          nights: nights
        }
      })

      console.log('创建订单响应:', response.data)

      // 处理成功响应
      if (response.data.code === 200 || response.data.code === 201) {
        const orderData = response.data.data || response.data
        console.log('订单数据:', orderData)
        
        // 确保订单ID统一
        const orderId = orderData._id || orderData.id || generateOrderId()
        
        // 保存到本地存储
        const existingOrders = Taro.getStorageSync('orders') || []
        
        // 构建订单数据
        const cleanOrder = {
          id: orderId,
          _id: orderId,
          hotelId: hotelInfo.id,
          hotelName: hotelInfo.name,
          hotelImage: hotelInfo.image,
          roomId: roomInfo.id,
          roomName: roomInfo.name,
          roomPrice: roomInfo.price,
          checkInDate: bookingInfo.checkInDate,
          checkOutDate: bookingInfo.checkOutDate,
          nights: nights,
          roomCount: bookingInfo.roomCount,
          totalPrice: bookingInfo.totalPrice,
          guestName: bookingInfo.guestName.trim(),
          guestPhone: bookingInfo.guestPhone.trim(),
          orderTime: new Date().toLocaleString(),
          status: 'pending',
          canReview: false,
          reviewed: false,
          usedTime: ''
        }
        
        console.log('保存订单:', cleanOrder)
        
        existingOrders.unshift(cleanOrder)
        Taro.setStorageSync('orders', existingOrders)
        
        // 验证保存是否成功
        const savedOrders = Taro.getStorageSync('orders') || []
        console.log('保存后的订单列表:', savedOrders)

        // 提示成功
        showModal({
          title: '订单创建成功',
          content: `订单已创建，共计 ${bookingInfo.totalPrice}，请前往订单列表支付`,
          confirmText: '去支付',
          cancelText: '返回首页',
          success: (res) => {
            if (res.confirm) {
              Taro.switchTab({ url: '/pages/order/index' })
            } else {
              Taro.switchTab({ url: '/pages/index/index' })
            }
          }
        })
      } 
      // 处理业务错误
      else if (response.data.code === 400) {
        Taro.hideToast()
        
        let errorMessage = response.data.msg || '订单创建失败'
        let confirmText = '知道了'
        let cancelText = '选其他房型'
        
        if (errorMessage.includes('售罄')) {
          errorMessage = `很抱歉，您选择的房型已售罄。\n\n建议您选择其他日期或其他房型。`
          confirmText = '选其他房型'
          cancelText = '返回首页'
        }
        
        showModal({
          title: '预订失败',
          content: errorMessage,
          confirmText: confirmText,
          cancelText: cancelText,
          success: (res) => {
            if (res.confirm) {
              navigateBack()
            } else {
              Taro.switchTab({ url: '/pages/index/index' })
            }
          }
        })
      }
      // 处理其他错误
      else {
        Taro.hideToast()
        showModal({
          title: '预订失败',
          content: response.data.msg || '订单创建失败，请稍后重试',
          confirmText: '知道了',
          success: () => {
            navigateBack()
          }
        })
      }
      
    } catch (error: any) {
      console.error('提交订单失败:', error)
      
      Taro.hideToast()
      
      let errorMessage = '网络连接失败，请检查网络后重试'
      if (error.errMsg) {
        if (error.errMsg.includes('timeout')) {
          errorMessage = '连接超时，请稍后重试'
        } else if (error.errMsg.includes('fail')) {
          errorMessage = '网络异常，请检查网络连接'
        }
      }
      
      showModal({
        title: '预订失败',
        content: errorMessage,
        confirmText: '知道了'
      })
    }
  }
  
  // 获取当前日期
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return (
    <View className='booking-container'>
      {/* 酒店信息 */}
      <View className='hotel-section'>
        <Text className='section-title'>酒店信息</Text>
        <View className='hotel-info'>
          <Text className='hotel-name'>{hotelInfo.name}</Text>
        </View>
      </View>
      
      {/* 房型信息 */}
      <View className='room-section'>
        <Text className='section-title'>房型信息</Text>
        <View className='room-info'>
          <Text className='room-name'>{roomInfo.name}</Text>
          <Text className='room-price'>{roomInfo.price}/晚</Text>
        </View>
      </View>
      
      {/* 日期选择 */}
      <View className='date-section'>
        <Text className='section-title'>入住日期</Text>
        <View className='date-picker'>
          <Picker 
            mode='date' 
            onChange={onCheckInDateChange}
            value={bookingInfo.checkInDate || getTodayDate()}
            start={getTodayDate()}
          >
            <View className='picker-item'>
              <Text className='picker-label'>入住</Text>
              <Text className='picker-value'>{bookingInfo.checkInDate || '请选择'}</Text>
            </View>
          </Picker>
          <Picker 
            mode='date' 
            onChange={onCheckOutDateChange}
            value={bookingInfo.checkOutDate || getTodayDate()}
            start={bookingInfo.checkInDate || getTodayDate()}
          >
            <View className='picker-item'>
              <Text className='picker-label'>离店</Text>
              <Text className='picker-value'>{bookingInfo.checkOutDate || '请选择'}</Text>
            </View>
          </Picker>
        </View>
        {bookingInfo.checkInDate && bookingInfo.checkOutDate && (
          <Text className='nights-hint'>共 {calculateNights()} 晚</Text>
        )}
      </View>
      
      {/* 房间数量 */}
      <View className='room-count-section'>
        <Text className='section-title'>房间数量</Text>
        <Picker 
          mode='selector' 
          range={roomCountRange} 
          onChange={onRoomCountChange}
          value={bookingInfo.roomCount - 1}
        >
          <View className='count-picker'>
            <Text className='count-label'>{bookingInfo.roomCount} 间</Text>
            <Text className='picker-arrow'>〉</Text>
          </View>
        </Picker>
      </View>
      
      {/* 入住人信息 */}
      <View className='guest-section'>
        <Text className='section-title'>入住人信息</Text>
        <View className='guest-form'>
          <Input
            className='guest-input'
            placeholder='入住人姓名'
            value={bookingInfo.guestName}
            onInput={onGuestNameInput}
            maxlength={20}
          />
          <Input
            className='guest-input'
            placeholder='联系电话'
            type='number'
            value={bookingInfo.guestPhone}
            onInput={onGuestPhoneInput}
            maxlength={11}
          />
        </View>
      </View>
      
      {/* 价格总计 */}
      <View className='total-section'>
        <View className='total-row'>
          <Text className='total-label'>房费总额</Text>
          <Text className='total-price'>{bookingInfo.totalPrice}</Text>
        </View>
      </View>
      
      {/* 提交按钮 */}
      <View className='action-buttons'>
        <Button 
          className='submit-btn'
          onClick={handleSubmit}
        >
          提交订单
        </Button>
      </View>
    </View>
  )
}