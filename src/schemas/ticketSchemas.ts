import { z } from "zod";

// Constantes pour la validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

// Enums pour les types
export const TicketStatusEnum = z.enum([
  'New',
  'In_Progress',
  'Resolved',
  'Closed',
  'Canceled'
]);

export const TicketPriorityEnum = z.enum([
  'Low',
  'Medium',
  'High',
  'Critical'
]);

// Schéma pour les pièces jointes
export const attachmentSchema = z.object({
  name: z.string()
    .min(1, "Le nom du fichier ne peut pas être vide")
    .max(255, "Le nom du fichier est trop long"),
  size: z.number()
    .positive("La taille du fichier doit être positive")
    .max(MAX_FILE_SIZE, `Le fichier ne peut pas dépasser ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  type: z.string()
    .refine(
      (type) => ALLOWED_FILE_TYPES.includes(type),
      "Type de fichier non supporté. Formats acceptés : images, PDF, Word, Excel, texte"
    )
});

// Schéma de validation pour la création d'un ticket
export const createTicketSchema = z.object({
  title: z.string()
    .trim()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .refine(
      (val) => !/[<>]/.test(val),
      "Le titre contient des caractères non autorisés"
    ),
  
  description: z.string()
    .trim()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(5000, "La description ne peut pas dépasser 5000 caractères")
    .refine(
      (val) => !/[<>]/.test(val),
      "La description contient des caractères non autorisés"
    ),
  
  priority: TicketPriorityEnum,
  
  categoryId: z.string()
    .uuid({ message: "L'ID de catégorie doit être un UUID valide" }),
  
  attachments: z.array(attachmentSchema)
    .max(MAX_FILES, `Vous ne pouvez joindre que ${MAX_FILES} fichiers maximum`)
    .optional()
    .default([])
});

// Schéma pour la mise à jour d'un ticket
export const updateTicketSchema = z.object({
  title: z.string()
    .trim()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .optional(),
  
  description: z.string()
    .trim()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(5000, "La description ne peut pas dépasser 5000 caractères")
    .optional(),
  
  status: TicketStatusEnum.optional(),
  
  priority: TicketPriorityEnum.optional(),
  
  assignee_id: z.string()
    .uuid({ message: "L'ID de l'assigné doit être un UUID valide" })
    .nullable()
    .optional()
});

// Schéma pour les commentaires/mises à jour de ticket
export const ticketUpdateSchema = z.object({
  body: z.string()
    .trim()
    .min(1, "Le commentaire ne peut pas être vide")
    .max(2000, "Le commentaire ne peut pas dépasser 2000 caractères")
    .refine(
      (val) => !/[<>]/.test(val),
      "Le commentaire contient des caractères non autorisés"
    ),
  
  type: z.enum(['comment', 'status_change', 'assignment'])
});

// Types TypeScript inférés depuis les schémas
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export type TicketPriority = z.infer<typeof TicketPriorityEnum>;
export type AttachmentInput = z.infer<typeof attachmentSchema>;
