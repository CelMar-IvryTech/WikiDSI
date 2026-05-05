import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, FileText, Folder, ChevronRight, Edit3, Save, X, Image as ImageIcon, BookOpen, AlignLeft, AlignCenter, AlignRight, FolderPlus, FilePlus, Trash2, FileCode, Share2, ArrowUpDown, Edit2
} from 'lucide-react';

import { marked } from 'marked';
import TurndownService from 'turndown';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API_BASE = 'http://localhost:3001/api';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

marked.setOptions({
    breaks: true,
    gfm: true
});

interface FileNode { name: string; type: 'file' | 'directory'; path: string; createdAt?: string; children?: FileNode[]; }

const WikiPage: React.FC = () => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [sortMode, setSortMode] = useState<'name' | 'date'>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState({ show: false, oldPath: '', oldName: '' });
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [splitWidth, setSplitWidth] = useState(50); // Pourcentage de l'éditeur visuel
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [tocWidth, setTocWidth] = useState(220); // Largeur en pixels
  const [isDraggingTOC, setIsDraggingTOC] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(280); // Largeur en pixels
  const [isDraggingExplorer, setIsDraggingExplorer] = useState(false);
  const [editContentHTML, setEditContentHTML] = useState('');
  const [editContentMD, setEditContentMD] = useState('');
  const [originalContentHTML, setOriginalContentHTML] = useState('');
  const [originalContentMD, setOriginalContentMD] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [toc, setToc] = useState<{ text: string, level: number, index: number }[]>([]);
  const quillRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);

  // --- Système de Notifications ---
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  const showNotify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  useEffect(() => {
    if (isEditing && !syncLock.current) {
      const markdown = turndownService.turndown(editContentHTML);
      if (markdown !== editContentMD) setEditContentMD(markdown);
    }
    
    // Extraction du sommaire (TOC)
    if (!isEditing && editContentHTML) {
      const doc = new DOMParser().parseFromString(editContentHTML, 'text/html');
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
      setToc(headings.map((h, i) => ({
        text: h.textContent || '',
        level: parseInt(h.tagName.substring(1)),
        index: i
      })));
    } else {
      setToc([]);
    }
  }, [editContentHTML, isEditing]);

  const scrollToHeading = (index: number) => {
    if (contentRef.current) {
      const headings = contentRef.current.querySelectorAll('h1, h2, h3');
      if (headings[index]) {
        headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleMDChange = async (md: string) => {
    setEditContentMD(md);
    syncLock.current = true;
    const html = await marked.parse(md);
    setEditContentHTML(typeof html === 'string' ? html : String(html));
    setTimeout(() => { syncLock.current = false; }, 100);
  };

  const handleDelete = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const fileName = path.split('/').pop();
    askConfirm(
      'Suppression',
      `Voulez-vous vraiment supprimer "${fileName}" ? Il sera déplacé vers la corbeille.`,
      async () => {
        try {
          await axios.post(`${API_BASE}/delete`, { filePath: path });
          if (selectedFile === path) setSelectedFile(null);
          fetchTree();
          showNotify('Élément supprimé avec succès', 'success');
        } catch (err) { 
          showNotify('Erreur lors de la suppression', 'error'); 
        }
      }
    );
  };

  const handleRename = async () => {
    if (!newName) return;
    const isDirectory = !showRenameModal.oldPath.endsWith('.md');
    let finalNewName = newName;
    if (!isDirectory && !finalNewName.endsWith('.md')) finalNewName += '.md';
    
    const parentPath = showRenameModal.oldPath.includes('/') 
      ? showRenameModal.oldPath.substring(0, showRenameModal.oldPath.lastIndexOf('/')) 
      : '';
    const newPath = parentPath ? `${parentPath}/${finalNewName}` : finalNewName;

    try {
      await axios.post(`${API_BASE}/move`, { oldPath: showRenameModal.oldPath, newPath: newPath });
      fetchTree();
      if (selectedFile === showRenameModal.oldPath) setSelectedFile(newPath);
      setShowRenameModal({ show: false, oldPath: '', oldName: '' });
      setNewName('');
      showNotify('Élément renommé', 'success');
    } catch (err: unknown) {
      const errorMessage = axios.isAxiosError(err) ? err.response?.data?.error : 'Erreur lors du renommage';
      showNotify(errorMessage || 'Erreur lors du renommage', 'error');
    }
  };

  const fetchTree = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tree`);
      setTree(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTree(); }, []);

  const loadFile = async (path: string) => {
    try {
      const res = await axios.get(`${API_BASE}/file`, { params: { filePath: path } });
      setSelectedFile(path);
      const parent = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      setActiveFolder(parent);
      const html = await marked.parse(res.data.content);
      const finalHTML = typeof html === 'string' ? html : String(html);
      setEditContentHTML(finalHTML);
      setEditContentMD(res.data.content);
      setOriginalContentHTML(finalHTML);
      setOriginalContentMD(res.data.content);
      setIsEditing(false);
    } catch (err) { 
        showNotify('Erreur lors du chargement du fichier', 'error');
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await axios.post(`${API_BASE}/file`, { filePath: selectedFile, content: editContentMD });
      setOriginalContentHTML(editContentHTML);
      setOriginalContentMD(editContentMD);
      setIsEditing(false);
      showNotify('Fichier sauvegardé !', 'success');
    } catch (err) { 
        showNotify('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleShare = () => {
    if (!selectedFile) return;
    const shareUrl = `${window.location.origin}/share/${selectedFile}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotify('Lien de partage copié !', 'success');
    });
  };

  // --- Drag & Drop ---
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, path: string) => {
    setDraggedItem(path);
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath || sourcePath === targetFolderPath) return;

    if (targetFolderPath.startsWith(sourcePath + '/')) {
        showNotify('Impossible de déplacer un dossier dans lui-même', 'error');
        return;
    }

    const fileName = sourcePath.split('/').pop();
    const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName;

    if (sourcePath === newPath) return;

    try {
        await axios.post(`${API_BASE}/move`, { oldPath: sourcePath, newPath: newPath });
        fetchTree();
        if (selectedFile === sourcePath) setSelectedFile(newPath);
        showNotify('Élément déplacé', 'success');
    } catch (err: any) {
        showNotify(err.response?.data?.error || 'Erreur lors du déplacement', 'error');
    }
    setDraggedItem(null);
  };

  // --- Manipulation d'image ---
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [overlayPos, setOverlayPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && selectedFile) {
      const formData = new FormData();
      formData.append('image', e.target.files[0]);
      // Envoyer le dossier parent du fichier actuel pour organiser les images
      const parentDir = selectedFile.includes('/') ? selectedFile.substring(0, selectedFile.lastIndexOf('/')) : '';
      formData.append('folderPath', parentDir);

      try {
        const res = await axios.post(`${API_BASE}/upload`, formData);
        const tag = `<img src="${res.data.url}" width="50%" style="display:block;margin:20px auto;cursor:pointer;" />`;
        setEditContentHTML(prev => prev + tag);
        showNotify('Image ajoutée', 'success');
      } catch (err) { showNotify('Erreur upload image', 'error'); }
    }
  };

  const updateImageStyle = (img: HTMLImageElement, align: 'left' | 'center' | 'right') => {
    let margin = '20px auto'; let float = 'none';
    if (align === 'left') { margin = '0 20px 20px 0'; float = 'left'; }
    if (align === 'right') { margin = '0 0 20px 20px'; float = 'right'; }
    img.style.margin = margin; img.style.float = float;
    img.style.display = align === 'center' ? 'block' : 'inline-block';
    setEditContentHTML(quillRef.current.getEditor().root.innerHTML);
  };

  useEffect(() => {
    if (!selectedImg || !wrapperRef.current) return;
    const update = () => {
      if (!selectedImg || !wrapperRef.current) return;
      const imgRect = selectedImg.getBoundingClientRect();
      const wrapRect = wrapperRef.current.getBoundingClientRect();
      
      setOverlayPos({
        top: imgRect.top - wrapRect.top,
        left: imgRect.left - wrapRect.left,
        width: imgRect.width,
        height: imgRect.height
      });
    };
    update();
    const inv = setInterval(update, 30);
    return () => clearInterval(inv);
  }, [selectedImg]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setSelectedImg(target as HTMLImageElement);
    } else if (!target.closest('.img-overlay-controls')) {
      setSelectedImg(null);
    }
  };

  const onResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const onGlobalMouseMove = (e: React.MouseEvent) => {
    if (isResizing && selectedImg) {
      const containerWidth = selectedImg.parentElement?.offsetWidth || 1000;
      const imgRect = selectedImg.getBoundingClientRect();
      const newWidthPx = e.clientX - imgRect.left;
      const newWidthPct = Math.min(100, Math.max(5, (newWidthPx / containerWidth) * 100));
      const finalWidth = `${Math.round(newWidthPct)}%`;
      selectedImg.style.width = finalWidth;
      selectedImg.setAttribute('width', finalWidth);
    }

    if (isDraggingSplit && wrapperRef.current) {
        const container = wrapperRef.current.closest('.split-editor');
        if (container) {
            const rect = container.getBoundingClientRect();
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
            setSplitWidth(Math.min(85, Math.max(15, newWidth)));
        }
    }

    if (isDraggingTOC) {
        const newWidth = window.innerWidth - e.clientX - 20; // 20px de padding/marge
        setTocWidth(Math.min(500, Math.max(150, newWidth)));
    }

    if (isDraggingExplorer) {
        const newWidth = e.clientX - 20; // 20px de padding/marge
        setExplorerWidth(Math.min(500, Math.max(200, newWidth)));
    }
  };

  const onGlobalMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      setEditContentHTML(quillRef.current.getEditor().root.innerHTML);
    }
    if (isDraggingSplit) setIsDraggingSplit(false);
    if (isDraggingTOC) setIsDraggingTOC(false);
    if (isDraggingExplorer) setIsDraggingExplorer(false);
  };

  const handleRenameEditor = () => {
    if (!selectedFile) return;
    const fileName = selectedFile.split('/').pop() || '';
    setShowRenameModal({ show: true, oldPath: selectedFile, oldName: fileName });
  };

  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return [...nodes]
      .sort((a, b) => {
        // Toujours mettre les dossiers en premier
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        
        if (sortMode === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          // Tri par date de création (du plus récent au plus ancien)
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
      })
      .map(node => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined
      }));
  };

  const filterTree = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .map(node => {
        if (node.type === 'directory') {
          const filteredChildren = node.children ? filterTree(node.children) : [];
          const matches = node.name.toLowerCase().includes(searchTerm.toLowerCase());
          if (matches || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
        } else {
          if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return node;
          }
        }
        return null;
      })
      .filter((node): node is FileNode => node !== null);
  };

  const renderTree = (nodes: FileNode[]) => sortNodes(nodes).map(node => (
    <div key={node.path} style={{ marginLeft: '8px' }}>
      {node.type === 'directory' ? (
        <div className="tree-node"
             onDragOver={onDragOver}
             onDrop={(e) => onDrop(e, node.path)}>
          <div className={`tree-item folder ${activeFolder === node.path ? 'active-folder' : ''}`} 
               draggable
               onDragStart={(e) => onDragStart(e, node.path)}
               onClick={() => {
            const next = new Set(expandedFolders);
            if (next.has(node.path)) next.delete(node.path); else next.add(node.path);
            setExpandedFolders(next);
            setActiveFolder(node.path);
          }}>
            <div className="tree-item-content">
              <ChevronRight size={14} style={{ transform: expandedFolders.has(node.path) ? 'rotate(90deg)' : 'none' }} />
              <Folder size={18} color="#94a3b8" />
              <span>{node.name}</span>
            </div>
            <div className="tree-item-actions">
              <button className="action-btn-mini" onClick={(e) => { e.stopPropagation(); setShowRenameModal({show: true, oldPath: node.path, oldName: node.name}); }} title="Renommer"><Edit2 size={14}/></button>
              <button className="action-btn-mini" onClick={(e) => { e.stopPropagation(); setShowCreateModal({show: true, type: 'file', parent: node.path}); }} title="Nouveau fichier ici"><FilePlus size={14}/></button>
              <button className="action-btn-mini" onClick={(e) => { e.stopPropagation(); setShowCreateModal({show: true, type: 'folder', parent: node.path}); }} title="Nouveau dossier ici"><FolderPlus size={14}/></button>
              <button className="delete-btn" onClick={(e) => handleDelete(e, node.path)}><Trash2 size={14}/></button>
            </div>
          </div>
          {(expandedFolders.has(node.path) || searchTerm) && node.children && <div>{renderTree(node.children)}</div>}
        </div>
      ) : (
        <div className={`tree-item file ${selectedFile === node.path ? 'active' : ''}`} 
             draggable
             onDragStart={(e) => onDragStart(e, node.path)}
             onClick={() => loadFile(node.path)}>
          <div className="tree-item-content">
            <FileText size={18} /><span>{node.name.replace('.md', '')}</span>
          </div>
          <div className="tree-item-actions">
            <button className="action-btn-mini" onClick={(e) => { e.stopPropagation(); setShowRenameModal({show: true, oldPath: node.path, oldName: node.name}); }} title="Renommer"><Edit2 size={14}/></button>
            <button className="delete-btn" onClick={(e) => handleDelete(e, node.path)}><Trash2 size={14}/></button>
          </div>
        </div>
      )}
    </div>
  ));

  const [newName, setNewName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState({ show: false, type: 'file' as 'file'|'folder', parent: '' });

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const formData = new FormData();
      formData.append('word', e.target.files[0]);
      try {
        const res = await axios.post(`${API_BASE}/convert-docx`, formData);
        const html = res.data.html;
        const markdown = turndownService.turndown(html);
        askConfirm(
            'Import Word',
            'Voulez-vous vraiment ajouter ce contenu à la fin de votre procédure ?',
            () => {
                setEditContentHTML(prev => prev + '<br/>' + html);
                setEditContentMD(prev => prev + '\n\n' + markdown);
                syncLock.current = true;
                setTimeout(() => { syncLock.current = false; }, 200);
                showNotify('Contenu Word ajouté à la fin', 'success');
            }
        );
      } catch (err) { showNotify('Erreur lors de l\'importation Word', 'error'); }
    }
  };

  const handleWordImportDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('word', file);
      try {
        const res = await axios.post(`${API_BASE}/convert-docx`, formData);
        const markdown = turndownService.turndown(res.data.html);
        const targetDir = activeFolder;
        const fileName = file.name.replace('.docx', '.md');
        const fullPath = targetDir ? `${targetDir}/${fileName}` : fileName;
        await axios.post(`${API_BASE}/file`, { filePath: fullPath, content: markdown });
        fetchTree();
        loadFile(fullPath);
        showNotify('Fichier créé par import Word', 'success');
      } catch (err) { showNotify('Erreur lors de l\'importation Word', 'error'); }
    }
  };

  return (
    <div className={`app-container ${isDraggingSplit ? 'dragging' : ''}`} onMouseMove={onGlobalMouseMove} onMouseUp={onGlobalMouseUp}>
      <header className="main-header">
        <div className="logo" onClick={() => setActiveFolder('')} style={{cursor:'pointer'}}><span className="logo-ivry">ivry</span><span className="logo-dsi"> - Wiki DSI</span></div>
        <div className="version-badge">Premium Editor v2.4</div>
        {activeFolder && (
          <div className="active-path-indicator">
            📍 Emplacement : <span>{activeFolder}</span>
            <button onClick={() => setActiveFolder('')} title="Revenir à la racine"><X size={12}/></button>
          </div>
        )}
      </header>

      <div className="main-layout">
        <aside className={`sidebar ${isDraggingExplorer ? 'dragging' : ''}`} style={{ width: `${explorerWidth}px`, position: 'relative', overflow: 'visible' }}>
          <div className="sidebar-inner" style={{ borderRadius: '20px', border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="sidebar-header">
              <span>PROCÉDURES</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className={`sidebar-action-btn ${sortMode === 'date' ? 'active-sort' : ''}`} 
                  onClick={() => {
                    const next = sortMode === 'name' ? 'date' : 'name';
                    setSortMode(next);
                    showNotify(`Tri par ${next === 'name' ? 'nom' : 'date'}`, 'info');
                  }} 
                  title={`Trier par ${sortMode === 'name' ? 'date' : 'nom'}`}
                >
                  <ArrowUpDown size={16}/>
                </button>
                <label className="sidebar-action-btn" title={`Importer Word dans ${activeFolder || 'la racine'}`}>
                  <FileCode size={16}/>
                  <input type="file" hidden accept=".docx" onChange={handleWordImportDirect} />
                </label>
                <button className="sidebar-action-btn" onClick={() => setShowCreateModal({show: true, type: 'folder', parent: activeFolder})} title={`Nouveau dossier dans ${activeFolder || 'la racine'}`}>
                  <FolderPlus size={16}/>
                </button>
                <button className="sidebar-action-btn" onClick={() => setShowCreateModal({show: true, type: 'file', parent: activeFolder})} title={`Nouvelle procédure dans ${activeFolder || 'la racine'}`}>
                  <FilePlus size={16}/>
                </button>
              </div>
            </div>

            <div className="sidebar-search">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}><X size={14}/></button>}
              </div>
            </div>

            <div className="tree-container">{renderTree(filterTree(tree))}</div>
          </div>
          <div className="resizer-handle right-side" onMouseDown={() => setIsDraggingExplorer(true)}></div>
        </aside>

        <main className="content">
          <div className="content-inner">
            {selectedFile ? (
              <div className="document-card">
                <div className="doc-header">
                  <div className="breadcrumb">
                    {selectedFile.replace('.md', '')}
                    <button className="action-btn-mini" style={{ marginLeft: '10px' }} onClick={handleRenameEditor} title="Renommer la procédure">
                        <Edit2 size={14}/>
                    </button>
                  </div>
                  <div className="doc-actions">
                    {isEditing ? (
                      <div className="editing-toolbar">
                        <label className="btn btn-secondary action-btn-horizontal"><FileCode size={18} /> Word<input type="file" hidden accept=".docx" onChange={handleWordImport} /></label>
                        <label className="btn btn-secondary action-btn-horizontal"><ImageIcon size={18} /> Image<input type="file" hidden accept="image/*" onChange={handleImageSelect} /></label>
                        <div className="toolbar-separator"></div>
                        <button className="btn btn-primary action-btn-horizontal" onClick={handleSave}><Save size={18} /> Sauvegarder</button>
                        <button className="btn btn-secondary action-btn-horizontal" onClick={() => { 
                          setEditContentHTML(originalContentHTML);
                          setEditContentMD(originalContentMD);
                          setIsEditing(false); 
                          setShowMarkdown(false); 
                        }}><X size={18} /> Annuler</button>
                      </div>
                    ) : (
                      <div className="viewing-toolbar">
                        <button className="btn btn-secondary action-btn-horizontal" onClick={handleShare} title="Partager cette procédure"><Share2 size={18} /> Partager</button>
                        <button className="btn btn-secondary action-btn-horizontal" onClick={() => setIsEditing(true)}><Edit3 size={18} /> Modifier</button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="split-editor" style={{ display: 'flex', gap: showMarkdown ? '0' : '20px' }}>
                    <div className="editor-side visual-side" 
                         onMouseDown={handleMouseDown}
                         style={{ width: showMarkdown ? `${splitWidth}%` : '100%', flex: 'none' }}>
                      <div className="side-label">VISUEL (DRAG & RESIZE)</div>
                      <div className="quill-wrapper" ref={wrapperRef} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div className="custom-quill-toolbar">
                            <select className="ql-header" defaultValue="">
                                <option value="1">Grand Titre (H1)</option>
                                <option value="2">Titre (H2)</option>
                                <option value="3">Sous-titre (H3)</option>
                                <option value="4">Petit titre (H4)</option>
                                <option value="">Corps de texte</option>
                            </select>
                            <select className="ql-size" defaultValue="">
                                <option value="small">Petit</option>
                                <option value="">Normal</option>
                                <option value="large">Grand</option>
                                <option value="huge">Très grand</option>
                            </select>
                            <div className="toolbar-separator-mini"></div>
                            <button className="ql-bold" title="Gras"></button>
                            <button className="ql-italic" title="Italique"></button>
                            <button className="ql-underline" title="Souligné"></button>
                            <button className="ql-strike" title="Barré"></button>
                            <div className="toolbar-separator-mini"></div>
                            <select className="ql-align" defaultValue=""></select>
                            <button className="ql-list" value="ordered" title="Liste numérotée"></button>
                            <button className="ql-list" value="bullet" title="Liste à puces"></button>
                            <button className="ql-blockquote" title="Citation"></button>
                            <button className="ql-code-block" title="Bloc de code"></button>
                            <div className="toolbar-separator-mini"></div>
                            <button className="ql-link" title="Lien"></button>
                            <button className="ql-clean" title="Effacer mise en forme"></button>
                            <button 
                                className={`custom-toolbar-btn ${showMarkdown ? 'active' : ''}`}
                                onClick={() => setShowMarkdown(!showMarkdown)}
                                title="Afficher l'éditeur textuel"
                                style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px', fontWeight: 700, color: showMarkdown ? '#E30613' : '#64748b' }}
                            >
                                <FileCode size={16} /> {showMarkdown ? 'MASQUER TEXTUEL' : 'ÉDITEUR TEXTUEL'}
                            </button>
                        </div>
                        <ReactQuill 
                          ref={quillRef} 
                          theme="snow" 
                          value={editContentHTML} 
                          onChange={(content) => { if (!syncLock.current) setEditContentHTML(content); }}
                          modules={{ toolbar: { container: ".custom-quill-toolbar" } }} 
                        />
                        {selectedImg && (
                          <div className="img-overlay-controls" style={{ 
                            position: 'absolute',
                            top: overlayPos.top,
                            left: overlayPos.left,
                            width: overlayPos.width,
                            height: overlayPos.height,
                            pointerEvents: 'none',
                            border: '2px solid #E30613'
                          }}>
                            <div className="image-floating-toolbar" style={{ position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
                              <button onClick={() => updateImageStyle(selectedImg, 'left')}><AlignLeft size={16}/></button>
                              <button onClick={() => updateImageStyle(selectedImg, 'center')}><AlignCenter size={16}/></button>
                              <button onClick={() => updateImageStyle(selectedImg, 'right')}><AlignRight size={16}/></button>
                              <button className="delete" onClick={() => { selectedImg.remove(); setSelectedImg(null); setEditContentHTML(quillRef.current.getEditor().root.innerHTML); }}><Trash2 size={16}/></button>
                            </div>
                            <div className="image-handle" style={{ position: 'absolute', bottom: -8, right: -8, pointerEvents: 'auto' }} onMouseDown={onResizeStart} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {showMarkdown && (
                        <>
                            <div className="resizer-handle" onMouseDown={() => setIsDraggingSplit(true)}></div>
                            <div className="editor-side code-side" style={{ flex: 1 }}>
                                <div className="side-label">MARKDOWN (TEXTUEL)</div>
                                <textarea value={editContentMD} onChange={(e) => handleMDChange(e.target.value)} />
                            </div>
                        </>
                    )}
                  </div>
                ) : (
                  <div className="scrollable-container">
                    <div 
                      ref={contentRef}
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: editContentHTML }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="welcome-screen"><BookOpen size={48} color="#E30613" /><h1>Wiki DSI</h1></div>
            )}
          </div>
        </main>

        <aside className={`sidebar toc-sidebar ${isDraggingTOC ? 'dragging' : ''}`} style={{ width: `${tocWidth}px` }}>
            <div className="resizer-handle left" onMouseDown={() => setIsDraggingTOC(true)}></div>
            <div className="sidebar-inner">
                <div className="sidebar-header">
                    <span>SOMMAIRE</span>
                </div>
                <div className="toc-container">
                    {toc.length > 0 ? (
                        toc.map((item, i) => (
                            <div 
                                key={i} 
                                className={`toc-item level-${item.level}`}
                                onClick={() => scrollToHeading(item.index)}
                            >
                                {item.text}
                            </div>
                        ))
                    ) : (
                        <div className="toc-empty">Aucun titre détecté</div>
                    )}
                </div>
            </div>
        </aside>
      </div>

      {showCreateModal.show && (
        <div className="modal-overlay">
          <div className="premium-modal">
            <h3>{showCreateModal.type === 'folder' ? 'Nouveau Dossier' : 'Nouvelle Procédure'}</h3>
            <div className="modal-context">📍 Dans : {showCreateModal.parent || 'Racine'}</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} autoFocus placeholder="Nom..." />
            <button className="btn-primary-premium" onClick={() => {
                const path = showCreateModal.parent ? `${showCreateModal.parent}/${newName}` : newName;
                if (showCreateModal.type === 'folder') {
                  axios.post(`${API_BASE}/folder`, { folderPath: path }).then(() => { 
                    fetchTree(); 
                    setShowCreateModal({show:false,type:'file',parent:''}); 
                    setNewName('');
                    showNotify('Dossier créé', 'success');
                  });
                } else {
                  const fileName = path.endsWith('.md') ? path : `${path}.md`;
                  axios.post(`${API_BASE}/file`, { filePath: fileName, content: `# ${newName}` }).then(() => { 
                    fetchTree(); 
                    loadFile(fileName); 
                    setIsEditing(true); 
                    setShowCreateModal({show:false,type:'file',parent:''}); 
                    setNewName('');
                    showNotify('Fichier créé', 'success');
                  });
                }
            }}>Créer</button>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={() => setShowCreateModal({show: false, type: 'file', parent: ''})}>Annuler</button>
          </div>
        </div>
      )}

      {showRenameModal.show && (
        <div className="modal-overlay">
          <div className="premium-modal">
            <h3>Renommer</h3>
            <div className="modal-context">📍 Ancien nom : {showRenameModal.oldName}</div>
            <input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              autoFocus 
              placeholder="Nouveau nom..." 
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            />
            <button className="btn-primary-premium" onClick={handleRename}>Renommer</button>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={() => { setShowRenameModal({show: false, oldPath: '', oldName: ''}); setNewName(''); }}>Annuler</button>
          </div>
        </div>
      )}

      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {confirmModal && confirmModal.show && (
        <div className="modal-overlay">
            <div className="premium-modal confirm-modal">
                <h3>{confirmModal.title}</h3>
                <p>{confirmModal.message}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button className="btn-primary-premium" style={{ flex: 1 }} onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Confirmer</button>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmModal(null)}>Annuler</button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', sans-serif; height: 100vh; overflow: hidden; background: #f8fafc; }
        .app-container.dragging { cursor: col-resize; user-select: none; }
        .app-container { display: flex; flex-direction: column; height: 100vh; }
        .main-header { height: 60px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; padding: 0 30px; flex-shrink: 0; gap: 20px; }
        .logo { font-size: 22px; font-weight: 900; }
        .logo-ivry { color: #E30613; }
        .logo-dsi { color: #003366; opacity: 0.8; }
        .version-badge { background: #f1f5f9; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 800; color: #64748b; border: 1px solid #e2e8f0; }
        .active-path-indicator { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #64748b; background: #fff1f2; padding: 6px 12px; border-radius: 8px; border: 1px solid #ffe4e6; }
        .active-path-indicator span { color: #E30613; }
        .active-path-indicator button { background: none; border: none; color: #f43f5e; cursor: pointer; display: flex; padding: 2px; }
        .main-layout { display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 0; }
        .sidebar { width: 280px; flex-shrink: 0; background: white; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; margin-right: 20px; }
        .sidebar-header { padding: 15px; border-bottom: 1px solid #f1f5f9; font-weight: 800; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-action-btn { background: #fff1f2; color: #E30613; border: none; padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .sidebar-action-btn:hover { background: #E30613; color: white; transform: scale(1.1); }
        .sidebar-action-btn.active-sort { background: #003366; color: white; }

        .sidebar-search { padding: 15px; border-bottom: 1px solid #f1f5f9; }
        .search-input-wrapper { position: relative; display: flex; align-items: center; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .search-input-wrapper:focus-within { border-color: #E30613; background: white; box-shadow: 0 0 0 3px rgba(227, 6, 19, 0.1); }
        .search-icon { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }
        .search-input-wrapper input { width: 100%; border: none; background: transparent; padding: 10px 35px 10px 35px; font-size: 13px; font-weight: 600; color: #1e293b; outline: none; }
        .clear-search { position: absolute; right: 10px; background: #e2e8f0; border: none; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; padding: 0; }
        .clear-search:hover { background: #f43f5e; color: white; }

        .tree-container { flex: 1; overflow-y: auto; padding: 10px; }
        .tree-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; cursor: pointer; border-radius: 12px; font-weight: 600; font-size: 13.5px; color: #475569; margin-bottom: 2px; transition: all 0.2s; min-width: 0; }
        .tree-item-content { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .tree-item-content span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .tree-item:hover { background: #f8fafc; }
        .tree-item.active { background: #f1f5f9; color: #E30613; }
        .tree-item.active-folder { background: #fff1f2; border: 1px solid #ffe4e6; }
        .tree-item-actions { display: flex; align-items: center; gap: 2px; opacity: 0; transition: opacity 0.2s; }
        .tree-item:hover .tree-item-actions { opacity: 1; }
        .action-btn-mini { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; }
        .action-btn-mini:hover { background: #fff1f2; color: #E30613; }
        .delete-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s; display: flex; }
        .delete-btn:hover { background: #fff1f2; color: #E30613; }
        .toc-sidebar { flex-shrink: 0; background: white; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: row !important; overflow: visible; position: relative; }
        .toc-sidebar .sidebar-inner { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .toc-container { flex: 1; overflow-y: auto; padding: 10px; }
        .toc-item { 
            padding: 4px 8px; 
            font-size: 13px; 
            font-weight: 600; 
            color: #64748b; 
            cursor: pointer; 
            border-radius: 8px; 
            transition: all 0.2s;
            line-height: 1.4;
            margin-bottom: 1px;
        }
        .toc-item:hover { background: #f1f5f9; color: #E30613; padding-left: 12px; }
        .toc-item.level-1 { font-weight: 800; color: #1e293b; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px; padding-bottom: 4px; font-size: 13.5px; }
        .toc-item.level-2 { margin-left: 6px; }
        .toc-item.level-3 { margin-left: 12px; font-size: 12px; opacity: 0.8; }
        .toc-empty { padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic; }
        
        .content { flex: 1; height: 100%; overflow: hidden; margin-right: 0; }
        .content-inner { height: 100%; display: flex; flex-direction: column; }
        .document-card { flex: 1; background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 25px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .doc-header { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
        .breadcrumb { font-weight: 800; color: #94a3b8; font-size: 11px; text-transform: uppercase; }
        
        .editing-toolbar, .viewing-toolbar { display: flex; align-items: center; gap: 10px; }
        .action-btn-horizontal { height: 40px; white-space: nowrap; }
        .toolbar-separator { width: 1px; height: 25px; background: #e2e8f0; margin: 0 5px; }
        .toolbar-separator-mini { width: 1px; height: 18px; background: #e2e8f0; margin: 0 8px; }

        .scrollable-container { flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px; }
        .split-editor { flex: 1; min-height: 0; position: relative; }
        
        .resizer-handle { 
            width: 8px; 
            background: #f1f5f9; 
            cursor: col-resize; 
            flex-shrink: 0; 
            z-index: 10; 
            position: relative;
            transition: background 0.2s;
            border-left: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
        }
        .resizer-handle.left, .resizer-handle.right-side {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            height: 100px;
            width: 10px;
            border-radius: 10px;
            background: #e2e8f0;
            border: none;
            z-index: 20;
        }
        .resizer-handle.left { left: -14px; }
        .resizer-handle.right-side { right: -14px; }
        
        .resizer-handle.left:hover, .resizer-handle.right-side:hover, 
        .app-container.dragging .resizer-handle.left, 
        .app-container.dragging .resizer-handle.right-side {
            background: #E30613;
        }
        .resizer-handle::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 2px;
            height: 30px;
            background: #cbd5e1;
            border-radius: 10px;
        }
        .resizer-handle.left::after, .resizer-handle.right-side::after {
            height: 20px;
        }
        .resizer-handle:hover, .app-container.dragging .resizer-handle { 
            background: #E30613; 
            border-color: #E30613;
        }
        .resizer-handle:hover::after, .app-container.dragging .resizer-handle::after {
            background: white;
        }
        
        .sidebar { flex-shrink: 0; background: transparent; display: flex; flex-direction: column; }
        .sidebar.dragging { user-select: none; }
        .sidebar-inner { background: white; flex: 1; display: flex; flex-direction: column; }
        .side-label { padding: 8px 15px; font-size: 10px; font-weight: 900; color: #94a3b8; border-bottom: 1px solid #e2e8f0; background: white; flex-shrink: 0; }
        .quill { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
        .ql-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; border: none !important; min-height: 0; }
        .ql-editor { flex: 1; overflow-y: auto !important; background: white; padding: 30px; font-size: 16px; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
        textarea { flex: 1; border: none; padding: 25px; background: #1e293b; color: #e2e8f0; font-family: monospace; outline: none; resize: none; font-size: 14px; line-height: 1.7; overflow-y: auto; }
        .image-handle { width: 16px; height: 16px; background: #E30613; border: 3px solid white; border-radius: 4px; cursor: nwse-resize; z-index: 1001; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .image-floating-toolbar { background: #003366; padding: 6px; border-radius: 12px; display: flex; gap: 4px; z-index: 1000; box-shadow: 0 8px 25px rgba(0,0,0,0.4); }
        .image-floating-toolbar button { background: transparent; border: none; color: white; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; }
        .image-floating-toolbar button:hover { background: rgba(255,255,255,0.15); transform: scale(1.1); }
        .markdown-body { 
            padding: 10px 20px; 
            line-height: 1.8; 
            font-size: 16px; 
            color: #334155; 
            width: 100%;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
        }
        /* Aligner tout à gauche sans restriction de largeur fixe */
        .markdown-body > p, .markdown-body > h1, .markdown-body > h2, .markdown-body > h3, .markdown-body > ul, .markdown-body > ol, .markdown-body > blockquote {
            width: 100%;
            margin-left: 0;
            margin-right: 0;
        }
        .markdown-body pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            overflow-x: auto;
        }
        .markdown-body code {
            font-family: monospace;
            background: #f1f5f9;
            padding: 2px 5px;
            border-radius: 4px;
            word-break: break-all;
        }
        .markdown-body img { 
            max-width: 100%; 
            height: auto;
            border-radius: 12px; 
            box-shadow: 0 8px 20px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3); 
            border: 1px solid #cbd5e1;
            cursor: pointer;
            margin: 15px 0;
            display: inline-block;
        }
        .btn { padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 10px; border: none; cursor: pointer; }
        .btn-primary { background: #E30613; color: white; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .premium-modal { background: white; padding: 35px; border-radius: 24px; width: 400px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .premium-modal h3 { margin-top: 0; color: #003366; font-size: 20px; font-weight: 800; }
        .modal-context { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 10px; background: #f8fafc; padding: 5px 10px; border-radius: 6px; }
        .premium-modal input { width: 100%; padding: 15px; margin: 10px 0 20px 0; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 16px; outline: none; font-weight: 600; }
        .btn-primary-premium { width: 100%; background: #E30613; color: white; border: none; padding: 15px; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer; }
        .welcome-screen { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: #94a3b8; }
        .ql-editor img { cursor: pointer; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        .notification-toast {
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 15px 25px;
            border-radius: 12px;
            background: white;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 3000;
            font-weight: 700;
            animation: slideIn 0.3s ease-out;
            border-left: 5px solid #64748b;
        }
        .notification-toast.success { border-left-color: #10b981; color: #065f46; }
        .notification-toast.error { border-left-color: #ef4444; color: #991b1b; }
        @keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .confirm-modal p { color: #64748b; line-height: 1.6; margin-top: 10px; font-weight: 500; }
      `}</style>
    </div>
  );
}

export default WikiPage;
