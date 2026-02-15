import React, { useEffect, useState } from 'react';
import { Table, Button, message, Tag, Space, Card, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
// import axios from '../utils/request'; // 记得解开这个注释

const Audit = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // 模拟数据 (为了让你立刻看到效果，不再显示 No Data)
  // 等接口通了，把这里删掉，用下面的 fetchPendingHotels
  useEffect(() => {
    setData([
      { _id: '1', name: '希尔顿大酒店', address: '北京市朝阳区建国路', status: 'pending', createdAt: '2023-10-01' },
      { _id: '2', name: '全季酒店(西湖店)', address: '杭州市西湖区', status: 'pending', createdAt: '2023-10-02' },
      { _id: '3', name: '橘子水晶', address: '上海市浦东新区', status: 'pending', createdAt: '2023-10-05' },
    ]);
  }, []);

  /* const fetchPendingHotels = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/hotels/pending');
      if(res.code === 200) setData(res.data || []);
    } catch (error) {
      message.error('获取列表失败');
    } finally {
      setLoading(false);
    }
  };
  */

  // 审核处理
  const handleAudit = (record, status) => {
    Modal.confirm({
      title: status === 'published' ? '通过审核?' : '拒绝申请?',
      icon: <ExclamationCircleOutlined />,
      content: `确定要${status === 'published' ? '通过' : '拒绝'} "${record.name}" 的发布申请吗？`,
      onOk: async () => {
        try {
          // await axios.patch(`/api/hotels/${record._id}/status`, { status });
          message.success('操作成功 (模拟)');
          // fetchPendingHotels(); // 刷新列表
          
          // 模拟前端移除该条目效果
          setData(prev => prev.filter(item => item._id !== record._id));
        } catch (error) {
          message.error('操作失败');
        }
      }
    });
  };

  const columns = [
    { 
      title: '酒店名称', 
      dataIndex: 'name', 
      key: 'name',
      fontWeight: 'bold'
    },
    { 
      title: '地址', 
      dataIndex: 'address', 
      key: 'address' 
    },
    { 
      title: '申请时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (text) => <span style={{ color: '#999' }}>{text || '刚刚'}</span>
    },
    { 
      title: '当前状态', 
      dataIndex: 'status', 
      key: 'status',
      render: () => <Tag color="orange" icon={<ExclamationCircleOutlined />}>待审核</Tag> 
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            shape="round"
            icon={<CheckCircleOutlined />}
            onClick={() => handleAudit(record, 'published')}
          >
            通过
          </Button>
          <Button 
            danger 
            shape="round"
            icon={<CloseCircleOutlined />}
            onClick={() => handleAudit(record, 'offline')}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  return (
    // 最外层容器：给一个内边距，让内容不要贴边
    <div style={{ padding: '24px' }}>
      
      {/* 头部标题区：也可以用 PageHeader 组件 */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#1f1f1f' }}>酒店审核控制台</h2>
        <span style={{ color: '#666' }}>管理员可以在此通过或拒绝商户的酒店发布申请</span>
      </div>

      {/* 核心内容区：用 Card 包裹 Table */}
      <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 5 }} // 分页配置
        />
      </Card>
    </div>
  );
};

export default Audit;