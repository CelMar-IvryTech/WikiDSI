# Procédure AOVPN

![Bannière procédure][image_8o5T9tCFiNTKBBXgfRVMZg==]

**Nom de la procédure :** Procédure AOVPN  **N° de révision / Date :** 1.00 / 20/08/2024  **Auteur de la procédure :** Cyril ESCRIU  **Procédure à destination de :** Techniciens SSD

---

## 1. Pré-requis Active Directory – Utilisateur

**Groupe AD utilisateur :** `AlwaysOnVPN-Users`  ➡️ Installation du certificat d’authentification utilisateur.

### Vérifications
- Vérifier dans l’AD que l’agent fait bien partie de ce groupe.
- Vérification via la console **MMC**.

![Console MMC][image_aeP4weBZyZTLkyMx6Wg8TQ==]

### Ouvrir la console MMC
- Menu **Démarrer**
- Taper **mmc** puis ouvrir l’application.

![Étape MMC 1][image_8mcNju3Iv+v7OD1ybdkJew==]
![Étape MMC 2][image_ADra829zBHDnzBmnqnfhQw==]
![Étape MMC 3][image_uDYTtq2Ob8NpV4Nk1E8yHA==]
![Étape MMC 4][image_JJUBgR4FU9GIT/ZeTSv+hA==]
![Certificats][image_VM/ml61jahPyo6dVxF2Y4A==]

### Vérification du certificat utilisateur
- **Certificats – Utilisateur actuel**
- **Personnel**
- **Certificats**

Un certificat au nom de l’agent avec la mention **AlwaysOnVPN-Users** doit être présent.

---

## 2. Pré-requis Active Directory – Ordinateur

**Groupe AD ordinateur :** `Ordinateurs – AOVPN`  ➡️ Configuration du VPN.

![Groupe AD Ordinateur][image_tjkAzvTw2qctfQ5euGQRTA==]

### Actions si nécessaire
- Ajouter le poste au groupe **Ordinateurs – AOVPN**
- Lancer :

```powershell
gpupdate /force
```

---

## 3. Vérification côté poste

### Chemin à contrôler
```text
C:\ProgramData\Microsoft\Network\Connections
```

- Vérifier la présence du dossier **pbk**.

![Dossier pbk][image_dczh/oeKRKiopZFSmgjIWw==]

### En cas de problème
```powershell
gpupdate /force
```

Puis redémarrer le PC.

---

**Fin de procédure**
