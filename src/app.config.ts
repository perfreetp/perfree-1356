export default defineAppConfig({
  pages: [
    'pages/risk/index',
    'pages/warmup/index',
    'pages/training/index',
    'pages/pain/index',
    'pages/profile/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#10B981',
    navigationBarTitleText: '运动损伤预防',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F0FDF4'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#10B981',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/risk/index',
        text: '风险自测'
      },
      {
        pagePath: 'pages/warmup/index',
        text: '动作热身'
      },
      {
        pagePath: 'pages/training/index',
        text: '训练计划'
      },
      {
        pagePath: 'pages/pain/index',
        text: '疼痛记录'
      },
      {
        pagePath: 'pages/profile/index',
        text: '个人档案'
      }
    ]
  }
})
