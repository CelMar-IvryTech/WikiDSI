const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const mammoth = require('mammoth');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DOCS_DIR = path.join(__dirname, 'docs');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const TRASH_DIR = path.join(__dirname, 'trash');

// Assurer l'existence des dossiers de base
fs.ensureDirSync(DOCS_DIR);
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(TRASH_DIR);

app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.get('/api/tree', async (req, res) => {
    try {
        const getTree = async (dir) => {
            const files = await fs.readdir(dir);
            const tree = [];

            for (const file of files) {
                if (file === 'trash' || file === '.trash' || file === 'node_modules') continue;
                const filePath = path.join(dir, file);
                const stats = await fs.stat(filePath);
                const relativePath = path.relative(DOCS_DIR, filePath);

                if (stats.isDirectory()) {
                    tree.push({
                        name: file,
                        type: 'directory',
                        path: relativePath.replace(/\\/g, '/'),
                        createdAt: stats.birthtime,
                        children: await getTree(filePath)
                    });
                } else if (file.endsWith('.md')) {
                    tree.push({
                        name: file,
                        type: 'file',
                        path: relativePath.replace(/\\/g, '/'),
                        createdAt: stats.birthtime
                    });
                }
            }
            return tree.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        };

        const tree = await getTree(DOCS_DIR);
        res.json(tree);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lecture arborescence' });
    }
});

app.get('/api/file', async (req, res) => {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'Chemin manquant' });

    try {
        const fullPath = path.join(DOCS_DIR, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        res.json({ content });
    } catch (error) {
        res.status(404).json({ error: 'Fichier non trouvé' });
    }
});

app.post('/api/file', async (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Chemin manquant' });

    try {
        const fullPath = path.join(DOCS_DIR, filePath);
        
        // Sécurité : Empecher de sortir du dossier docs
        if (!fullPath.startsWith(DOCS_DIR)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        // CRUCIAL : Créer les dossiers parents s'ils n'existent pas
        await fs.ensureDir(path.dirname(fullPath));
        
        await fs.writeFile(fullPath, content, 'utf-8');
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur écriture fichier:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

/**
 * Créer un dossier vide
 */
app.post('/api/folder', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) return res.status(400).json({ error: 'Chemin manquant' });

    try {
        // Normaliser le chemin pour éviter les traversées de répertoire
        const normalizedPath = path.normalize(folderPath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = path.join(DOCS_DIR, normalizedPath);
        
        if (!fullPath.startsWith(DOCS_DIR)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        await fs.ensureDir(fullPath);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur dossier:', error);
        res.status(500).json({ error: 'Erreur création dossier' });
    }
});

/**
 * Supprimer (Déplacer vers la corbeille)
 */
app.post('/api/delete', async (req, res) => {
    let { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Chemin manquant' });

    try {
        // Normaliser le chemin
        filePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = path.join(DOCS_DIR, filePath);
        
        if (!fullPath.startsWith(DOCS_DIR)) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        if (!(await fs.pathExists(fullPath))) {
            return res.status(404).json({ error: 'Fichier ou dossier non trouvé' });
        }

        const fileName = path.basename(filePath);
        const timestamp = Date.now();
        const trashName = `${timestamp}-${fileName}`;
        const trashPath = path.join(TRASH_DIR, trashName);

        // S'assurer que le dossier trash existe
        await fs.ensureDir(TRASH_DIR);

        // Déplacer vers la corbeille
        await fs.move(fullPath, trashPath, { overwrite: true });
        
        res.json({ success: true, message: `Déplacé vers la corbeille sous le nom ${trashName}` });
    } catch (error) {
        console.error('Erreur suppression détaillée:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la suppression', 
            details: error.message,
            code: error.code 
        });
    }
});

/**
 * Déplacer (Renommer) un fichier ou dossier
 */
app.post('/api/move', async (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'Chemins manquants' });

    try {
        const resolvedDocsDir = path.resolve(DOCS_DIR).toLowerCase();
        const fullOldPath = path.resolve(path.join(DOCS_DIR, oldPath));
        const fullNewPath = path.resolve(path.join(DOCS_DIR, newPath));
        
        console.log(`Déplacement: "${fullOldPath}" -> "${fullNewPath}"`);

        // Sécurité : Empecher de sortir du dossier docs (insensible à la casse pour Windows)
        if (!fullOldPath.toLowerCase().startsWith(resolvedDocsDir) || !fullNewPath.toLowerCase().startsWith(resolvedDocsDir)) {
            return res.status(403).json({ error: 'Accès interdit : Hors du répertoire autorisé' });
        }

        if (!(await fs.pathExists(fullOldPath))) {
            return res.status(404).json({ error: `Source non trouvée : ${oldPath}` });
        }

        // Vérifier si la destination existe déjà
        if (await fs.pathExists(fullNewPath)) {
            return res.status(400).json({ error: 'Un élément porte déjà ce nom à destination' });
        }

        // S'assurer que le dossier parent de destination existe
        await fs.ensureDir(path.dirname(fullNewPath));

        await fs.move(fullOldPath, fullNewPath);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur déplacement détaillée:', error);
        res.status(500).json({ 
            error: 'Erreur lors du déplacement', 
            details: error.message 
        });
    }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    
    const { folderPath } = req.body;
    let finalUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

    if (folderPath) {
        try {
            const targetDir = path.join(UPLOADS_DIR, folderPath);
            await fs.ensureDir(targetDir);
            const newPath = path.join(targetDir, req.file.filename);
            await fs.move(req.file.path, newPath);
            finalUrl = `http://localhost:${PORT}/uploads/${folderPath}/${req.file.filename}`;
        } catch (err) {
            console.error('Erreur organisation image:', err);
        }
    }
    
    res.json({ url: finalUrl });
});

app.post('/api/convert-docx', upload.single('word'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    try {
        const options = {
            convertImage: mammoth.images.inline(async (element) => {
                const buffer = await element.read();
                const extension = element.contentType.split('/')[1] || 'png';
                const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
                const filePath = path.join(UPLOADS_DIR, filename);

                await fs.writeFile(filePath, buffer);

                return {
                    src: `http://localhost:${PORT}/uploads/${filename}`
                };
            })
        };

        const result = await mammoth.convertToHtml({ path: req.file.path }, options);
        // Supprimer le fichier temporaire après conversion
        await fs.remove(req.file.path);
        res.json({ html: result.value });
    } catch (error) {
        console.error('Erreur conversion Word:', error);
        res.status(500).json({ error: 'Erreur lors de la conversion du fichier' });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur WikiDSI démarré sur http://localhost:${PORT}`);
});
