# 🚀 Guide d'Implémentation de la Sécurité

Ce guide explique comment utiliser les nouvelles fonctionnalités de sécurité dans votre code.

## 📚 Table des Matières

1. [Validation avec Zod](#validation-avec-zod)
2. [Gestion des Erreurs](#gestion-des-erreurs)
3. [Sanitisation des Données](#sanitisation-des-données)
4. [Rate Limiting](#rate-limiting)
5. [Exemples Complets](#exemples-complets)

---

## 1️⃣ Validation avec Zod

### Dans un composant de formulaire

```typescript
import { createTicketSchema } from '@/schemas/ticketSchemas';
import { showError } from '@/utils/errorHandler';

function NewTicketForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      // Valider les données
      const validated = createTicketSchema.parse({
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        categoryId: formData.get('categoryId'),
        attachments: files.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      });
      
      // Les données sont maintenant sûres et typées !
      await createTicket(validated);
      
    } catch (error) {
      // Zod erreurs ou autres erreurs
      showError(error, 'Création ticket');
    }
  };
}
```

### Validation de fichiers

```typescript
import { attachmentSchema } from '@/schemas/ticketSchemas';

function validateFile(file: File): boolean {
  try {
    attachmentSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type
    });
    return true;
  } catch (error) {
    showError(error, 'Validation fichier');
    return false;
  }
}
```

---

## 2️⃣ Gestion des Erreurs

### Utilisation basique

```typescript
import { showError, handleError } from '@/utils/errorHandler';

async function fetchTickets() {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // Affiche un toast d'erreur utilisateur-friendly
    showError(error, 'Chargement tickets');
    return [];
  }
}
```

### Utilisation avec safeAsync

```typescript
import { safeAsync } from '@/utils/errorHandler';

async function createTicket(data: CreateTicketInput) {
  const { data: ticket, error } = await safeAsync(
    async () => {
      const result = await supabase
        .from('tickets')
        .insert(data)
        .select()
        .single();
      
      if (result.error) throw result.error;
      return result.data;
    },
    'Création ticket'
  );
  
  if (error) {
    toast.error(error.message);
    return null;
  }
  
  return ticket;
}
```

### Hook personnalisé

```typescript
import { useErrorHandler } from '@/utils/errorHandler';

function MyComponent() {
  const { handleError, createError } = useErrorHandler();
  
  const onSubmit = async (data: any) => {
    try {
      // Validation custom
      if (!data.title) {
        throw createError(
          ErrorType.VALIDATION,
          "Le titre est requis"
        );
      }
      
      await submitData(data);
    } catch (error) {
      handleError(error, 'Soumission formulaire');
    }
  };
}
```

---

## 3️⃣ Sanitisation des Données

### Affichage sécurisé

```typescript
import { escapeHtml, sanitizeString } from '@/utils/sanitizer';

function TicketDisplay({ ticket }: { ticket: Ticket }) {
  // Pour afficher du texte simple
  return (
    <div>
      <h1>{escapeHtml(ticket.title)}</h1>
      <p>{escapeHtml(ticket.description)}</p>
    </div>
  );
}
```

### Nettoyage avant sauvegarde

```typescript
import { sanitizeString, sanitizeFilename } from '@/utils/sanitizer';

function prepareTicketData(formData: any) {
  return {
    title: sanitizeString(formData.title),
    description: sanitizeString(formData.description),
    // Les autres champs sont validés par Zod
  };
}
```

### Upload de fichiers sécurisé

```typescript
import { 
  sanitizeFilename, 
  generateSecureFilename,
  validateFileSize,
  validateFileType 
} from '@/utils/sanitizer';

async function uploadFile(file: File, userId: string) {
  // Validation
  if (!validateFileSize(file, 10 * 1024 * 1024)) {
    throw new Error('Fichier trop volumineux');
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!validateFileType(file, allowedTypes)) {
    throw new Error('Type de fichier non autorisé');
  }
  
  // Nom sécurisé
  const safeName = generateSecureFilename(file.name, userId);
  
  // Upload
  const { error } = await supabase.storage
    .from('ticket-attachments')
    .upload(safeName, file);
  
  if (error) throw error;
  
  return safeName;
}
```

---

## 4️⃣ Rate Limiting

### Protection connexion

```typescript
import { authRateLimiter, checkRateLimit } from '@/utils/security';

async function handleLogin(email: string, password: string) {
  try {
    // Vérifie le rate limit (5 tentatives / 5 min)
    checkRateLimit(
      authRateLimiter,
      email,
      "Trop de tentatives de connexion. Réessayez dans quelques minutes."
    );
    
    // Procède à la connexion
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Reset le compteur en cas de succès
    authRateLimiter.reset(email);
    
    return data;
  } catch (error) {
    showError(error, 'Connexion');
    return null;
  }
}
```

### Protection création de tickets

```typescript
import { ticketRateLimiter, checkRateLimit, getSessionId } from '@/utils/security';

async function createTicket(data: CreateTicketInput) {
  const sessionId = getSessionId();
  
  try {
    // 10 tickets max par minute
    checkRateLimit(
      ticketRateLimiter,
      sessionId,
      "Vous créez des tickets trop rapidement. Attendez un peu."
    );
    
    // Crée le ticket
    const ticket = await insertTicket(data);
    
    return ticket;
  } catch (error) {
    showError(error, 'Création ticket');
    return null;
  }
}
```

### Rate limiter personnalisé

```typescript
import { RateLimiter } from '@/utils/security';

// 3 recherches par seconde maximum
const searchRateLimiter = new RateLimiter(3, 1000);

async function handleSearch(query: string) {
  const sessionId = getSessionId();
  
  if (!searchRateLimiter.canProceed(sessionId)) {
    const timeRemaining = searchRateLimiter.getTimeUntilReset(sessionId);
    toast.error(`Attendez ${Math.ceil(timeRemaining / 1000)}s avant de rechercher à nouveau`);
    return;
  }
  
  await performSearch(query);
}
```

---

## 5️⃣ Exemples Complets

### Exemple 1 : Formulaire de création de ticket sécurisé

```typescript
import { useState } from 'react';
import { createTicketSchema } from '@/schemas/ticketSchemas';
import { showError } from '@/utils/errorHandler';
import { ticketRateLimiter, checkRateLimit, getSessionId } from '@/utils/security';
import { generateSecureFilename } from '@/utils/sanitizer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SecureTicketForm() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Rate limiting
      const sessionId = getSessionId();
      checkRateLimit(ticketRateLimiter, sessionId);

      // 2. Extraction des données
      const formData = new FormData(e.currentTarget);
      
      // 3. Validation Zod
      const validated = createTicketSchema.parse({
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        categoryId: formData.get('categoryId'),
        attachments: files.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      });

      // 4. Upload sécurisé des fichiers
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const uploadedFiles = [];
      for (const file of files) {
        const safeName = generateSecureFilename(file.name, user.id);
        const { error } = await supabase.storage
          .from('ticket-attachments')
          .upload(safeName, file);

        if (error) throw error;
        
        uploadedFiles.push({
          name: file.name,
          size: file.size,
          path: safeName
        });
      }

      // 5. Création du ticket
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: validated.title,
          description: validated.description,
          priority: validated.priority,
          category_id: validated.categoryId,
          requester_id: user.id,
          metadata: { attachments: uploadedFiles }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Ticket créé avec succès !');
      
      // Navigation ou autre action
      
    } catch (error) {
      showError(error, 'Création ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Vos champs de formulaire */}
      <button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer le ticket'}
      </button>
    </form>
  );
}
```

### Exemple 2 : Authentification sécurisée

```typescript
import { signInSchema } from '@/schemas/authSchemas';
import { authRateLimiter, checkRateLimit } from '@/utils/security';
import { showError } from '@/utils/errorHandler';
import { sanitizeEmail } from '@/utils/sanitizer';

export function SecureLoginForm() {
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // 1. Extraction des données
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      // 2. Sanitisation
      const cleanEmail = sanitizeEmail(email);
      if (!cleanEmail) {
        throw new Error('Email invalide');
      }
      
      // 3. Validation Zod
      const validated = signInSchema.parse({
        email: cleanEmail,
        password
      });
      
      // 4. Rate limiting
      checkRateLimit(
        authRateLimiter,
        validated.email,
        "Trop de tentatives. Réessayez dans 5 minutes."
      );
      
      // 5. Connexion
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password
      });
      
      if (error) throw error;
      
      // 6. Reset rate limiter en cas de succès
      authRateLimiter.reset(validated.email);
      
      toast.success('Connexion réussie !');
      
    } catch (error) {
      showError(error, 'Connexion');
    }
  };

  return <form onSubmit={handleLogin}>{/* ... */}</form>;
}
```

### Exemple 3 : Recherche sécurisée

```typescript
import { sanitizeSearchQuery, detectSuspiciousPattern } from '@/utils/sanitizer';
import { showError } from '@/utils/errorHandler';

export function SecureSearch() {
  const handleSearch = async (query: string) => {
    try {
      // 1. Détection de patterns suspects
      if (detectSuspiciousPattern(query)) {
        throw new Error('Recherche invalide');
      }
      
      // 2. Sanitisation
      const cleanQuery = sanitizeSearchQuery(query);
      
      // 3. Recherche sécurisée
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .ilike('title', `%${cleanQuery}%`);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      showError(error, 'Recherche');
      return [];
    }
  };

  return (
    <input
      type="search"
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Rechercher..."
    />
  );
}
```

---

## ✅ Checklist d'Implémentation

Avant de pousser du code, vérifiez :

- [ ] Toutes les entrées utilisateur sont validées avec Zod
- [ ] Les erreurs sont gérées avec `showError()` ou `handleError()`
- [ ] Les affichages utilisent `escapeHtml()` ou `sanitizeString()`
- [ ] Les actions sensibles ont du rate limiting
- [ ] Les fichiers sont validés et ont des noms sécurisés
- [ ] Pas de `console.log()` avec des données sensibles
- [ ] Les URLs externes sont validées avec `sanitizeUrl()`
- [ ] Les recherches utilisent `sanitizeSearchQuery()`

---

## 🎯 Prochaines Étapes

Une fois ces pratiques adoptées :

1. Mettre à jour tous les formulaires existants
2. Ajouter la validation sur toutes les pages
3. Implémenter le rate limiting partout
4. Audit de sécurité complet
5. Tests de sécurité automatisés

---

**Besoin d'aide ?** Consultez `SECURITY.md` pour plus de détails !
