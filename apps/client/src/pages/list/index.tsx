import { View, Text, ScrollView, Image, Input } from '@tarojs/components'
import { useLoad, useRouter, navigateTo } from '@tarojs/taro'
import { useState } from 'react'
import request from '../../utils/request'
import './index.scss'

// 后端基础地址，用于拼接相对图片路径
const BASE_URL = 'http://localhost:3000'

// 定义查询参数接口
interface SearchParams {
  city?: string;
  keyword?: string;
  minStar?: string;
  maxStar?: string;
  minPrice?: string;
  maxPrice?: string;
  minScore?: string;
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

// 将后端返回的图片路径转换为可访问的完整 URL
const getFullImageUrl = (url?: string): string => {
  if (!url) return ''
  // 已经是完整 URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // 统一补上前导斜杠
  const normalized = url.startsWith('/') ? url : `/${url}`
  return `${BASE_URL}${normalized}`
}

// 星级选项类型
interface StarOption {
  label: string;
  minStar: string;
  maxStar: string;
}

// 评分选项类型
interface ScoreOption {
  label: string;
  minScore: string;
}

// 价格选项类型
interface PriceOption {
  label: string;
  minPrice: string;
  maxPrice: string;
}

// 城市数据
const CITIES = [
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

// 热门城市（前10个）
const POPULAR_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '西安', '南京', '重庆', '厦门']

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
  const [allCities] = useState<string[]>(CITIES.map(city => city.label))
  
  // 星级选项配置
  const starOptions: StarOption[] = [
    { label: '不限星级', minStar: '0', maxStar: '5' },
    { label: '经济型(1-2星)', minStar: '1', maxStar: '2' },
    { label: '舒适型(3-4星)', minStar: '3', maxStar: '4' },
    { label: '豪华型(5星)', minStar: '5', maxStar: '5' }
  ]
  
  // 评分选项配置
  const scoreOptions: ScoreOption[] = [
    { label: '不限评分', minScore: '0' },
    { label: '4.5分以上', minScore: '4.5' },
    { label: '4.0分以上', minScore: '4.0' },
    { label: '3.5分以上', minScore: '3.5' }
  ]
  
  // 价格选项配置
  const priceOptions: PriceOption[] = [
    { label: '不限价格', minPrice: '0', maxPrice: '99999' },
    { label: '300元以下', minPrice: '0', maxPrice: '300' },
    { label: '300-500元', minPrice: '300', maxPrice: '500' },
    { label: '500-800元', minPrice: '500', maxPrice: '800' },
    { label: '800-1200元', minPrice: '800', maxPrice: '1200' },
    { label: '1200元以上', minPrice: '1200', maxPrice: '99999' }
  ]

  // 解码URL参数
  const decodeParams = (params: any): SearchParams => {
    const decoded: SearchParams = {}
    
    Object.keys(params).forEach(key => {
      const value = params[key]
      if (typeof value === 'string') {
        try {
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
      addFilter('minPrice', params.minPrice ? Number(params.minPrice) : null)
      addFilter('maxPrice', params.maxPrice ? Number(params.maxPrice) : null)
      addFilter('minScore', params.minScore ? Number(params.minScore) : null)
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
        
        setTotal(res.data.total || qualified.length)
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
      
      // 验证价格
      if (isQualified && params.minPrice && params.maxPrice) {
        const minPrice = Number(params.minPrice)
        const maxPrice = Number(params.maxPrice)
        
        if (hotel.minPrice < minPrice || hotel.minPrice > maxPrice) {
          isQualified = false
        }
      }
      
      // 验证评分
      if (isQualified && params.minScore) {
        const minScore = Number(params.minScore)
        const hotelScore = hotel.score || 0
        
        if (hotelScore < minScore) {
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
        
        // 价格接近加分
        if (params.minPrice && params.maxPrice) {
          const minPrice = Number(params.minPrice)
          const maxPrice = Number(params.maxPrice)
          const targetPrice = (minPrice + maxPrice) / 2
          const priceDiff = Math.abs(hotel.minPrice - targetPrice) / 100
          score += Math.max(0, 5 - priceDiff)
        }
        
        // 高评分酒店加分
        if (hotel.score && hotel.score >= 4.5) {
          score += 3
        } else if (hotel.score && hotel.score >= 4.0) {
          score += 2
        } else if (hotel.score && hotel.score >= 3.5) {
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
    
    if (filterParams.minPrice && filterParams.maxPrice) {
      const minPrice = Number(filterParams.minPrice)
      const maxPrice = Number(filterParams.maxPrice)
      
      if (hotel.minPrice < minPrice) {
        reasons.push(`价格低于${minPrice}元`)
      } else if (hotel.minPrice > maxPrice) {
        reasons.push(`价格高于${maxPrice}元`)
      }
    }
    
    if (filterParams.minScore) {
      const minScore = Number(filterParams.minScore)
      const hotelScore = hotel.score || 0
      
      if (hotelScore < minScore) {
        reasons.push(`评分低于${minScore}分`)
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
  
  // 跳转到酒店详情页
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
  
  // 获取价格描述
  const getPriceDescription = () => {
    if (!filterParams.minPrice || !filterParams.maxPrice) return '不限价格'
    
    const minPrice = Number(filterParams.minPrice)
    const maxPrice = Number(filterParams.maxPrice)
    
    if (minPrice === 0 && maxPrice === 99999) return '不限价格'
    if (minPrice === 0 && maxPrice === 300) return '300元以下'
    if (minPrice === 1200 && maxPrice === 99999) return '1200元以上'
    
    return `${minPrice}-${maxPrice}元`
  }
  
  // 获取评分描述
  const getScoreDescription = () => {
    if (!filterParams.minScore) return '不限评分'
    
    const minScore = Number(filterParams.minScore)
    
    if (minScore === 4.5) return '4.5分以上'
    if (minScore === 4.0) return '4.0分以上'
    if (minScore === 3.5) return '3.5分以上'
    
    return `${minScore}分以上`
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
  
  // 选择临时评分
  const selectTempScoreOption = (option: ScoreOption) => {
    updateTempFilter('minScore', option.minScore)
  }
  
  // 选择临时价格
  const selectTempPriceOption = (option: PriceOption) => {
    updateTempFilter('minPrice', option.minPrice)
    updateTempFilter('maxPrice', option.maxPrice)
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
  
  // 检查评分选项是否选中
  const isScoreOptionSelected = (option: ScoreOption) => {
    const currentMin = tempFilterParams.minScore || '0'
    return option.minScore === currentMin
  }
  
  // 检查价格选项是否选中
  const isPriceOptionSelected = (option: PriceOption) => {
    const currentMin = tempFilterParams.minPrice || '0'
    const currentMax = tempFilterParams.maxPrice || '99999'
    return option.minPrice === currentMin && option.maxPrice === currentMax
  }
  
  // 渲染筛选条件卡片
  const renderFilterCard = () => {
    const hasFilters = filterParams.city || filterParams.keyword || 
                      filterParams.minStar || filterParams.minPrice || 
                      filterParams.minScore || filterParams.checkInDate
    
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
          
          {filterParams.minPrice && filterParams.maxPrice && (
            <View className='filter-item'>
              <Text className='filter-label'>价格：</Text>
              <Text className='filter-value'>{getPriceDescription()}</Text>
            </View>
          )}
          
          {filterParams.minScore && (
            <View className='filter-item'>
              <Text className='filter-label'>评分：</Text>
              <Text className='filter-value'>{getScoreDescription()}</Text>
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
              {/* 城市选择 */}
              <View className='panel-section'>
                <Text className='section-title'>选择城市</Text>
                
                {/* 热门城市 */}
                <View className='city-group'>
                  <Text className='group-label'>热门城市</Text>
                  <View className='city-options'>
                    {POPULAR_CITIES.map((city) => (
                      <View 
                        key={city}
                        className={`city-option ${tempFilterParams.city === city ? 'active' : ''}`}
                        onClick={() => selectTempCity(city)}
                      >
                        <Text className='city-text'>{city}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                {/* 全部城市 */}
                <View className='city-group'>
                  <Text className='group-label'>全部城市</Text>
                  <View className='city-options-scroll'>
                    {allCities.map((city) => (
                      <View 
                        key={city}
                        className={`city-option ${tempFilterParams.city === city ? 'active' : ''}`}
                        onClick={() => selectTempCity(city)}
                      >
                        <Text className='city-text'>{city}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <View className='custom-city'>
                  <Text className='city-hint'>支持以上所有城市，也可输入关键词搜索</Text>
                </View>
              </View>
              
              {/* 星级选择 */}
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
              
              {/* 价格选择 */}
              <View className='panel-section'>
                <Text className='section-title'>价格范围</Text>
                <View className='price-options'>
                  {priceOptions.map((option) => (
                    <View 
                      key={option.label}
                      className={`price-option ${isPriceOptionSelected(option) ? 'active' : ''}`}
                      onClick={() => selectTempPriceOption(option)}
                    >
                      <Text className='option-text'>{option.label}</Text>
                      {isPriceOptionSelected(option) && <Text className='check-mark'>✓</Text>}
                    </View>
                  ))}
                </View>
              </View>
              
              {/* 评分选择 */}
              <View className='panel-section'>
                <Text className='section-title'>用户评分</Text>
                <View className='score-options'>
                  {scoreOptions.map((option) => (
                    <View 
                      key={option.label}
                      className={`score-option ${isScoreOptionSelected(option) ? 'active' : ''}`}
                      onClick={() => selectTempScoreOption(option)}
                    >
                      <Text className='option-text'>{option.label}</Text>
                      {isScoreOptionSelected(option) && <Text className='check-mark'>✓</Text>}
                    </View>
                  ))}
                </View>
              </View>
              
              {/* 关键词搜索 - 加高搜索栏 */}
              <View className='panel-section'>
                <Text className='section-title'>关键词搜索</Text>
                <View className='keyword-input-container'>
                  <Input
                    className='keyword-input'
                    type='text'
                    placeholder='输入酒店名、地址等关键词'
                    value={tempFilterParams.keyword || ''}
                    onInput={handleTempKeywordChange}
                    placeholderStyle='color: #95a5a6; font-size: 28rpx;'
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
          src={getFullImageUrl(hotel.images?.[0])}
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
              <Text className='rating-score'>{hotel.score?.toFixed(1) || '4.5'}</Text>
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