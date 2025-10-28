# 📦 Documentation de Déploiement - PCCI Help Desk

## 📋 Vue d'Ensemble

Ce dossier contient tous les fichiers nécessaires pour **mettre à jour votre serveur Ubuntu** avec les améliorations de sécurité (Phases 1-4).

---

## 📚 Fichiers Disponibles

### 1. 🇫🇷 **GUIDE_MISE_A_JOUR_SERVEUR.md** - COMMENCEZ ICI!

**👉 LISEZ CE FICHIER EN PREMIER!**

Guide complet en français avec instructions simples pour mettre à jour votre serveur Ubuntu.

**Contenu:**
- ⚡ OPTION 1: Déploiement automatique (5 minutes)
- 🔧 OPTION 2: Déploiement manuel (10 minutes)
- ✅ Vérifications post-déploiement
- 🔙 Guide de rollback
- 🆘 Dépannage

**Qui doit l'utiliser:** Tous les utilisateurs, techniques ou non

**Lien:** [GUIDE_MISE_A_JOUR_SERVEUR.md](./GUIDE_MISE_A_JOUR_SERVEUR.md)

---

### 2. 🤖 **deploy-to-ubuntu.sh** - Script Automatisé

Script Bash pour déploiement automatique complet.

**Fonctionnalités:**
- ✅ Sauvegarde automatique avant mise à jour
- ✅ Récupération du code depuis GitHub
- ✅ Installation des dépendances
- ✅ Build de l'application
- ✅ Redémarrage automatique
- ✅ Tests de santé post-déploiement
- ✅ Support des paramètres personnalisés

**Usage de Base:**
```bash
# 1. Télécharger
wget https://raw.githubusercontent.com/mwrhv/pcci-support-hero/main/deploy-to-ubuntu.sh
chmod +x deploy-to-ubuntu.sh

# 2. Configurer (éditer APP_DIR, PM2_APP_NAME, APP_PORT dans le script)
nano deploy-to-ubuntu.sh

# 3. Exécuter
./deploy-to-ubuntu.sh
```

**Usage Avancé:**
```bash
# Avec paramètres personnalisés
./deploy-to-ubuntu.sh \
  --app-dir /var/www/pcci-helpdesk \
  --pm2-name my-app \
  --port 8080

# Déploiement rapide sans tests
./deploy-to-ubuntu.sh --skip-tests

# Afficher l'aide
./deploy-to-ubuntu.sh --help
```

**Qui doit l'utiliser:** Utilisateurs préférant l'automatisation

**Lien:** [deploy-to-ubuntu.sh](./deploy-to-ubuntu.sh)

---

### 3. 📖 **DEPLOYMENT_GUIDE_UBUNTU.md** - Guide Technique Complet

Documentation technique détaillée pour administrateurs système.

**Contenu:**
- 🔧 Pré-requis système
- 💾 Instructions de sauvegarde détaillées
- 🔄 Méthodes de mise à jour (manuelle et automatique)
- ✅ Checklist de vérifications complètes
- 🔙 Procédures de rollback détaillées
- 🤖 Création du script d'automatisation
- 🆘 Section dépannage approfondie

**Qui doit l'utiliser:** Administrateurs système, DevOps

**Lien:** [DEPLOYMENT_GUIDE_UBUNTU.md](./DEPLOYMENT_GUIDE_UBUNTU.md)

---

### 4. ⚡ **QUICK_DEPLOYMENT_REFERENCE.md** - Référence Rapide

Aide-mémoire avec commandes essentielles.

**Contenu:**
- ⚡ Commandes de déploiement rapide
- 🔍 Vérifications post-déploiement express
- 🔙 Rollback d'urgence
- 📊 Options du script
- 🆘 Dépannage rapide
- ✅ Checklist express

**Qui doit l'utiliser:** Utilisateurs expérimentés cherchant une référence rapide

**Lien:** [QUICK_DEPLOYMENT_REFERENCE.md](./QUICK_DEPLOYMENT_REFERENCE.md)

---

### 5. 📊 **PHASE_4_IMPLEMENTATION_SUMMARY.md** - Détails des Améliorations

Documentation complète des améliorations de sécurité (Phase 4).

**Contenu:**
- 🔐 Liste des 9 pages sécurisées en Phase 4
- 📊 Matrice de sécurité complète (18/18 pages)
- 🔒 Détails des améliorations par page
- 📈 Métriques de sécurité
- 🎯 Recommandations futures

**Qui doit l'utiliser:** Développeurs, auditeurs de sécurité

**Lien:** [PHASE_4_IMPLEMENTATION_SUMMARY.md](./PHASE_4_IMPLEMENTATION_SUMMARY.md)

---

## 🚀 Quel Fichier Utiliser?

### Pour Mettre à Jour Votre Serveur:

```
┌─────────────────────────────────────────────────┐
│  VOUS VOULEZ METTRE À JOUR VOTRE SERVEUR?      │
└─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Vous êtes débutant ou      │
        │  voulez des instructions    │
        │  simples en français?       │
        └─────────────────────────────┘
                │                 │
               OUI               NON
                │                 │
                ▼                 ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ UTILISEZ:        │   │ UTILISEZ:        │
    │ GUIDE_MISE_A_    │   │ QUICK_DEPLOY...  │
    │ JOUR_SERVEUR.md  │   │ ou               │
    │                  │   │ deploy-to-       │
    │ (en français)    │   │ ubuntu.sh        │
    └──────────────────┘   └──────────────────┘
```

### Pour Comprendre les Changements:

```
┌─────────────────────────────────────────────────┐
│  VOUS VOULEZ SAVOIR CE QUI A CHANGÉ?           │
└─────────────────────────────────────────────────┘
                      │
                      ▼
              UTILISEZ:
    PHASE_4_IMPLEMENTATION_SUMMARY.md
    
    ✅ Liste complète des améliorations
    ✅ Détails techniques par page
    ✅ Matrice de sécurité
```

### Pour Administration Système Avancée:

```
┌─────────────────────────────────────────────────┐
│  VOUS ÊTES ADMIN SYSTÈME / DEVOPS?             │
└─────────────────────────────────────────────────┘
                      │
                      ▼
              UTILISEZ:
    DEPLOYMENT_GUIDE_UBUNTU.md
    
    ✅ Documentation technique complète
    ✅ Procédures détaillées
    ✅ Personnalisation avancée
```

---

## 🎯 Démarrage Rapide (3 Étapes)

### Méthode la Plus Simple:

```bash
# 1. Télécharger le script sur votre serveur Ubuntu
ssh votre_user@votre_serveur
wget https://raw.githubusercontent.com/mwrhv/pcci-support-hero/main/deploy-to-ubuntu.sh
chmod +x deploy-to-ubuntu.sh

# 2. Configurer vos chemins dans le script
nano deploy-to-ubuntu.sh
# Modifiez APP_DIR, PM2_APP_NAME, APP_PORT

# 3. Exécuter
./deploy-to-ubuntu.sh
```

**C'EST TOUT!** ✅

---

## 📊 Comparaison des Méthodes

| Méthode | Temps | Difficulté | Recommandé Pour |
|---------|-------|------------|-----------------|
| **Script Automatique** | 5 min | ⭐☆☆ | Tous |
| **Commandes Manuelles** | 10 min | ⭐⭐☆ | Utilisateurs expérimentés |
| **Personnalisation Avancée** | 20+ min | ⭐⭐⭐ | Admin système |

---

## ✅ Ce Que Vous Obtiendrez

Après la mise à jour, votre application aura:

### 🔐 Sécurité Renforcée (100% couverture)
- ✅ Protection XSS sur toutes les pages (18/18)
- ✅ Rate Limiting contre brute force
- ✅ Validation Zod de toutes les entrées
- ✅ Sanitization de toutes les données
- ✅ Mots de passe renforcés (8+ caractères)
- ✅ Gestion d'erreurs centralisée

### 📊 Pages Sécurisées (Phase 4)
1. ✅ AdminUsers.tsx - Gestion utilisateurs
2. ✅ AuditLogs.tsx - Logs d'audit
3. ✅ TicketsList.tsx - Liste des tickets
4. ✅ ForgotPassword.tsx - Récupération mot de passe
5. ✅ ResetPassword.tsx - Réinitialisation mot de passe
6. ✅ NotFound.tsx - Page 404
7. ✅ Index.tsx - Page d'accueil
8. ✅ FichesDirectory.tsx - Répertoire fiches
9. ✅ DatabaseSettings.tsx - Paramètres base de données

---

## 🔙 Rollback (Retour Arrière)

Si quelque chose ne fonctionne pas, rollback rapide:

```bash
# 1. Arrêter l'app
pm2 stop pcci-helpdesk

# 2. Trouver la sauvegarde
ls -lh ~/backups/

# 3. Restaurer (remplacez YYYYMMDD par la date de backup)
BACKUP="$HOME/backups/pcci-backup-YYYYMMDD-HHMMSS"
cp -r "$BACKUP/"* /chemin/vers/pcci-helpdesk/

# 4. Redémarrer
pm2 restart pcci-helpdesk
```

**Voir les guides pour procédures détaillées de rollback.**

---

## 🆘 Besoin d'Aide?

### Support par Niveau d'Urgence:

#### 🔴 URGENT: Application ne démarre pas
1. Consultez: [GUIDE_MISE_A_JOUR_SERVEUR.md - Section Rollback](./GUIDE_MISE_A_JOUR_SERVEUR.md#-en-cas-de-problème-rollback)
2. Exécutez le rollback immédiat
3. Collectez les logs: `pm2 logs pcci-helpdesk --err`

#### 🟡 MOYEN: Problème de configuration
1. Consultez: [QUICK_DEPLOYMENT_REFERENCE.md - Dépannage](./QUICK_DEPLOYMENT_REFERENCE.md#-dépannage-rapide)
2. Vérifiez les variables d'environnement
3. Redémarrez PM2

#### 🟢 FAIBLE: Question sur les améliorations
1. Consultez: [PHASE_4_IMPLEMENTATION_SUMMARY.md](./PHASE_4_IMPLEMENTATION_SUMMARY.md)
2. Lisez la documentation complète

---

## 📞 Contacts et Ressources

- **Repository GitHub:** https://github.com/mwrhv/pcci-support-hero
- **Documentation Supabase:** https://supabase.com/docs
- **Documentation PM2:** https://pm2.keymetrics.io/
- **Documentation Node.js:** https://nodejs.org/docs/

---

## 📝 Checklist de Déploiement

Cochez chaque étape:

### Avant Déploiement
- [ ] J'ai lu GUIDE_MISE_A_JOUR_SERVEUR.md
- [ ] J'ai accès SSH à mon serveur
- [ ] Je connais le chemin de mon application
- [ ] Je connais le nom PM2 de mon app
- [ ] J'ai notifié les utilisateurs (maintenance)

### Pendant Déploiement
- [ ] Sauvegarde créée
- [ ] Script téléchargé (ou commandes prêtes)
- [ ] Script configuré (chemins personnalisés)
- [ ] Script exécuté (ou commandes manuelles)
- [ ] Aucune erreur affichée

### Après Déploiement
- [ ] `pm2 status` montre "online"
- [ ] Login fonctionne
- [ ] Dashboard s'affiche
- [ ] Création ticket fonctionne
- [ ] Protection XSS testée (test `<script>`)
- [ ] Rate limiting testé (6 tentatives)
- [ ] Logs ne montrent pas d'erreurs

**SI TOUTES LES CASES SONT COCHÉES ✅ → SUCCÈS!**

---

## 🎉 Conclusion

Vous avez maintenant **tout ce qu'il faut** pour mettre à jour votre serveur Ubuntu avec les améliorations de sécurité!

### Les 3 Fichiers Clés:
1. 🇫🇷 **GUIDE_MISE_A_JOUR_SERVEUR.md** - Pour tout le monde
2. 🤖 **deploy-to-ubuntu.sh** - Script automatique
3. ⚡ **QUICK_DEPLOYMENT_REFERENCE.md** - Référence rapide

### Temps Total Estimé:
- Avec script: **5 minutes**
- Manuel: **10 minutes**
- Avec tests: **+5 minutes**

### Niveau de Difficulté:
**⭐⭐☆☆☆ (Facile à Moyen)**

---

**Bonne mise à jour! 🚀**

*Pour toute question, consultez les guides ou créez un issue sur GitHub.*
