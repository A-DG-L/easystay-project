// apps/admin/src/components/Layout.jsx
import React from 'react';
import { Layout, Menu, Button, Tag } from 'antd'; // 添加 Button 和 Tag 的导入
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UnorderedListOutlined,
  AuditOutlined,
  LogoutOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const AppLayout = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');



  const menuItems = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: <Link to="/dashboard">控制面板</Link>
    },
    {
      key: '/hotel',
      icon: <UnorderedListOutlined />,
      label: '酒店管理',
      children: [
        {
          key: '/hotel/publish',
          label: <Link to="/hotel/publish">发布酒店</Link>
        },
        {
          key: '/hotel/list',
          label: <Link to="/hotel/list">我的酒店</Link>
        }
      ]
    },
    {
      key: '/audit',
      icon: <AuditOutlined />,
      label: <Link to="/audit">审核管理</Link>,
      hidden: user.role !== 'admin'
    }
  ];

  // 过滤掉隐藏的菜单项
  const filteredMenuItems = menuItems.filter(item => !item.hidden);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light" collapsible>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: 0, color: '#1890ff' }}>易宿酒店</h2>
          <div style={{ fontSize: '12px', color: '#666' }}>商户后台</div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/hotel']}
          items={filteredMenuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          height: '64px',
          lineHeight: '64px'
        }}>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              欢迎回来，{user.username || '商户'}
            </span>
            <Tag color="blue" style={{ marginLeft: '12px' }}>
              {user.role === 'merchant' ? '商户' : '管理员'}
            </Tag>
          </div>
          <div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
            >
              退出登录
            </Button>
          </div>
        </Header>
        <Content className="app-content" style={{ overflow: 'auto' }}>
			    <Outlet />
		    </Content> 
      </Layout>
    </Layout>
  );
};

export default AppLayout;