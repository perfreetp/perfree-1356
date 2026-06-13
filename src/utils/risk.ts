import { BodyPart, RiskLevel } from '@/types';

interface RiskInput {
  bodyParts: BodyPart[];
  intensity: number;
  sleepQuality: number;
  hasHistory: boolean;
  historyParts: BodyPart[];
}

export const BODY_PART_NAMES: Record<BodyPart, string> = {
  neck: '颈部', shoulder: '肩部', elbow: '肘部', wrist: '腕部',
  back: '背部', waist: '腰部', hip: '髋部', knee: '膝部',
  calf: '小腿', ankle: '踝部', foot: '足部', chest: '胸部'
};

export function calculateRisk(input: RiskInput): { level: RiskLevel; score: number; suggestions: string[] } {
  let score = 0;
  const suggestions: string[] = [];

  score += input.bodyParts.length * 12;
  if (input.bodyParts.length >= 3) {
    suggestions.push('多部位同时不适，建议降低训练强度或休息1-2天');
  } else if (input.bodyParts.length > 0) {
    suggestions.push(`注意保护${input.bodyParts.map(p => BODY_PART_NAMES[p]).join('、')}，训练前充分热身`);
  }

  score += (input.intensity - 1) * 8;
  if (input.intensity >= 4) {
    suggestions.push('高强度训练后务必进行充分拉伸和冷身，建议冰敷易损部位');
  }

  if (input.sleepQuality <= 2) {
    score += 20;
    suggestions.push('睡眠不足会显著增加受伤风险，建议保证7-8小时优质睡眠后再训练');
  } else if (input.sleepQuality === 3) {
    score += 8;
    suggestions.push('睡眠质量一般，训练中注意身体信号，如有不适及时停止');
  }

  if (input.hasHistory) {
    score += 15 + input.historyParts.length * 6;
    suggestions.push(`旧伤部位${input.historyParts.map(p => BODY_PART_NAMES[p]).join('、')}需重点防护，建议佩戴护具`);
  }

  score = Math.min(score, 100);

  let level: RiskLevel = 'low';
  if (score >= 60) {
    level = 'high';
    suggestions.unshift('高风险状态！建议暂停训练，充分休息恢复，必要时就医检查');
  } else if (score >= 35) {
    level = 'medium';
    suggestions.unshift('中等风险，建议降低训练强度，重点关注不适部位');
  } else {
    suggestions.unshift('风险较低，保持良好状态，继续科学训练');
  }

  if (suggestions.length === 1) {
    suggestions.push('训练前充分热身10-15分钟，训练后进行静态拉伸');
    suggestions.push('注意补充水分和电解质，保持均衡饮食');
  }

  return { level, score, suggestions };
}

export function getRiskLevelText(level: RiskLevel): string {
  const map = { low: '低风险', medium: '中风险', high: '高风险' };
  return map[level];
}

export function getRiskLevelColor(level: RiskLevel): string {
  const map = { low: '#10B981', medium: '#F59E0B', high: '#EF4444' };
  return map[level];
}

export function getPainLevelText(level: number): string {
  if (level <= 2) return '轻微疼痛';
  if (level <= 4) return '中度疼痛';
  if (level <= 6) return '较强疼痛';
  if (level <= 8) return '剧烈疼痛';
  return '难以忍受';
}

export function getRecoveryStatusText(status: string): string {
  const map: Record<string, string> = {
    worsening: '加重', unchanged: '无变化', improving: '好转', recovered: '已恢复'
  };
  return map[status] || status;
}

export function getSportTypeName(type: string): string {
  const map: Record<string, string> = { running: '跑步', ball: '球类', fitness: '健身' };
  return map[type] || type;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
