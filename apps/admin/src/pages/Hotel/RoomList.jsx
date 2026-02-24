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
  Divider,
  Upload,
  DatePicker
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import request from '../../utils/request';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const RoomList = () => {
  const navigate = useNavigate();
  const { hotelId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [hotelInfo, setHotelInfo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const [inventoryRoom, setInventoryRoom] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);

  // 将后端返回的相对路径（/uploads/xxx.jpg）转换为可访问的完整 URL
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const normalized = url.startsWith('/') ? url : `/${url}`;
    // 与后端 baseURL 保持一致：http://localhost:3000
    return `http://localhost:3000${normalized}`;
  };

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

  // 房型图片上传
  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await request.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.code === 200) {
        const url = res.data.url;
        // 写回表单的 imageUrl 字段，统一使用本地 uploads 下的图片地址
        form.setFieldsValue({ imageUrl: url });
        message.success('图片上传成功');
        return url;
      } else {
        message.error(res.msg || '上传失败');
        return false;
      }
    } catch (error) {
      message.error('上传失败，请检查网络');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    beforeUpload: async (file) => {
      if (!file.type.startsWith('image/')) {
        message.error('只能上传图片文件！');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 5) {
        message.error('图片大小不能超过5MB！');
        return Upload.LIST_IGNORE;
      }
      const result = await handleUpload(file);
      // 返回 false 阻止 antd 自动上传，改为我们手动上传
      return result === false ? Upload.LIST_IGNORE : false;
    },
    showUploadList: false,
    disabled: uploading
  };

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

  // 获取某个房型在一段时间内的每日库存明细
  const fetchInventory = async (room, range) => {
    if (!room || !room._id) return;
    setInventoryLoading(true);
    try {
      const params = {};
      if (range && range.length === 2) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }

      const res = await request.get(`/rooms/${room._id}/inventory`, { params });
      if (res.code === 200 && res.data && Array.isArray(res.data.list)) {
        setInventoryData(res.data.list);
      } else {
        message.error('获取库存明细失败');
      }
    } catch (error) {
      message.error('获取库存明细失败');
    } finally {
      setInventoryLoading(false);
    }
  };

  const columns = [
    {
      title: '房型图片',
      key: 'image',
      width: 80,
      render: (_, record) => record.imageUrl ? (
        <Image src={getImageUrl(record.imageUrl)} width={60} height={60} style={{ objectFit: 'cover' }} />
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
          <Button
            type="link"
            onClick={() => {
              setInventoryRoom(record);
              setInventoryVisible(true);
              setInventoryData([]);
              // 默认让后端按今天起 7 天返回
              fetchInventory(record);
            }}
          >
            库存明细
          </Button>
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
            <Input placeholder="输入图片URL，或使用下方按钮上传" />
            <div style={{ marginTop: 8 }}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {uploading ? '上传中...' : '上传图片到服务器'}
                </Button>
              </Upload>
            </div>
            {form.getFieldValue('imageUrl') && (
              <div style={{ marginTop: 8 }}>
                <Image
                  src={getImageUrl(form.getFieldValue('imageUrl'))}
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                />
                <Button
                  type="link"
                  danger
                  style={{ padding: 0, marginTop: 4 }}
                  onClick={async () => {
                    const currentUrl = form.getFieldValue('imageUrl');
                    if (!currentUrl) return;
                    try {
                      const res = await request.delete('/upload', { data: { url: currentUrl } });
                      if (res.code === 200) {
                        message.success('图片已删除');
                        form.setFieldsValue({ imageUrl: '' });
                      } else {
                        message.error(res.msg || '删除失败');
                      }
                    } catch (error) {
                      message.error('删除失败');
                    }
                  }}
                >
                  删除图片
                </Button>
              </div>
            )}
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

      {/* 库存明细弹窗 */}
      <Modal
        title={inventoryRoom ? `${inventoryRoom.name} - 库存明细` : '库存明细'}
        open={inventoryVisible}
        onCancel={() => setInventoryVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <RangePicker
            onChange={(dates) => {
              if (!dates || dates.length !== 2 || !inventoryRoom) return;
              fetchInventory(inventoryRoom, dates);
            }}
          />
        </div>
        <Table
          dataSource={inventoryData}
          columns={[
            { title: '入住日期（按晚统计）', dataIndex: 'date', key: 'date' },
            { title: '总房量', dataIndex: 'total', key: 'total' },
            { title: '已预订', dataIndex: 'booked', key: 'booked' },
            { title: '可售', dataIndex: 'available', key: 'available' },
          ]}
          rowKey={(record) => record.date}
          loading={inventoryLoading}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default RoomList;