# 🗄️ Guide de Migration SQL - Module de Gestion des Temps

## ⚠️ IMPORTANT - À Exécuter Avant de Tester

Le module de gestion des temps nécessite la création de 6 tables dans votre base de données Supabase. Ce guide vous explique comment exécuter la migration SQL.

---

## 📋 Tables à Créer

1. **time_entries** - Enregistrements de pointage (arrivée, départ, pause)
2. **work_sessions** - Sessions de travail calculées
3. **work_schedules** - Horaires de travail des employés
4. **leave_requests** - Demandes d'absence
5. **time_balances** - Compteurs (congés, heures sup, RTT)
6. **time_rules** - Règles métier (durées max, seuils)

---

## 🚀 Procédure d'Exécution

### Étape 1: Accéder à Supabase SQL Editor

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **PCCI Help Desk**
3. Dans le menu latéral, cliquez sur **SQL Editor**
4. Cliquez sur **New Query**

### Étape 2: Copier le Script SQL

Le script SQL se trouve dans le fichier:
```
supabase/migrations/time_management_schema.sql
```

Copiez **tout le contenu** de ce fichier (environ 350 lignes).

### Étape 3: Coller et Exécuter

1. Collez le contenu dans l'éditeur SQL de Supabase
2. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter`)
3. Attendez la confirmation d'exécution (environ 5-10 secondes)

### Étape 4: Vérifier la Création

Pour vérifier que toutes les tables ont été créées correctement, exécutez cette requête:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'time_entries', 
    'work_sessions', 
    'work_schedules', 
    'leave_requests', 
    'time_balances', 
    'time_rules'
  )
ORDER BY table_name;
```

**Résultat attendu**: 6 lignes (les 6 tables)

---

## ✅ Vérifications Post-Migration

### 1. Vérifier les Tables

```sql
-- Vérifier time_entries
SELECT COUNT(*) FROM time_entries;

-- Vérifier work_sessions
SELECT COUNT(*) FROM work_sessions;

-- Vérifier work_schedules
SELECT COUNT(*) FROM work_schedules;

-- Vérifier leave_requests
SELECT COUNT(*) FROM leave_requests;

-- Vérifier time_balances
SELECT COUNT(*) FROM time_balances;

-- Vérifier time_rules
SELECT COUNT(*) FROM time_rules;
-- Devrait retourner 1 (règle par défaut 35h/semaine)
```

### 2. Vérifier les RLS (Row Level Security)

```sql
-- Vérifier que les policies RLS sont actives
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'time_entries', 
  'work_sessions', 
  'work_schedules', 
  'leave_requests', 
  'time_balances', 
  'time_rules'
)
ORDER BY tablename, policyname;
```

**Résultat attendu**: Plusieurs policies par table (SELECT, INSERT, UPDATE, DELETE)

### 3. Vérifier les Index

```sql
-- Vérifier les index créés
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN (
  'time_entries', 
  'work_sessions', 
  'work_schedules', 
  'leave_requests', 
  'time_balances', 
  'time_rules'
)
ORDER BY tablename, indexname;
```

---

## 🛠️ Que Contient le Script?

### 1. **Création des Tables**
- Définition de toutes les colonnes
- Types de données appropriés
- Contraintes (NOT NULL, CHECK, UNIQUE)
- Clés étrangères vers `auth.users`

### 2. **Index pour Performance**
```sql
-- Exemples d'index créés:
idx_time_entries_user_timestamp  -- Recherches rapides par utilisateur et date
idx_work_sessions_user_date      -- Sessions par utilisateur et date
idx_leave_requests_user_dates    -- Absences par utilisateur et période
```

### 3. **Row Level Security (RLS)**

**Pour les utilisateurs normaux:**
- Peuvent voir uniquement leurs propres données
- Peuvent créer leurs propres entrées
- Peuvent modifier leurs propres entrées non validées

**Pour les superviseurs/admin:**
- Peuvent voir toutes les données
- Peuvent valider les entrées
- Peuvent approuver les demandes d'absence

### 4. **Triggers**
```sql
-- Mise à jour automatique des timestamps
trigger_time_entries_updated_at
trigger_work_sessions_updated_at
trigger_leave_requests_updated_at
```

### 5. **Données Initiales**
```sql
-- Règle par défaut: 35h/semaine (France)
INSERT INTO time_rules (name, max_daily_hours, max_weekly_hours, ...)
VALUES ('Règle standard France', 10.00, 48.00, 35.00, ...);
```

---

## 🔐 Sécurité Implémentée

### Authentification Required
Toutes les tables nécessitent une authentification via `auth.uid()`.

### RLS Policies

**time_entries:**
- ✅ Les utilisateurs voient leurs propres entrées
- ✅ Les superviseurs voient toutes les entrées
- ✅ Seuls les superviseurs peuvent valider

**leave_requests:**
- ✅ Les utilisateurs créent leurs demandes
- ✅ Les superviseurs approuvent/rejettent
- ✅ Les utilisateurs peuvent annuler leurs demandes en attente

**work_schedules:**
- ✅ Les utilisateurs voient leur propre planning
- ✅ Seuls les superviseurs modifient les plannings

### Validation des Données
```sql
-- Exemples de contraintes CHECK:
CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end'))
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
CHECK (leave_type IN ('paid_leave', 'sick_leave', 'unpaid_leave', 'rtt', 'other'))
```

---

## 🚨 En Cas de Problème

### Erreur: "relation already exists"
Si une ou plusieurs tables existent déjà:

```sql
-- Supprimer les tables existantes (⚠️ ATTENTION: cela supprime les données!)
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS work_sessions CASCADE;
DROP TABLE IF EXISTS work_schedules CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS time_balances CASCADE;
DROP TABLE IF EXISTS time_rules CASCADE;
```

Puis ré-exécutez le script complet.

### Erreur: "permission denied"
Vérifiez que vous êtes connecté en tant que **propriétaire du projet** dans Supabase.

### Erreur: "syntax error"
Assurez-vous de copier **tout le contenu** du fichier SQL, y compris les commentaires.

---

## 📊 Données de Test (Optionnel)

Pour créer des données de test, vous pouvez exécuter ces requêtes après la migration:

```sql
-- Créer un horaire pour un utilisateur
INSERT INTO work_schedules (user_id, monday_start, monday_end, tuesday_start, tuesday_end, ...)
VALUES (auth.uid(), '09:00', '17:00', '09:00', '17:00', ...);

-- Créer un compteur pour l'année en cours
INSERT INTO time_balances (user_id, year, paid_leave_total, paid_leave_remaining, ...)
VALUES (auth.uid(), EXTRACT(YEAR FROM CURRENT_DATE), 25.0, 25.0, ...);
```

---

## ✅ Migration Réussie!

Une fois la migration exécutée avec succès:

1. ✅ Toutes les tables sont créées
2. ✅ Les RLS policies sont actives
3. ✅ Les index sont créés pour la performance
4. ✅ La règle par défaut (35h/semaine) est créée
5. ✅ Les triggers de mise à jour automatique sont actifs

Vous pouvez maintenant utiliser le module de gestion des temps:
- **Page de Pointage**: `/time/clock`
- **Tableau de Bord** (à venir): `/time/dashboard`
- **Gestion des Absences** (à venir): `/time/leaves`
- **Rapports** (à venir): `/time/reports`

---

## 📚 Référence Rapide des Tables

| Table | Description | Colonnes Clés |
|-------|-------------|---------------|
| `time_entries` | Pointages individuels | event_type, timestamp, user_id |
| `work_sessions` | Sessions calculées | clock_in_time, clock_out_time, total_work_minutes |
| `work_schedules` | Plannings employés | monday_start/end, expected_hours_per_week |
| `leave_requests` | Demandes d'absence | leave_type, start_date, end_date, status |
| `time_balances` | Compteurs annuels | paid_leave_remaining, overtime_accumulated |
| `time_rules` | Règles métier | max_daily_hours, overtime_threshold |

---

## 🎯 Prochaines Étapes

Après la migration SQL:
1. Tester la page de pointage (`/time/clock`)
2. Créer un pointage d'arrivée
3. Vérifier que les données sont bien enregistrées
4. Passer à la création des autres pages du module

---

**Date de création**: 2025-11-04  
**Module**: Time Management  
**Version**: 1.0.0
