// apps/admin/src/pages/Hotel/RoomList.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Popconfirm,
  Modal,
  Form,
  Input,
  InputNumber,
  Image,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import request from '../../utils/request';

const { TextArea } = Input;

const RoomList = () => {
  const navigate = useNavigate();
  const { hotelId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [hotelInfo, setHotelInfo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // 获取房型列表
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await request.get('/rooms', { params: { hotelId } });
      if (res.code === 200) {
        setRooms(res.data || []);
      }
    } catch (error) {
      message.error('获取房型失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取酒店信息
  const fetchHotelInfo = async () => {
    try {
      const res = await request.get(`/hotels/${hotelId}`);
      if (res.code === 200) {
        setHotelInfo(res.data);
      }
    } catch (error) {
      message.error('获取酒店信息失败');
    }
  };

  useEffect(() => {
    if (hotelId) {
      fetchHotelInfo();
      fetchRooms();
    }
  }, [hotelId]);

  // 添加/编辑房型
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const url = editingRoom ? `/rooms/${editingRoom._id}` : '/rooms';
      const method = editingRoom ? 'put' : 'post';
      const data = {
        ...values,
        hotelId,
        price: Number(values.price),
        stock: Number(values.stock),
        size: Number(values.size)
      };

      const res = await request[method](url, data);
      
      if (res.code === 200) {
        message.success(editingRoom ? '更新成功' : '添加成功');
        setModalVisible(false);
        form.resetFields();
        setEditingRoom(null);
        fetchRooms();
      }
    } catch (error) {
      message.error(editingRoom ? '更新失败' : '添加失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除房型
  const handleDelete = async (id) => {
    try {
      const res = await request.delete(`/rooms/${id}`);
      if (res.code === 200) {
        message.success('删除成功');
        fetchRooms();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '房型图片',
      key: 'image',
      width: 80,
      render: (_, record) => record.imageUrl ? (
        <Image src={record.imageUrl} width={60} height={60} style={{ objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 60, height: 60, background: '#f0f0f0', textAlign: 'center', lineHeight: '60px' }}>暂无</div>
      )
    },
    {
      title: '房型名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '价格(元/晚)',
      dataIndex: 'price',
      key: 'price',
      render: price => `¥${price}`
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
    },
    {
      title: '面积(㎡)',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRoom(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个房型吗？"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div >
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/hotel/list')}
              style={{ marginRight: '16px' }}
            />
            <span>
              {hotelInfo?.name || '加载中...'} - 房型管理
            </span>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRoom(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            添加房型
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rooms}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 添加/编辑房型弹窗 */}
      <Modal
        title={editingRoom ? '编辑房型' : '添加房型'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ stock: 10, size: 30 }}
        >
          <Form.Item name="name" label="房型名称" rules={[{ required: true }]}>
            <Input placeholder="如：豪华大床房" />
          </Form.Item>
          
          <Form.Item name="price" label="价格(元/晚)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="stock" label="库存(间)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="size" label="面积(㎡)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="㎡" />
          </Form.Item>
          
          <Form.Item name="imageUrl" label="房型图片">
            <Input placeholder="输入图片URL" />
          </Form.Item>
          
          <Divider />
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setModalVisible(false)}>取消</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  确定
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomList;