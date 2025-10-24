/**
 * Utilitaires de sécurité généraux
 */

/**
 * Rate limiter côté client pour éviter l'abus
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Vérifie si une action peut être effectuée
   */
  canProceed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Nettoie les anciennes requêtes
    const recentTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    recentTimestamps.push(now);
    this.requests.set(key, recentTimestamps);
    
    return true;
  }

  /**
   * Réinitialise le compteur pour une clé
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Obtient le temps restant avant de pouvoir refaire une requête (en ms)
   */
  getTimeUntilReset(key: string): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;
    
    const oldestTimestamp = Math.min(...timestamps);
    const timeElapsed = Date.now() - oldestTimestamp;
    const timeRemaining = Math.max(0, this.windowMs - timeElapsed);
    
    return timeRemaining;
  }
}

// Instances de rate limiters pour différentes actions
export const authRateLimiter = new RateLimiter(5, 300000); // 5 tentatives par 5 minutes
export const ticketRateLimiter = new RateLimiter(10, 60000); // 10 créations par minute
export const fileUploadRateLimiter = new RateLimiter(20, 60000); // 20 uploads par minute

/**
 * Vérifie si une action est rate limited
 */
export function checkRateLimit(
  limiter: RateLimiter,
  key: string,
  errorMessage: string = "Trop de requêtes. Veuillez réessayer dans quelques instants."
): boolean {
  if (!limiter.canProceed(key)) {
    const timeRemaining = limiter.getTimeUntilReset(key);
    const seconds = Math.ceil(timeRemaining / 1000);
    throw new Error(`${errorMessage} (${seconds}s)`);
  }
  return true;
}

/**
 * Génère un ID de session unique pour le rate limiting
 */
export function getSessionId(): string {
  // En production, utiliser un ID de session réel depuis l'authentification
  // Pour le moment, on utilise un ID stocké dans le localStorage
  let sessionId = localStorage.getItem('session_id');
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Détecte les tentatives de timing attack
 */
export async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  // Cette fonction prend toujours le même temps, peu importe où se trouve la différence
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Détecte les patterns suspects dans les inputs (potentielles attaques)
 */
export function detectSuspiciousPattern(input: string): boolean {
  // Patterns d'attaque communs
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /import\s+/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /document\./i,
    /window\./i,
    /--/,  // SQL comment
    /;.*drop/i,  // SQL injection
    /;.*delete/i,  // SQL injection
    /union.*select/i,  // SQL injection
    /\.\.\/\.\.\//,  // Directory traversal
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Génère un token CSRF (Cross-Site Request Forgery)
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Stocke le token CSRF dans le sessionStorage
 */
export function storeCSRFToken(token: string): void {
  sessionStorage.setItem('csrf_token', token);
}

/**
 * Récupère le token CSRF
 */
export function getCSRFToken(): string | null {
  return sessionStorage.getItem('csrf_token');
}

/**
 * Valide le token CSRF
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = getCSRFToken();
  return storedToken === token;
}

/**
 * Nettoie les données sensibles du localStorage/sessionStorage
 */
export function clearSensitiveData(): void {
  const keysToKeep = ['theme', 'language']; // Garder certaines préférences
  
  // Nettoie localStorage
  const localKeys = Object.keys(localStorage);
  localKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Nettoie sessionStorage
  sessionStorage.clear();
}

/**
 * Masque les données sensibles pour les logs (en développement uniquement)
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'authorization'];
  const masked = { ...data };
  
  for (const key in masked) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  
  return masked;
}

/**
 * Vérifie la force d'un mot de passe
 */
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Longueur
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  else feedback.push("Utilisez au moins 12 caractères");
  
  // Complexité
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push("Mélangez majuscules et minuscules");
  }
  
  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push("Ajoutez des chiffres");
  }
  
  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push("Ajoutez des caractères spéciaux (!@#$%^&*)");
  }
  
  // Patterns communs
  const commonPatterns = [
    /^[0-9]+$/,
    /^[a-z]+$/,
    /^[A-Z]+$/,
    /password/i,
    /123456/,
    /qwerty/i,
    /azerty/i,
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push("Évitez les patterns communs");
  }
  
  return {
    score: Math.min(4, score),
    feedback,
    isStrong: score >= 3
  };
}

/**
 * Timeout pour les requêtes (protection contre les DoS)
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}
