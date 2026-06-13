import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RiskAssessment, PainRecord, UserProfile, WeeklyTrend, ReminderItem } from '@/types';
import { generateId } from '@/utils/risk';

interface AppState {
  assessments: RiskAssessment[];
  painRecords: PainRecord[];
  reminders: ReminderItem[];
  userProfile: UserProfile;
  addAssessment: (a: Omit<RiskAssessment, 'id' | 'timestamp'>) => void;
  addPainRecord: (r: Omit<PainRecord, 'id' | 'timestamp'>) => void;
  toggleReminder: (id: string) => void;
  addReminder: (r: Omit<ReminderItem, 'id' | 'done'>) => void;
  updateProfile: (p: Partial<UserProfile>) => void;
  getWeeklyTrend: () => WeeklyTrend[];
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
const day = 24 * 60 * 60 * 1000;

const defaultReminders: ReminderItem[] = [
  { id: generateId(), date: new Date(now + day).toISOString().split('T')[0], title: '康复训练', description: '踝部稳定性训练15分钟', type: 'recovery', done: false },
  { id: generateId(), date: new Date(now + 2 * day).toISOString().split('T')[0], title: '复查评估', description: '膝部疼痛再评估', type: 'check', done: false },
  { id: generateId(), date: new Date(now + 3 * day).toISOString().split('T')[0], title: '恢复训练', description: '低强度有氧30分钟', type: 'training', done: false }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      assessments: [],
      painRecords: [],
      reminders: defaultReminders,
      userProfile: defaultProfile,

      addAssessment: (a) => set((s) => ({
        assessments: [{ ...a, id: generateId(), timestamp: Date.now() }, ...s.assessments]
      })),

      addPainRecord: (r) => set((s) => ({
        painRecords: [{ ...r, id: generateId(), timestamp: Date.now() }, ...s.painRecords]
      })),

      toggleReminder: (id) => set((s) => ({
        reminders: s.reminders.map(r => r.id === id ? { ...r, done: !r.done } : r)
      })),

      addReminder: (r) => set((s) => ({
        reminders: [...s.reminders, { ...r, id: generateId(), done: false }]
      })),

      updateProfile: (p) => set((s) => ({
        userProfile: { ...s.userProfile, ...p }
      })),

      getWeeklyTrend: () => {
        const { painRecords, assessments } = get();
        const trend: WeeklyTrend[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now - i * day);
          const dateStr = d.toISOString().split('T')[0];
          const dayRecords = painRecords.filter(r => new Date(r.timestamp).toISOString().split('T')[0] === dateStr);
          const dayAssess = assessments.filter(a => new Date(a.timestamp).toISOString().split('T')[0] === dateStr);
          trend.push({
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            painCount: dayRecords.length,
            avgPainLevel: dayRecords.length ? Math.round(dayRecords.reduce((s, r) => s + r.painLevel, 0) / dayRecords.length * 10) / 10 : 0,
            trainingHours: (Math.random() * 2 + 0.5),
            riskScore: dayAssess.length ? Math.round(dayAssess.reduce((s, a) => s + a.score, 0) / dayAssess.length) : Math.round(Math.random() * 30 + 10)
          });
        }
        return trend;
      }
    }),
    { name: 'injury-prevention-store' }
  )
);
