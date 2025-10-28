# 🚀 Guide Rapide de Mise à Jour - Serveur Ubuntu

## ⚡ Déploiement Rapide (Méthode Recommandée)

### 1. Télécharger le Script

```bash
# Depuis votre serveur Ubuntu
cd ~
wget https://raw.githubusercontent.com/mwrhv/pcci-support-hero/main/deploy-to-ubuntu.sh
chmod +x deploy-to-ubuntu.sh
```

### 2. Exécuter le Script

```bash
# Exécution simple (utilise les paramètres par défaut)
./deploy-to-ubuntu.sh

# Ou avec paramètres personnalisés
./deploy-to-ubuntu.sh --app-dir /var/www/pcci-helpdesk --pm2-name my-app --port 3000
```

**C'est tout!** Le script fait automatiquement:
- ✅ Sauvegarde complète
- ✅ Récupération du code GitHub
- ✅ Installation des dépendances
- ✅ Build de l'application
- ✅ Redémarrage de l'app
- ✅ Tests de santé

---

## 🛠️ Déploiement Manuel (Si Préféré)

### Commandes Essentielles

```bash
# 1. Se connecter au serveur
ssh user@votre-serveur-ip

# 2. Aller dans le répertoire de l'app
cd ~/pcci-helpdesk  # Ajustez selon votre installation

# 3. SAUVEGARDE (IMPORTANT!)
cp -r ~/pcci-helpdesk ~/pcci-helpdesk-backup-$(date +%Y%m%d)

# 4. Arrêter l'application
pm2 stop pcci-helpdesk

# 5. Récupérer les modifications
git pull origin main

# 6. Installer les dépendances
npm install

# 7. Rebuild
npm run build

# 8. Redémarrer
pm2 restart pcci-helpdesk
pm2 save

# 9. Vérifier
pm2 status
pm2 logs pcci-helpdesk --lines 20
```

---

## 🔍 Vérifications Post-Déploiement

### Dans le Terminal

```bash
# Vérifier le statut PM2
pm2 status

# Voir les logs en temps réel
pm2 logs pcci-helpdesk

# Vérifier que le port est en écoute (exemple port 3000)
sudo netstat -tlnp | grep :3000

# Test HTTP simple
curl http://localhost:3000
```

### Dans le Navigateur

1. **Login**: https://votre-domaine.com/login
   - ✅ Se connecter avec un compte valide
   - ✅ Essayer 6 fois avec mauvais mot de passe (doit bloquer à la 6ème)

2. **Dashboard**: https://votre-domaine.com/dashboard
   - ✅ Vérifier que les tickets s'affichent

3. **Test XSS**: Créer un ticket avec:
   - Titre: `<script>alert('XSS')</script>`
   - ✅ Le script doit être échappé (pas d'alerte)

4. **Admin Users**: https://votre-domaine.com/admin/users
   - ✅ Changer un mot de passe
   - ✅ Doit exiger 8+ caractères avec maj + min + chiffre

---

## 🔙 Rollback d'Urgence

### Si Problème - Restauration Rapide

```bash
# 1. Arrêter l'app
pm2 stop pcci-helpdesk

# 2. Restaurer depuis backup
rm -rf ~/pcci-helpdesk
cp -r ~/pcci-helpdesk-backup-YYYYMMDD ~/pcci-helpdesk

# 3. Redémarrer
cd ~/pcci-helpdesk
pm2 restart pcci-helpdesk
```

### Rollback Git

```bash
# Voir les derniers commits
cd ~/pcci-helpdesk
git log --oneline -5

# Revenir au commit précédent
git reset --hard HEAD~1

# Rebuild et redémarrer
npm install
npm run build
pm2 restart pcci-helpdesk
```

---

## 📊 Paramètres du Script de Déploiement

### Options Disponibles

```bash
./deploy-to-ubuntu.sh [OPTIONS]

Options:
  --app-dir PATH        Chemin vers l'app (défaut: ~/pcci-helpdesk)
  --pm2-name NAME       Nom PM2 (défaut: pcci-helpdesk)
  --port PORT           Port de l'app (défaut: 3000)
  --skip-backup         Sauter la sauvegarde (NON RECOMMANDÉ!)
  --skip-tests          Sauter les tests post-déploiement
  -h, --help            Afficher l'aide
```

### Exemples d'Utilisation

```bash
# Installation standard
./deploy-to-ubuntu.sh

# Installation personnalisée
./deploy-to-ubuntu.sh \
  --app-dir /var/www/helpdesk \
  --pm2-name my-helpdesk \
  --port 8080

# Déploiement rapide (sans tests)
./deploy-to-ubuntu.sh --skip-tests

# Déploiement dangereux (sans backup - NE PAS UTILISER EN PROD!)
./deploy-to-ubuntu.sh --skip-backup
```

---

## 🆘 Dépannage Rapide

### Problème 1: "npm install" échoue

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Problème 2: "npm run build" échoue

```bash
# Vérifier les erreurs détaillées
npm run build -- --verbose

# Vérifier la version Node.js
node --version  # Doit être 18+
```

### Problème 3: PM2 ne démarre pas

```bash
# Redémarrer complètement PM2
pm2 kill
pm2 start ecosystem.config.js
pm2 save

# Vérifier les logs
pm2 logs pcci-helpdesk --err
```

### Problème 4: Application ne répond pas

```bash
# Vérifier les processus
pm2 status
ps aux | grep node

# Vérifier les ports
sudo netstat -tlnp | grep node

# Redémarrer Nginx (si utilisé)
sudo systemctl restart nginx
```

### Problème 5: Variables d'environnement manquantes

```bash
# Vérifier le fichier .env
cat ~/pcci-helpdesk/.env

# Restaurer depuis backup si nécessaire
cp ~/pcci-helpdesk-backup-YYYYMMDD/.env ~/pcci-helpdesk/.env

# Redémarrer
pm2 restart pcci-helpdesk
```

---

## 📞 Support

### Logs à Vérifier

```bash
# Logs de l'application
pm2 logs pcci-helpdesk

# Logs système (si systemd)
sudo journalctl -u pcci-helpdesk -n 100

# Logs Nginx (si utilisé)
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Informations à Collecter en Cas de Problème

```bash
# Créer un rapport de débogage
cat > ~/debug-report.txt << 'EOF'
========================================
PCCI HELP DESK - DEBUG REPORT
========================================
Date: $(date)
Hostname: $(hostname)
User: $(whoami)

--- Git Info ---
$(cd ~/pcci-helpdesk && git log -1 --oneline)
$(cd ~/pcci-helpdesk && git status)

--- Node/npm Versions ---
Node: $(node -v)
npm: $(npm -v)

--- PM2 Status ---
$(pm2 status)

--- Last 20 Logs ---
$(pm2 logs pcci-helpdesk --lines 20 --nostream)

--- Port Status ---
$(sudo netstat -tlnp | grep :3000)

--- Disk Space ---
$(df -h ~)

--- Memory ---
$(free -h)
========================================
EOF

cat ~/debug-report.txt
```

---

## 📚 Ressources

- **Guide Complet**: [DEPLOYMENT_GUIDE_UBUNTU.md](./DEPLOYMENT_GUIDE_UBUNTU.md)
- **Documentation Phase 4**: [PHASE_4_IMPLEMENTATION_SUMMARY.md](./PHASE_4_IMPLEMENTATION_SUMMARY.md)
- **Repository GitHub**: https://github.com/mwrhv/pcci-support-hero
- **Documentation PM2**: https://pm2.keymetrics.io/
- **Support Supabase**: https://supabase.com/docs

---

## ✅ Checklist Express

Imprimez ou gardez cette checklist à portée de main:

### Avant Déploiement
- [ ] Sauvegarde créée
- [ ] Accès serveur vérifié
- [ ] Notification aux utilisateurs envoyée

### Pendant Déploiement
- [ ] Application arrêtée
- [ ] Code mis à jour (git pull)
- [ ] Dépendances installées
- [ ] Build réussi
- [ ] Application redémarrée

### Après Déploiement
- [ ] PM2 status = online
- [ ] Login fonctionne
- [ ] Dashboard charge
- [ ] Protection XSS active
- [ ] Rate limiting fonctionne
- [ ] Pas d'erreur dans les logs

---

**Temps de Déploiement Moyen**: 5-10 minutes  
**Difficulté**: ⭐⭐☆☆☆ (Facile avec script)  
**Dernière Mise à Jour**: 2024-10-28
