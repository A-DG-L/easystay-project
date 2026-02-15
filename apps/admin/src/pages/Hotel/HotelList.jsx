// apps/admin/src/pages/Hotel/HotelList.jsx
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
  Upload,
  Image,
  Row,
  Col,
  Statistic,
  Badge,
  Select,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  ReloadOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../../utils/request';

const { TextArea } = Input;
const { Option } = Select;

const HotelList = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [roomForm] = Form.useForm();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [selectedHotel, setSelectedHotel] = useState(null);
  
  // 弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageList, setImageList] = useState([]);

  // 设施选项
  const facilityOptions = [
    '免费WiFi', '游泳池', '健身房', '含早餐', '接送机', 
    '24小时热水', '自助洗衣', '露台', '烧烤架', '投影仪',
    '宠物友好', '停车场', '水疗中心', '酒吧', '餐厅', 
    '商务中心', '客房服务'
  ];

  // 星级选项
  const starOptions = [1, 2, 3, 4, 5];

  // 状态标签颜色映射
  const statusColorMap = {
    pending: 'orange',    // 待审核
    published: 'green',   // 已发布
    rejected: 'red',      // 已拒绝
    draft: 'gray'         // 草稿
  };

  // 状态文字映射
  const statusTextMap = {
    pending: '待审核',
    published: '已发布',
    rejected: '已拒绝',
    draft: '草稿'
  };

  // 1. 加载酒店列表数据
  const fetchHotelList = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await request.get('/hotels/my-hotels', {
        params: { page, pageSize }
      });

      if (res.code === 200) {
        const list = res.data?.list || res.data || [];
        const total = res.data?.total || list.length;
       
        setData(list);

        setPagination({
          current: page,
          pageSize,
          total
        });
        
        if (list.length === 0) {
          message.info('您还没有发布任何酒店，快去发布吧！');
        }
      } else {
        message.error(res.msg || '获取酒店列表失败');
      }
    } catch (error) {
      console.error('获取酒店列表出错:', error);
      message.error('网络异常，请检查连接');
    } finally {
      setLoading(false);
    }
	
  };

  // 2. 删除酒店
  const handleDelete = async (id) => {
    try {
      const res = await request.delete(`/hotels/${id}`);
      
      if (res.code === 200) {
        message.success('删除成功');
        fetchHotelList(pagination.current, pagination.pageSize);
      } else {
        message.error(res.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除酒店出错:', error);
      message.error('删除失败，请稍后重试');
    }
  };

	// 编辑酒店 - 打开弹窗
	const handleEdit = (record) => {
	  setSelectedHotel(record);
	  setImageList(record.images || []);
	  
	  // 分离标准设施和自定义设施
	  const standardFacilities = record.facilities?.filter(f => facilityOptions.includes(f)) || [];
	  const customFacilities = record.facilities?.filter(f => !facilityOptions.includes(f)) || [];
	  form.setFieldsValue({
		name: record.name,
		address: record.address,
		starLevel: record.starLevel,
		openingTime: record.openingTime,
		description: record.description,
		minPrice: record.minPrice,
		facilities: standardFacilities,
    customFacilities: customFacilities
	  });
	  setEditModalVisible(true);
	};
  // 4. 提交编辑
  const handleEditSubmit = async (values) => {
    if (!selectedHotel) return;
    
    setLoading(true);
	const allFacilitiesList = [
		...(values.facilities || []),
		...(values.customFacilities || [])
	];

    const submitData = {
      ...values,
      starLevel: Number(values.starLevel),
      minPrice: Number(values.minPrice) || 0,
      facilities: allFacilitiesList,
      images: imageList
    };

    try {
      const res = await request.put(`/hotels/${selectedHotel._id}`, submitData);
      
      if (res.code === 200) {
        message.success('更新成功');
        setEditModalVisible(false);
        fetchHotelList(pagination.current, pagination.pageSize);
      } else {
        message.error(res.msg || '更新失败');
      }
    } catch (error) {
      console.error('更新酒店出错:', error);
      message.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 5. 图片上传处理
  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await request.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.code === 200) {
        const newImageUrl = res.data.url;
        setImageList(prev => [...prev, newImageUrl]);
        message.success('图片上传成功');
        return newImageUrl;
      } else {
        message.error(res.msg || '上传失败');
        return false;
      }
    } catch (error) {
      console.error('上传出错:', error);
      message.error('上传失败，请检查网络');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // 6. 删除图片
  const handleRemoveImage = (url) => {
    setImageList(imageList.filter(item => item !== url));
  };

  // 7. 添加房型 - 打开弹窗
  const handleAddRoom = (hotel) => {
    setSelectedHotel(hotel);
    roomForm.resetFields();
    setRoomModalVisible(true);
  };

  // 8. 提交房型
  const handleRoomSubmit = async (values) => {
    if (!selectedHotel) return;
    
    setLoading(true);
    const roomData = {
      ...values,
      hotelId: selectedHotel._id,
      price: Number(values.price),
      stock: Number(values.stock),
      size: Number(values.size)
    };

    try {
      const res = await request.post('/rooms', roomData);
      
      if (res.code === 200) {
        message.success('房型添加成功');
        setRoomModalVisible(false);
        roomForm.resetFields();
        
        // 更新当前酒店的房型数
        setData(prevData => 
          prevData.map(hotel => 
          hotel._id === selectedHotel._id 
            ? { ...hotel, roomCount: (hotel.roomCount || 0) + 1 }
            : hotel
          )
        );
		
        //fetchHotelList(pagination.current, pagination.pageSize); // 刷新列表更新房型数
      } else {
        message.error(res.msg || '添加房型失败');
      }
    } catch (error) {
      console.error('添加房型出错:', error);
      message.error('添加失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 9. 查看房型（可以链接到新的房型管理页）
  const handleViewRooms = (hotel) => {
    //message.info(`查看 ${hotel.name} 的房型，后续可以跳转到房型管理页`);
     navigate(`/hotel/${hotel._id}/rooms`);
  };

  // 10. 上传组件配置
  const uploadProps = {
    beforeUpload: async (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过5MB！');
        return false;
      }

      const result = await handleUpload(file);
      return result === false ? false : false;
    },
    showUploadList: false,
    disabled: uploading
  };

  // 11. 表格列定义
  const columns = [
    {
      title: '酒店信息',
      key: 'info',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {record.images?.[0] && (
            <Image
              src={record.images[0]}
              width={80}
              height={60}
              style={{ borderRadius: '4px', objectFit: 'cover', marginRight: '12px' }}
              preview={{
                mask: <EyeOutlined style={{ color: '#fff', fontSize: '16px' }} />,
                src: record.images[0]
              }}
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
              {record.name}
              <Tag 
                color={statusColorMap[record.status] || 'default'} 
                style={{ marginLeft: '8px', fontSize: '12px' }}
              >
                {statusTextMap[record.status] || record.status}
              </Tag>
            </div>
            <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
              <EnvironmentOutlined style={{ marginRight: '4px' }} />
              {record.address}
            </div>
            <div style={{ color: '#ff6b35' }}>
              {'★'.repeat(record.starLevel || 0)}
              <span style={{ color: '#999', marginLeft: '4px' }}>
                {record.starLevel || 0}星级
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '设施服务',
      dataIndex: 'facilities',
      key: 'facilities',
      render: (facilities) => (
        <div style={{ maxWidth: '200px' }}>
          {facilities && facilities.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {facilities.slice(0, 3).map(facility => (
                <Tag key={facility} color="blue" style={{ margin: 0, fontSize: '11px' }}>
                  {facility}
                </Tag>
              ))}
              {facilities.length > 3 && (
                <Tag color="default" style={{ fontSize: '11px' }}>
                  +{facilities.length - 3}
                </Tag>
              )}
            </div>
          ) : (
            <span style={{ color: '#999' }}>暂无设施</span>
          )}
        </div>
      )
    },
    {
      title: '状态统计',
      key: 'stats',
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px' }}>
            <Badge 
              status="success" 
              text={
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {record.roomCount || 0}
                </span>
              }
            />
            <div style={{ fontSize: '12px', color: '#666' }}>房型数</div>
          </div>
          <div>
            <Badge 
              status="processing" 
              text={
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {record.orderCount || 0}
                </span>
              }
            />
            <div style={{ fontSize: '12px', color: '#666' }}>订单数</div>
          </div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewRooms(record)}
            size="small"
          >
            房型
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => handleAddRoom(record)}
            size="small"
            style={{ color: '#52c41a' }}
          >
            加房型
          </Button>
          <Popconfirm
            title="确定要删除这个酒店吗？"
            description="删除后，该酒店的所有房型和订单也将被删除"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 12. 分页变化处理
  const handleTableChange = (pagination) => {
    fetchHotelList(pagination.current, pagination.pageSize);
  };

  // 13. 初始化加载数据
  useEffect(() => {
    fetchHotelList();
  }, []);

  // 14. 统计数据
  const statistics = {
    totalHotels: data.length,
    published: data.filter(item => item.status === 'published').length,
    pending: data.filter(item => item.status === 'pending').length
  };

  return (
    <div >
      {/* 顶部标题和操作区 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <HomeOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                我的酒店管理
              </span>
            </div>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchHotelList(pagination.current, pagination.pageSize)}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/hotel/publish')}
              >
                发布新酒店
              </Button>
            </Space>
          </div>
        }
        bordered={false}
        style={{ marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        {/* 统计数据 */}
        <Row gutter={16} style={{ marginBottom: '20px' }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="酒店总数"
                value={statistics.totalHotels}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="已发布"
                value={statistics.published}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="待审核"
                value={statistics.pending}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 酒店表格 */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 家酒店`,
            pageSizeOptions: ['5', '10', '20', '50']
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <HomeOutlined style={{ fontSize: '48px', color: '#ddd', marginBottom: '16px' }} />
                <div style={{ fontSize: '16px', color: '#999', marginBottom: '16px' }}>
                  您还没有发布任何酒店
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/hotel/publish')}
                >
                  去发布第一个酒店
                </Button>
              </div>
            )
          }}
        />
      </Card>

      {/* 编辑酒店弹窗 */}
	<Modal
	  title="编辑酒店信息"
	  open={editModalVisible}
	  onCancel={() => setEditModalVisible(false)}
	  footer={null}
	  width={800}
	  destroyOnClose
	>
	  <Form
		form={form}
		layout="vertical"
		onFinish={handleEditSubmit}
	  >
		<Row gutter={16}>
		  <Col span={12}>
			<Form.Item name="name" label="酒店名称" rules={[{ required: true }]}>
			  <Input placeholder="请输入酒店全称（包括英文）" />
			</Form.Item>
		  </Col>
		  <Col span={12}>
			<Form.Item name="openingTime" label="开业时间">
		      <Input placeholder="如：2020年1月1日" />
			</Form.Item>
		  </Col>
		</Row>

		<Form.Item name="address" label="详细地址" rules={[{ required: true }]}>
		  <Input placeholder="省/市/区/街道/门牌号" />
		</Form.Item>
		
		<Row gutter={16}>
		  <Col span={12}>
			<Form.Item name="starLevel" label="星级" rules={[{ required: true }]}>
			  <Select>
				{[1,2,3,4,5].map(star => (
				  <Option key={star} value={star}>{'★'.repeat(star)}</Option>
				))}
			  </Select>
			</Form.Item>
		  </Col>
		  <Col span={12}>
			<Form.Item name="minPrice" label="最低价格">
			  <InputNumber min={0} style={{ width: '100%' }} placeholder="元/晚" />
			</Form.Item>
		  </Col>
		</Row>

		<Form.Item name="description" label="酒店简介" rules={[{ required: true }]}>
		  <TextArea rows={3} />
		</Form.Item>

		<Form.Item name="facilities" label="配套设施">
		  <Select mode="multiple" placeholder="选择设施">
			{facilityOptions.map(f => (
			  <Option key={f} value={f}>{f}</Option>
			))}
		  </Select>
		</Form.Item>

		<Form.List name="customFacilities">
		  {(fields, { add, remove }) => (
			<>
			  {fields.map(({ key, name, ...restField }) => (
               <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Form.Item
				 {...restField}
                 name={[name]}
                 rules={[{ required: true, message: '请输入设施名称' }]}
                 style={{ flex: 1, marginBottom: 0 }}
              >
                <Input placeholder="自定义设施名称" />
              </Form.Item>
              <MinusCircleOutlined 
                onClick={() => remove(name)} 
                style={{ color: '#ff4d4f', fontSize: '16px', cursor: 'pointer' }}
              />
			</Space>
		 ))}
			<Form.Item>
			  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
				添加自定义设施
			  </Button>
			</Form.Item>
		   </>
		  )}
		</Form.List>

		<Form.Item label="酒店图片">
		  <Upload {...uploadProps}>
			<Button icon={<UploadOutlined />} loading={uploading}>上传图片</Button>
		  </Upload>
		  {imageList.length > 0 && (
			<div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
			  {imageList.map((url, i) => (
				<div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
				  <Image src={url} width={80} height={80} style={{ objectFit: 'cover' }} />
				  <Button type="text" danger size="small" onClick={() => handleRemoveImage(url)}
					style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.8)' }}>
					×
				  </Button>
				</div>
			  ))}
			</div>
		  )}
		</Form.Item>

		<Divider />
		<Form.Item>
		  <div style={{ textAlign: 'right' }}>
			<Space>
			  <Button onClick={() => setEditModalVisible(false)}>取消</Button>
			  <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
			</Space>
		  </div>
		</Form.Item>
	  </Form>
	</Modal>

      {/* 添加房型弹窗 */}
      <Modal
        title={`为 ${selectedHotel?.name || ''} 添加房型`}
        open={roomModalVisible}
        onCancel={() => setRoomModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={roomForm}
          layout="vertical"
          onFinish={handleRoomSubmit}
          initialValues={{
            stock: 10,
            size: 30
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="房型名称"
                rules={[{ required: true, message: '请输入房型名称' }]}
              >
                <Input placeholder="如：豪华大床房、标准双床房" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price"
                label="价格（元/晚）"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  min={0}
                  max={99999}
                  placeholder="请输入价格"
                  style={{ width: '100%' }}
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="stock"
                label="库存（间）"
                rules={[{ required: true, message: '请输入库存数量' }]}
              >
                <InputNumber
                  min={0}
                  max={999}
                  placeholder="可预订房间数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="size"
                label="面积（㎡）"
                rules={[{ required: true, message: '请输入房间面积' }]}
              >
                <InputNumber
                  min={0}
                  max={999}
                  placeholder="房间面积"
                  style={{ width: '100%' }}
                  addonAfter="㎡"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="imageUrl"
            label="房型图片"
          >
            <Input placeholder="输入图片URL或使用上传功能" />
          </Form.Item>


          <Divider />
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setRoomModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  添加房型
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HotelList;