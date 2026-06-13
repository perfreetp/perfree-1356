export type RiskLevel = 'low' | 'medium' | 'high';

export type SportType = 'running' | 'ball' | 'fitness';

export type BodyPart =
  | 'neck' | 'shoulder' | 'elbow' | 'wrist'
  | 'back' | 'waist' | 'hip' | 'knee'
  | 'calf' | 'ankle' | 'foot' | 'chest';

export interface RiskAssessment {
  id: string;
  timestamp: number;
  bodyParts: BodyPart[];
  intensity: number;
  sleepQuality: number;
  hasHistory: boolean;
  historyParts: BodyPart[];
  riskLevel: RiskLevel;
  score: number;
  suggestions: string[];
}

export interface WarmupAction {
  id: string;
  name: string;
  sportTypes: SportType[];
  duration: number;
  description: string;
  steps: string[];
  mistakes: string[];
  tips: string[];
  targetParts: BodyPart[];
}

export type PlanType = 'rest' | 'alternative' | 'recovery';
export type ReminderType = 'rest' | 'alternative' | 'recovery' | 'training' | 'check';

export interface TrainingPlan {
  id: string;
  title: string;
  type: PlanType;
  description: string;
  duration: string;
  intensity: 'low' | 'medium' | 'high';
  items: string[];
  targetParts: BodyPart[];
  suitableRiskLevels: RiskLevel[];
  defaultDurationDays: number;
  scheduleNote: string;
}

export interface ReminderItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: ReminderType;
  planType?: PlanType;
  done: boolean;
  completedAt?: number;
  originPlanId?: string;
  scheduleGroupId?: string;
  scheduleStartDate?: string;
  scheduleDayIndex?: number;
  scheduleTotalDays?: number;
  lastAdjustmentId?: string;
  originalTitle?: string;
}

export interface PainRecord {
  id: string;
  timestamp: number;
  bodyPart: BodyPart;
  painLevel: number;
  description: string;
  recoveryStatus: 'worsening' | 'unchanged' | 'improving' | 'recovered';
  triggers: string[];
  measures: string[];
}

export interface TrainingRecord {
  id: string;
  timestamp: number;
  date: string;
  sportType: SportType;
  duration: number;
  intensity: number;
  completed: boolean;
  note?: string;
  sets?: number;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  category: 'prevention' | 'treatment' | 'recovery' | 'emergency';
  summary: string;
  content: string;
  tags: string[];
}

export interface WeeklyTrend {
  date: string;
  dateKey: string;
  dayOfWeek: string;
  painCount: number;
  avgPainLevel: number;
  recoveryImprovingCount: number;
  trainingHours: number;
  trainingMinutes: number;
  trainingCount: number;
  riskScore: number;
  riskLevel: RiskLevel | null;
  assessmentCount: number;
  reminderCompletedCount: number;
  reminderTotalCount: number;
  trainingRecords: TrainingRecord[];
  reminders: ReminderItem[];
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number;
  weight: number;
  mainSport: SportType;
  trainingFrequency: number;
  emergencyContact: string;
  allergies: string;
}

export interface SmartRecommendation {
  planId: string;
  plan: TrainingPlan;
  matchScore: number;
  matchPercentage: number;
  reason: string;
  detailedReasons: string[];
  recommendedDurationDays: number;
  scheduleHint: string;
  priority: number;
}

export interface DayScheduleItem {
  dateKey: string;
  dateDisplay: string;
  dayOfWeek: string;
  isToday: boolean;
  reminders: ReminderItem[];
  trainingRecords: TrainingRecord[];
  painCount: number;
  riskLevel: RiskLevel | null;
  hasActivity: boolean;
}

export type AdjustmentType = 'upgrade' | 'downgrade' | 'cancel' | 'extend' | 'switch';

export interface AdjustmentReminderSnapshot {
  id: string;
  date: string;
  title: string;
  type: ReminderType;
  description?: string;
}

export interface ScheduleAdjustment {
  id: string;
  timestamp: number;
  type: AdjustmentType;
  reason: string;
  detailedReasons: string[];
  triggerSource: 'assessment' | 'pain' | 'manual';
  beforeRiskLevel?: RiskLevel;
  afterRiskLevel?: RiskLevel;
  beforePainCount?: number;
  afterPainCount?: number;
  affectedPlanIds: string[];
  addedReminderIds: string[];
  removedReminderIds: string[];
  updatedReminderIds: string[];
  affectedDateKeys: string[];
  removedReminders: AdjustmentReminderSnapshot[];
  addedReminders: AdjustmentReminderSnapshot[];
}

export type NextWeekStrategy = 'taper' | 'maintain' | 'recovery' | 'advance' | 'rest';

export interface NextWeekRecommendation {
  strategy: NextWeekStrategy;
  strategyName: string;
  reason: string;
  detailedReasons: string[];
  recommendedPlanIds: string[];
  predictedDurationDays: number;
  keyMetrics: {
    completionRate: number;
    painDelta: number;
    riskDelta: number;
    trainingLoadDelta: number;
  };
  scheduleNote: string;
}

export type TimelineItemType = 'training' | 'pain' | 'assessment' | 'reminder' | 'adjustment';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  dateKey: string;
  timestamp: number;
  timeLabel: string;
  title: string;
  description?: string;
  tag?: string;
  tagColor?: string;
  icon?: string;
}
