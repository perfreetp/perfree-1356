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

export interface TrainingPlan {
  id: string;
  title: string;
  type: 'rest' | 'alternative' | 'recovery';
  description: string;
  duration: string;
  intensity: 'low' | 'medium' | 'high';
  items: string[];
}

export interface ReminderItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'recovery' | 'training' | 'check';
  done: boolean;
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
  painCount: number;
  avgPainLevel: number;
  trainingHours: number;
  riskScore: number;
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
