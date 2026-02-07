import { View, Text } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import './index.scss'

export default function HotelDetail() {
  const router = useRouter()
  const hotelId = router.params?.id || ''

  useLoad(() => {
    console.log('酒店详情页面加载，酒店ID:', hotelId)
  })

  return (
    <View className='hotel-detail'>
      <Text>酒店详情页面</Text>
      <Text>当前酒店ID: {hotelId}</Text>
      <Text>这里将展示酒店详细信息</Text>
    </View>
  )
}