import React, { useEffect, useState } from 'react';
import { Table, Button, message, Tag, Space, Card, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
// 1. 引入请求工具 (保持和其他文件一致)
import request from '../utils/request'; 

const Audit = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // 2. 定义获取待审核酒店的函数
  const fetchPendingHotels = async () => {
    setLoading(true);
    try {
      // 注意：这里假设你的后端接口地址是 /hotels/pending
      // 如果后端接口是 /admin/hotels/pending 或者其他，请对应修改
      const res = await request.get('/hotels/pending'); 
      
      if (res.code === 200) {
        // 兼容处理：后端可能直接返回数组，也可能返回 { list: [] }
        const list = res.data?.list || res.data || [];
        setData(list);
      }
    } catch (error) {
      console.error(error);
      message.error('获取待审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 3. 页面加载时调用接口，而不是设置假数据
  useEffect(() => {
    fetchPendingHotels();
  }, []);

  // 4. 审核处理（通过或拒绝）
  const handleAudit = (record, status) => {
    // status 参数: 'published' (通过) 或 'rejected' (拒绝) 
    // 注意：你的数据库截图里拒绝状态用的 rejectReason，这里根据业务逻辑调整
    // 原代码里拒绝写的 'offline'，建议统一状态枚举，这里暂时用 'rejected'
    const targetStatus = status === 'published' ? 'published' : 'rejected';

    Modal.confirm({
      title: targetStatus === 'published' ? '通过审核?' : '拒绝申请?',
      icon: <ExclamationCircleOutlined />,
      content: `确定要${targetStatus === 'published' ? '通过' : '拒绝'} "${record.name}" 的发布申请吗？`,
      onOk: async () => {
        try {
          // 发送请求给后端修改状态
          // 假设接口是 PATCH /hotels/:id/status
          const res = await request.patch(`/hotels/${record._id}/status`, { 
            status: targetStatus 
          });

          if (res.code === 200) {
            message.success('操作成功');
            // 操作成功后重新拉取列表，确保数据同步
            fetchPendingHotels(); 
          } else {
            message.error(res.msg || '操作失败');
          }
        } catch (error) {
          console.error(error);
          message.error('网络异常，操作失败');
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
      title: '提交时间', 
      // 数据库截图里没有 createdAt，如果有 openingTime 可以显示，或者显示空
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (text) => <span style={{ color: '#999' }}>{text ? new Date(text).toLocaleDateString() : '-'}</span>
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
            onClick={() => handleAudit(record, 'rejected')}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#1f1f1f' }}>酒店审核控制台</h2>
        <span style={{ color: '#666' }}>管理员可以在此通过或拒绝商户的酒店发布申请</span>
      </div>

      <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无待审核酒店' }}
        />
      </Card>
    </div>
  );
};

export default Audit;