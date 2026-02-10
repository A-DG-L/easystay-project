export default defineAppConfig({
  pages: [

    'pages/index/index',     //底部导航栏（首页）
    'pages/login/index',
    'pages/register/index',
    'pages/list/index',      //搜索后页面
    'pages/hotel-detail/index', //酒店详情 
    'pages/order/index',       //底部导航栏（订单）
    'pages/likes-history/index',    //底部导航栏（喜欢，浏览记录）
    'pages/my/index',     //底部导航栏（我的）
    'pages/edit/index',   //修改个人信息
    'pages/change-pwd/index',   //修改密码
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '易宿酒店',
    navigationBarTextStyle: 'black'
  },
  // tabBar 配置
  tabBar: {
    color: '#95a5a6',            // 未选中颜色
    selectedColor: '#5d6d7e',    // 选中颜色
    backgroundColor: '#ffffff',  // 背景色
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: '', 
        selectedIconPath: ''
      },
      {
        pagePath: 'pages/likes-history/index',
        text: '收藏',
        iconPath: '',
        selectedIconPath: ''
      },
      {
        pagePath: 'pages/order/index',
        text: '订单',
        iconPath: '',
        selectedIconPath: ''
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
        iconPath: '',
        selectedIconPath: ''
      }
    ]
  }

})
