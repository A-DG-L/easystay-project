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
    'pages/booking/index',    //预订页面
    'pages/my-comments/index'    //我的评论页面
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#9B111E', // ⚡️ 改为与背景一致的宝石红
    navigationBarTitleText: '易宿酒店',
    navigationBarTextStyle: 'white'          // ⚡️ 文字颜色改为白色
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
        iconPath: 'assets/icons/home_unselected.png', 
        selectedIconPath: 'assets/icons/home_selected.png'
      },
      {
        pagePath: 'pages/likes-history/index',
        text: '记录',
        iconPath: 'assets/icons/history_unselected.png',
        selectedIconPath: 'assets/icons/history_selected.png'
      },
      {
        pagePath: 'pages/order/index',
        text: '订单',
        iconPath: 'assets/icons/order_unselected.png',
        selectedIconPath: 'assets/icons/order_selected.png'
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
        iconPath: 'assets/icons/my_unselected.png',
        selectedIconPath: 'assets/icons/my_selected.png'
      }
    ]
  }

})
