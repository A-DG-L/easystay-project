import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.scss'

export default function Order() {
  useLoad(() => {
    console.log('订单页面加载')
  })

  return (
    <View className='order-page'>
      <View className='page-header'>
        <Text className='title'>我的订单</Text>
      </View>
      
      <View className='content'>
        <Text>订单页面内容</Text>
      </View>
    </View>
  )
}