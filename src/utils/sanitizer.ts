/**
 * Utilitaires de sanitisation pour protéger contre les attaques XSS et injection
 */

/**
 * Caractères dangereux qui doivent être échappés
 */
const DANGEROUS_CHARS: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '&': '&amp;'
};

/**
 * Échappe les caractères HTML pour prévenir les attaques XSS
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/[<>"'\/&]/g, (char) => DANGEROUS_CHARS[char] || char);
}

/**
 * Nettoie une chaîne en retirant les caractères dangereux
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Retire les caractères de contrôle
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Retire les scripts inline
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Retire les event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Retire les balises HTML sauf celles autorisées
  const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p'];
  const allowedPattern = new RegExp(`<(?!\\/?(${allowedTags.join('|')})\\b)[^>]*>`, 'gi');
  sanitized = sanitized.replace(allowedPattern, '');
  
  return sanitized.trim();
}

/**
 * Valide et nettoie une URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // N'autorise que les protocoles sécurisés
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    
    // Vérifie qu'il n'y a pas de javascript: ou data:
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Nettoie un nom de fichier
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed_file';
  
  // Garde seulement les caractères alphanumériques, tirets, underscores et points
  let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Évite les doubles points qui pourraient être utilisés pour traverser les dossiers
  sanitized = sanitized.replace(/\.{2,}/g, '.');
  
  // Limite la longueur
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 255 - ext.length - 1) + '.' + ext;
  }
  
  return sanitized;
}

/**
 * Valide un email (en plus de la validation Zod)
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  // Format basique d'un email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  // Vérifie qu'il n'y a pas de caractères suspects
  if (/[<>'"()]/.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

/**
 * Nettoie un numéro de téléphone
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Garde seulement les chiffres, +, -, espaces et parenthèses
  return phone.replace(/[^0-9+\-\s()]/g, '').trim();
}

/**
 * Valide et limite la taille d'un fichier
 */
export function validateFileSize(file: File, maxSizeInBytes: number = 10 * 1024 * 1024): boolean {
  return file.size <= maxSizeInBytes;
}

/**
 * Valide le type MIME d'un fichier
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Sanitise un objet en profondeur
 */
export function deepSanitize<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item)) as unknown as T;
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized as T;
  }
  
  return obj;
}

/**
 * Prévient les attaques par injection SQL dans les recherches
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  // Retire les caractères SQL dangereux
  let sanitized = query.replace(/['";\\]/g, '');
  
  // Retire les commentaires SQL
  sanitized = sanitized.replace(/--.*$/gm, '');
  sanitized = sanitized.replace(/\/\*.*?\*\//g, '');
  
  // Limite la longueur
  return sanitized.substring(0, 200).trim();
}

/**
 * Génère un nom de fichier sécurisé avec timestamp
 */
export function generateSecureFilename(originalName: string, userId?: string): string {
  const sanitizedName = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  
  const ext = sanitizedName.split('.').pop() || 'bin';
  const nameWithoutExt = sanitizedName.substring(0, sanitizedName.lastIndexOf('.')) || 'file';
  
  const prefix = userId ? `${userId}_` : '';
  return `${prefix}${timestamp}_${random}_${nameWithoutExt}.${ext}`;
}
