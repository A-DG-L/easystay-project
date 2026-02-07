import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.scss'

export default function LikesHistory() {
  useLoad(() => {
    console.log('收藏/浏览记录页面加载')
  })

  return (
    <View className='likes-history-page'>
      <View className='page-header'>
        <Text className='title'>收藏与浏览记录</Text>
      </View>
      
      <View className='content'>
        <Text>收藏和浏览记录页面内容</Text>
      </View>
    </View>
  )
}