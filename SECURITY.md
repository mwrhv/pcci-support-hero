# 🔐 Guide de Sécurité - PCCI Help Desk

Ce document décrit les mesures de sécurité implémentées dans l'application et les bonnes pratiques à suivre.

## 📋 Table des Matières

1. [Variables d'Environnement](#variables-denvironnement)
2. [Validation des Données](#validation-des-données)
3. [Gestion des Erreurs](#gestion-des-erreurs)
4. [Protection XSS](#protection-xss)
5. [Rate Limiting](#rate-limiting)
6. [Authentification](#authentification)
7. [Fichiers et Uploads](#fichiers-et-uploads)
8. [Headers de Sécurité](#headers-de-sécurité)
9. [Bonnes Pratiques](#bonnes-pratiques)

---

## 🔑 Variables d'Environnement

### ⚠️ CRITIQUE : Ne JAMAIS commiter le fichier .env

Le fichier `.env` contient des informations sensibles et **NE DOIT JAMAIS** être ajouté au contrôle de version.

### Configuration

1. **Copiez `.env.example` vers `.env`**
   ```bash
   cp .env.example .env
   ```

2. **Remplissez les vraies valeurs dans `.env`**
   - Obtenez vos clés depuis le [Dashboard Supabase](https://app.supabase.com)
   - N'utilisez JAMAIS la clé `service_role` côté client !

3. **Le fichier `.env` est automatiquement ignoré par Git**

### Variables Requises

```env
VITE_SUPABASE_PROJECT_ID=votre_project_id
VITE_SUPABASE_URL=https://votre-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_cle_publique_anon
```

---

## ✅ Validation des Données

### Schemas Zod

Toutes les entrées utilisateur sont validées avec **Zod** avant traitement.

#### Schémas disponibles :

- `src/schemas/ticketSchemas.ts` - Validation des tickets
- `src/schemas/authSchemas.ts` - Validation authentification
- `src/schemas/profileSchemas.ts` - Validation profils

#### Exemple d'utilisation :

```typescript
import { createTicketSchema } from '@/schemas/ticketSchemas';

try {
  const validated = createTicketSchema.parse(formData);
  // Données sûres à utiliser
} catch (error) {
  // Erreur de validation
}
```

### Règles de validation

- **Titres** : 5-200 caractères, pas de `<>` 
- **Descriptions** : 10-5000 caractères, pas de HTML dangereux
- **Emails** : Format RFC valide, lowercase
- **Mots de passe** : 8+ caractères, minuscule + MAJUSCULE + chiffre
- **Fichiers** : Max 10MB, types MIME vérifiés

---

## 🛡️ Gestion des Erreurs

### ErrorHandler

Le système de gestion d'erreurs centralise et sécurise les messages d'erreur.

#### Utilisation :

```typescript
import { handleError, showError } from '@/utils/errorHandler';

try {
  await riskyOperation();
} catch (error) {
  showError(error, 'Context optionnel');
}
```

#### Avantages :

✅ Messages utilisateur friendly
✅ Pas de fuite d'informations techniques en production
✅ Logs détaillés en développement uniquement
✅ Types d'erreurs standardisés

### Types d'erreurs

- `VALIDATION` - Données invalides
- `AUTHENTICATION` - Échec d'authentification
- `AUTHORIZATION` - Permissions insuffisantes
- `NOT_FOUND` - Ressource introuvable
- `DATABASE` - Erreur base de données
- `NETWORK` - Problème de connexion
- `FILE_UPLOAD` - Échec upload
- `RATE_LIMIT` - Trop de requêtes
- `UNKNOWN` - Erreur inattendue

---

## 🚫 Protection XSS

### Sanitisation

Toutes les entrées utilisateur sont nettoyées avant affichage.

#### Fonctions disponibles :

```typescript
import { 
  escapeHtml,
  sanitizeString,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeEmail,
  sanitizeSearchQuery
} from '@/utils/sanitizer';

// Échapper HTML
const safe = escapeHtml(userInput);

// Nettoyer complètement
const clean = sanitizeString(userInput);

// Valider une URL
const safeUrl = sanitizeUrl(userUrl);
```

### Protections automatiques

- ✅ Échappement des caractères HTML dangereux
- ✅ Suppression des scripts inline
- ✅ Suppression des event handlers
- ✅ Validation des URLs (pas de javascript:, data:)
- ✅ Noms de fichiers sécurisés

---

## ⏱️ Rate Limiting

### Limiteurs de taux côté client

Protection contre l'abus et les attaques par force brute.

#### Limiteurs configurés :

```typescript
import { 
  authRateLimiter,        // 5 tentatives / 5 min
  ticketRateLimiter,      // 10 créations / min
  fileUploadRateLimiter,  // 20 uploads / min
  checkRateLimit 
} from '@/utils/security';

// Vérifier avant une action
try {
  checkRateLimit(
    authRateLimiter, 
    userId, 
    "Trop de tentatives de connexion"
  );
  await login();
} catch (error) {
  // Utilisateur rate limited
}
```

---

## 🔐 Authentification

### Bonnes pratiques

1. **Mots de passe forts obligatoires**
   - Minimum 8 caractères
   - Au moins 1 minuscule, 1 MAJUSCULE, 1 chiffre
   - Vérification de la force avec `checkPasswordStrength()`

2. **Sessions sécurisées**
   - Tokens gérés par Supabase
   - Expiration automatique
   - Refresh tokens sécurisés

3. **Protection des routes**
   - `AuthGuard` vérifie l'authentification
   - Redirections automatiques
   - Gestion de session React

### Recommandations futures

🔜 **À implémenter** :
- Authentification à deux facteurs (2FA)
- Connexion sociale (Google, Microsoft)
- Politique de mot de passe personnalisable
- Historique des connexions

---

## 📁 Fichiers et Uploads

### Validation stricte

```typescript
// Taille maximum
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Types autorisés
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  // ...
];
```

### Sécurité des uploads

1. **Validation côté client** (schemas Zod)
2. **Noms de fichiers sécurisés**
   ```typescript
   const safeName = generateSecureFilename(originalName, userId);
   // Résultat : user123_1234567890_abc123_document.pdf
   ```
3. **Stockage isolé** (Supabase Storage avec RLS)
4. **Scan antivirus** (recommandé côté serveur)

---

## 🌐 Headers de Sécurité

### Headers HTTP configurés

Headers de sécurité ajoutés dans `vite.config.ts` :

```typescript
headers: {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}
```

### Protection fournie

- **X-Content-Type-Options** : Empêche le MIME sniffing
- **X-Frame-Options** : Prévient le clickjacking
- **X-XSS-Protection** : Active la protection XSS du navigateur
- **Referrer-Policy** : Limite les informations de referrer

---

## ✨ Bonnes Pratiques

### Pour les Développeurs

1. **Ne jamais commiter de secrets**
   - Vérifiez `.gitignore` inclut `.env`
   - Utilisez `.env.example` pour documenter

2. **Toujours valider les entrées**
   ```typescript
   // ❌ Mauvais
   const data = { title: req.body.title };
   
   // ✅ Bon
   const validated = createTicketSchema.parse(req.body);
   ```

3. **Gérer les erreurs proprement**
   ```typescript
   // ❌ Mauvais
   catch (error) {
     console.log(error);
   }
   
   // ✅ Bon
   catch (error) {
     showError(error, 'Création ticket');
   }
   ```

4. **Nettoyer les données affichées**
   ```typescript
   // ❌ Mauvais
   <div>{userInput}</div>
   
   // ✅ Bon
   <div>{escapeHtml(userInput)}</div>
   ```

5. **Limiter les requêtes sensibles**
   ```typescript
   checkRateLimit(authRateLimiter, userId);
   ```

### Checklist de sécurité

Avant chaque commit :

- [ ] Pas de secrets dans le code
- [ ] Validation Zod sur toutes les entrées
- [ ] Gestion d'erreurs avec `handleError()`
- [ ] Sanitisation des affichages
- [ ] Rate limiting sur actions sensibles
- [ ] Tests des cas limites

### En Production

- [ ] Variables d'environnement configurées
- [ ] HTTPS activé (obligatoire)
- [ ] Logs de sécurité activés
- [ ] Monitoring des erreurs (Sentry recommandé)
- [ ] Backups réguliers de la DB
- [ ] Row Level Security (RLS) activé sur Supabase

---

## 🚨 Rapport de Vulnérabilité

Si vous découvrez une faille de sécurité :

1. **NE PAS** la rendre publique
2. Contactez l'équipe de sécurité par email
3. Fournissez les détails (steps to reproduce)
4. Attendez la correction avant divulgation

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [React Security Best Practices](https://react.dev/learn/escape-hatches)
- [Zod Documentation](https://zod.dev/)

---

**Dernière mise à jour** : 2025-10-24
**Version** : 1.0.0
