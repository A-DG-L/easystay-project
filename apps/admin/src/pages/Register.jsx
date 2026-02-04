import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, message } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import request from '../utils/request';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 调用注册接口
      const res = await request.post('/auth/register', values);
      
      if (res.code === 200) {
        message.success('注册成功，请登录');
        navigate('/login');
      } else {
        message.error(res.msg || '注册失败');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card" title="新用户注册">
        <Form 
          onFinish={onFinish} 
          size="large"
          layout="vertical" // 表单上下排列，更适合 B 端
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item 
            name="role" 
            label="选择角色" 
            initialValue="merchant"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="merchant">我是商户 (主要测试这个)</Select.Option>
              <Select.Option value="admin">我是管理员 (审核用)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              提交注册
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">已有账号？返回登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;