import { View, Text, Swiper, SwiperItem, Image, Picker, Button, Input } from '@tarojs/components'
import { useLoad, getStorageSync, reLaunch, showToast, navigateTo } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import request from '../../utils/request'
import Calendar from '../../components/calendar'
import './index.scss'

import bgImg from '../../assets/images/index_bg_cny.jpg'

export default function Index() {
  const [hotelList, setHotelList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showStarOptions, setShowStarOptions] = useState(false)

  // 检查登录状态
  useLoad(() => {
    const token = getStorageSync('token')
    if (!token) {
      showToast({ title: '请先登录', icon: 'none', duration: 1500 })
      setTimeout(() => {
        reLaunch({ url: '/pages/login/index' })
      }, 1600)
    }
  })

  // 获取酒店数据
  useEffect(() => {
    fetchHotels()
  }, [])

  const fetchHotels = async () => {
    try {
      setLoading(true)
      console.log('正在获取酒店数据...')

      const res = await request({
        url: '/hotels',
        method: 'GET'
      })

      console.log('接口响应:', res)

      if (res.code === 200 && res.data && res.data.list) {
        const hotelArray = res.data.list

        // 过滤出已发布且有图片的酒店
        const publishedHotels = hotelArray
          .filter(item => {
            const hasImages = item.images &&
              Array.isArray(item.images) &&
              item.images.length > 0
            return item.status === 'published' && hasImages
          })
          .slice(0, 3) // 只取前3个

        console.log('获取到的酒店:', publishedHotels)

        if (publishedHotels.length > 0) {
          setHotelList(publishedHotels)
        } else {
          // 如果没有符合条件的酒店，至少显示一个
          const firstHotel = hotelArray.length > 0 ? hotelArray[0] : null
          if (firstHotel) {
            setHotelList([firstHotel])
          } else {
            setHotelList(getSimpleBanners())
          }
        }
      } else {
        console.log('数据格式不正确，使用备用数据')
        setHotelList(getSimpleBanners())
      }
    } catch (error: any) {
      console.error('获取酒店列表失败:', error)
      setHotelList(getSimpleBanners())
    } finally {
      setLoading(false)
    }
  }

  // 简单的备用数据
  const getSimpleBanners = () => {
    return [
      {
        _id: '1',
        name: '易宿酒店',
        images: [],
        starLevel: 5,
        address: '欢迎体验',
        color: '#8A9A9B',
        minPrice: 399
      },
      {
        _id: '2',
        name: '豪华精选',
        images: [],
        starLevel: 5,
        address: '尊贵服务',
        color: '#A8C6C5',
        minPrice: 699
      },
      {
        _id: '3',
        name: '商务之选',
        images: [],
        starLevel: 4,
        address: '出行便捷',
        color: '#D4B996',
        minPrice: 299
      }
    ]
  }

  // 确保显示3张轮播图
  const getDisplayBanners = () => {
    if (hotelList.length >= 3) {
      return hotelList.slice(0, 3)
    }

    if (hotelList.length > 0) {
      const simpleBanners = getSimpleBanners()
      const needed = 3 - hotelList.length
      return [
        ...hotelList,
        ...simpleBanners.slice(0, needed)
      ]
    }

    return getSimpleBanners()
  }

  // 点击轮播图跳转到酒店详情页
  const handleBannerClick = (hotel: any) => {
    if (hotel._id && hotel._id !== '1' && hotel._id !== '2' && hotel._id !== '3') {
      // 真实数据，跳转到详情页
      navigateTo({
        url: `/pages/hotel-detail/index?id=${hotel._id}`
      })
    } else {
      // 模拟数据，提示用户
      showToast({
        title: '此酒店为示例，请查看真实酒店',
        icon: 'none',
        duration: 2000
      })
    }
  }

  // 日历组件状态
  const [calendarVisible, setCalendarVisible] = useState(false)

  // 查询条件状态
  const [searchForm, setSearchForm] = useState({
    city: '上海',
    checkInDate: getDateStr(0),
    checkOutDate: getDateStr(1),
    keyword: '',
    guestCount: 2,
    roomCount: 1,
    starLevel: 0, // 0表示不限星级
  })

  // 星级选项（与城市选择器类似）
  const starOptions = [
    { label: '不限星级', value: 0 },
    { label: '五星级', value: 5 },
    { label: '四星级', value: 4 },
    { label: '三星级', value: 3 },
    { label: '二星级', value: 2 },
    { label: '一星级', value: 1 }
  ]

  // 星级分类选项（点击展开）
  const starCategoryOptions = [
    { label: '不限', value: 0, desc: '不限星级' },
    { label: '经济型', value: 12, desc: '1-2星' },
    { label: '舒适型', value: 34, desc: '3-4星' },
    { label: '豪华型', value: 5, desc: '5星' }
  ]

  const cities = [
    { label: '安庆', value: '安庆', pinyin: 'anqing' },
    { label: '安阳', value: '安阳', pinyin: 'anyang' },
    { label: '北京', value: '北京', pinyin: 'beijing' },
    { label: '包头', value: '包头', pinyin: 'baotou' },
    { label: '保定', value: '保定', pinyin: 'baoding' },
    { label: '成都', value: '成都', pinyin: 'chengdu' },
    { label: '重庆', value: '重庆', pinyin: 'chongqing' },
    { label: '长沙', value: '长沙', pinyin: 'changsha' },
    { label: '长春', value: '长春', pinyin: 'changchun' },
    { label: '大连', value: '大连', pinyin: 'dalian' },
    { label: '东莞', value: '东莞', pinyin: 'dongguan' },
    { label: '大理', value: '大理', pinyin: 'dali' },
    { label: '大庆', value: '大庆', pinyin: 'daqin' },
    { label: '福州', value: '福州', pinyin: 'fuzhou' },
    { label: '佛山', value: '佛山', pinyin: 'foshan' },
    { label: '广州', value: '广州', pinyin: 'guangzhou' },
    { label: '贵阳', value: '贵阳', pinyin: 'guiyang' },
    { label: '桂林', value: '桂林', pinyin: 'guilin' },
    { label: '杭州', value: '杭州', pinyin: 'hangzhou' },
    { label: '合肥', value: '合肥', pinyin: 'hefei' },
    { label: '哈尔滨', value: '哈尔滨', pinyin: 'haerbin' },
    { label: '海口', value: '海口', pinyin: 'haikou' },
    { label: '呼和浩特', value: '呼和浩特', pinyin: 'huhehaote' },
    { label: '济南', value: '济南', pinyin: 'jinan' },
    { label: '嘉兴', value: '嘉兴', pinyin: 'jiaxing' },
    { label: '九江', value: '九江', pinyin: 'jiujiang' },
    { label: '昆明', value: '昆明', pinyin: 'kunming' },
    { label: '开封', value: '开封', pinyin: 'kaifeng' },
    { label: '兰州', value: '兰州', pinyin: 'lanzhou' },
    { label: '洛阳', value: '洛阳', pinyin: 'luoyang' },
    { label: '临沂', value: '临沂', pinyin: 'linyi' },
    { label: '拉萨', value: '拉萨', pinyin: 'lasa' },
    { label: '绵阳', value: '绵阳', pinyin: 'mianyang' },
    { label: '牡丹江', value: '牡丹江', pinyin: 'mudanjiang' },
    { label: '南京', value: '南京', pinyin: 'nanjing' },
    { label: '宁波', value: '宁波', pinyin: 'ningbo' },
    { label: '南昌', value: '南昌', pinyin: 'nanchang' },
    { label: '南宁', value: '南宁', pinyin: 'nanning' },
    { label: '青岛', value: '青岛', pinyin: 'qingdao' },
    { label: '泉州', value: '泉州', pinyin: 'quanzhou' },
    { label: '秦皇岛', value: '秦皇岛', pinyin: 'qinhuangdao' },
    { label: '上海', value: '上海', pinyin: 'shanghai' },
    { label: '深圳', value: '深圳', pinyin: 'shenzhen' },
    { label: '苏州', value: '苏州', pinyin: 'suzhou' },
    { label: '沈阳', value: '沈阳', pinyin: 'shenyang' },
    { label: '石家庄', value: '石家庄', pinyin: 'shijiazhuang' },
    { label: '绍兴', value: '绍兴', pinyin: 'shaoxing' },
    { label: '天津', value: '天津', pinyin: 'tianjin' },
    { label: '太原', value: '太原', pinyin: 'taiyuan' },
    { label: '唐山', value: '唐山', pinyin: 'tangshan' },
    { label: '武汉', value: '武汉', pinyin: 'wuhan' },
    { label: '无锡', value: '无锡', pinyin: 'wuxi' },
    { label: '温州', value: '温州', pinyin: 'wenzhou' },
    { label: '乌鲁木齐', value: '乌鲁木齐', pinyin: 'wulumuqi' },
    { label: '西安', value: '西安', pinyin: 'xian' },
    { label: '厦门', value: '厦门', pinyin: 'xiamen' },
    { label: '徐州', value: '徐州', pinyin: 'xuzhou' },
    { label: '西宁', value: '西宁', pinyin: 'xining' },
    { label: '烟台', value: '烟台', pinyin: 'yantai' },
    { label: '扬州', value: '扬州', pinyin: 'yangzhou' },
    { label: '银川', value: '银川', pinyin: 'yinchuan' },
    { label: '郑州', value: '郑州', pinyin: 'zhengzhou' },
    { label: '珠海', value: '珠海', pinyin: 'zhuhai' },
    { label: '淄博', value: '淄博', pinyin: 'zibo' },
    { label: '张家界', value: '张家界', pinyin: 'zhangjiajie' },
  ].sort((a, b) => a.pinyin.localeCompare(b.pinyin))

  // 获取日期字符串
  function getDateStr(days: number) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  // 打开日历
  const openCalendar = () => {
    setCalendarVisible(true)
  }

  // 处理日期选择
  const handleDateSelect = (startDate: string, endDate: string) => {
    setSearchForm(prev => ({
      ...prev,
      checkInDate: startDate,
      checkOutDate: endDate
    }))
  }

  // 处理表单变化
  const handleInputChange = (key: string, value: any) => {
    setSearchForm(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[date.getDay()]

    return {
      short: `${month}/${day}`,
      withWeek: `${month}月${day}日 ${weekDay}`
    }
  }

  // 计算入住天数
  const calculateNights = () => {
    const checkIn = new Date(searchForm.checkInDate)
    const checkOut = new Date(searchForm.checkOutDate)
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 增加天数
  const increaseNights = () => {
    const nights = calculateNights()
    const newCheckOut = new Date(searchForm.checkInDate)
    newCheckOut.setDate(newCheckOut.getDate() + nights + 1)

    setSearchForm(prev => ({
      ...prev,
      checkOutDate: newCheckOut.toISOString().split('T')[0]
    }))
  }

  // 减少天数
  const decreaseNights = () => {
    const nights = calculateNights()
    if (nights > 1) {
      const newCheckOut = new Date(searchForm.checkInDate)
      newCheckOut.setDate(newCheckOut.getDate() + nights - 1)

      setSearchForm(prev => ({
        ...prev,
        checkOutDate: newCheckOut.toISOString().split('T')[0]
      }))
    }
  }

  // 处理星级选择
  const handleStarSelect = (value: number) => {
    setSearchForm(prev => ({
      ...prev,
      starLevel: value
    }))
  }

  // 获取当前选中的星级标签
  const getCurrentStarLabel = () => {
    const selected = starCategoryOptions.find(opt => {
      if (searchForm.starLevel === 0) return opt.value === 0
      if (searchForm.starLevel === 12) return opt.value === 12
      if (searchForm.starLevel === 34) return opt.value === 34
      if (searchForm.starLevel === 5) return opt.value === 5
      return false
    })
    return selected || starCategoryOptions[0]
  }

  // 处理搜索
  const handleSearch = () => {
    console.log('搜索条件:', searchForm)

    const queryParams: any = {}

    // 1. 城市查询
    if (searchForm.city) {
      queryParams.city = searchForm.city
    }

    // 2. 关键词查询
    if (searchForm.keyword.trim()) {
      queryParams.keyword = searchForm.keyword.trim()
    }

    // 3. 星级查询
    if (searchForm.starLevel > 0) {
      if (searchForm.starLevel === 12) {
        queryParams.minStar = 1
        queryParams.maxStar = 2
      } else if (searchForm.starLevel === 34) {
        queryParams.minStar = 3
        queryParams.maxStar = 4
      } else if (searchForm.starLevel === 5) {
        queryParams.minStar = 5
        queryParams.maxStar = 5
      } else {
        queryParams.minStar = searchForm.starLevel
        queryParams.maxStar = searchForm.starLevel
      }
    }

    // 4. 入住日期和离店日期
    if (searchForm.checkInDate && searchForm.checkOutDate) {
      queryParams.checkInDate = searchForm.checkInDate
      queryParams.checkOutDate = searchForm.checkOutDate
    }

    // 5. 入住人数和房间数
    if (searchForm.guestCount > 2) {
      queryParams.guests = searchForm.guestCount
    }
    if (searchForm.roomCount > 1) {
      queryParams.rooms = searchForm.roomCount
    }

    console.log('查询参数:', queryParams)

    const queryString = Object.keys(queryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&')

    navigateTo({
      url: `/pages/list/index${queryString ? '?' + queryString : ''}`
    })
  }

  // 获取要显示的轮播图数据
  const displayBanners = getDisplayBanners()

  return (
    <View className='index' style={{ backgroundImage: `url(${bgImg})` }}>
      <View className='index'>
        {/* 主要内容区域 */}
        <View className='main-content'>
          {/* 轮播图区域 */}
          {loading ? (
            <View className='loading-banner'>
              <Text>加载中...</Text>
            </View>
          ) : (
            <Swiper
              className='ad-swiper'
              indicatorColor='rgba(255,255,255,0.3)'
              indicatorActiveColor='#FFFFFF'
              circular={displayBanners.length > 1}
              indicatorDots={displayBanners.length > 1}
              autoplay={displayBanners.length > 1}
              interval={3000}
            >
              {displayBanners.map(hotel => {
                const hasRealImage = hotel.images &&
                  Array.isArray(hotel.images) &&
                  hotel.images.length > 0 &&
                  hotel.images[0]

                const imageUrl = hasRealImage ? hotel.images[0] : ''

                return (
                  <SwiperItem key={hotel._id}>
                    <View
                      className='banner-item'
                      style={{
                        backgroundColor: hotel.color || '#8A9A9B',
                        height: '400rpx'
                      }}
                      onClick={() => handleBannerClick(hotel)}
                    >
                      {/* 真实图片 */}
                      {hasRealImage && imageUrl && (
                        <Image
                          className='banner-image'
                          src={imageUrl}
                          mode='aspectFill'
                        />
                      )}

                      {/* 广告标签 */}
                      <View className='ad-label'>
                        <Text className='ad-text'>推荐</Text>
                      </View>

                      {/* 酒店信息 */}
                      <View className='banner-overlay'>
                        <Text className='hotel-name'>{hotel.name}</Text>
                        <View className='hotel-info'>
                          <Text className='hotel-star'>
                            {'★'.repeat(hotel.starLevel || 3)}
                            {hotel.starLevel ? ` ${hotel.starLevel}星` : ''}
                          </Text>
                          <Text className='hotel-address'>
                            {hotel.address || '未知地址'}
                          </Text>
                        </View>
                        {hotel.minPrice && (
                          <View className='hotel-price'>
                            <Text className='price-text'>¥{hotel.minPrice}起</Text>
                          </View>
                        )}
                      </View>

                      {/* 点击提示 */}
                      <View className='click-hint'>
                        <Text className='hint-text'>点击查看详情</Text>
                      </View>
                    </View>
                  </SwiperItem>
                )
              })}
            </Swiper>
          )}

          {/* 酒店查询卡片 */}
          <View className='search-card'>
            {/* 居中的标题 */}
            <View className='card-header-center'>
              <Text className='card-title'>易宿酒店预订平台</Text>
              <Text className='card-subtitle'>快速找到心仪住宿</Text>
            </View>

            {/* 城市选择 */}
            <View className='form-row'>
              <Text className='form-label'>选择城市</Text>
              <View className='clickable-section'>
                <Picker
                  mode='selector'
                  range={cities}
                  rangeKey='label'
                  value={cities.findIndex(c => c.value === searchForm.city)}
                  onChange={(e) => {
                    const selectedIndex = Number(e.detail.value)
                    const selectedCity = cities[selectedIndex].value
                    handleInputChange('city', selectedCity)
                  }}
                >
                  <View className='city-select-btn'>
                    <View className='city-info'>
                      <Text className='city-name'>{searchForm.city}</Text>
                    </View>
                    <View className='btn-arrow'>
                      <Text className='arrow-icon'>▼</Text>
                      <Text className='btn-hint'>点击选择</Text>
                    </View>
                  </View>
                </Picker>

                {/* 热门城市快速选择 */}
                <View className='quick-cities'>
                  <Text className='quick-label'>热门：</Text>
                  {['上海', '北京', '广州', '深圳', '杭州', '成都']
                    .map(city => (
                      <View
                        key={city}
                        className={`city-chip ${searchForm.city === city ? 'active' : ''}`}
                        onClick={() => handleInputChange('city', city)}
                      >
                        <Text className='chip-text'>{city}</Text>
                        {searchForm.city === city && <Text className='check-mark'>✓</Text>}
                      </View>
                    ))}
                </View>
              </View>
            </View>

            {/* 入住/离店日期 */}
            <View className='form-row'>
              <Text className='form-label'>入住/离店</Text>
              <View className='clickable-section'>
                <View className='date-select-btn' onClick={openCalendar}>
                  <View className='date-info'>
                    <View className='date-item'>
                      <Text className='date-type'>入住</Text>
                      <Text className='date-value'>{formatDateDisplay(searchForm.checkInDate).short}</Text>
                      <Text className='date-week'>{formatDateDisplay(searchForm.checkInDate).withWeek.split(' ')[1]}</Text>
                    </View>

                    {/* 天数控制 */}
                    <View className='date-middle'>
                      <View className='nights-control'>
                        <Button
                          className='nights-btn minus'
                          onClick={(e) => {
                            e.stopPropagation()
                            decreaseNights()
                          }}
                        >
                          -
                        </Button>
                        <Text className='nights-text'>{calculateNights()}晚</Text>
                        <Button
                          className='nights-btn plus'
                          onClick={(e) => {
                            e.stopPropagation()
                            increaseNights()
                          }}
                        >
                          +
                        </Button>
                      </View>
                    </View>

                    <View className='date-item'>
                      <Text className='date-type'>离店</Text>
                      <Text className='date-value'>{formatDateDisplay(searchForm.checkOutDate).short}</Text>
                      <Text className='date-week'>{formatDateDisplay(searchForm.checkOutDate).withWeek.split(' ')[1]}</Text>
                    </View>
                  </View>

                  <View className='btn-hint-area'>
                    <Text className='btn-hint'>点击选择日期</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 关键词搜索 */}
            <View className='form-row'>
              <Text className='form-label'>酒店/位置</Text>
              <View className='input-container'>
                <Input
                  className='keyword-input'
                  placeholder='输入酒店名/商圈/位置'
                  value={searchForm.keyword}
                  onInput={(e) => { handleInputChange('keyword', e.detail.value) }}
                />
              </View>
            </View>

            {/* 人数和房间数 */}
            <View className='form-row guest-row'>
              <View className='guest-item'>
                <Text className='form-label'>入住人数</Text>
                <Picker
                  mode='selector'
                  range={[1, 2, 3, 4]}
                  value={searchForm.guestCount - 1}
                  onChange={(e) => {
                    const selectedValue = Number(e.detail.value) + 1
                    handleInputChange('guestCount', selectedValue)
                  }}
                >
                  <View className='count-selector-btn'>
                    <Text className='count-text'>{searchForm.guestCount}人</Text>
                    <Text className='selector-arrow'>▼</Text>
                  </View>
                </Picker>
              </View>

              <View className='guest-item'>
                <Text className='form-label'>房间数量</Text>
                <View className='room-controls'>
                  <Button
                    className='count-btn minus'
                    onClick={() => handleInputChange('roomCount', Math.max(1, searchForm.roomCount - 1))}
                  >
                    -
                  </Button>
                  <Text className='room-number'>{searchForm.roomCount}</Text>
                  <Button
                    className='count-btn plus'
                    onClick={() => handleInputChange('roomCount', searchForm.roomCount + 1)}
                  >
                    +
                  </Button>
                </View>
              </View>
            </View>

            {/* 星级筛选 */}
            <View className='form-row'>
              <Text className='form-label'>酒店星级</Text>
              <View className='clickable-section'>
                {/* 星级选择器 */}
                <Picker
                  mode='selector'
                  range={starOptions}
                  rangeKey='label'
                  value={starOptions.findIndex(opt => opt.value === searchForm.starLevel)}
                  onChange={(e) => {
                    const selectedIndex = Number(e.detail.value)
                    const selectedStar = starOptions[selectedIndex].value
                    handleStarSelect(selectedStar)
                  }}
                >
                  <View className='star-select-btn'>
                    <View className='star-info'>
                      <Text className='star-label'>
                        {searchForm.starLevel === 0 ? '不限星级' :
                          searchForm.starLevel === 12 ? '经济型 (1-2星)' :
                            searchForm.starLevel === 34 ? '舒适型 (3-4星)' :
                              searchForm.starLevel === 5 ? '豪华型 (5星)' :
                                `${searchForm.starLevel}星级`}
                      </Text>
                      {searchForm.starLevel > 0 && searchForm.starLevel <= 5 && (
                        <Text className='star-icons'>
                          {'★'.repeat(searchForm.starLevel)}
                        </Text>
                      )}
                    </View>
                    <View className='btn-arrow'>
                      <Text className='arrow-icon'>▼</Text>
                      <Text className='btn-hint'>点击选择</Text>
                    </View>
                  </View>
                </Picker>

                {/* 星级分类快速选择 */}
                <View className='star-options-section'>
                  <View
                    className='toggle-star-options'
                    onClick={() => setShowStarOptions(!showStarOptions)}
                  >
                    <Text className='toggle-text'>
                      {showStarOptions ? '收起选项' : '更多选项'}
                    </Text>
                    <Text className={`toggle-arrow ${showStarOptions ? 'expanded' : ''}`}>
                      ▼
                    </Text>
                  </View>

                  {/* 展开的选项 */}
                  {showStarOptions && (
                    <View className='expanded-star-options'>
                      {starCategoryOptions.map(option => (
                        <View
                          key={option.value}
                          className={`star-option ${searchForm.starLevel === option.value ? 'active' : ''}`}
                          onClick={() => {
                            handleStarSelect(option.value)
                            setShowStarOptions(false)
                          }}
                        >
                          <Text className='star-option-text'>{option.label}</Text>
                          <Text className='star-option-desc'>{option.desc}</Text>
                          {option.value > 0 && option.value <= 5 && (
                            <Text className='star-option-icons'>
                              {'★'.repeat(option.value)}
                            </Text>
                          )}
                          {option.value === 12 && (
                            <Text className='star-option-icons'>★ ★</Text>
                          )}
                          {option.value === 34 && (
                            <Text className='star-option-icons'>★★★ ★</Text>
                          )}
                          {searchForm.starLevel === option.value && (
                            <Text className='check-mark'>✓</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* 搜索按钮 */}
            <Button className='search-btn primary' onClick={handleSearch}>
              找酒店
            </Button>
          </View>
        </View>

        {/* 日历组件 */}
        <Calendar
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          onSelect={handleDateSelect}
        />
      </View>
    </View>
  )
}