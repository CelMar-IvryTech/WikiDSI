# Installation du certificat VPN utilisateur

A vérifier dans l’AD : Si l’agent fait bien parti de ce groupe.

Vérification ici dans la console « **MMC** »

![](http://localhost:3001/uploads/1777538318197-295329213.png)

Menu « Démarrer » tapez « **mmc.** » puis cliquez dessus pour l’ouvrir.

![](http://localhost:3001/uploads/1777538318200-64477517.png)![](http://localhost:3001/uploads/1777538318202-741803634.png)![](http://localhost:3001/uploads/1777538318205-958358687.png)![](http://localhost:3001/uploads/1777538318208-107660332.png)![](http://localhost:3001/uploads/1777538318210-393028801.png)Dépliez **Certificats – Utilisateur actuel** puis **Personnel** puis cliquez sur « **Certificats** ».

Un certificat avec les noms et prénoms de l’agent et la mention « **AlwaysOnVPN-Users** » devrait apparaitre.

Groupe AD ordinateur : **Ordinateurs – AOVPN** => Configuration du VPN

A vérifier dans l’AD : Si l’ordinateur portable fait bien parti de ce groupe

![](http://localhost:3001/uploads/1777538318211-309843205.png)Au besoin, le rajouter dans le groupe « **Ordinateurs – AOVPN** » puis faire un gpupdate /force pour faire remonter la configuration sur le poste.

Vérification dans : C:\\ProgramData\\Microsoft\\Network\\Connections

Présence du dossier « **pbk** »

![](http://localhost:3001/uploads/1777538318215-393973745.png)Si besoin de faire remonter les informations, faire un **gpupdate /force** et redémarrez le Pc.