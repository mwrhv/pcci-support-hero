/**
 * Types TypeScript pour l'intégration Genspark AI
 * Système d'analyse intelligente des incidents IT
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketData {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  userId: string;
  department: string;
  location: string;
  phone: string;
  email: string;
  motif: string;
  description: string;
  interventionDate: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GensarkAnalysis {
  ticketId: string;
  ticketCode: string;
  department: string;
  incidentType: string;
  priority: Priority;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  impact: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  proposedSolutions: string[];
  resolutionSteps: string[];
  isRecurrent: boolean;
  recurrentReason?: string;
  estimatedResolutionTime: string;
  requiredSkills: string[];
  escalationNeeded: boolean;
  relatedTickets: string[];
  analyzedAt: string;
}

export interface DepartmentStats {
  department: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  recurrentIncidents: number;
  averageResolutionTime: string;
  topIssues: Array<{
    issue: string;
    count: number;
  }>;
}

export interface DailySummary {
  date: string;
  totalTickets: number;
  byDepartment: DepartmentStats[];
  overallRecurrentIncidents: number;
  criticalIssues: Array<{
    ticketCode: string;
    department: string;
    issue: string;
  }>;
  recommendations: string[];
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalTickets: number;
  byDepartment: DepartmentStats[];
  trends: Array<{
    department: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    changePercentage: number;
  }>;
  recurrentPatterns: Array<{
    pattern: string;
    frequency: number;
    affectedDepartments: string[];
  }>;
  recommendations: string[];
}

export interface AnalysisFilters {
  startDate?: string;
  endDate?: string;
  departments?: string[];
  priorities?: Priority[];
  status?: TicketStatus[];
  includeRecurrent?: boolean;
}

export interface AnalysisReport {
  generatedAt: string;
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  filters: AnalysisFilters;
  summary: DailySummary | WeeklySummary;
  detailedAnalysis: GensarkAnalysis[];
  exportFormats: Array<'pdf' | 'excel' | 'csv'>;
}

// Constantes pour la classification
export const PRIORITY_KEYWORDS = {
  critical: [
    'serveur down',
    'panne totale',
    'système hors ligne',
    'données perdues',
    'sécurité compromise',
    'virus',
    'ransomware',
    'accès bloqué',
    'production arrêtée',
  ],
  high: [
    'lenteur importante',
    'erreur récurrente',
    'accès limité',
    'fonctionnalité essentielle',
    'plusieurs utilisateurs',
    'département bloqué',
    'perte de connexion',
  ],
  medium: [
    'problème intermittent',
    'lenteur occasionnelle',
    'erreur sporadique',
    'un utilisateur',
    'fonctionnalité secondaire',
    'amélioration',
  ],
  low: [
    'question',
    'demande information',
    'formation',
    'documentation',
    'conseil',
    'optimisation',
  ],
} as const;

export const INCIDENT_TYPES = {
  network: [
    'connexion',
    'réseau',
    'wifi',
    'internet',
    'vpn',
    'routeur',
    'switch',
    'câble',
  ],
  hardware: [
    'ordinateur',
    'écran',
    'clavier',
    'souris',
    'imprimante',
    'scanner',
    'disque dur',
    'mémoire',
    'alimentation',
  ],
  software: [
    'application',
    'logiciel',
    'programme',
    'installation',
    'mise à jour',
    'licence',
    'bug',
    'crash',
  ],
  access: [
    'mot de passe',
    'compte',
    'authentification',
    'autorisation',
    'accès',
    'permission',
    'droits',
  ],
  email: [
    'email',
    'courriel',
    'outlook',
    'messagerie',
    'mail',
    'envoi',
    'réception',
  ],
  security: [
    'virus',
    'malware',
    'phishing',
    'sécurité',
    'antivirus',
    'firewall',
    'intrusion',
  ],
  data: [
    'données',
    'fichier',
    'sauvegarde',
    'restauration',
    'corruption',
    'perte',
    'récupération',
  ],
  performance: [
    'lenteur',
    'performance',
    'optimisation',
    'rapidité',
    'vitesse',
    'ralentissement',
  ],
} as const;

export const DEPARTMENTS = [
  'IT',
  'Finance',
  'RH',
  'Commercial',
  'Production',
  'Logistique',
  'Marketing',
  'Direction',
  'Comptabilité',
  'Juridique',
] as const;

export type Department = typeof DEPARTMENTS[number];
export type IncidentType = keyof typeof INCIDENT_TYPES;
