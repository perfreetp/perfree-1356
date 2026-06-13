import { TrainingPlan } from '@/types';

export const TRAINING_PLANS: TrainingPlan[] = [
  {
    id: 'tp1',
    title: '主动休息日计划',
    type: 'rest',
    description: '完全休息或极低强度活动，让身体充分修复',
    duration: '1天',
    intensity: 'low',
    items: [
      '保证8小时优质睡眠',
      '20-30分钟慢走散步',
      '泡沫轴放松紧张肌群15分钟',
      '充足蛋白质和水分摄入',
      '避免长时间久坐，每小时起身活动'
    ]
  },
  {
    id: 'tp2',
    title: '踝部康复替代训练',
    type: 'alternative',
    description: '踝部不适时的替代训练方案，避免加重损伤',
    duration: '45分钟',
    intensity: 'low',
    items: [
      '坐姿上身力量训练30分钟',
      '游泳或水中有氧20分钟',
      '上肢哑铃推举 3组×12次',
      '核心平板支撑 3组×45秒',
      '踝部等长收缩练习 3组×30秒'
    ]
  },
  {
    id: 'tp3',
    title: '膝部友好替代训练',
    type: 'alternative',
    description: '膝关节不适时的低冲击训练方案',
    duration: '50分钟',
    intensity: 'medium',
    items: [
      '椭圆机或划船机25分钟（低阻力）',
      '坐姿腿屈伸 3组×15次',
      '臀桥 3组×12次',
      '靠墙静蹲 3组×30秒',
      '游泳自由泳20分钟可选'
    ]
  },
  {
    id: 'tp4',
    title: '腰背部恢复训练',
    type: 'recovery',
    description: '腰部不适后的循序渐进恢复计划',
    duration: '7天',
    intensity: 'low',
    items: [
      '第1-2天：卧床休息+热敷，避免弯腰',
      '第3-4天：猫牛式、桥式运动，每组10次',
      '第5-6天：增加鸟狗式、死虫式核心训练',
      '第7天：尝试快走15-20分钟',
      '全程佩戴护腰，避免负重'
    ]
  },
  {
    id: 'tp5',
    title: '肩部恢复训练',
    type: 'recovery',
    description: '肩部拉伤或炎症后的康复训练流程',
    duration: '10天',
    intensity: 'low',
    items: [
      '第1-3天：休息+冰敷，避免抬臂',
      '第4-6天：钟摆运动，Codman体操',
      '第7-10天：弹力带外旋内旋练习',
      '逐步恢复重量训练，从轻重量开始',
      '每周两次肩袖专项强化训练'
    ]
  },
  {
    id: 'tp6',
    title: '跑步减量周计划',
    type: 'rest',
    description: '高负荷训练后的减量周，预防过度训练',
    duration: '7天',
    intensity: 'medium',
    items: [
      '总跑量减少40-50%',
      '配速降低30-60秒/公里',
      '增加交叉训练（游泳/骑行）',
      '每天10分钟小腿泡沫轴放松',
      '周末长距离取消或缩短一半'
    ]
  }
];

export const EMERGENCY_RULES = {
  shouldSeekMedical: [
    '关节出现明显畸形或脱位',
    '受伤部位无法承重或完全不能活动',
    '剧烈疼痛无法忍受，服用止痛药无效',
    '受伤后迅速出现大面积肿胀淤青',
    '感觉神经异常（麻木、刺痛、无力）',
    '损伤部位有骨摩擦音或异常活动',
    '扭伤后24小时肿胀持续加重',
    '伴有发热或全身不适症状'
  ],
  riceProtocol: [
    { step: 'Rest', title: '休息', desc: '立即停止运动，避免加重损伤' },
    { step: 'Ice', title: '冰敷', desc: '伤后24-72小时内，每次15-20分钟，每2-3小时一次' },
    { step: 'Compression', title: '加压', desc: '用弹性绷带适度加压包扎，减轻肿胀' },
    { step: 'Elevation', title: '抬高', desc: '将患肢抬高至心脏水平以上，促进血液回流' }
  ]
};
