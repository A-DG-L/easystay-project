import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, FileSearchOutlined, LogoutOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 菜单点击处理
  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      localStorage.clear();
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 左侧侧边栏 */}
      <Sider collapsible breakpoint="lg">
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign:'center', color:'white', lineHeight:'32px' }}>
          EasyStay Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={[
            {
              key: '/audit',
              icon: <FileSearchOutlined />,
              label: '酒店审核',
            },
            // 未来这里可以加 '商户管理'、'订单管理' 等
            {
              key: '/hotel-list', // 假设以后有这个
              icon: <UserOutlined />,
              label: '我的酒店(商户)',
            },
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: '退出登录',
              danger: true,
            },
          ]}
        />
      </Sider>

      {/* 右侧主体 */}
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '16px 16px' }}>
          {/* 核心魔法：Outlet 
             这里是“坑位”，子路由（Audit, UserList等）的内容会显示在这里 
          */}
          <div style={{ minHeight: 360 }}> 
            <Outlet /> 
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default BasicLayout;