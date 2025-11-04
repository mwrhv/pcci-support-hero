/**
 * Utilitaires de calcul pour le module de gestion des temps
 * Fonctions de calcul des heures, overtime, congés, etc.
 */

import type { 
  TimeEntry, 
  WorkSession, 
  WorkSchedule,
  DailySummary,
  MonthlyTimeReport 
} from '@/types/time-management';

/**
 * Calcule la durée en minutes entre deux timestamps
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 1000 / 60);
}

/**
 * Calcule la durée en heures (avec décimales)
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const minutes = calculateDurationMinutes(startTime, endTime);
  return minutes / 60;
}

/**
 * Formate des minutes en format HH:MM
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formate des heures décimales en format HH:MM
 */
export function formatHoursToTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return formatMinutesToTime(totalMinutes);
}

/**
 * Parse un format HH:MM en minutes
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

/**
 * Calcule la session de travail à partir des pointages
 */
export function calculateWorkSession(
  clockIn: TimeEntry,
  clockOut: TimeEntry | null,
  breaks: TimeEntry[],
  expectedHoursPerDay: number
): Partial<WorkSession> {
  const clockInTime = clockIn.timestamp;
  const clockOutTime = clockOut?.timestamp;
  
  if (!clockOutTime) {
    return {
      clock_in_time: clockInTime,
      clock_out_time: undefined,
      break_duration_minutes: 0,
      total_work_minutes: 0,
      overtime_minutes: 0,
      status: 'in_progress',
    };
  }
  
  // Calcule le temps total
  const totalMinutes = calculateDurationMinutes(clockInTime, clockOutTime);
  
  // Calcule les pauses
  let breakMinutes = 0;
  for (let i = 0; i < breaks.length; i += 2) {
    const breakStart = breaks[i];
    const breakEnd = breaks[i + 1];
    if (breakStart && breakEnd) {
      breakMinutes += calculateDurationMinutes(
        breakStart.timestamp,
        breakEnd.timestamp
      );
    }
  }
  
  // Temps de travail net
  const netWorkMinutes = totalMinutes - breakMinutes;
  
  // Heures supplémentaires
  const expectedMinutes = expectedHoursPerDay * 60;
  const overtimeMinutes = Math.max(0, netWorkMinutes - expectedMinutes);
  
  return {
    clock_in_time: clockInTime,
    clock_out_time: clockOutTime,
    break_duration_minutes: breakMinutes,
    total_work_minutes: netWorkMinutes,
    overtime_minutes: overtimeMinutes,
    status: 'completed',
  };
}

/**
 * Calcule les heures attendues pour une période
 */
export function calculateExpectedHours(
  schedule: WorkSchedule,
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalHours = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    let dayHours = 0;
    switch (dayOfWeek) {
      case 1: // Lundi
        if (schedule.monday_start && schedule.monday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.monday_start}`,
            `2024-01-01T${schedule.monday_end}`
          );
        }
        break;
      case 2: // Mardi
        if (schedule.tuesday_start && schedule.tuesday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.tuesday_start}`,
            `2024-01-01T${schedule.tuesday_end}`
          );
        }
        break;
      case 3: // Mercredi
        if (schedule.wednesday_start && schedule.wednesday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.wednesday_start}`,
            `2024-01-01T${schedule.wednesday_end}`
          );
        }
        break;
      case 4: // Jeudi
        if (schedule.thursday_start && schedule.thursday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.thursday_start}`,
            `2024-01-01T${schedule.thursday_end}`
          );
        }
        break;
      case 5: // Vendredi
        if (schedule.friday_start && schedule.friday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.friday_start}`,
            `2024-01-01T${schedule.friday_end}`
          );
        }
        break;
      case 6: // Samedi
        if (schedule.saturday_start && schedule.saturday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.saturday_start}`,
            `2024-01-01T${schedule.saturday_end}`
          );
        }
        break;
      case 0: // Dimanche
        if (schedule.sunday_start && schedule.sunday_end) {
          dayHours = calculateDurationHours(
            `2024-01-01T${schedule.sunday_start}`,
            `2024-01-01T${schedule.sunday_end}`
          );
        }
        break;
    }
    
    totalHours += dayHours;
  }
  
  return totalHours;
}

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 */
export function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    // Exclut samedi (6) et dimanche (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  
  return count;
}

/**
 * Calcule un résumé quotidien
 */
export function calculateDailySummary(
  sessions: WorkSession[],
  date: string
): Partial<DailySummary> {
  const daySession = sessions.find(s => s.date === date);
  
  if (!daySession) {
    return {
      date,
      total_work_minutes: 0,
      break_minutes: 0,
      net_work_minutes: 0,
      status: 'absent',
      overtime_minutes: 0,
      validated: false,
    };
  }
  
  return {
    date,
    clock_in_time: daySession.clock_in_time,
    clock_out_time: daySession.clock_out_time,
    total_work_minutes: daySession.total_work_minutes,
    break_minutes: daySession.break_duration_minutes,
    net_work_minutes: daySession.total_work_minutes,
    status: daySession.status === 'completed' ? 'present' : 'not_clocked_out',
    overtime_minutes: daySession.overtime_minutes,
    validated: daySession.validated,
  };
}

/**
 * Calcule le rapport mensuel
 */
export function calculateMonthlyReport(
  sessions: WorkSession[],
  schedule: WorkSchedule,
  month: string // YYYY-MM
): Partial<MonthlyTimeReport> {
  const startDate = `${month}-01`;
  const endDate = new Date(
    parseInt(month.split('-')[0]),
    parseInt(month.split('-')[1]),
    0
  ).toISOString().split('T')[0];
  
  // Total heures travaillées
  const totalWorkMinutes = sessions.reduce(
    (sum, s) => sum + s.total_work_minutes,
    0
  );
  const totalWorkHours = totalWorkMinutes / 60;
  
  // Heures attendues
  const expectedHours = calculateExpectedHours(schedule, startDate, endDate);
  
  // Heures supplémentaires
  const overtimeMinutes = sessions.reduce(
    (sum, s) => sum + s.overtime_minutes,
    0
  );
  const overtimeHours = overtimeMinutes / 60;
  
  // Jours travaillés
  const daysWorked = sessions.filter(s => s.status === 'completed').length;
  
  // Moyenne journalière
  const averageDailyHours = daysWorked > 0 ? totalWorkHours / daysWorked : 0;
  
  return {
    month,
    total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
    expected_work_hours: parseFloat(expectedHours.toFixed(2)),
    difference_hours: parseFloat((totalWorkHours - expectedHours).toFixed(2)),
    overtime_hours: parseFloat(overtimeHours.toFixed(2)),
    days_worked: daysWorked,
    average_daily_hours: parseFloat(averageDailyHours.toFixed(2)),
    generated_at: new Date().toISOString(),
  };
}

/**
 * Vérifie si un employé dépasse les heures max
 */
export function checkMaxHoursViolation(
  totalHours: number,
  maxDailyHours: number,
  maxWeeklyHours: number,
  period: 'day' | 'week'
): boolean {
  if (period === 'day') {
    return totalHours > maxDailyHours;
  } else {
    return totalHours > maxWeeklyHours;
  }
}

/**
 * Calcule le montant des heures supplémentaires
 */
export function calculateOvertimeAmount(
  overtimeHours: number,
  hourlyRate: number,
  overtimeRatePercentage: number = 125 // 125% = +25%
): number {
  const rate = overtimeRatePercentage / 100;
  return overtimeHours * hourlyRate * rate;
}

/**
 * Obtient la date du premier jour de la semaine
 */
export function getWeekStartDate(date: string, weekStartDay: 'monday' | 'sunday' = 'monday'): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = weekStartDay === 'monday' 
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * Obtient la date du dernier jour de la semaine
 */
export function getWeekEndDate(date: string, weekStartDay: 'monday' | 'sunday' = 'monday'): string {
  const startDate = getWeekStartDate(date, weekStartDay);
  const d = new Date(startDate);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

/**
 * Obtient le premier jour du mois
 */
export function getMonthStartDate(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Obtient le dernier jour du mois
 */
export function getMonthEndDate(date: string): string {
  const d = new Date(date);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Formate une date en français
 */
export function formatDateFR(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formate un timestamp en heure HH:MM
 */
export function formatTimestampToTime(timestamp: string): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
