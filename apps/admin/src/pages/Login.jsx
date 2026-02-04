import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import request from '../utils/request';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 1. 调用登录接口
      const res = await request.post('/auth/login', values);

      if (res.code === 200) {
        message.success('登录成功！');
        
        // --- 核心逻辑开始 ---
        const { token, user } = res.data;

        // 2. 存 Token 和用户信息到浏览器缓存 (localStorage)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // 3. 根据角色 (Role) 进行路由跳转
        // merchant -> 去商户后台
        // admin    -> 去管理员审核后台
        // user     -> 报错 (普通用户应该去手机端)
        switch (user.role) {
          case 'merchant':
            navigate('/dashboard'); // 暂时都去 dashboard，后面可以拆分
            break;
          case 'admin':
            navigate('/dashboard'); // 暂时都去 dashboard
            break;
          case 'user':
            message.warning('检测到您是普通用户，请前往手机端 App 进行预订！');
            localStorage.clear(); // 清除刚刚存的 token
            break;
          default:
            message.error('角色异常，请联系客服');
        }
        // --- 核心逻辑结束 ---

      } else {
        message.error(res.msg || '登录失败');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container"> {/* 使用刚才写的 CSS 类名 */}
      <Card className="auth-card">
        <div className="auth-title">易宿酒店管理后台</div>
        
        <Alert 
          message="温馨提示：这是商户/管理员专用入口" 
          type="info" 
          showIcon 
          style={{ marginBottom: 24 }} 
        />

        <Form
          name="login"
          size="large" // 变大一点，好看
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              立即登录
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center' }}>
            <Link to="/register">我是商户，我要入驻 (注册)</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;