// apps/admin/src/pages/Hotel/HotelPublish.jsx

import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Upload,
  Select,
  Tag,
  message,
  Space,
  Divider,
  Row,
  Col
} from 'antd';
import {
  UploadOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../../utils/request';

const { TextArea } = Input;
const { Option } = Select;

const HotelPublish = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageList, setImageList] = useState([]);
  const [allFacilities, setAllFacilities] = useState([]); // 合并后的所有设施

  // 标准设施选项
  const facilityOptions = [
    '免费WiFi', '游泳池', '健身房', '含早餐', '接送机', 
    '24小时热水', '自助洗衣', '露台', '烧烤架', '投影仪',
    '宠物友好', '停车场', '水疗中心', '酒吧', '餐厅', 
    '商务中心', '客房服务'
  ];

  // 图片上传处理
  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await request.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
      message.error('上传失败，请检查网络');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // 删除图片
  const handleRemoveImage = (url) => {
    setImageList(imageList.filter(item => item !== url));
  };

  // 更新所有设施列表
  const updateAllFacilities = (selected, customList) => {
    const all = [...(selected || []), ...(customList || [])];
    setAllFacilities(all);
  };

  // 表单提交
  const onFinish = async (values) => {
    if (imageList.length === 0) {
      message.warning('请至少上传一张酒店图片');
      return;
    }

    setLoading(true);
    
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    
    // 合并所有设施
    const allFacilitiesList = [
      ...(values.facilities || []),
      ...(values.customFacilities || [])
    ];

    const submitData = {
      merchantId: userInfo.id || userInfo._id,
      name: values.name,
      address: values.address,
      starLevel: Number(values.starLevel),
      openingTime: values.openingTime,
      description: values.description,
      minPrice: Number(values.minPrice) || 0,
      facilities: allFacilitiesList,  // 合并后的设施列表
      images: imageList,
      score: 4.5,  // 默认评分
      status: 'pending'  // 默认为审核中
    };

    console.log('提交数据:', submitData);

    try {
      const res = await request.post('/hotels', submitData);
      
      if (res.code === 200) {
        message.success('酒店提交成功，等待审核！');
        form.resetFields();
        setImageList([]);
        setAllFacilities([]);
        navigate('/hotel/list');
      } else {
        message.error(res.msg || '提交失败');
      }
    } catch (error) {
      message.error('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 上传组件配置
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
      return result === false ? Upload.LIST_IGNORE : false;
    },
    showUploadList: false,
    disabled: uploading
  };

  return (
    <div>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              发布新酒店
            </span>
            <Button
              type="link"
              onClick={() => navigate('/hotel/list')}
              style={{ marginLeft: 'auto' }}
            >
              返回酒店列表
            </Button>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            starLevel: 3,
            facilities: ['免费WiFi']
          }}
        >
          <Row gutter={24}>
            {/* 左侧列 */}
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="酒店名称"
                rules={[{ required: true, message: '请输入酒店名称' }]}
              >
                <Input placeholder="请输入酒店全称（包括英文）" size="large" />
              </Form.Item>

              <Form.Item
                name="address"
                label="详细地址"
                rules={[{ required: true, message: '请输入酒店地址' }]}
              >
                <Input placeholder="省/市/区/街道/门牌号" size="large" />
              </Form.Item>

              
              <Form.Item
                name="openingTime"
                label="开业时间"
                rules={[{ required: true, message: '请输入酒店开业时间' }]}
              >
                <Input placeholder="如：2020年1月1日" size="large" />
              </Form.Item>


              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="starLevel"
                    label="星级"
                    rules={[{ required: true }]}
                  >
                    <Select size="large">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Option key={star} value={star}>
                          {'★'.repeat(star)}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    name="minPrice"
                    label="最低价格"
                    rules={[
                      { required: false },
                      { type: 'number', min: 0, max: 99999, message: '价格范围0-99999' }
                    ]}
                  >
                    <InputNumber
                      placeholder="元/晚"
                      size="large"
                      style={{ width: '100%' }}
                      min={0}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="酒店简介"
                rules={[{ required: true, message: '请输入酒店简介' }]}
              >
                <TextArea
                  placeholder="请输入酒店的详细描述，包括特色、服务等"
                  rows={4}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>
            </Col>

            {/* 右侧列 */}
            <Col xs={24} md={12}>
              {/* 图片上传 */}
              <Form.Item
                label="酒店图片"
                required
                extra="建议上传酒店外观、大堂、客房等图片，每张不超过5MB"
              >
                <div>
                  <Upload {...uploadProps}>
                    <Button
                      icon={<UploadOutlined />}
                      loading={uploading}
                      size="large"
                    >
                      {uploading ? '上传中...' : '上传图片'}
                    </Button>
                  </Upload>

                  {imageList.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {imageList.map((url, index) => (
                        <div
                          key={index}
                          style={{
                            position: 'relative',
                            width: '100px',
                            height: '100px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid #d9d9d9'
                          }}
                        >
                          <img
                            src={url}
                            alt={`酒店图片${index + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => handleRemoveImage(url)}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              backgroundColor: 'rgba(255,255,255,0.8)'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Form.Item>

              <Divider />

              {/* 设施选择 */}
              <Form.Item
                name="facilities"
                label="配套设施"
                extra="选择酒店提供的设施和服务"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择设施"
                  size="large"
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    const custom = form.getFieldValue('customFacilities') || [];
                    updateAllFacilities(value, custom);
                  }}
                  tagRender={({ label, onClose }) => (
                    <Tag closable onClose={onClose} style={{ marginRight: 3 }}>{label}</Tag>
                  )}
                >
                  {facilityOptions.map(facility => (
                    <Option key={facility} value={facility}>{facility}</Option>
                  ))}
                </Select>
              </Form.Item>

              {/* 自定义设施 */}
              <Form.Item label="添加自定义设施">
                <Form.List name="customFacilities">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name]}
                            rules={[{ required: true, message: '请输入设施名称' }]}
                          >
                            <Input 
                              placeholder="设施名称" 
                              onChange={() => {
                                const facilities = form.getFieldValue('facilities') || [];
                                const custom = form.getFieldValue('customFacilities') || [];
                                updateAllFacilities(facilities, custom);
                              }}
                            />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => {
                            remove(name);
                            const facilities = form.getFieldValue('facilities') || [];
                            const custom = form.getFieldValue('customFacilities') || [];
                            updateAllFacilities(facilities, custom);
                          }} />
                        </Space>
                      ))}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          block
                          icon={<PlusOutlined />}
                        >
                          添加自定义设施
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          
          {/* 提交按钮 */}
          <Form.Item>
            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{ width: '200px' }}
                >
                  {loading ? '提交中...' : '提交审核'}
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setImageList([]);
                    setAllFacilities([]);
                  }}
                  size="large"
                >
                  重置
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default HotelPublish;