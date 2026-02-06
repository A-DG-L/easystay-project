import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
// import './index.scss'

export default function My() {
  useLoad(() => {
    console.log('我的页面加载')
  })

  return (
    <View className='my-page'>
      <View className='page-header'>
        <Text className='title'>个人中心</Text>
      </View>
      
      <View className='content'>
        <Text>个人中心页面内容</Text>
      </View>
    </View>
  )
}