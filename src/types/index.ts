export type UserRole = 'reporter' | 'cleaner' | 'admin';

export type ReportStatus = 'pending' | 'in_progress' | 'completed';

export type WasteType = 'plastic' | 'food_waste' | 'paper' | 'electronic' | 'hazardous' | 'glass' | 'mixed_waste' | 'organic';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type EnvironmentalRisk = 'low_risk' | 'medium_risk' | 'high_risk';

export type BinStatus = 'empty' | 'half_full' | 'full';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  image_url: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  waste_type: WasteType;
  severity: SeverityLevel;
  priority: PriorityLevel;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface Cleaner {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
}

export interface SmartBin {
  id: string;
  bin_id: string;
  name: string;
  latitude: number;
  longitude: number;
  fill_level: number;
  status: BinStatus;
  last_updated: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  report_id: string;
  cleaner_id: string;
  assigned_at: string;
  completed_at?: string;
  status: AssignmentStatus;
  distance_km?: number;
  notes?: string;
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export interface AIAnalysis {
  wasteType: string;
  severity: string;
  priority: string;
  estimatedQuantity: string;
  environmentalRisk: string;
  recommendedAction: string;
  confidence: number;
}

export interface DashboardStats {
  total_reports: number;
  pending_reports: number;
  completed_reports: number;
  active_cleaners: number;
  smart_bins: number;
}
