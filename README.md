# 📚 WikiDSI - Gestionnaire de Procédures Premium

WikiDSI est une application moderne et intuitive conçue pour centraliser, créer et partager les procédures techniques de la DSI. Basée sur une architecture React/Node.js, elle offre une expérience d'édition "Premium" mêlant la puissance du Markdown et la simplicité du WYSIWYG.

## ✨ Fonctionnalités Clés

### 📝 Édition Avancée (Mode Premium)
- **Éditeur Hybride** : Alternez instantanément entre un éditeur visuel (WYSIWYG) et un éditeur textuel (Markdown).
- **Synchronisation Temps Réel** : Les modifications apportées d'un côté sont immédiatement reflétées de l'autre.
- **Gestion des Images** : Glissez-déposez des images, redimensionnez-les à la volée et choisissez leur alignement (gauche, centre, droite).
- **Import Word Intelligent** : Importez des documents `.docx` directement. Le contenu est automatiquement converti en Markdown/HTML et ajouté à la fin de votre procédure actuelle.

### 📁 Organisation & Structure
- **Arborescence Dynamique** : Gérez vos dossiers et fichiers avec une interface fluide.
- **Drag & Drop** : Déplacez facilement vos procédures ou dossiers complets par simple glisser-déposer.
- **Corbeille Sécurisée** : Les fichiers supprimés sont horodatés et déplacés vers un dossier `trash` pour éviter toute perte accidentelle.

### 🔗 Partage & Consultation
- **Lien de Partage** : Générez en un clic un lien public pour consulter une procédure sans passer par l'interface d'édition.
- **Lecture Optimisée** : Une interface de lecture épurée avec support du wrapping automatique pour les lignes de code et URLs longues.

## 🚀 Installation & Démarrage

### Prérequis
- Node.js (v18 ou supérieur)
- npm

### 1. Installation des dépendances
Dans la racine du projet WikiDSI :

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Lancement de l'application
Vous pouvez utiliser le script batch à la racine ou lancer manuellement :

**Lancement via Batch (Windows) :**
Double-cliquez sur `Lancer_Wiki.bat`

**Lancement Manuel :**
```bash
# Terminal 1 : Backend (Port 3001)
cd backend
node server.js

# Terminal 2 : Frontend (Port 5173 par défaut avec Vite)
cd frontend
npm run dev
```

## 🛠️ Stack Technique
- **Frontend** : React (TypeScript), Vite, Lucide React, React Quill, Marked.
- **Backend** : Node.js, Express, Multer (Uploads), Mammoth (Conversion Word), FS-Extra.

---
*Développé pour la DSI - Ivry-sur-Seine*
