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
  painCount: number;
  avgPainLevel: number;
  recoveryImprovingCount: number;
  trainingHours: number;
  trainingCount: number;
  riskScore: number;
  riskLevel: RiskLevel | null;
  assessmentCount: number;
  reminderCompletedCount: number;
  reminderTotalCount: number;
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
  reason: string;
  priority: number;
}
