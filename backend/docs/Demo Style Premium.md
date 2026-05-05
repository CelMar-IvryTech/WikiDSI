# 🌟 Demo Style Premium WikiDSI

Bienvenue dans la procédure témoin ! Ce document illustre toutes les capacités de mise en forme disponibles dans l'éditeur.

---

## 📊 Tableaux de données
Les tableaux sont parfaits pour lister des serveurs, des IPs ou des configurations.

| Service | Serveur | État | IP |
| :--- | :--- | :--- | :--- |
| **Backend** | SRV-WEB-01 | ✅ Actif | 10.0.0.1 |
| **Base de données** | SRV-SQL-01 | ⚠️ Maintenance | 10.0.0.2 |
| **Cache** | SRV-REDIS-01 | 🔵 Veille | 10.0.0.3 |

---

## 💡 Blocs d'attention (Callouts)
Utilisez ces blocs pour mettre en avant des informations cruciales.

> [!INFO] Information générale
> Ce bloc permet d'ajouter un contexte supplémentaire sans interrompre le flux de lecture.

> [!TIP] Astuce de productivité
> Saviez-vous que vous pouvez utiliser le bouton "Renommer" directement dans le fil d'Ariane ?

> [!WARNING] Point de vigilance critique
> Ne jamais redémarrer le service sans avoir effectué une sauvegarde préalable des données.

> [!SUCCESS] Résultat attendu
> La procédure est terminée avec succès lorsque le voyant passe au vert.

---

## 💻 Coloration Syntaxique
Idéal pour copier/coller des scripts ou des configurations sans erreur.

### PowerShell
```powershell
# Script de vérification des services
Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object DisplayName, Status
```

### JSON
```json
{
  "project": "WikiDSI",
  "version": "2.5",
  "features": ["Tables", "Callouts", "Syntax Highlighting"]
}
```

---

## 🖼️ Images et Mise en page
Les images peuvent être redimensionnées et alignées pour s'intégrer parfaitement au texte.

*Note: Insérez une image via le bouton "Image" pour tester le redimensionnement et l'ombre portée.*

---

## 📂 Navigation fluide
Utilisez le **Sommaire** à droite pour naviguer rapidement entre ces sections. Vous pouvez également **masquer les barres latérales** via les boutons dans l'en-tête pour un mode lecture "plein écran".
