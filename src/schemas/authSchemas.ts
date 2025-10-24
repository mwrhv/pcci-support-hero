import { z } from "zod";

// Schéma pour l'inscription
export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email("Adresse email invalide")
    .min(5, "L'email est trop court")
    .max(255, "L'email est trop long")
    .toLowerCase(),
  
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe est trop long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre"
    ),
  
  confirmPassword: z.string(),
  
  fullName: z.string()
    .trim()
    .min(2, "Le nom complet doit contenir au moins 2 caractères")
    .max(100, "Le nom complet ne peut pas dépasser 100 caractères")
    .refine(
      (val) => !/[<>]/.test(val),
      "Le nom contient des caractères non autorisés"
    )
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
);

// Schéma pour la connexion
export const signInSchema = z.object({
  email: z.string()
    .trim()
    .email("Adresse email invalide")
    .toLowerCase(),
  
  password: z.string()
    .min(1, "Le mot de passe est requis")
});

// Schéma pour la réinitialisation du mot de passe
export const resetPasswordSchema = z.object({
  email: z.string()
    .trim()
    .email("Adresse email invalide")
    .toLowerCase()
});

// Schéma pour le nouveau mot de passe
export const newPasswordSchema = z.object({
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe est trop long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre"
    ),
  
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
);

// Types TypeScript inférés
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
