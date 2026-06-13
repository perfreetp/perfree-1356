import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  RiskAssessment, PainRecord, UserProfile, WeeklyTrend, ReminderItem,
  TrainingRecord, SmartRecommendation, BodyPart, RiskLevel, DayScheduleItem,
  PlanType, ReminderType, ScheduleAdjustment, NextWeekRecommendation,
  NextWeekStrategy, AdjustmentType, TimelineItem
} from '@/types';
import { generateId, getRiskLevelText, BODY_PART_NAMES } from '@/utils/risk';
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
  scheduleAdjustments: ScheduleAdjustment[];
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
  updateReminder: (id: string, patch: Partial<ReminderItem>) => void;
  moveReminderSchedule: (id: string, dateOffset: number) => { success: boolean; newDate: string } | null;
  deleteReminder: (id: string) => void;
  cancelPlanSchedule: (originPlanId: string) => number;

  addPlanWithSchedule: (planId: string, startDateKey?: string, overrideDays?: number) => { created: number; days: number };
  refreshPlanSchedulesByState: (triggerSource?: 'assessment' | 'pain' | 'manual') => {
    updated: number;
    removed: number;
    added: number;
    adjustments: ScheduleAdjustment[];
  };

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
  getScheduleAdjustments: (weekOffset?: number) => ScheduleAdjustment[];
  getWeeklyTimeline: (weekOffset?: number) => TimelineItem[];
  getNextWeekRecommendation: () => NextWeekRecommendation | null;
  applyNextWeekRecommendation: () => { created: number; days: number; planCount: number } | null;
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
      scheduleAdjustments: [],
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
        setTimeout(() => get().refreshPlanSchedulesByState('assessment'), 0);
      },

      addPainRecord: (r) => {
        set((s) => ({ painRecords: [{ ...r, id: generateId(), timestamp: Date.now() }, ...s.painRecords] }));
        setTimeout(() => get().refreshPlanSchedulesByState('pain'), 0);
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

      updateReminder: (id, patch) => set((s) => ({
        reminders: s.reminders.map(r => r.id === id ? { ...r, ...patch } : r)
      })),

      moveReminderSchedule: (id, dateOffset) => {
        let newDate = '';
        set((s) => {
          const updated = s.reminders.map(r => {
            if (r.id !== id) return r;
            newDate = addDaysToDateKey(r.date, dateOffset);
            return { ...r, date: newDate };
          });
          return { reminders: updated };
        });
        return newDate ? { success: true, newDate } : null;
      },

      deleteReminder: (id) => set((s) => ({
        reminders: s.reminders.filter(r => r.id !== id)
      })),

      cancelPlanSchedule: (originPlanId) => {
        let removed = 0;
        set((s) => {
          const before = s.reminders.length;
          const reminders = s.reminders.filter(r => r.originPlanId !== originPlanId || r.done);
          removed = before - reminders.length;
          return { reminders };
        });
        return removed;
      },

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

      refreshPlanSchedulesByState: (triggerSource = 'manual') => {
        const {
          getLatestRiskLevel, getLatestPainfulParts, reminders, scheduleAdjustments,
          getSmartRecommendations, getDaySchedule
        } = get();

        const beforeRisk = getLatestRiskLevel();
        const beforePains = getLatestPainfulParts();
        const beforePainCount = beforePains.length;

        const newAdjustments: ScheduleAdjustment[] = [];
        let totalAdded = 0;
        let totalRemoved = 0;
        let totalUpdated = 0;

        const todayKey = getDateKey(Date.now());

        const activePlanIds = new Set<string>();
        reminders.forEach(r => {
          if (r.originPlanId && !r.done) activePlanIds.add(r.originPlanId);
        });

        const smartRecs = getSmartRecommendations();
        const recMap: Record<string, SmartRecommendation> = {};
        smartRecs.forEach(r => { recMap[r.planId] = r; });

        let newReminders = [...reminders];

        const processedPlans = new Set<string>();

        activePlanIds.forEach(planId => {
          if (processedPlans.has(planId)) return;
          processedPlans.add(planId);

          const plan = TRAINING_PLANS.find(p => p.id === planId);
          if (!plan) return;

          const planReminders = newReminders.filter(r => r.originPlanId === planId);
          const undoneReminders = planReminders.filter(r => !r.done);
          if (undoneReminders.length === 0) return;

          const currentRec = recMap[planId];
          const currentScore = currentRec?.matchScore || 0;

          let bestAlt: SmartRecommendation | null = null;
          for (const rec of smartRecs) {
            if (rec.planId === planId) continue;
            if (rec.matchScore - currentScore >= 25) {
              bestAlt = rec;
              break;
            }
          }

          if (!bestAlt) {
            const riskOk = beforeRisk && plan.suitableRiskLevels.includes(beforeRisk);
            if (!riskOk && beforeRisk && smartRecs.length > 0) {
              bestAlt = smartRecs[0];
            }
          }

          if (!bestAlt) return;

          const newPlan = bestAlt.plan;
          const adjustmentId = generateId();
          const removedIds: string[] = [];
          const addedIds: string[] = [];
          const updatedIds: string[] = [];
          const affectedDateKeys: string[] = [];

          const todayAndAfter = undoneReminders.filter(r => r.date >= todayKey);
          const futureMinDayIndex = Math.min(...todayAndAfter.map(r => r.scheduleDayIndex ?? 0));

          const todayAndAfterCount = todayAndAfter.length;
          if (todayAndAfterCount === 0) return;
          if (todayAndAfterCount < 2 && beforeRisk !== 'high') return;

          const newDays = Math.min(todayAndAfterCount, newPlan.defaultDurationDays);
          const newStartKey = todayAndAfter[0].date;

          const newRemindersForPlan: ReminderItem[] = [];
          for (let i = 0; i < newDays; i++) {
            const dk = addDaysToDateKey(newStartKey, i);
            const isCheckDay = newDays >= 4 && i === newDays - 1;
            let title: string;
            let desc: string;
            let type: ReminderType = PLAN_TYPE_TO_REMINDER_TYPE[newPlan.type];
            if (isCheckDay) {
              type = 'check';
              title = `[${newPlan.title}] 阶段复查`;
              desc = `${newPlan.scheduleNote}\n因状态调整，请完成疼痛记录+风险自测评估`;
            } else {
              const phase = Math.floor(i / Math.ceil(newDays / 3));
              const phaseText = ['初期·制动消肿', '中期·功能恢复', '后期·强度回归'][phase] || '执行';
              title = `D${i + 1}/${newDays} ${newPlan.title}`;
              desc = `【${phaseText}】${newPlan.items[i % newPlan.items.length]}\n\n方案已根据状态自动调整`;
            }
            newRemindersForPlan.push({
              id: generateId(),
              date: dk,
              title,
              description: desc,
              type,
              planType: newPlan.type,
              done: false,
              originPlanId: newPlan.id,
              scheduleStartDate: newStartKey,
              scheduleDayIndex: i,
              scheduleTotalDays: newDays,
              lastAdjustmentId: adjustmentId,
              originalTitle: plan.title
            });
            addedIds.push(newRemindersForPlan[i].id);
            affectedDateKeys.push(dk);
          }

          todayAndAfter.forEach(r => {
            removedIds.push(r.id);
            if (!affectedDateKeys.includes(r.date)) affectedDateKeys.push(r.date);
          });

          const adjType: AdjustmentType =
            (bestAlt.matchScore - currentScore) > 35 ? 'switch' :
              newPlan.type === 'rest' && plan.type !== 'rest' ? 'downgrade' :
                newPlan.type === 'recovery' && plan.type === 'alternative' ? 'upgrade' :
                  newPlan.type === 'alternative' && plan.type === 'recovery' ? 'downgrade' :
                    'switch';

          const detailedReasons = [
            ...(bestAlt.detailedReasons?.slice(0, 3) || []),
            `原方案「${plan.title}」匹配度下降`,
            `切换为「${newPlan.title}」更适合当前状态`
          ];

          const adjustment: ScheduleAdjustment = {
            id: adjustmentId,
            timestamp: Date.now(),
            type: adjType,
            reason: `根据最新${triggerSource === 'assessment' ? '风险自测' : '疼痛记录'}结果，方案由「${plan.title}」调整为「${newPlan.title}」`,
            detailedReasons,
            triggerSource,
            beforeRiskLevel: beforeRisk ?? undefined,
            afterRiskLevel: beforeRisk ?? undefined,
            beforePainCount,
            afterPainCount: beforePainCount,
            affectedPlanIds: [planId, newPlan.id],
            addedReminderIds: addedIds,
            removedReminderIds: removedIds,
            updatedReminderIds: updatedIds,
            affectedDateKeys: [...new Set(affectedDateKeys)]
          };

          newReminders = newReminders.filter(r => !removedIds.includes(r.id));
          newReminders = [...newReminders, ...newRemindersForPlan];

          newAdjustments.push(adjustment);
          totalRemoved += removedIds.length;
          totalAdded += addedIds.length;
        });

        if (beforeRisk === 'low' && beforePainCount === 0) {
          const removeIds: string[] = [];
          newReminders.forEach(r => {
            if (!r.done && r.type === 'rest' && r.originPlanId) {
              removeIds.push(r.id);
            }
          });
          if (removeIds.length > 0) {
            newReminders = newReminders.filter(r => !removeIds.includes(r.id));
            const adjustmentId = generateId();
            const affectedDateKeys = [...new Set(
              reminders.filter(r => removeIds.includes(r.id)).map(r => r.date)
            )];
            const adjustment: ScheduleAdjustment = {
              id: adjustmentId,
              timestamp: Date.now(),
              type: 'cancel',
              reason: '风险降低且无疼痛，自动取消休息类安排',
              detailedReasons: [
                '当前风险等级：低',
                '当前无活动中疼痛部位',
                '已无必要继续主动休息',
                '可逐步恢复常规训练'
              ],
              triggerSource,
              beforeRiskLevel: beforeRisk ?? undefined,
              afterRiskLevel: beforeRisk ?? undefined,
              beforePainCount,
              afterPainCount: beforePainCount,
              affectedPlanIds: [],
              addedReminderIds: [],
              removedReminderIds: removeIds,
              updatedReminderIds: [],
              affectedDateKeys
            };
            newAdjustments.push(adjustment);
            totalRemoved += removeIds.length;
          }
        }

        if (newAdjustments.length > 0) {
          set((s) => ({
            reminders: newReminders,
            scheduleAdjustments: [...newAdjustments, ...s.scheduleAdjustments]
          }));
        }

        return {
          updated: totalUpdated,
          removed: totalRemoved,
          added: totalAdded,
          adjustments: newAdjustments
        };
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
      },

      getScheduleAdjustments: (weekOffset = 0) => {
        const { scheduleAdjustments, getWeekRange } = get();
        const { startKey, endKey } = getWeekRange(weekOffset);
        return scheduleAdjustments.filter(a => {
          const k = getDateKey(a.timestamp);
          return k >= startKey && k <= endKey;
        });
      },

      getWeeklyTimeline: (weekOffset = 0) => {
        const {
          painRecords, trainingRecords, reminders, assessments, scheduleAdjustments,
          getWeekRange
        } = get();
        const { startKey, endKey } = getWeekRange(weekOffset);

        const items: TimelineItem[] = [];

        assessments.forEach(a => {
          const k = getDateKey(a.timestamp);
          if (k < startKey || k > endKey) return;
          const t = new Date(a.timestamp);
          items.push({
            id: 'as_' + a.id,
            type: 'assessment',
            dateKey: k,
            timestamp: a.timestamp,
            timeLabel: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
            title: `${getRiskLevelText(a.riskLevel)}风险自测`,
            description: `综合得分 ${a.score} 分${a.bodyParts.length > 0 ? ` · 涉及${a.bodyParts.length}个部位` : ''}`,
            tag: a.riskLevel === 'high' ? '高风险' : a.riskLevel === 'medium' ? '中风险' : '低风险',
            tagColor: a.riskLevel === 'high' ? '#EF4444' : a.riskLevel === 'medium' ? '#F59E0B' : '#10B981',
            icon: '🎯'
          });
        });

        painRecords.forEach(p => {
          const k = getDateKey(p.timestamp);
          if (k < startKey || k > endKey) return;
          const t = new Date(p.timestamp);
          const partName = BODY_PART_NAMES[p.bodyPart] || p.bodyPart;
          items.push({
            id: 'pn_' + p.id,
            type: 'pain',
            dateKey: k,
            timestamp: p.timestamp,
            timeLabel: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
            title: `${partName}疼痛 VAS ${p.painLevel}`,
            description: p.description,
            tag: p.recoveryStatus === 'recovered' ? '已恢复' :
              p.recoveryStatus === 'improving' ? '好转中' :
                p.recoveryStatus === 'worsening' ? '加重' : '持平',
            tagColor: p.recoveryStatus === 'recovered' ? '#10B981' :
              p.recoveryStatus === 'improving' ? '#3B82F6' :
                p.recoveryStatus === 'worsening' ? '#EF4444' : '#64748B',
            icon: '📍'
          });
        });

        trainingRecords.forEach(tr => {
          const k = tr.date;
          if (k < startKey || k > endKey) return;
          const t = new Date(tr.timestamp);
          const sportName = tr.sportType === 'running' ? '跑步' : tr.sportType === 'ball' ? '球类' : '健身';
          items.push({
            id: 'tr_' + tr.id,
            type: 'training',
            dateKey: k,
            timestamp: tr.timestamp,
            timeLabel: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
            title: `${sportName} · ${tr.duration}分钟${tr.sets ? ` · ${tr.sets}组` : ''}`,
            description: tr.note,
            tag: tr.completed ? '已完成' : '未完成',
            tagColor: tr.completed ? '#10B981' : '#F59E0B',
            icon: tr.sportType === 'running' ? '🏃' : tr.sportType === 'ball' ? '⚽' : '💪'
          });
        });

        reminders.forEach(r => {
          if (r.date < startKey || r.date > endKey) return;
          const ts = parseDateKey(r.date) + 12 * 3600 * 1000;
          items.push({
            id: 'rm_' + r.id,
            type: 'reminder',
            dateKey: r.date,
            timestamp: ts,
            timeLabel: '全天',
            title: r.title,
            description: r.description,
            tag: r.done ? '已完成' : '待办',
            tagColor: r.done ? '#10B981' : '#F59E0B',
            icon: '🔔'
          });
        });

        scheduleAdjustments.forEach(a => {
          const k = getDateKey(a.timestamp);
          if (k < startKey || k > endKey) return;
          const t = new Date(a.timestamp);
          const typeName =
            a.type === 'upgrade' ? '方案升级' :
              a.type === 'downgrade' ? '方案降级' :
                a.type === 'cancel' ? '方案取消' :
                  a.type === 'extend' ? '方案延期' : '方案调整';
          items.push({
            id: 'ad_' + a.id,
            type: 'adjustment',
            dateKey: k,
            timestamp: a.timestamp,
            timeLabel: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
            title: `🤖 ${typeName}`,
            description: a.reason,
            tag: '系统自动',
            tagColor: '#8B5CF6',
            icon: '🔄'
          });
        });

        return items.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
          return a.timestamp - b.timestamp;
        });
      },

      getNextWeekRecommendation: () => {
        const {
          getWeeklyTrainingStats, getWeeklyTrend, getLatestRiskLevel,
          getLatestPainfulParts, getRecoveryStatusSummary, getSmartRecommendations
        } = get();

        const thisWeekStats = getWeeklyTrainingStats(0);
        const lastWeekStats = getWeeklyTrainingStats(-1);
        const thisWeekTrend = getWeeklyTrend(0);

        const completionRate = thisWeekStats.completionRate;
        const painDelta = (() => {
          const thisWeekPain = thisWeekTrend.reduce((s, d) => s + d.painCount, 0);
          const lastWeekPain = getWeeklyTrend(-1).reduce((s, d) => s + d.painCount, 0);
          return thisWeekPain - lastWeekPain;
        })();
        const riskLevel = getLatestRiskLevel();
        const painfulParts = getLatestPainfulParts();
        const recovery = getRecoveryStatusSummary();

        const trainingLoadDelta = Math.round(thisWeekStats.totalMinutes - lastWeekStats.totalMinutes);

        let strategy: NextWeekStrategy = 'maintain';
        let strategyName = '维持现状';
        const detailedReasons: string[] = [];

        if (riskLevel === 'high' || painfulParts.length >= 2) {
          strategy = 'rest';
          strategyName = '主动休息周';
          detailedReasons.push('当前处于高风险或多部位疼痛');
          detailedReasons.push('建议优先休息，给身体充分恢复时间');
        } else if (painDelta > 0 || recovery.worsening > 0) {
          strategy = 'taper';
          strategyName = '减量调整周';
          detailedReasons.push('本周疼痛记录较上周增加');
          detailedReasons.push('建议降低训练量 30-50%');
        } else if (completionRate < 50 && thisWeekStats.totalCount > 2) {
          strategy = 'taper';
          strategyName = '减量调整周';
          detailedReasons.push(`本周完成率仅 ${completionRate}%`);
          detailedReasons.push('建议下调训练强度，逐步找回节奏');
        } else if (riskLevel === 'low' && painfulParts.length === 0 && recovery.recovered > 0) {
          strategy = 'advance';
          strategyName = '进阶恢复周';
          detailedReasons.push('风险低且无活动疼痛');
          detailedReasons.push('已恢复部位可逐步回归正常训练');
        } else if (recovery.improving > 0) {
          strategy = 'recovery';
          strategyName = '康复巩固周';
          detailedReasons.push(`${recovery.improving} 个部位正在好转`);
          detailedReasons.push('建议继续康复训练巩固效果');
        } else if (completionRate >= 85 && thisWeekStats.totalMinutes > 120) {
          strategy = 'advance';
          strategyName = '进阶提升周';
          detailedReasons.push(`本周完成率 ${completionRate}%，表现优秀`);
          detailedReasons.push('下周可适当增加训练量 10-15%');
        } else {
          detailedReasons.push('当前状态平稳');
          detailedReasons.push('建议维持现有训练节奏');
        }

        const smartRecs = getSmartRecommendations();
        const recommendedPlanIds = smartRecs.slice(0, 2).map(r => r.planId);

        const predictedDays = smartRecs.length > 0
          ? Math.min(7, smartRecs[0].recommendedDurationDays + 1)
          : 5;

        let scheduleNote = '';
        if (strategy === 'rest') {
          scheduleNote = '以完全休息为主，可做轻度拉伸，避免任何高强度运动';
        } else if (strategy === 'taper') {
          scheduleNote = '训练量降低 30-50%，重点放在热身和恢复，疼痛部位完全休息';
        } else if (strategy === 'recovery') {
          scheduleNote = '继续当前康复方案，每天完成指定动作，周末做一次全面评估';
        } else if (strategy === 'advance') {
          scheduleNote = '可逐步增加训练强度和时长，但仍需注意热身和冷身，防止复发';
        } else {
          scheduleNote = '保持现有训练节奏，注意睡眠和营养，持续监测身体反应';
        }

        return {
          strategy,
          strategyName,
          reason: detailedReasons.slice(0, 2).join(' · '),
          detailedReasons,
          recommendedPlanIds,
          predictedDurationDays: predictedDays,
          keyMetrics: {
            completionRate,
            painDelta,
            riskDelta: 0,
            trainingLoadDelta
          },
          scheduleNote
        } as NextWeekRecommendation;
      },

      applyNextWeekRecommendation: () => {
        const { getNextWeekRecommendation, addPlanWithSchedule, getWeekRange } = get();
        const rec = getNextWeekRecommendation();
        if (!rec || rec.recommendedPlanIds.length === 0) return null;

        const nextMonday = getWeekRange(1).startKey;
        let totalCreated = 0;
        let planCount = 0;
        let totalDays = 0;

        let usedDays = 0;
        for (let i = 0; i < rec.recommendedPlanIds.length && usedDays < 7; i++) {
          const planId = rec.recommendedPlanIds[i];
          const plan = TRAINING_PLANS.find(p => p.id === planId);
          if (!plan) continue;
          const days = Math.min(plan.defaultDurationDays, 7 - usedDays);
          if (days < 1) continue;
          const startKey = addDaysToDateKey(nextMonday, usedDays);
          const result = addPlanWithSchedule(planId, startKey, days);
          totalCreated += result.created;
          totalDays += result.days;
          usedDays += result.days;
          planCount += 1;
        }

        return { created: totalCreated, days: totalDays, planCount };
      }
    }),
    { name: 'injury-prevention-store-v4' }
  )
);
