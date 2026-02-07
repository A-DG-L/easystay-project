import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.scss'

export default function HotelList() {
  useLoad(() => {
    console.log('酒店列表页面加载')
  })

  return (
    <View className='hotel-list'>
      <Text>酒店列表页面</Text>
      <Text>这里将展示所有酒店信息</Text>
    </View>
  )
}