import { toast } from "sonner";
import { PostgrestError } from "@supabase/supabase-js";
import { ZodError } from "zod";

/**
 * Types d'erreurs personnalisés
 */
export enum ErrorType {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  DATABASE = "DATABASE",
  NETWORK = "NETWORK",
  FILE_UPLOAD = "FILE_UPLOAD",
  RATE_LIMIT = "RATE_LIMIT",
  UNKNOWN = "UNKNOWN"
}

/**
 * Interface pour les erreurs applicatives
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  statusCode?: number;
  timestamp: Date;
}

/**
 * Classe d'erreur personnalisée
 */
export class ApplicationError extends Error implements AppError {
  type: ErrorType;
  details?: string;
  statusCode?: number;
  timestamp: Date;

  constructor(type: ErrorType, message: string, details?: string, statusCode?: number) {
    super(message);
    this.name = "ApplicationError";
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date();
  }
}

/**
 * Messages d'erreur traduits et sécurisés (pas de détails techniques exposés)
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VALIDATION]: "Les données fournies sont invalides",
  [ErrorType.AUTHENTICATION]: "Authentification échouée. Veuillez vous reconnecter",
  [ErrorType.AUTHORIZATION]: "Vous n'avez pas les permissions nécessaires",
  [ErrorType.NOT_FOUND]: "La ressource demandée n'a pas été trouvée",
  [ErrorType.DATABASE]: "Une erreur est survenue lors de l'accès aux données",
  [ErrorType.NETWORK]: "Erreur de connexion. Vérifiez votre connexion internet",
  [ErrorType.FILE_UPLOAD]: "Erreur lors du téléchargement du fichier",
  [ErrorType.RATE_LIMIT]: "Trop de requêtes. Veuillez réessayer dans quelques instants",
  [ErrorType.UNKNOWN]: "Une erreur inattendue s'est produite"
};

/**
 * Détermine le type d'erreur depuis une erreur Supabase/Postgres
 */
function getErrorTypeFromPostgrest(error: PostgrestError): ErrorType {
  const code = error.code;
  
  if (code === "PGRST116") return ErrorType.NOT_FOUND;
  if (code === "23505") return ErrorType.VALIDATION; // Duplicate key
  if (code === "23503") return ErrorType.VALIDATION; // Foreign key violation
  if (code === "42501") return ErrorType.AUTHORIZATION; // Insufficient privilege
  if (code?.startsWith("23")) return ErrorType.VALIDATION; // Integrity constraint violation
  
  return ErrorType.DATABASE;
}

/**
 * Parse les erreurs Zod pour un message utilisateur friendly
 */
function parseZodError(error: ZodError): string {
  const firstError = error.errors[0];
  return firstError.message;
}

/**
 * Fonction principale de gestion des erreurs
 * Transforme n'importe quelle erreur en AppError standardisé
 */
export function handleError(error: unknown, context?: string): AppError {
  // Log l'erreur en développement (jamais en production pour éviter les fuites d'infos)
  if (import.meta.env.DEV) {
    console.error(`[Error Handler${context ? ` - ${context}` : ""}]:`, error);
  }

  // Erreur Zod (validation)
  if (error instanceof ZodError) {
    return {
      type: ErrorType.VALIDATION,
      message: parseZodError(error),
      timestamp: new Date()
    };
  }

  // Erreur applicative custom
  if (error instanceof ApplicationError) {
    return error;
  }

  // Erreur Supabase/Postgres
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as PostgrestError;
    const errorType = getErrorTypeFromPostgrest(pgError);
    
    return {
      type: errorType,
      message: ERROR_MESSAGES[errorType],
      details: import.meta.env.DEV ? pgError.message : undefined,
      timestamp: new Date()
    };
  }

  // Erreur réseau
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: ErrorType.NETWORK,
      message: ERROR_MESSAGES[ErrorType.NETWORK],
      timestamp: new Date()
    };
  }

  // Erreur HTTP standard
  if (error && typeof error === "object" && "status" in error) {
    const httpError = error as { status: number; message?: string };
    
    if (httpError.status === 401) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: ERROR_MESSAGES[ErrorType.AUTHENTICATION],
        statusCode: 401,
        timestamp: new Date()
      };
    }
    
    if (httpError.status === 403) {
      return {
        type: ErrorType.AUTHORIZATION,
        message: ERROR_MESSAGES[ErrorType.AUTHORIZATION],
        statusCode: 403,
        timestamp: new Date()
      };
    }
    
    if (httpError.status === 404) {
      return {
        type: ErrorType.NOT_FOUND,
        message: ERROR_MESSAGES[ErrorType.NOT_FOUND],
        statusCode: 404,
        timestamp: new Date()
      };
    }
    
    if (httpError.status === 429) {
      return {
        type: ErrorType.RATE_LIMIT,
        message: ERROR_MESSAGES[ErrorType.RATE_LIMIT],
        statusCode: 429,
        timestamp: new Date()
      };
    }
  }

  // Erreur générique
  const message = error instanceof Error ? error.message : String(error);
  
  return {
    type: ErrorType.UNKNOWN,
    message: ERROR_MESSAGES[ErrorType.UNKNOWN],
    details: import.meta.env.DEV ? message : undefined,
    timestamp: new Date()
  };
}

/**
 * Affiche une erreur à l'utilisateur via toast
 */
export function showError(error: unknown, context?: string): void {
  const appError = handleError(error, context);
  
  toast.error(appError.message, {
    description: appError.details && import.meta.env.DEV ? appError.details : undefined,
    duration: 5000
  });
}

/**
 * Hook pour gérer les erreurs dans les composants React
 */
export function useErrorHandler() {
  return {
    handleError: (error: unknown, context?: string) => {
      showError(error, context);
    },
    createError: (type: ErrorType, message: string, details?: string) => {
      return new ApplicationError(type, message, details);
    }
  };
}

/**
 * Wrapper pour les fonctions async qui gère automatiquement les erreurs
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    const appError = handleError(error, context);
    return { data: null, error: appError };
  }
}
