import React, { useState } from 'react';
import { View, Input, Button, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import request from '../../utils/request';

// 1. 引入本地图片资源
import bgImg from '../../assets/images/register_bg_cny.jpg';

// 2. 引入专门为这个页面写的样式文件
import './index.scss';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!username || !password) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    // ... (注册逻辑保持不变) ...
    try {
        // 模拟请求
        console.log('Registering:', username, password);
        Taro.showToast({ title: '注册成功(模拟)', icon: 'success' });
         setTimeout(() => {
          Taro.navigateBack();
        }, 1000);
    } catch (error) {
        console.error(error);
    }
  };

  return (
    /* 最外层容器，设置背景图 */
    /* 注意：style 中使用模板字符串引入图片路径 */
    <View className="register-container" style={{ backgroundImage: `url(${bgImg})` }}>
      
      {/* 内容区域，这里面的内容会被 padding-top 挤到卷轴位置 */}
      <View className="scroll-content-area">
        
        {/* 标题部分 */}
        <View>
          <Text className="main-title">易宿酒店</Text>
          <Text className="sub-title">甲辰马年 · 迎新纳福</Text>
        </View>

        {/* 表单部分 - 使用新的 scroll 样式类名 */}
        <View className="cny-input-group-scroll">
          <Input 
            className="cny-input-scroll"
            placeholder="请输入用户名" 
            onInput={(e) => setUsername(e.detail.value)}
            // 提示文字颜色稍微深一点
            placeholderStyle="color: #998A7A;"
          />
        </View>

        <View className="cny-input-group-scroll">
          <Input 
            className="cny-input-scroll"
            placeholder="请设置登录密码" 
            password
            onInput={(e) => setPassword(e.detail.value)}
            placeholderStyle="color: #998A7A;"
          />
        </View>

        {/* 提交按钮 - 复用全局的 cny-btn-primary, 外面套一层View加阴影 */}
        <View className="register-btn-area">
            <Button 
            className="cny-btn-primary" 
            hoverClass="cny-btn-hover"
            onClick={handleRegister}
            >
            立即注册
            </Button>
        </View>

      </View>
    </View>
  );
}