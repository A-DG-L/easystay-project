import { View, Text, Swiper, SwiperItem, Image, Picker, Button, Input } from '@tarojs/components'
import { useLoad, getStorageSync, reLaunch, showToast } from '@tarojs/taro'
import { useState } from 'react'
import Calendar from '../../components/calendar'
import './index.scss'

export default function Index() {
  // 只在页面加载时检查登录状态
  useLoad(() => {
    const token = getStorageSync('token')
    if (!token) {
      showToast({ title: '请先登录', icon: 'none', duration: 1500 })
      setTimeout(() => {
        reLaunch({ url: '/pages/login/index' })
      }, 1600)
    }
  })

  // 日历组件状态
  const [calendarVisible, setCalendarVisible] = useState(false)

  // 查询条件状态(默认)
  const [searchForm, setSearchForm] = useState({
    city: '上海',
    checkInDate: getDateStr(0),  // 今天
    checkOutDate: getDateStr(1), // 明天
    keyword: '',
    guestCount: 2,
    roomCount: 1,
  })

  // 模拟广告数据
  const bannerList = [
    { id: 1, url: 'https://via.placeholder.com/750x400?text=Ad+1' },
    { id: 2, url: 'https://via.placeholder.com/750x400?text=Ad+2' },
    { id: 3, url: 'https://via.placeholder.com/750x400?text=Ad+3' },
  ]
  
  const cities = [
    // A
    { label: '安庆', value: '安庆', pinyin: 'anqing' },
    { label: '安阳', value: '安阳', pinyin: 'anyang' },
    
    // B
    { label: '北京', value: '北京', pinyin: 'beijing' },
    { label: '包头', value: '包头', pinyin: 'baotou' },
    { label: '保定', value: '保定', pinyin: 'baoding' },
    
    // C
    { label: '成都', value: '成都', pinyin: 'chengdu' },
    { label: '重庆', value: '重庆', pinyin: 'chongqing' },
    { label: '长沙', value: '长沙', pinyin: 'changsha' },
    { label: '长春', value: '长春', pinyin: 'changchun' },
    
    // D
    { label: '大连', value: '大连', pinyin: 'dalian' },
    { label: '东莞', value: '东莞', pinyin: 'dongguan' },
    { label: '大理', value: '大理', pinyin: 'dali' },
    { label: '大庆', value: '大庆', pinyin: 'daqin' },
    
    // F
    { label: '福州', value: '福州', pinyin: 'fuzhou' },
    { label: '佛山', value: '佛山', pinyin: 'foshan' },
    
    // G
    { label: '广州', value: '广州', pinyin: 'guangzhou' },
    { label: '贵阳', value: '贵阳', pinyin: 'guiyang' },
    { label: '桂林', value: '桂林', pinyin: 'guilin' },
    
    // H
    { label: '杭州', value: '杭州', pinyin: 'hangzhou' },
    { label: '合肥', value: '合肥', pinyin: 'hefei' },
    { label: '哈尔滨', value: '哈尔滨', pinyin: 'haerbin' },
    { label: '海口', value: '海口', pinyin: 'haikou' },
    { label: '呼和浩特', value: '呼和浩特', pinyin: 'huhehaote' },
    
    // J
    { label: '济南', value: '济南', pinyin: 'jinan' },
    { label: '嘉兴', value: '嘉兴', pinyin: 'jiaxing' },
    { label: '九江', value: '九江', pinyin: 'jiujiang' },
    
    // K
    { label: '昆明', value: '昆明', pinyin: 'kunming' },
    { label: '开封', value: '开封', pinyin: 'kaifeng' },
    
    // L
    { label: '兰州', value: '兰州', pinyin: 'lanzhou' },
    { label: '洛阳', value: '洛阳', pinyin: 'luoyang' },
    { label: '临沂', value: '临沂', pinyin: 'linyi' },
    { label: '拉萨', value: '拉萨', pinyin: 'lasa' },
    
    // M
    { label: '绵阳', value: '绵阳', pinyin: 'mianyang' },
    { label: '牡丹江', value: '牡丹江', pinyin: 'mudanjiang' },
    
    // N
    { label: '南京', value: '南京', pinyin: 'nanjing' },
    { label: '宁波', value: '宁波', pinyin: 'ningbo' },
    { label: '南昌', value: '南昌', pinyin: 'nanchang' },
    { label: '南宁', value: '南宁', pinyin: 'nanning' },
    
    // Q
    { label: '青岛', value: '青岛', pinyin: 'qingdao' },
    { label: '泉州', value: '泉州', pinyin: 'quanzhou' },
    { label: '秦皇岛', value: '秦皇岛', pinyin: 'qinhuangdao' },
    
    // S
    { label: '上海', value: '上海', pinyin: 'shanghai' },
    { label: '深圳', value: '深圳', pinyin: 'shenzhen' },
    { label: '苏州', value: '苏州', pinyin: 'suzhou' },
    { label: '沈阳', value: '沈阳', pinyin: 'shenyang' },
    { label: '石家庄', value: '石家庄', pinyin: 'shijiazhuang' },
    { label: '绍兴', value: '绍兴', pinyin: 'shaoxing' },
    
    // T
    { label: '天津', value: '天津', pinyin: 'tianjin' },
    { label: '太原', value: '太原', pinyin: 'taiyuan' },
    { label: '唐山', value: '唐山', pinyin: 'tangshan' },
    
    // W
    { label: '武汉', value: '武汉', pinyin: 'wuhan' },
    { label: '无锡', value: '无锡', pinyin: 'wuxi' },
    { label: '温州', value: '温州', pinyin: 'wenzhou' },
    { label: '乌鲁木齐', value: '乌鲁木齐', pinyin: 'wulumuqi' },
    
    // X
    { label: '西安', value: '西安', pinyin: 'xian' },
    { label: '厦门', value: '厦门', pinyin: 'xiamen' },
    { label: '徐州', value: '徐州', pinyin: 'xuzhou' },
    { label: '西宁', value: '西宁', pinyin: 'xining' },
    
    // Y
    { label: '烟台', value: '烟台', pinyin: 'yantai' },
    { label: '扬州', value: '扬州', pinyin: 'yangzhou' },
    { label: '银川', value: '银川', pinyin: 'yinchuan' },
    
    // Z
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

  // 处理搜索
  const handleSearch = () => {
    console.log('搜索条件:', searchForm)
    // 这里可以跳转到搜索结果页面
  }

  // 处理快捷日期选择
  const handleQuickDateSelect = (type: 'today' | 'tomorrow') => {
    if (type === 'today') {
      setSearchForm(prev => ({
        ...prev,
        checkInDate: getDateStr(0),
        checkOutDate: getDateStr(1)
      }))
    } else {
      setSearchForm(prev => ({
        ...prev,
        checkInDate: getDateStr(1),
        checkOutDate: getDateStr(2)
      }))
    }
  }

  return (
    <View className='index'>
      {/* 主要内容区域 */}
      <View className='main-content'>
        {/* 轮播图区域 */}
        <Swiper
          className='ad-swiper'
          indicatorColor='#d1d1d1'
          indicatorActiveColor='#a8c6c5'
          circular
          indicatorDots
          autoplay
        >
          {bannerList.map((item) => (
            <SwiperItem key={item.id}>
              <Image className='ad-image' src={item.url} mode='aspectFill' />
            </SwiperItem>
          ))}
        </Swiper>

        {/* 酒店查询卡片 */}
        <View className='search-card'>
          <View className='card-header'>
            <Text className='card-title'>酒店查询</Text>
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
                  
                  <View className='date-middle'>
                    <Text className='nights'>{calculateNights()}晚</Text>
                    <View className='arrow-container'>
                      <Text className='arrow'>→</Text>
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

              {/* 快捷日期选项 */}
              <View className='quick-dates'>
                <View 
                  className={`quick-date-btn ${calculateNights() === 1 && searchForm.checkInDate === getDateStr(0) ? 'active' : ''}`}
                  onClick={() => handleQuickDateSelect('today')}
                >
                  <Text className='date-text'>今天入住</Text>
                </View>
                <View 
                  className={`quick-date-btn ${calculateNights() === 1 && searchForm.checkInDate === getDateStr(1) ? 'active' : ''}`}
                  onClick={() => handleQuickDateSelect('tomorrow')}
                >
                  <Text className='date-text'>明天入住</Text>
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
                onInput={(e) => {handleInputChange('keyword', e.detail.value)}}
              />
              <Text className='input-icon'>🔍</Text>
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
  )
}