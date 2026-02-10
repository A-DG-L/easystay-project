import { View, Text, ScrollView, Image, Input } from '@tarojs/components'
import { useLoad, useRouter, navigateTo } from '@tarojs/taro'
import { useState } from 'react'
import request from '../../utils/request'
import './index.scss'

// 定义查询参数接口
interface SearchParams {
  city?: string;
  keyword?: string;
  minStar?: string;
  maxStar?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: string;
  rooms?: string;
  [key: string]: any;
}

// 酒店数据接口
interface Hotel {
  _id: string;
  name: string;
  city?: string;
  address?: string;
  starLevel: number;
  minPrice: number;
  images?: string[];
  facilities?: string[];
  score?: number;
  description?: string;
}

// 星级选项类型
interface StarOption {
  label: string;
  minStar: string;
  maxStar: string;
}

export default function HotelList() {
  const router = useRouter()
  const [qualifiedHotels, setQualifiedHotels] = useState<Hotel[]>([])
  const [recommendedHotels, setRecommendedHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filterParams, setFilterParams] = useState<SearchParams>({})
  const [tempFilterParams, setTempFilterParams] = useState<SearchParams>({})
  
  // 星级选项配置
  const starOptions: StarOption[] = [
    { label: '不限星级', minStar: '0', maxStar: '5' },
    { label: '经济型(1-2星)', minStar: '1', maxStar: '2' },
    { label: '舒适型(3-4星)', minStar: '3', maxStar: '4' },
    { label: '豪华型(5星)', minStar: '5', maxStar: '5' }
  ]
  
  // 热门城市选项
  const popularCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '西安', '南京']
  
  // 解码URL参数
  const decodeParams = (params: any): SearchParams => {
    const decoded: SearchParams = {}
    
    Object.keys(params).forEach(key => {
      const value = params[key]
      if (typeof value === 'string') {
        try {
          // 解码URL编码的参数
          decoded[key] = decodeURIComponent(value)
        } catch (e) {
          console.warn(`参数解码失败 ${key}:`, value, e)
          decoded[key] = value
        }
      } else {
        decoded[key] = value
      }
    })
    
    return decoded
  }
  
  // 初始化筛选参数
  useLoad(() => {
    const initialParams = decodeParams(router.params || {})
    console.log('列表页接收到的参数:', initialParams)
    setFilterParams(initialParams)
    setTempFilterParams(initialParams)
    fetchHotels(1, initialParams)
  })
  
  const fetchHotels = async (page = 1, params: SearchParams) => {
    try {
      setLoading(true)
      
      // 构建查询参数
      const queryParams: Record<string, any> = {
        page,
        pageSize: 10
      }
      
      // 添加筛选条件
      const addFilter = (key: string, value: any, condition = true) => {
        if (condition && value != null && value !== '') {
          queryParams[key] = value
        }
      }
      
      addFilter('city', params.city?.trim())
      addFilter('keyword', params.keyword?.trim())
      addFilter('minStar', params.minStar ? Number(params.minStar) : null)
      addFilter('maxStar', params.maxStar ? Number(params.maxStar) : null)
      addFilter('checkInDate', params.checkInDate)
      addFilter('checkOutDate', params.checkOutDate)
      
      console.log('发送到 /api/hotels 的查询参数:', queryParams)
      
      // 调用搜索接口
      const res = await request({
        url: '/hotels',
        method: 'GET',
        data: queryParams
      })
      
      console.log('API返回结果:', res)
      
      if (res.code === 200 && res.data) {
        const allHotels = res.data.list || []
        
        // 分离符合条件的酒店
        const { qualified, unqualified } = separateHotelsByParams(allHotels, params)
        
        if (page === 1) {
          setQualifiedHotels(qualified)
          setRecommendedHotels(getRecommendedHotels(unqualified, params))
        } else {
          setQualifiedHotels(prev => [...prev, ...qualified])
        }
        
        setTotal(qualified.length)
        setCurrentPage(page)
        
        // 检查是否还有更多数据
        const totalPages = Math.ceil((res.data.total || 0) / 10)
        setHasMore(page < totalPages)
      } else {
        console.error('搜索失败:', res.msg)
        setQualifiedHotels([])
        setRecommendedHotels([])
        setTotal(0)
      }
    } catch (error) {
      console.error('搜索出错:', error)
      setQualifiedHotels([])
      setRecommendedHotels([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }
  
  // 分离符合条件的和不符合条件的酒店
  const separateHotelsByParams = (hotels: Hotel[], params: SearchParams): { 
    qualified: Hotel[], 
    unqualified: Hotel[] 
  } => {
    const qualified: Hotel[] = []
    const unqualified: Hotel[] = []
    
    hotels.forEach(hotel => {
      let isQualified = true
      
      // 验证城市
      if (params.city?.trim()) {
        const city = params.city.trim().toLowerCase()
        const hotelCity = hotel.city?.toLowerCase() || ''
        const hotelAddress = hotel.address?.toLowerCase() || ''
        
        if (hotelCity !== city && !hotelAddress.includes(city)) {
          isQualified = false
        }
      }
      
      // 验证关键词
      if (isQualified && params.keyword?.trim()) {
        const keyword = params.keyword.trim().toLowerCase()
        const nameMatch = hotel.name?.toLowerCase().includes(keyword) || false
        const addressMatch = hotel.address?.toLowerCase().includes(keyword) || false
        const descMatch = hotel.description?.toLowerCase().includes(keyword) || false
        
        if (!nameMatch && !addressMatch && !descMatch) {
          isQualified = false
        }
      }
      
      // 验证星级
      if (isQualified && params.minStar && params.maxStar) {
        const minStar = Number(params.minStar)
        const maxStar = Number(params.maxStar)
        
        if (hotel.starLevel < minStar || hotel.starLevel > maxStar) {
          isQualified = false
        }
      }
      
      isQualified ? qualified.push(hotel) : unqualified.push(hotel)
    })
    
    return { qualified, unqualified }
  }
  
  // 获取推荐的酒店
  const getRecommendedHotels = (unqualifiedHotels: Hotel[], params: SearchParams): Hotel[] => {
    if (unqualifiedHotels.length === 0) return []
    
    return unqualifiedHotels
      .map(hotel => {
        let score = 0
        
        // 同城市或附近区域加分
        if (params.city && (hotel.city === params.city || hotel.address?.includes(params.city))) {
          score += 3
        }
        
        // 星级接近加分
        if (params.minStar && params.maxStar) {
          const minStar = Number(params.minStar)
          const maxStar = Number(params.maxStar)
          const targetStar = (minStar + maxStar) / 2
          const starDiff = Math.abs(hotel.starLevel - targetStar)
          score += Math.max(0, 5 - starDiff)
        }
        
        // 高评分酒店加分
        if (hotel.score && hotel.score >= 4.5) {
          score += 2
        } else if (hotel.score && hotel.score >= 4.0) {
          score += 1
        }
        
        // 低价酒店加分
        if (hotel.minPrice < 300) {
          score += 1
        }
        
        return { hotel, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.hotel)
  }
  
  // 获取酒店不满足的条件
  const getUnqualifiedReasons = (hotel: Hotel): string[] => {
    const reasons: string[] = []
    
    if (filterParams.minStar && filterParams.maxStar) {
      const minStar = Number(filterParams.minStar)
      const maxStar = Number(filterParams.maxStar)
      
      if (hotel.starLevel < minStar) {
        reasons.push(`星级低于${minStar}星`)
      } else if (hotel.starLevel > maxStar) {
        reasons.push(`星级高于${maxStar}星`)
      }
    }
    
    if (filterParams.city && hotel.city !== filterParams.city && 
        !hotel.address?.includes(filterParams.city)) {
      reasons.push(`不在${filterParams.city}`)
    }
    
    if (filterParams.keyword) {
      const keyword = filterParams.keyword.toLowerCase()
      const nameMatch = hotel.name?.toLowerCase().includes(keyword) || false
      const addressMatch = hotel.address?.toLowerCase().includes(keyword) || false
      const descMatch = hotel.description?.toLowerCase().includes(keyword) || false
      
      if (!nameMatch && !addressMatch && !descMatch) {
        reasons.push(`不包含"${filterParams.keyword}"`)
      }
    }
    
    return reasons
  }
  
  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchHotels(currentPage + 1, filterParams)
    }
  }
  
  // 跳转到酒店详情页(/pages/hotel-detail/index)
  const goToHotelDetail = (hotelId: string) => {
    navigateTo({
      url: `/pages/hotel-detail/index?id=${hotelId}`
    })
  }
  
  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const weekday = weekdays[date.getDay()]
      return `${month}月${day}日(${weekday})`
    } catch (e) {
      return dateStr
    }
  }
  
  // 获取星级描述
  const getStarDescription = () => {
    if (!filterParams.minStar || !filterParams.maxStar) return '不限星级'
    
    const minStar = Number(filterParams.minStar)
    const maxStar = Number(filterParams.maxStar)
    
    if (minStar === 0 && maxStar === 5) return '不限星级'
    if (minStar === 1 && maxStar === 2) return '经济型(1-2星)'
    if (minStar === 3 && maxStar === 4) return '舒适型(3-4星)'
    if (minStar === 5 && maxStar === 5) return '豪华型(5星)'
    
    return `${minStar}-${maxStar}星`
  }
  
  // 打开筛选面板
  const openFilterPanel = () => {
    setTempFilterParams({ ...filterParams })
    setShowFilterPanel(true)
  }
  
  // 更新临时筛选参数
  const updateTempFilter = (key: keyof SearchParams, value: string) => {
    setTempFilterParams(prev => ({ ...prev, [key]: value }))
  }
  
  // 处理临时关键词输入
  const handleTempKeywordChange = (e: any) => {
    const value = e.detail?.value || ''
    console.log('关键词输入:', value)
    updateTempFilter('keyword', value)
  }
  
  // 选择临时城市
  const selectTempCity = (city: string) => {
    updateTempFilter('city', city)
  }
  
  // 选择临时星级
  const selectTempStarOption = (option: StarOption) => {
    updateTempFilter('minStar', option.minStar)
    updateTempFilter('maxStar', option.maxStar)
  }
  
  // 清空临时关键词
  const clearTempKeyword = () => {
    updateTempFilter('keyword', '')
  }
  
  // 应用筛选条件
  const applyFilters = () => {
    setFilterParams(tempFilterParams)
    setShowFilterPanel(false)
    fetchHotels(1, tempFilterParams)
  }
  
  // 重置筛选条件
  const resetFilters = () => {
    const emptyParams: SearchParams = {}
    setTempFilterParams(emptyParams)
    setFilterParams(emptyParams)
    fetchHotels(1, emptyParams)
    setShowFilterPanel(false)
  }
  
  // 检查星级选项是否选中
  const isStarOptionSelected = (option: StarOption) => {
    const currentMin = tempFilterParams.minStar || '0'
    const currentMax = tempFilterParams.maxStar || '5'
    return option.minStar === currentMin && option.maxStar === currentMax
  }
  
  // 渲染筛选条件卡片
  const renderFilterCard = () => {
    const hasFilters = filterParams.city || filterParams.keyword || 
                      filterParams.minStar || filterParams.checkInDate
    
    return (
      <View className='filter-card'>
        <View className='card-header'>
          <Text className='card-title'>当前筛选条件</Text>
          <View className='edit-btn' onClick={openFilterPanel}>
            <Text className='edit-text'>编辑</Text>
          </View>
        </View>
        
        <View className='filter-items'>
          {filterParams.city && (
            <View className='filter-item'>
              <Text className='filter-label'>城市：</Text>
              <Text className='filter-value'>{filterParams.city}</Text>
            </View>
          )}
          
          {(filterParams.checkInDate || filterParams.checkOutDate) && (
            <View className='filter-item'>
              <Text className='filter-label'>入住日期：</Text>
              <Text className='filter-value'>
                {filterParams.checkInDate ? formatDateDisplay(filterParams.checkInDate) : '未选择'}
                {filterParams.checkOutDate ? ` 至 ${formatDateDisplay(filterParams.checkOutDate)}` : ''}
              </Text>
            </View>
          )}
          
          {filterParams.keyword && (
            <View className='filter-item'>
              <Text className='filter-label'>关键词：</Text>
              <Text className='filter-value'>{filterParams.keyword}</Text>
            </View>
          )}
          
          {filterParams.minStar && filterParams.maxStar && (
            <View className='filter-item'>
              <Text className='filter-label'>星级：</Text>
              <Text className='filter-value'>{getStarDescription()}</Text>
            </View>
          )}
          
          {(filterParams.guests || filterParams.rooms) && (
            <View className='filter-item'>
              <Text className='filter-label'>入住信息：</Text>
              <Text className='filter-value'>
                {filterParams.guests ? `${filterParams.guests}人` : ''}
                {filterParams.rooms ? ` ${filterParams.rooms}间` : ''}
              </Text>
            </View>
          )}
          
          {!hasFilters && (
            <View className='filter-item'>
              <Text className='filter-value'>未设置筛选条件，显示全部酒店</Text>
            </View>
          )}
        </View>
      </View>
    )
  }
  
  // 渲染筛选面板
  const renderFilterPanel = () => {
    if (!showFilterPanel) return null
    
    return (
      <View className='filter-panel-mask' onClick={() => setShowFilterPanel(false)}>
        <View className='filter-panel' onClick={(e) => e.stopPropagation()}>
          <View className='panel-header'>
            <Text className='panel-title'>修改筛选条件</Text>
            <View className='close-btn' onClick={() => setShowFilterPanel(false)}>
              <Text className='close-text'>✕</Text>
            </View>
          </View>
          
          <ScrollView className='panel-content' scrollY scrollWithAnimation>
            <View className='panel-scroll-content'>
              <View className='panel-section'>
                <Text className='section-title'>选择城市</Text>
                <View className='city-options'>
                  {popularCities.map((city) => (
                    <View 
                      key={city}
                      className={`city-option ${tempFilterParams.city === city ? 'active' : ''}`}
                      onClick={() => selectTempCity(city)}
                    >
                      <Text className='city-text'>{city}</Text>
                    </View>
                  ))}
                </View>
                <View className='custom-city'>
                  <Text className='city-hint'>其他城市请在首页选择</Text>
                </View>
              </View>
              
              <View className='panel-section'>
                <Text className='section-title'>酒店星级</Text>
                <View className='star-options'>
                  {starOptions.map((option) => (
                    <View 
                      key={option.label}
                      className={`star-option ${isStarOptionSelected(option) ? 'active' : ''}`}
                      onClick={() => selectTempStarOption(option)}
                    >
                      <Text className='option-text'>{option.label}</Text>
                      {isStarOptionSelected(option) && <Text className='check-mark'>✓</Text>}
                    </View>
                  ))}
                </View>
              </View>
              
              <View className='panel-section'>
                <Text className='section-title'>关键词搜索</Text>
                <View className='keyword-input-container'>
                  <Input
                    className='keyword-input'
                    type='text'
                    placeholder='输入酒店名、地址等关键词'
                    value={tempFilterParams.keyword || ''}
                    onInput={handleTempKeywordChange}
                    placeholderStyle='color: #BDC3C7;'
                    confirmType='search'
                    adjustPosition={false}
                  />
                  {tempFilterParams.keyword && tempFilterParams.keyword.length > 0 && (
                    <View className='clear-keyword' onClick={clearTempKeyword}>
                      <Text className='clear-text'>✕</Text>
                    </View>
                  )}
                </View>
                {tempFilterParams.keyword && (
                  <View className='keyword-preview'>
                    <Text className='preview-text'>搜索: "{tempFilterParams.keyword}"</Text>
                  </View>
                )}
              </View>
              
              <View className='panel-tips'>
                <Text className='tip-text'>如需修改入住日期、人数等信息，请返回首页重新搜索</Text>
              </View>
            </View>
          </ScrollView>
          
          <View className='panel-actions'>
            <View className='reset-btn' onClick={resetFilters}>
              <Text className='reset-text'>重置</Text>
            </View>
            <View className='apply-btn' onClick={applyFilters}>
              <Text className='apply-text'>应用筛选</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }
  
  // 渲染单个酒店项
  const renderHotelItem = (hotel: Hotel, isRecommended = false) => {
    const reasons = isRecommended ? getUnqualifiedReasons(hotel) : []
    
    return (
      <View 
        key={hotel._id} 
        className={`hotel-item ${isRecommended ? 'recommended' : ''}`}
        onClick={() => goToHotelDetail(hotel._id)}
      >
        <Image 
          className='hotel-image'
          src={hotel.images?.[0] || ''}
          mode='aspectFill'
        />
        
        <View className='hotel-info'>
          <View className='hotel-header'>
            <Text className='hotel-name'>{hotel.name}</Text>
            {isRecommended && reasons.length > 0 && (
              <View className='unqualified-reason'>
                <Text className='reason-tag'>{reasons[0]}</Text>
                {reasons.length > 1 && (
                  <Text className='reason-more'>等{reasons.length}项不符</Text>
                )}
              </View>
            )}
          </View>
          
          <View className='hotel-meta'>
            <Text className='hotel-star'>{'★'.repeat(hotel.starLevel)}</Text>
            <Text className='hotel-location'>{hotel.address}</Text>
          </View>
          
          {hotel.facilities && hotel.facilities.length > 0 && (
            <View className='hotel-facilities'>
              {hotel.facilities.slice(0, 3).map((facility, index) => (
                <Text key={index} className='facility-tag'>{facility}</Text>
              ))}
            </View>
          )}
          
          <View className='hotel-bottom'>
            <View className='hotel-rating'>
              <Text className='rating-score'>{hotel.score || 4.5}</Text>
              <Text className='rating-text'>分</Text>
            </View>
            
            <View className='hotel-price'>
              <Text className='price-amount'>¥{hotel.minPrice}</Text>
              <Text className='price-unit'>起</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }
  
  return (
    <View className='hotel-list'>
      <View className='search-summary'>
        <Text className='summary-text'>
          共找到 {total} 个酒店
        </Text>
      </View>
      
      {renderFilterCard()}
      {renderFilterPanel()}
      
      {loading && qualifiedHotels.length === 0 ? (
        <View className='loading'>
          <Text>搜索中...</Text>
        </View>
      ) : qualifiedHotels.length === 0 ? (
        <View className='empty'>
          <Text>未找到符合条件的酒店</Text>
          <Text className='empty-tip'>建议尝试调整筛选条件</Text>
        </View>
      ) : (
        <ScrollView 
          className='hotel-scroll' 
          scrollY
          scrollWithAnimation
          onScrollToLower={loadMore}
        >
          <View className='main-content'>
            {qualifiedHotels.map(hotel => renderHotelItem(hotel, false))}
            
            {recommendedHotels.length > 0 && (
              <>
                <View className='section-divider'></View>
                <View className='section-header'>
                  <Text className='section-title'>以下酒店不满足条件，但为您推荐</Text>
                  <Text className='section-subtitle'>根据您的搜索偏好推荐</Text>
                </View>
                {recommendedHotels.map(hotel => renderHotelItem(hotel, true))}
              </>
            )}
            
            {hasMore && (
              <View className='load-more'>
                {loading ? <Text>加载中...</Text> : <Text>上拉加载更多</Text>}
              </View>
            )}
            
            {!hasMore && qualifiedHotels.length > 0 && (
              <View className='no-more'>
                <Text>没有更多了</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  )
}