Groupe AD utilisateur : **AlwaysOnVPN-Users** => Installation du certificat d’authentification utilisateur

A vérifier dans l’AD : Si l’agent fait bien parti de ce groupe.

Vérification ici dans la console « **MMC** »

<img src="http://localhost:3001/uploads/1777533928881-934682550.png" width="" style="" />

Menu « Démarrer » tapez « **mmc.** » puis cliquez dessus pour l’ouvrir.

<img src="http://localhost:3001/uploads/1777533928883-576031910.png" width="" style="" />

<img src="http://localhost:3001/uploads/1777533928885-398815525.png" width="" style="" />

<img src="http://localhost:3001/uploads/1777533928886-392192550.png" width="" style="" />

<img src="http://localhost:3001/uploads/1777533928887-996349572.png" width="" style="" />

<img src="http://localhost:3001/uploads/1777533928889-335808850.png" width="" style="" />

Dépliez **Certificats – Utilisateur actuel** puis **Personnel** puis cliquez sur « **Certificats** ».

Un certificat avec les noms et prénoms de l’agent et la mention « **AlwaysOnVPN-Users** » devrait apparaitre.

Groupe AD ordinateur : **Ordinateurs – AOVPN** => Configuration du VPN

A vérifier dans l’AD : Si l’ordinateur portable fait bien parti de ce groupe

<img src="http://localhost:3001/uploads/1777533928891-572161582.png" width="" style="" />

Au besoin, le rajouter dans le groupe « **Ordinateurs – AOVPN** » puis faire un gpupdate /force pour faire remonter la configuration sur le poste.

Vérification dans : C:\\ProgramData\\Microsoft\\Network\\Connections

Présence du dossier « **pbk** »

<img src="http://localhost:3001/uploads/1777533928893-23787946.png" width="" style="" />

Si besoin de faire remonter les informations, faire un **gpupdate /force** et redémarrez le Pc.