import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  RiskAssessment, PainRecord, UserProfile, WeeklyTrend, ReminderItem,
  TrainingRecord, SmartRecommendation, BodyPart, RiskLevel
} from '@/types';
import { generateId } from '@/utils/risk';
import { TRAINING_PLANS } from '@/data/training';

const DAY = 24 * 60 * 60 * 1000;

const getDateKey = (ts: number): string => new Date(ts).toISOString().split('T')[0];
const getDisplayDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

interface AppState {
  assessments: RiskAssessment[];
  painRecords: PainRecord[];
  reminders: ReminderItem[];
  trainingRecords: TrainingRecord[];
  userProfile: UserProfile;

  addAssessment: (a: Omit<RiskAssessment, 'id' | 'timestamp'>) => void;
  addPainRecord: (r: Omit<PainRecord, 'id' | 'timestamp'>) => void;

  addTrainingRecord: (r: Omit<TrainingRecord, 'id' | 'timestamp' | 'date'>) => void;
  toggleTrainingRecord: (id: string) => void;
  deleteTrainingRecord: (id: string) => void;

  addReminder: (r: Omit<ReminderItem, 'id' | 'done'>) => void;
  toggleReminder: (id: string) => void;
  updateReminderDate: (id: string, newDate: string) => void;
  deleteReminder: (id: string) => void;

  updateProfile: (p: Partial<UserProfile>) => void;

  getWeeklyTrend: () => WeeklyTrend[];
  getWeeklyTrainingStats: () => { totalHours: number; totalCount: number; completedCount: number; avgIntensity: number; bySport: Record<string, { hours: number; count: number }>; };
  getSmartRecommendations: () => SmartRecommendation[];
  getLatestRiskLevel: () => RiskLevel | null;
  getLatestPainfulParts: () => BodyPart[];
  getRecoveryStatusSummary: () => { improving: number; unchanged: number; worsening: number; recovered: number; };
}

const defaultProfile: UserProfile = {
  name: '运动达人',
  age: 28,
  gender: 'male',
  height: 175,
  weight: 70,
  mainSport: 'running',
  trainingFrequency: 3,
  emergencyContact: '120',
  allergies: '无'
};

const now = Date.now();

const defaultReminders: ReminderItem[] = [
  {
    id: generateId(),
    date: getDateKey(now + DAY),
    title: '踝部稳定性训练',
    description: '单脚站立平衡 + 弹力带外翻，各3组',
    type: 'recovery',
    planType: 'recovery',
    done: false
  },
  {
    id: generateId(),
    date: getDateKey(now + 2 * DAY),
    title: '疼痛复查评估',
    description: '评估膝部疼痛是否减轻，完成风险自测',
    type: 'check',
    done: false
  },
  {
    id: generateId(),
    date: getDateKey(now + 3 * DAY),
    title: '低强度恢复跑',
    description: '配速6:30+，30分钟内，平地为主',
    type: 'training',
    planType: 'alternative',
    done: false
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      assessments: [],
      painRecords: [],
      reminders: defaultReminders,
      trainingRecords: [],
      userProfile: defaultProfile,

      addAssessment: (a) => set((s) => ({
        assessments: [{ ...a, id: generateId(), timestamp: Date.now() }, ...s.assessments]
      })),

      addPainRecord: (r) => set((s) => ({
        painRecords: [{ ...r, id: generateId(), timestamp: Date.now() }, ...s.painRecords]
      })),

      addTrainingRecord: (r) => {
        const ts = Date.now();
        set((s) => ({
          trainingRecords: [{
            ...r,
            id: generateId(),
            timestamp: ts,
            date: getDateKey(ts)
          }, ...s.trainingRecords]
        }));
      },

      toggleTrainingRecord: (id) => set((s) => ({
        trainingRecords: s.trainingRecords.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      })),

      deleteTrainingRecord: (id) => set((s) => ({
        trainingRecords: s.trainingRecords.filter(t => t.id !== id)
      })),

      addReminder: (r) => set((s) => ({
        reminders: [...s.reminders, { ...r, id: generateId(), done: false }]
      })),

      toggleReminder: (id) => set((s) => ({
        reminders: s.reminders.map(r =>
          r.id === id ? { ...r, done: !r.done, completedAt: !r.done ? Date.now() : undefined } : r
        )
      })),

      updateReminderDate: (id, newDate) => set((s) => ({
        reminders: s.reminders.map(r =>
          r.id === id ? { ...r, date: newDate } : r
        )
      })),

      deleteReminder: (id) => set((s) => ({
        reminders: s.reminders.filter(r => r.id !== id)
      })),

      updateProfile: (p) => set((s) => ({
        userProfile: { ...s.userProfile, ...p }
      })),

      getWeeklyTrend: () => {
        const { painRecords, assessments, trainingRecords, reminders } = get();
        const trend: WeeklyTrend[] = [];
        const nowTs = Date.now();

        for (let i = 6; i >= 0; i--) {
          const ts = nowTs - i * DAY;
          const dateKey = getDateKey(ts);

          const dayPain = painRecords.filter(r => getDateKey(r.timestamp) === dateKey);
          const dayAssess = assessments.filter(a => getDateKey(a.timestamp) === dateKey);
          const dayTraining = trainingRecords.filter(t => t.date === dateKey && t.completed);
          const dayReminders = reminders.filter(r => r.date === dateKey);

          const improvingCount = dayPain.filter(r =>
            r.recoveryStatus === 'improving' || r.recoveryStatus === 'recovered'
          ).length;

          const avgRisk = dayAssess.length
            ? Math.round(dayAssess.reduce((s, a) => s + a.score, 0) / dayAssess.length)
            : 0;

          const riskLevel: RiskLevel | null = dayAssess.length
            ? (avgRisk >= 60 ? 'high' : avgRisk >= 35 ? 'medium' : 'low')
            : null;

          const completedReminders = dayReminders.filter(r => r.done).length;

          trend.push({
            date: getDisplayDate(ts),
            dateKey,
            painCount: dayPain.length,
            avgPainLevel: dayPain.length
              ? Math.round(dayPain.reduce((s, r) => s + r.painLevel, 0) / dayPain.length * 10) / 10
              : 0,
            recoveryImprovingCount: improvingCount,
            trainingHours: Math.round(dayTraining.reduce((s, t) => s + t.duration, 0) * 10) / 10,
            trainingCount: dayTraining.length,
            riskScore: avgRisk,
            riskLevel,
            assessmentCount: dayAssess.length,
            reminderCompletedCount: completedReminders,
            reminderTotalCount: dayReminders.length
          });
        }
        return trend;
      },

      getWeeklyTrainingStats: () => {
        const { trainingRecords } = get();
        const nowTs = Date.now();
        const weekAgo = nowTs - 7 * DAY;

        const weekRecords = trainingRecords.filter(t => t.timestamp >= weekAgo);
        const completed = weekRecords.filter(t => t.completed);

        const totalHours = Math.round(completed.reduce((s, t) => s + t.duration, 0) * 10) / 10;
        const totalCount = weekRecords.length;
        const completedCount = completed.length;
        const avgIntensity = completed.length
          ? Math.round(completed.reduce((s, t) => s + t.intensity, 0) / completed.length * 10) / 10
          : 0;

        const bySport: Record<string, { hours: number; count: number }> = {};
        completed.forEach(t => {
          if (!bySport[t.sportType]) bySport[t.sportType] = { hours: 0, count: 0 };
          bySport[t.sportType].hours += t.duration;
          bySport[t.sportType].count += 1;
        });
        Object.keys(bySport).forEach(k => {
          bySport[k].hours = Math.round(bySport[k].hours * 10) / 10;
        });

        return { totalHours, totalCount, completedCount, avgIntensity, bySport };
      },

      getLatestRiskLevel: (): RiskLevel | null => {
        const { assessments } = get();
        if (assessments.length === 0) return null;
        return assessments[0].riskLevel;
      },

      getLatestPainfulParts: (): BodyPart[] => {
        const { painRecords } = get();
        const weekAgo = Date.now() - 7 * DAY;
        const recent = painRecords.filter(r => r.timestamp >= weekAgo && r.recoveryStatus !== 'recovered');
        const parts = new Set<BodyPart>();
        recent.forEach(r => parts.add(r.bodyPart));
        return Array.from(parts);
      },

      getRecoveryStatusSummary: () => {
        const { painRecords } = get();
        const weekAgo = Date.now() - 7 * DAY;
        const recent = painRecords.filter(r => r.timestamp >= weekAgo);
        return {
          improving: recent.filter(r => r.recoveryStatus === 'improving').length,
          unchanged: recent.filter(r => r.recoveryStatus === 'unchanged').length,
          worsening: recent.filter(r => r.recoveryStatus === 'worsening').length,
          recovered: recent.filter(r => r.recoveryStatus === 'recovered').length
        };
      },

      getSmartRecommendations: (): SmartRecommendation[] => {
        const riskLevel = get().getLatestRiskLevel();
        const painfulParts = get().getLatestPainfulParts();
        const recovery = get().getRecoveryStatusSummary();

        const results: SmartRecommendation[] = [];

        TRAINING_PLANS.forEach(plan => {
          let score = 0;
          const reasons: string[] = [];

          if (riskLevel && plan.suitableRiskLevels.includes(riskLevel)) {
            score += riskLevel === 'high' ? 40 : riskLevel === 'medium' ? 25 : 10;
            reasons.push(`匹配当前${riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}风险状态`);
          } else if (riskLevel) {
            score -= 20;
          }

          const matchedParts = plan.targetParts.filter(p => painfulParts.includes(p));
          if (matchedParts.length > 0) {
            score += matchedParts.length * 20;
            reasons.push(`覆盖疼痛部位：${matchedParts.length}个`);
          }

          if ((recovery.worsening > 0 || recovery.unchanged > 0) && plan.type === 'recovery') {
            score += 25;
            reasons.push('存在未恢复疼痛，优先康复训练');
          }
          if (riskLevel === 'high' && plan.type === 'rest') {
            score += 20;
            reasons.push('高风险状态建议主动休息');
          }
          if (painfulParts.length > 0 && plan.type === 'alternative') {
            score += 15;
            reasons.push('疼痛期间推荐替代训练');
          }

          if (score > 0) {
            results.push({
              planId: plan.id,
              reason: reasons.join(' · '),
              priority: score
            });
          }
        });

        return results
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 3);
      }
    }),
    { name: 'injury-prevention-store-v2' }
  )
);
