/**
 * Types TypeScript pour le Module de Gestion des Temps
 * Système de pointage et gestion des heures de travail
 */

export type ClockEventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
export type LeaveType = 'paid_leave' | 'sick_leave' | 'unpaid_leave' | 'rtt' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type WorkScheduleType = 'fixed' | 'flexible' | 'shift';

/**
 * Événement de pointage (entrée/sortie)
 */
export interface TimeEntry {
  id: string;
  user_id: string;
  event_type: ClockEventType;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  device_info?: {
    type: 'web' | 'mobile' | 'external';
    device_id?: string;
    ip_address?: string;
  };
  notes?: string;
  validated: boolean;
  validated_by?: string;
  validated_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Session de travail calculée (paire entrée/sortie)
 */
export interface WorkSession {
  id: string;
  user_id: string;
  clock_in_id: string;
  clock_out_id?: string;
  date: string; // YYYY-MM-DD
  clock_in_time: string;
  clock_out_time?: string;
  break_duration_minutes: number;
  total_work_minutes: number;
  overtime_minutes: number;
  status: 'in_progress' | 'completed' | 'incomplete';
  validated: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Horaire de travail (planning)
 */
export interface WorkSchedule {
  id: string;
  user_id: string;
  schedule_type: WorkScheduleType;
  // Horaires fixes
  monday_start?: string;
  monday_end?: string;
  tuesday_start?: string;
  tuesday_end?: string;
  wednesday_start?: string;
  wednesday_end?: string;
  thursday_start?: string;
  thursday_end?: string;
  friday_start?: string;
  friday_end?: string;
  saturday_start?: string;
  saturday_end?: string;
  sunday_start?: string;
  sunday_end?: string;
  // Configuration
  expected_hours_per_day: number;
  expected_hours_per_week: number;
  break_duration_minutes: number;
  effective_from: string;
  effective_until?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Demande de congé/absence
 */
export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  total_days: number;
  half_day: boolean;
  reason?: string;
  status: LeaveStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Compteurs de temps (congés, RTT, etc.)
 */
export interface TimeBalance {
  id: string;
  user_id: string;
  year: number;
  // Congés payés
  paid_leave_total: number;
  paid_leave_taken: number;
  paid_leave_remaining: number;
  // RTT
  rtt_total: number;
  rtt_taken: number;
  rtt_remaining: number;
  // Heures supplémentaires
  overtime_accumulated_minutes: number;
  overtime_paid_minutes: number;
  overtime_remaining_minutes: number;
  // Congés maladie
  sick_leave_days_taken: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

/**
 * Règles de temps (conventions, règlements)
 */
export interface TimeRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'overtime' | 'break' | 'weekly_limit' | 'daily_limit' | 'other';
  // Limites
  max_daily_hours?: number;
  max_weekly_hours?: number;
  min_break_minutes?: number;
  // Heures supplémentaires
  overtime_threshold_daily?: number;
  overtime_threshold_weekly?: number;
  overtime_rate_percentage?: number; // ex: 125 pour +25%
  // Application
  applies_to_all: boolean;
  department_ids?: string[];
  effective_from: string;
  effective_until?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Rapport mensuel
 */
export interface MonthlyTimeReport {
  user_id: string;
  user_name: string;
  department: string;
  month: string; // YYYY-MM
  // Temps de travail
  total_work_hours: number;
  expected_work_hours: number;
  difference_hours: number; // positif = plus, négatif = moins
  // Heures supplémentaires
  overtime_hours: number;
  overtime_amount?: number; // Montant à payer
  // Absences
  paid_leave_days: number;
  sick_leave_days: number;
  unpaid_leave_days: number;
  rtt_days: number;
  // Statistiques
  days_worked: number;
  days_absent: number;
  average_daily_hours: number;
  // Validation
  validated: boolean;
  validated_by?: string;
  validated_at?: string;
  generated_at: string;
}

/**
 * Statistiques globales
 */
export interface TimeStatistics {
  period: string; // "2024-10" ou "2024-10-28"
  period_type: 'day' | 'week' | 'month' | 'year';
  // Global
  total_employees: number;
  total_work_hours: number;
  total_overtime_hours: number;
  // Par département
  by_department: Array<{
    department: string;
    employee_count: number;
    total_hours: number;
    overtime_hours: number;
    average_hours_per_employee: number;
  }>;
  // Absences
  total_leave_requests: number;
  pending_leave_requests: number;
  approved_leave_requests: number;
  total_absence_days: number;
  // Conformité
  employees_over_max_hours: number;
  employees_missing_clock_out: number;
  generated_at: string;
}

/**
 * Export pour la paie
 */
export interface PayrollExport {
  export_id: string;
  month: string; // YYYY-MM
  generated_at: string;
  generated_by: string;
  total_employees: number;
  entries: Array<{
    employee_id: string;
    employee_code: string;
    full_name: string;
    department: string;
    // Heures
    regular_hours: number;
    overtime_hours: number;
    night_hours: number; // Optionnel
    weekend_hours: number; // Optionnel
    // Absences
    paid_leave_days: number;
    sick_leave_days: number;
    unpaid_leave_days: number;
    // Montants (si calculés)
    base_salary?: number;
    overtime_amount?: number;
    total_gross_salary?: number;
  }>;
}

/**
 * Configuration du module temps
 */
export interface TimeModuleConfig {
  // Général
  enabled: boolean;
  timezone: string;
  week_start_day: 'monday' | 'sunday';
  // Pointage
  require_location: boolean;
  max_location_distance_meters?: number;
  allow_manual_entries: boolean;
  require_supervisor_validation: boolean;
  // Heures supplémentaires
  enable_overtime_tracking: boolean;
  overtime_auto_approval: boolean;
  // Congés
  enable_leave_management: boolean;
  max_advance_leave_request_days: number;
  min_notice_leave_request_days: number;
  // Notifications
  notify_missing_clock_out: boolean;
  notify_overtime_threshold: boolean;
  notify_leave_approval: boolean;
}

/**
 * Filtre pour les requêtes
 */
export interface TimeQueryFilter {
  user_ids?: string[];
  department?: string;
  start_date?: string;
  end_date?: string;
  validated?: boolean;
  include_absences?: boolean;
}

/**
 * Résumé quotidien pour un employé
 */
export interface DailySummary {
  date: string;
  user_id: string;
  // Temps de travail
  clock_in_time?: string;
  clock_out_time?: string;
  total_work_minutes: number;
  break_minutes: number;
  net_work_minutes: number;
  // Statut
  status: 'present' | 'absent' | 'on_leave' | 'not_clocked_out';
  leave_type?: LeaveType;
  // Heures supplémentaires
  overtime_minutes: number;
  // Notes
  notes?: string;
  validated: boolean;
}

/**
 * Données pour le dashboard
 */
export interface TimeDashboardData {
  current_status: {
    is_clocked_in: boolean;
    clock_in_time?: string;
    current_session_duration_minutes?: number;
  };
  today: DailySummary;
  this_week: {
    total_work_hours: number;
    expected_work_hours: number;
    days_worked: number;
    overtime_hours: number;
  };
  this_month: {
    total_work_hours: number;
    expected_work_hours: number;
    days_worked: number;
    days_absent: number;
    overtime_hours: number;
  };
  balances: TimeBalance;
  pending_leave_requests: number;
  recent_sessions: WorkSession[];
}

// Constantes utiles
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  paid_leave: 'Congé Payé',
  sick_leave: 'Congé Maladie',
  unpaid_leave: 'Congé Sans Solde',
  rtt: 'RTT',
  other: 'Autre',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'En Attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

export const CLOCK_EVENT_LABELS: Record<ClockEventType, string> = {
  clock_in: 'Entrée',
  clock_out: 'Sortie',
  break_start: 'Début Pause',
  break_end: 'Fin Pause',
};
