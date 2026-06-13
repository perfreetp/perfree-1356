import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  RiskAssessment, PainRecord, UserProfile, WeeklyTrend, ReminderItem,
  TrainingRecord, SmartRecommendation, BodyPart, RiskLevel, DayScheduleItem, PlanType, ReminderType
} from '@/types';
import { generateId } from '@/utils/risk';
import { TRAINING_PLANS } from '@/data/training';

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const getDateKey = (ts: number): string => new Date(ts).toISOString().split('T')[0];
const getDisplayDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const parseDateKey = (key: string): number => new Date(key + 'T00:00:00').getTime();
const addDaysToDateKey = (key: string, offset: number): string => {
  return getDateKey(parseDateKey(key) + offset * DAY);
};
const dateKeyToTs = (key: string): number => parseDateKey(key) + 12 * 60 * 60 * 1000;

interface AppState {
  assessments: RiskAssessment[];
  painRecords: PainRecord[];
  reminders: ReminderItem[];
  trainingRecords: TrainingRecord[];
  userProfile: UserProfile;

  addAssessment: (a: Omit<RiskAssessment, 'id' | 'timestamp'>) => void;
  addPainRecord: (r: Omit<PainRecord, 'id' | 'timestamp'>) => void;

  addTrainingRecord: (r: Omit<TrainingRecord, 'id' | 'timestamp' | 'date'> & { dateKey?: string }) => void;
  updateTrainingRecord: (id: string, patch: Partial<TrainingRecord> & { dateKey?: string }) => void;
  toggleTrainingRecord: (id: string) => void;
  deleteTrainingRecord: (id: string) => void;

  addReminder: (r: Omit<ReminderItem, 'id' | 'done'>) => void;
  toggleReminder: (id: string) => void;
  updateReminderDate: (id: string, newDate: string) => void;
  moveReminderSchedule: (id: string, dateOffset: number) => void;
  deleteReminder: (id: string) => void;
  cancelPlanSchedule: (originPlanId: string) => void;

  addPlanWithSchedule: (planId: string, startDateKey?: string, overrideDays?: number) => { created: number; days: number };
  refreshPlanSchedulesByState: () => { updated: number; removed: number };

  updateProfile: (p: Partial<UserProfile>) => void;

  getWeeklyTrend: (weekOffset?: number) => WeeklyTrend[];
  getWeeklyTrainingStats: (weekOffset?: number) => {
    totalMinutes: number;
    totalHours: number;
    totalCount: number;
    completedCount: number;
    completionRate: number;
    avgIntensity: number;
    bySport: Record<string, { minutes: number; hours: number; count: number }>;
    topSport: string | null;
    totalSets: number;
  };
  getSmartRecommendations: () => SmartRecommendation[];
  getLatestRiskLevel: () => RiskLevel | null;
  getLatestPainfulParts: () => BodyPart[];
  getRecoveryStatusSummary: () => { improving: number; unchanged: number; worsening: number; recovered: number; };
  getDaySchedule: (dateKey: string) => DayScheduleItem;
  getWeeklySchedule: (weekOffset?: number) => DayScheduleItem[];
  getWeekRange: (weekOffset: number) => { startKey: string; endKey: string; label: string };
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

const PLAN_TYPE_TO_REMINDER_TYPE: Record<PlanType, ReminderType> = {
  rest: 'rest',
  alternative: 'alternative',
  recovery: 'recovery'
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      assessments: [],
      painRecords: [],
      reminders: defaultReminders,
      trainingRecords: [],
      userProfile: defaultProfile,

      getWeekRange: (weekOffset) => {
        const nowD = new Date();
        const day = nowD.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        const mondayTs = nowD.setHours(0,0,0,0) + diffToMon * DAY + weekOffset * 7 * DAY;
        const sundayTs = mondayTs + 6 * DAY;
        const startKey = getDateKey(mondayTs);
        const endKey = getDateKey(sundayTs);
        const startMon = new Date(mondayTs).getMonth() + 1;
        const startDay = new Date(mondayTs).getDate();
        const endMon = new Date(sundayTs).getMonth() + 1;
        const endDay = new Date(sundayTs).getDate();
        return {
          startKey, endKey,
          label: weekOffset === 0 ? '本周' : weekOffset === -1 ? '上周' : weekOffset === 1 ? '下周' : `${startMon}/${startDay}-${endMon}/${endDay}`
        };
      },

      addAssessment: (a) => {
        set((s) => ({ assessments: [{ ...a, id: generateId(), timestamp: Date.now() }, ...s.assessments] }));
        setTimeout(() => get().refreshPlanSchedulesByState(), 0);
      },

      addPainRecord: (r) => {
        set((s) => ({ painRecords: [{ ...r, id: generateId(), timestamp: Date.now() }, ...s.painRecords] }));
        setTimeout(() => get().refreshPlanSchedulesByState(), 0);
      },

      addTrainingRecord: (r) => {
        const useKey = r.dateKey || getDateKey(Date.now());
        const ts = r.dateKey ? dateKeyToTs(r.dateKey) : Date.now();
        const { dateKey: _dk, ...rest } = r as any;
        set((s) => ({
          trainingRecords: [{
            ...rest,
            id: generateId(),
            timestamp: ts,
            date: useKey
          }, ...s.trainingRecords]
        }));
      },

      updateTrainingRecord: (id, patch) => {
        set((s) => ({
          trainingRecords: s.trainingRecords.map(t => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch } as any;
            if (patch.dateKey) {
              next.date = patch.dateKey;
              next.timestamp = dateKeyToTs(patch.dateKey);
            }
            delete next.dateKey;
            return next;
          })
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

      moveReminderSchedule: (id, dateOffset) => set((s) => ({
        reminders: s.reminders.map(r => {
          if (r.id !== id) return r;
          const newDate = addDaysToDateKey(r.date, dateOffset);
          return { ...r, date: newDate };
        })
      })),

      deleteReminder: (id) => set((s) => ({
        reminders: s.reminders.filter(r => r.id !== id)
      })),

      cancelPlanSchedule: (originPlanId) => set((s) => ({
        reminders: s.reminders.filter(r => r.originPlanId !== originPlanId || r.done)
      })),

      addPlanWithSchedule: (planId, startDateKey, overrideDays) => {
        const plan = TRAINING_PLANS.find(p => p.id === planId);
        if (!plan) return { created: 0, days: 0 };
        const days = overrideDays || plan.defaultDurationDays;
        const startKey = startDateKey || getDateKey(Date.now());
        const planType = plan.type;
        const reminderType = PLAN_TYPE_TO_REMINDER_TYPE[planType];

        const created: ReminderItem[] = [];
        for (let i = 0; i < days; i++) {
          const dk = addDaysToDateKey(startKey, i);
          const isCheckDay = days >= 4 && i === days - 1;
          let title: string;
          let desc: string;
          let type: ReminderType = reminderType;
          if (isCheckDay) {
            type = 'check';
            title = `[${plan.title}] 阶段复查`;
            desc = `${plan.scheduleNote}\n请完成疼痛记录+风险自测，评估是否可进入下一阶段`;
          } else {
            const phase = Math.floor(i / Math.ceil(days / 3));
            const phaseText = ['初期·制动消肿', '中期·功能恢复', '后期·强度回归'][phase] || '执行';
            title = `D${i + 1}/${days} ${plan.title}`;
            desc = `【${phaseText}】${plan.items[i % plan.items.length]}\n\n目标：${plan.description}`;
          }
          created.push({
            id: generateId(),
            date: dk,
            title,
            description: desc,
            type,
            planType,
            done: false,
            originPlanId: plan.id,
            scheduleStartDate: startKey,
            scheduleDayIndex: i,
            scheduleTotalDays: days
          });
        }
        set((s) => ({ reminders: [...s.reminders, ...created] }));
        return { created: created.length, days };
      },

      refreshPlanSchedulesByState: () => {
        const { getLatestRiskLevel, getLatestPainfulParts, reminders } = get();
        const risk = getLatestRiskLevel();
        const pains = getLatestPainfulParts();
        let updated = 0;
        let removed = 0;
        const planCoverage: Record<string, { covered: boolean; planType: PlanType }> = {};
        reminders.forEach(r => {
          if (r.originPlanId) {
            const p = TRAINING_PLANS.find(pp => pp.id === r.originPlanId);
            if (p) planCoverage[r.originPlanId] = { covered: true, planType: p.type };
          }
        });
        if (risk === 'low' && pains.length === 0) {
          const removeIds: string[] = [];
          reminders.forEach(r => {
            if (!r.done && r.originPlanId && planCoverage[r.originPlanId]?.planType !== 'recovery') {
              if (r.originPlanId && planCoverage[r.originPlanId].planType === 'rest') {
                removeIds.push(r.id);
                removed += 1;
              }
            }
          });
          if (removeIds.length > 0) {
            set((s) => ({ reminders: s.reminders.filter(r => !removeIds.includes(r.id)) }));
          }
        }
        return { updated, removed };
      },

      updateProfile: (p) => set((s) => ({
        userProfile: { ...s.userProfile, ...p }
      })),

      getWeeklyTrend: (weekOffset = 0) => {
        const { painRecords, assessments, trainingRecords, reminders, getWeekRange } = get();
        const { startKey } = getWeekRange(weekOffset);
        const trend: WeeklyTrend[] = [];
        for (let i = 0; i < 7; i++) {
          const dateKey = addDaysToDateKey(startKey, i);
          const ts = parseDateKey(dateKey);

          const dayPain = painRecords.filter(r => getDateKey(r.timestamp) === dateKey);
          const dayAssess = assessments.filter(a => getDateKey(a.timestamp) === dateKey);
          const dayTrainingAll = trainingRecords.filter(t => t.date === dateKey);
          const dayTraining = dayTrainingAll.filter(t => t.completed);
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
          const totalMinutes = dayTraining.reduce((s, t) => s + t.duration, 0);
          const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

          trend.push({
            date: getDisplayDate(ts),
            dateKey,
            dayOfWeek: WEEKDAY[new Date(ts).getDay()],
            painCount: dayPain.length,
            avgPainLevel: dayPain.length
              ? Math.round(dayPain.reduce((s, r) => s + r.painLevel, 0) / dayPain.length * 10) / 10
              : 0,
            recoveryImprovingCount: improvingCount,
            trainingMinutes: totalMinutes,
            trainingHours: totalHours,
            trainingCount: dayTraining.length,
            riskScore: avgRisk,
            riskLevel,
            assessmentCount: dayAssess.length,
            reminderCompletedCount: completedReminders,
            reminderTotalCount: dayReminders.length,
            trainingRecords: dayTrainingAll,
            reminders: dayReminders
          });
        }
        return trend;
      },

      getWeeklyTrainingStats: (weekOffset = 0) => {
        const { trainingRecords, getWeekRange } = get();
        const { startKey, endKey } = getWeekRange(weekOffset);
        const weekRecords = trainingRecords.filter(t => t.date >= startKey && t.date <= endKey);
        const completed = weekRecords.filter(t => t.completed);

        const totalMinutes = completed.reduce((s, t) => s + t.duration, 0);
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
        const totalCount = weekRecords.length;
        const completedCount = completed.length;
        const completionRate = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
        const avgIntensity = completed.length
          ? Math.round(completed.reduce((s, t) => s + t.intensity, 0) / completed.length * 10) / 10
          : 0;
        const totalSets = completed.reduce((s, t) => s + (t.sets || 0), 0);

        const bySport: Record<string, { minutes: number; hours: number; count: number }> = {};
        completed.forEach(t => {
          if (!bySport[t.sportType]) bySport[t.sportType] = { minutes: 0, hours: 0, count: 0 };
          bySport[t.sportType].minutes += t.duration;
          bySport[t.sportType].count += 1;
        });
        let topSport: string | null = null;
        let topCount = 0;
        Object.keys(bySport).forEach(k => {
          bySport[k].hours = Math.round(bySport[k].minutes / 60 * 10) / 10;
          if (bySport[k].count > topCount) {
            topCount = bySport[k].count;
            topSport = k;
          }
        });

        return { totalMinutes, totalHours, totalCount, completedCount, completionRate, avgIntensity, bySport, topSport, totalSets };
      },

      getLatestRiskLevel: (): RiskLevel | null => {
        const { assessments } = get();
        if (assessments.length === 0) return null;
        const recent = assessments[0];
        if (Date.now() - recent.timestamp > 7 * DAY) return null;
        return recent.riskLevel;
      },

      getLatestPainfulParts: (): BodyPart[] => {
        const { painRecords } = get();
        const weekAgo = Date.now() - 14 * DAY;
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

      getDaySchedule: (dateKey) => {
        const { reminders, trainingRecords, painRecords, assessments } = get();
        const ts = parseDateKey(dateKey);
        const todayKey = getDateKey(Date.now());
        const dayPain = painRecords.filter(r => getDateKey(r.timestamp) === dateKey);
        const dayAssess = assessments.filter(a => getDateKey(a.timestamp) === dateKey);
        const avgRisk = dayAssess.length
          ? Math.round(dayAssess.reduce((s, a) => s + a.score, 0) / dayAssess.length)
          : -1;
        const riskLevel: RiskLevel | null = avgRisk >= 0
          ? (avgRisk >= 60 ? 'high' : avgRisk >= 35 ? 'medium' : 'low')
          : null;
        return {
          dateKey,
          dateDisplay: getDisplayDate(ts),
          dayOfWeek: WEEKDAY[new Date(ts).getDay()],
          isToday: dateKey === todayKey,
          reminders: reminders.filter(r => r.date === dateKey).sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)),
          trainingRecords: trainingRecords.filter(t => t.date === dateKey),
          painCount: dayPain.length,
          riskLevel,
          hasActivity: dayPain.length + dayAssess.length + reminders.filter(r => r.date === dateKey).length + trainingRecords.filter(t => t.date === dateKey).length > 0
        };
      },

      getWeeklySchedule: (weekOffset = 0) => {
        const { getDaySchedule, getWeekRange } = get();
        const { startKey } = getWeekRange(weekOffset);
        const result: DayScheduleItem[] = [];
        for (let i = 0; i < 7; i++) {
          result.push(getDaySchedule(addDaysToDateKey(startKey, i)));
        }
        return result;
      },

      getSmartRecommendations: (): SmartRecommendation[] => {
        const riskLevel = get().getLatestRiskLevel();
        const painfulParts = get().getLatestPainfulParts();
        const recovery = get().getRecoveryStatusSummary();

        const results: SmartRecommendation[] = [];
        const MAX_POSSIBLE = 40 + 6 * 20 + 25 + 20 + 15;

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
            reasons.push(`覆盖疼痛部位：${matchedParts.length}个（${matchedParts.slice(0, 3).join('/')}${matchedParts.length > 3 ? '...' : ''}）`);
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
            reasons.push('疼痛期间推荐替代训练，降低再次受伤概率');
          }

          if (score <= 0 && !riskLevel && painfulParts.length === 0) {
            score = plan.type === 'recovery' ? 5 : plan.intensity === 'low' ? 12 : 8;
            if (score === 12) reasons.push('日常预防性维护推荐');
          }

          if (score > 0) {
            const matchPercentage = Math.min(99, Math.round(Math.max(score, 10) / MAX_POSSIBLE * 100) + 30);
            const duration = plan.defaultDurationDays;
            results.push({
              planId: plan.id,
              plan,
              matchScore: score,
              matchPercentage,
              reason: reasons.join(' · '),
              detailedReasons: reasons.length > 0 ? reasons : ['常规维护方案'],
              recommendedDurationDays: duration,
              scheduleHint: plan.scheduleNote,
              priority: score
            });
          }
        });

        return results
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 3);
      }
    }),
    { name: 'injury-prevention-store-v3' }
  )
);
