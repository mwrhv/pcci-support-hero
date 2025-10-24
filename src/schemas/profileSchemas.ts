import { z } from "zod";

// Regex pour validation téléphone (format international ou local)
const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;

// Schéma pour la mise à jour du profil
export const updateProfileSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, "Le nom complet doit contenir au moins 2 caractères")
    .max(100, "Le nom complet ne peut pas dépasser 100 caractères")
    .refine(
      (val) => !/[<>]/.test(val),
      "Le nom contient des caractères non autorisés"
    )
    .optional(),
  
  phone: z.string()
    .trim()
    .regex(phoneRegex, "Numéro de téléphone invalide")
    .optional()
    .or(z.literal("")),
  
  department: z.string()
    .trim()
    .max(100, "Le département ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
  
  avatar_url: z.string()
    .url("URL d'avatar invalide")
    .optional()
    .or(z.literal(""))
});

// Schéma pour les paramètres de notification
export const notificationSettingsSchema = z.object({
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  ticket_assigned: z.boolean().default(true),
  ticket_updated: z.boolean().default(true),
  ticket_resolved: z.boolean().default(true)
});

// Types TypeScript inférés
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
