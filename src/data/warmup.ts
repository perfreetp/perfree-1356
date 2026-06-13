import { WarmupAction } from '@/types';

export const WARMUP_ACTIONS: WarmupAction[] = [
  {
    id: 'w1',
    name: '动态弓步走',
    sportTypes: ['running', 'ball', 'fitness'],
    duration: 60,
    description: '激活髋屈肌和股四头肌，提升下肢活动范围',
    steps: ['自然站立，双手叉腰', '向前迈出一大步呈弓步姿势', '后侧膝盖尽量接近地面', '停留1秒后换腿继续前行', '每侧完成10-12步'],
    mistakes: ['前腿膝盖超过脚尖过多', '身体前倾弯腰驼背', '后腿膝盖直接着地', '步幅过小无效果'],
    tips: ['保持躯干直立，核心收紧', '步幅以感到髋部牵拉为宜', '初学者可扶墙保持平衡'],
    targetParts: ['hip', 'knee', 'calf']
  },
  {
    id: 'w2',
    name: '高抬腿跑',
    sportTypes: ['running', 'ball'],
    duration: 45,
    description: '激活核心肌群，提升心率，预热下肢爆发力',
    steps: ['原地站立，双臂自然摆动', '大腿交替抬高至与地面平行', '前脚掌着地，快速交替', '配合摆臂保持节奏', '持续30-45秒'],
    mistakes: ['脚跟落地冲击过大', '大腿抬高不够', '身体后仰腰部放松', '摆臂幅度过小'],
    tips: ['保持核心收紧，身体微微前倾', '频率由慢到快逐步加速', '落地时注意缓冲减震'],
    targetParts: ['calf', 'knee', 'hip']
  },
  {
    id: 'w3',
    name: '开合跳',
    sportTypes: ['running', 'ball', 'fitness'],
    duration: 45,
    description: '全身热身动作，快速提升心率和体温',
    steps: ['自然站立，双脚并拢', '跳起时双脚向两侧分开', '同时双手举过头顶', '落地时双脚并拢手回落', '重复进行保持节奏'],
    mistakes: ['落地时膝盖锁死', '跳得过高消耗过多', '弓背塌腰姿势变形', '动作幅度过小'],
    tips: ['落地时膝盖微屈缓冲', '保持均匀呼吸，配合动作节奏', '体重大者可降低跳跃高度'],
    targetParts: ['calf', 'knee', 'shoulder']
  },
  {
    id: 'w4',
    name: '肩部环绕',
    sportTypes: ['ball', 'fitness'],
    duration: 30,
    description: '活动肩关节，预防肩袖损伤和肌腱炎',
    steps: ['站立或坐姿，双手搭肩', '以肩膀为轴做圆周运动', '先向前环绕10次', '再向后环绕10次', '幅度由小到大'],
    mistakes: ['环绕速度过快', '耸肩肌肉紧张', '只动上臂不动肩胛', '幅度过小无效果'],
    tips: ['保持颈部放松，沉肩', '动作缓慢，感受关节活动', '疼痛时减小幅度或停止'],
    targetParts: ['shoulder']
  },
  {
    id: 'w5',
    name: '手腕踝部环绕',
    sportTypes: ['running', 'ball', 'fitness'],
    duration: 40,
    description: '活动远端小关节，预防扭伤和劳损',
    steps: ['单脚站立或坐姿', '脚尖点地做踝关节环绕', '顺时针15次后逆时针', '双手交叉做手腕环绕', '同时或分别进行均可'],
    mistakes: ['环绕速度过快过猛', '只做单一方向', '幅度太小活动不充分', '支撑脚不稳'],
    tips: ['平衡差可扶墙或坐姿', '环绕到极限时稍作停留', '运动前后都应做此动作'],
    targetParts: ['wrist', 'ankle']
  },
  {
    id: 'w6',
    name: '毛毛虫爬行',
    sportTypes: ['fitness', 'ball'],
    duration: 60,
    description: '拉伸腘绳肌和背部筋膜，激活核心',
    steps: ['站立，双脚与肩同宽', '弯腰双手撑地，向前爬行', '至身体呈平板支撑姿势', '保持2秒后双脚走回手部', '重复5-8次'],
    mistakes: ['爬行时塌腰或弓背', '膝盖弯曲无法拉伸后侧链', '速度过快失去控制', '臀部抬得过高'],
    tips: ['保持膝盖伸直但不锁死', '核心全程收紧', '柔韧性差可适当弯腿'],
    targetParts: ['back', 'waist', 'calf', 'wrist']
  },
  {
    id: 'w7',
    name: '侧向滑步',
    sportTypes: ['ball', 'running'],
    duration: 45,
    description: '激活髋外展肌，提升侧向移动稳定性',
    steps: ['微蹲准备姿势，双手前举', '向左侧交叉迈出一步', '右脚跟随向左移动', '保持半蹲姿势横向移动', '每侧移动10米后换方向'],
    mistakes: ['站立过直肌肉激活不足', '交叉步幅过小', '重心上下起伏过大', '身体前倾失去平衡'],
    tips: ['保持低重心，核心收紧', '移动时感受臀部外侧发力', '速度由慢到快'],
    targetParts: ['hip', 'knee', 'ankle']
  },
  {
    id: 'w8',
    name: '臀部动态拉伸',
    sportTypes: ['running', 'fitness', 'ball'],
    duration: 50,
    description: '激活臀肌，预防膝关节代偿性损伤',
    steps: ['单脚站立，另一腿后抬', '双手抱住后抬小腿', '臀部收紧向前顶', '感受臀部和髋屈肌拉伸', '每侧保持5秒，交替10次'],
    mistakes: ['腰部过度前凸代偿', '站立腿膝盖锁死', '身体歪斜不平衡', '拉伸时间不足'],
    tips: ['保持骨盆中正不前倾', '支撑腿微屈保持稳定', '可扶墙辅助平衡'],
    targetParts: ['hip', 'waist', 'knee']
  },
  {
    id: 'w9',
    name: '胸椎旋转',
    sportTypes: ['ball', 'fitness'],
    duration: 40,
    description: '活动胸椎，改善上背部活动度',
    steps: ['四点跪姿，手撑地面', '一手放头后，肘尖朝下', '向上旋转打开胸腔', '至极限停留2秒后回位', '每侧重复8-10次'],
    mistakes: ['旋转时腰部跟着转动', '速度过快甩动', '骨盆抬起不稳', '旋转幅度不足'],
    tips: ['保持骨盆和腰椎稳定', '用呼气带动旋转幅度', '视线随肘部移动'],
    targetParts: ['back', 'shoulder', 'chest']
  },
  {
    id: 'w10',
    name: '腘绳肌拉伸走',
    sportTypes: ['running', 'ball'],
    duration: 60,
    description: '拉伸大腿后侧肌群，预防拉伤',
    steps: ['站立位，一腿向前伸直', '脚跟着地，脚尖勾起', '上半身前倾至感到拉伸', '保持3秒后换腿向前走', '每侧完成8-10次'],
    mistakes: ['弯腰驼背而非髋部折叠', '前腿膝盖弯曲', '前倾过大导致圆背', '拉伸时间过短'],
    tips: ['从髋部开始前倾，背部保持平直', '柔韧性差可不追求幅度', '支撑腿微屈更稳定'],
    targetParts: ['calf', 'knee', 'hip', 'waist']
  }
];
