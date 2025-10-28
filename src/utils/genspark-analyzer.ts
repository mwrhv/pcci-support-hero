/**
 * Fonctions d'analyse automatique Genspark AI
 * Système d'analyse intelligente des incidents IT
 */

import {
  TicketData,
  GensarkAnalysis,
  Priority,
  DepartmentStats,
  DailySummary,
  PRIORITY_KEYWORDS,
  INCIDENT_TYPES,
  IncidentType,
} from '@/types/genspark';

/**
 * Analyse automatique d'un ticket
 */
export function analyzeTicket(ticket: TicketData): GensarkAnalysis {
  const combinedText = `${ticket.motif} ${ticket.description}`.toLowerCase();
  
  // Déterminer le type d'incident
  const incidentType = determineIncidentType(combinedText);
  
  // Évaluer la priorité
  const priority = evaluatePriority(combinedText, ticket.status);
  
  // Évaluer l'urgence et l'impact
  const { urgency, impact } = evaluateUrgencyAndImpact(combinedText, priority);
  
  // Générer un résumé
  const summary = generateSummary(ticket, incidentType);
  
  // Proposer des solutions
  const proposedSolutions = proposeSolutions(incidentType, combinedText);
  
  // Générer les étapes de résolution
  const resolutionSteps = generateResolutionSteps(incidentType, priority);
  
  // Vérifier si c'est récurrent (logique simplifiée)
  const isRecurrent = false; // À implémenter avec historique
  
  // Estimer le temps de résolution
  const estimatedResolutionTime = estimateResolutionTime(priority, incidentType);
  
  // Identifier les compétences requises
  const requiredSkills = identifyRequiredSkills(incidentType);
  
  // Déterminer si escalade nécessaire
  const escalationNeeded = priority === 'critical' || priority === 'high';
  
  return {
    ticketId: ticket.id,
    ticketCode: ticket.code,
    department: ticket.department,
    incidentType,
    priority,
    urgency,
    impact,
    summary,
    proposedSolutions,
    resolutionSteps,
    isRecurrent,
    estimatedResolutionTime,
    requiredSkills,
    escalationNeeded,
    relatedTickets: [],
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Détermine le type d'incident basé sur le contenu
 */
function determineIncidentType(text: string): string {
  const scores: Record<string, number> = {};
  
  for (const [type, keywords] of Object.entries(INCIDENT_TYPES)) {
    scores[type] = keywords.filter(keyword => text.includes(keyword)).length;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'Autre';
  
  const detectedType = Object.entries(scores).find(([, score]) => score === maxScore)?.[0];
  return detectedType ? capitalizeFirst(detectedType) : 'Autre';
}

/**
 * Évalue la priorité d'un ticket
 */
function evaluatePriority(text: string, status: string): Priority {
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
      return priority as Priority;
    }
  }
  
  // Priorité par défaut basée sur le statut
  if (status === 'open') return 'medium';
  return 'low';
}

/**
 * Évalue l'urgence et l'impact
 */
function evaluateUrgencyAndImpact(text: string, priority: Priority) {
  const multipleUsers = /plusieurs|tous|équipe|département/i.test(text);
  const productionImpact = /production|client|critique|urgent/i.test(text);
  
  let urgency: GensarkAnalysis['urgency'] = priority;
  let impact: GensarkAnalysis['impact'] = priority;
  
  if (multipleUsers) {
    impact = priority === 'low' ? 'medium' : priority === 'medium' ? 'high' : 'critical';
  }
  
  if (productionImpact) {
    urgency = priority === 'low' ? 'high' : 'critical';
  }
  
  return { urgency, impact };
}

/**
 * Génère un résumé clair du problème
 */
function generateSummary(ticket: TicketData, incidentType: string): string {
  const userName = `${ticket.firstName} ${ticket.lastName}`;
  const dept = ticket.department;
  const motif = ticket.motif;
  
  return `L'utilisateur ${userName} (${dept}) signale un problème de type "${incidentType}": ${motif}. ` +
    `Ticket créé le ${new Date(ticket.createdAt).toLocaleDateString('fr-FR')}.`;
}

/**
 * Propose des solutions selon le type d'incident
 */
function proposeSolutions(incidentType: string, text: string): string[] {
  const solutions: Record<string, string[]> = {
    'Network': [
      'Vérifier les câbles réseau et connexions physiques',
      'Redémarrer les équipements réseau (routeur, switch)',
      'Vérifier la configuration IP (ipconfig /all)',
      'Tester la connectivité avec ping',
      'Vérifier les paramètres DNS',
      'Contacter le support réseau si le problème persiste',
    ],
    'Hardware': [
      'Vérifier les connexions physiques du matériel',
      'Redémarrer l\'équipement concerné',
      'Vérifier les pilotes dans le Gestionnaire de périphériques',
      'Tester avec un autre câble/port si possible',
      'Remplacer le matériel défectueux si nécessaire',
    ],
    'Software': [
      'Redémarrer l\'application concernée',
      'Vérifier les mises à jour disponibles',
      'Réinstaller l\'application si nécessaire',
      'Vérifier les logs d\'erreur',
      'Contacter l\'éditeur du logiciel',
    ],
    'Access': [
      'Réinitialiser le mot de passe via le système AD',
      'Vérifier les droits d\'accès dans l\'annuaire',
      'Débloquer le compte si nécessaire',
      'Créer un nouveau profil utilisateur si corruption',
    ],
    'Email': [
      'Vérifier les paramètres du compte email',
      'Tester l\'envoi/réception avec webmail',
      'Vérifier la taille de la boîte mail',
      'Reconfigurer le client email',
      'Vérifier les règles de messagerie',
    ],
    'Security': [
      'Lancer un scan antivirus complet',
      'Isoler le poste du réseau si nécessaire',
      'Changer tous les mots de passe',
      'Vérifier les logs de sécurité',
      'Escalader au responsable sécurité',
    ],
    'Data': [
      'Vérifier les sauvegardes disponibles',
      'Tenter une restauration de fichiers',
      'Utiliser les outils de récupération de données',
      'Vérifier l\'intégrité du disque',
      'Contacter l\'équipe backup/restore',
    ],
    'Performance': [
      'Vérifier l\'utilisation CPU et mémoire',
      'Fermer les applications inutiles',
      'Nettoyer les fichiers temporaires',
      'Défragmenter le disque si HDD',
      'Ajouter de la mémoire RAM si nécessaire',
    ],
  };
  
  return solutions[incidentType] || [
    'Collecter plus d\'informations sur le problème',
    'Reproduire le problème pour mieux le comprendre',
    'Consulter la base de connaissances',
    'Escalader vers un expert si nécessaire',
  ];
}

/**
 * Génère les étapes de résolution
 */
function generateResolutionSteps(incidentType: string, priority: Priority): string[] {
  const baseSteps = [
    'Contacter l\'utilisateur pour confirmer le problème',
    'Collecter les informations détaillées',
    'Appliquer la solution proposée',
    'Tester et valider la résolution',
    'Documenter la solution dans le ticket',
    'Fermer le ticket avec l\'accord de l\'utilisateur',
  ];
  
  if (priority === 'critical') {
    return [
      '🔴 URGENT - Contacter immédiatement l\'utilisateur',
      'Évaluer l\'impact sur la production',
      'Appliquer la solution de contournement si disponible',
      ...baseSteps.slice(2),
    ];
  }
  
  return baseSteps;
}

/**
 * Estime le temps de résolution
 */
function estimateResolutionTime(priority: Priority, incidentType: string): string {
  const timeMap: Record<Priority, string> = {
    critical: '< 1 heure',
    high: '2-4 heures',
    medium: '4-8 heures',
    low: '1-2 jours',
  };
  
  return timeMap[priority];
}

/**
 * Identifie les compétences requises
 */
function identifyRequiredSkills(incidentType: string): string[] {
  const skillsMap: Record<string, string[]> = {
    'Network': ['Administration réseau', 'TCP/IP', 'Diagnostic réseau'],
    'Hardware': ['Support matériel', 'Diagnostic hardware'],
    'Software': ['Support applicatif', 'Installation logiciels'],
    'Access': ['Active Directory', 'Gestion des identités'],
    'Email': ['Administration messagerie', 'Exchange/Outlook'],
    'Security': ['Sécurité informatique', 'Analyse malware'],
    'Data': ['Backup/Restore', 'Récupération de données'],
    'Performance': ['Optimisation système', 'Diagnostic performance'],
  };
  
  return skillsMap[incidentType] || ['Support IT général'];
}

/**
 * Génère des statistiques par département
 */
export function generateDepartmentStats(
  tickets: TicketData[],
  analyses: GensarkAnalysis[]
): DepartmentStats[] {
  const deptMap = new Map<string, DepartmentStats>();
  
  tickets.forEach((ticket, index) => {
    const analysis = analyses[index];
    if (!analysis) return;
    
    if (!deptMap.has(ticket.department)) {
      deptMap.set(ticket.department, {
        department: ticket.department,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
        recurrentIncidents: 0,
        averageResolutionTime: '0h',
        topIssues: [],
      });
    }
    
    const stats = deptMap.get(ticket.department)!;
    stats.total++;
    stats[analysis.priority]++;
    
    if (analysis.isRecurrent) {
      stats.recurrentIncidents++;
    }
  });
  
  return Array.from(deptMap.values()).sort((a, b) => b.total - a.total);
}

/**
 * Génère un résumé quotidien
 */
export function generateDailySummary(
  tickets: TicketData[],
  analyses: GensarkAnalysis[]
): DailySummary {
  const today = new Date().toISOString().split('T')[0];
  
  const deptStats = generateDepartmentStats(tickets, analyses);
  
  const criticalIssues = analyses
    .filter(a => a.priority === 'critical')
    .slice(0, 5)
    .map(a => ({
      ticketCode: a.ticketCode,
      department: a.department,
      issue: a.summary.substring(0, 100),
    }));
  
  const recurrentCount = analyses.filter(a => a.isRecurrent).length;
  
  const recommendations = generateRecommendations(deptStats, analyses);
  
  return {
    date: today,
    totalTickets: tickets.length,
    byDepartment: deptStats,
    overallRecurrentIncidents: recurrentCount,
    criticalIssues,
    recommendations,
  };
}

/**
 * Génère des recommandations
 */
function generateRecommendations(
  deptStats: DepartmentStats[],
  analyses: GensarkAnalysis[]
): string[] {
  const recommendations: string[] = [];
  
  // Recommandations basées sur les départements avec beaucoup de tickets critiques
  deptStats.forEach(dept => {
    if (dept.critical > 2) {
      recommendations.push(
        `⚠️ Département ${dept.department}: ${dept.critical} incidents critiques. ` +
        `Envisager une formation ou une mise à niveau des équipements.`
      );
    }
  });
  
  // Recommandations sur les incidents récurrents
  const recurrentTypes = analyses
    .filter(a => a.isRecurrent)
    .map(a => a.incidentType);
  
  const uniqueRecurrent = [...new Set(recurrentTypes)];
  if (uniqueRecurrent.length > 0) {
    recommendations.push(
      `🔄 Incidents récurrents détectés: ${uniqueRecurrent.join(', ')}. ` +
      `Créer une base de connaissances pour ces problèmes.`
    );
  }
  
  // Recommandations générales
  if (analyses.some(a => a.escalationNeeded)) {
    recommendations.push(
      `📈 Plusieurs tickets nécessitent une escalade. Vérifier la disponibilité des experts.`
    );
  }
  
  return recommendations;
}

/**
 * Capitalise la première lettre
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Exporte les analyses en format CSV
 */
export function exportToCSV(analyses: GensarkAnalysis[]): string {
  const headers = [
    'Code Ticket',
    'Département',
    'Type Incident',
    'Priorité',
    'Urgence',
    'Impact',
    'Résumé',
    'Temps Estimé',
    'Récurrent',
    'Date Analyse',
  ];
  
  const rows = analyses.map(a => [
    a.ticketCode,
    a.department,
    a.incidentType,
    a.priority,
    a.urgency,
    a.impact,
    `"${a.summary.replace(/"/g, '""')}"`,
    a.estimatedResolutionTime,
    a.isRecurrent ? 'Oui' : 'Non',
    new Date(a.analyzedAt).toLocaleString('fr-FR'),
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
