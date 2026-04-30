import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, FileText, Folder, ChevronRight, ChevronDown, Edit3, Save, X, Image as ImageIcon, BookOpen, AlignLeft, AlignCenter, AlignRight, FolderPlus, FilePlus, Trash2, FileCode
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import TurndownService from 'turndown';
import { marked } from 'marked';

const API_BASE = 'http://localhost:3001/api';

const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndownService.addRule('img-width', {
  filter: 'img',
  replacement: (content, node: any) => {
    const src = node.getAttribute('src') || '';
    const width = node.getAttribute('width') || node.style.width || '';
    const style = node.getAttribute('style') || '';
    return `<img src="${src}" width="${width}" style="${style}" />`;
  }
});

interface FileNode { name: string; type: 'file' | 'directory'; path: string; children?: FileNode[]; }

function App() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContentHTML, setEditContentHTML] = useState('');
  const [editContentMD, setEditContentMD] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const quillRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);

  useEffect(() => {
    if (isEditing && !syncLock.current) {
      const markdown = turndownService.turndown(editContentHTML);
      if (markdown !== editContentMD) setEditContentMD(markdown);
    }
  }, [editContentHTML, isEditing]);

  const handleMDChange = async (md: string) => {
    setEditContentMD(md);
    syncLock.current = true;
    const html = await marked.parse(md);
    setEditContentHTML(typeof html === 'string' ? html : String(html));
    setTimeout(() => { syncLock.current = false; }, 100);
  };

  const handleDelete = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (window.confirm(`Voulez-vous vraiment supprimer "${path.split('/').pop()}" ?\nIl sera déplacé vers la corbeille.`)) {
      try {
        await axios.post(`${API_BASE}/delete`, { filePath: path });
        if (selectedFile === path) setSelectedFile(null);
        fetchTree();
      } catch (err) { alert('Erreur lors de la suppression'); }
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
      const html = await marked.parse(res.data.content);
      setEditContentHTML(typeof html === 'string' ? html : String(html));
      setEditContentMD(res.data.content);
      setIsEditing(false);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await axios.post(`${API_BASE}/file`, { filePath: selectedFile, content: editContentMD });
      setIsEditing(false);
    } catch (err) { alert('Erreur'); }
  };

  // --- Manipulation d'image ---
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [overlayPos, setOverlayPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const formData = new FormData();
      formData.append('image', e.target.files[0]);
      try {
        const res = await axios.post(`${API_BASE}/upload`, formData);
        const tag = `<img src="${res.data.url}" width="50%" style="display:block;margin:20px auto;cursor:pointer;" />`;
        setEditContentHTML(prev => prev + tag);
      } catch (err) { alert('Erreur upload'); }
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
  };

  const onGlobalMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      setEditContentHTML(quillRef.current.getEditor().root.innerHTML);
    }
  };

  const renderTree = (nodes: FileNode[]) => nodes.map(node => (
    <div key={node.path} style={{ marginLeft: '12px' }}>
      {node.type === 'directory' ? (
        <div className="tree-node">
          <div className="tree-item folder" onClick={() => {
            const next = new Set(expandedFolders);
            if (next.has(node.path)) next.delete(node.path); else next.add(node.path);
            setExpandedFolders(next);
          }}>
            <div className="tree-item-content">
              <ChevronRight size={14} style={{ transform: expandedFolders.has(node.path) ? 'rotate(90deg)' : 'none' }} />
              <Folder size={18} color="#94a3b8" />
              <span>{node.name}</span>
            </div>
            <button className="delete-btn" onClick={(e) => handleDelete(e, node.path)}><Trash2 size={14}/></button>
          </div>
          {expandedFolders.has(node.path) && node.children && <div>{renderTree(node.children)}</div>}
        </div>
      ) : (
        <div className={`tree-item file ${selectedFile === node.path ? 'active' : ''}`} onClick={() => loadFile(node.path)}>
          <div className="tree-item-content">
            <FileText size={18} /><span>{node.name.replace('.md', '')}</span>
          </div>
          <button className="delete-btn" onClick={(e) => handleDelete(e, node.path)}><Trash2 size={14}/></button>
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
        if (window.confirm("Importer le contenu Word ? Cela écrasera votre brouillon actuel.")) {
          setEditContentHTML(html);
          setEditContentMD(markdown);
          syncLock.current = true;
          setTimeout(() => { syncLock.current = false; }, 200);
        }
      } catch (err) { alert('Erreur lors de l\'importation Word'); }
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
        const fileName = file.name.replace('.docx', '.md');
        await axios.post(`${API_BASE}/file`, { filePath: fileName, content: markdown });
        fetchTree();
        loadFile(fileName);
      } catch (err) { alert('Erreur lors de l\'importation Word'); }
    }
  };

  return (
    <div className="app-container" onMouseMove={onGlobalMouseMove} onMouseUp={onGlobalMouseUp}>
      <header className="main-header">
        <div className="logo"><span className="logo-ivry">ivry</span><span className="logo-dsi"> - Wiki DSI</span></div>
        <div className="version-badge">Premium Editor v2.4</div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-inner">
            <div className="sidebar-header">
              <span>PROCÉDURES</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <label className="sidebar-action-btn" title="Importer Word">
                  <FileCode size={16}/>
                  <input type="file" hidden accept=".docx" onChange={handleWordImportDirect} />
                </label>
                <button className="sidebar-action-btn" onClick={() => setShowCreateModal({show: true, type: 'folder', parent: ''})} title="Nouveau dossier">
                  <FolderPlus size={16}/>
                </button>
                <button className="sidebar-action-btn" onClick={() => setShowCreateModal({show: true, type: 'file', parent: ''})} title="Nouveau fichier">
                  <FilePlus size={16}/>
                </button>
              </div>
            </div>
            <div className="tree-container">{renderTree(tree)}</div>
          </div>
        </aside>

        <main className="content">
          <div className="content-inner">
            {selectedFile ? (
              <div className="document-card">
                <div className="doc-header">
                  <div className="breadcrumb">{selectedFile.replace('.md', '')}</div>
                  <div className="doc-actions">
                    {isEditing ? (
                      <>
                        <label className="btn btn-secondary"><FileCode size={18} /> Word<input type="file" hidden accept=".docx" onChange={handleWordImport} /></label>
                        <label className="btn btn-secondary"><ImageIcon size={18} /> Image<input type="file" hidden accept="image/*" onChange={handleImageSelect} /></label>
                        <button className="btn btn-primary" onClick={handleSave}><Save size={18} /> Sauvegarder</button>
                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}><X size={18} /></button>
                      </>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => setIsEditing(true)}><Edit3 size={18} /> Modifier</button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="split-editor">
                    <div className="editor-side visual-side" onMouseDown={handleMouseDown}>
                      <div className="side-label">VISUEL (DRAG & RESIZE)</div>
                      <div className="quill-wrapper" ref={wrapperRef} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <ReactQuill 
                          ref={quillRef} 
                          theme="snow" 
                          value={editContentHTML} 
                          onChange={(content) => { if (!syncLock.current) setEditContentHTML(content); }}
                          modules={{ toolbar: [[{header:[1,2,3,false]}],['bold','italic','underline'],[{list:'ordered'},{list:'bullet'}],['link','clean']] }} 
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
                    <div className="editor-side code-side">
                      <div className="side-label">MARKDOWN</div>
                      <textarea value={editContentMD} onChange={(e) => handleMDChange(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="scrollable-container">
                    <div 
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
      </div>

      {showCreateModal.show && (
        <div className="modal-overlay">
          <div className="premium-modal">
            <h3>{showCreateModal.type === 'folder' ? 'Nouveau Dossier' : 'Nouvelle Procédure'}</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} autoFocus placeholder="Nom..." />
            <button className="btn-primary-premium" onClick={() => {
                const path = showCreateModal.parent ? `${showCreateModal.parent}/${newName}` : newName;
                if (showCreateModal.type === 'folder') {
                  axios.post(`${API_BASE}/folder`, { folderPath: path }).then(() => { 
                    fetchTree(); 
                    setShowCreateModal({show:false,type:'file',parent:''}); 
                    setNewName('');
                  });
                } else {
                  const fileName = path.endsWith('.md') ? path : `${path}.md`;
                  axios.post(`${API_BASE}/file`, { filePath: fileName, content: `# ${newName}` }).then(() => { 
                    fetchTree(); 
                    loadFile(fileName); 
                    setIsEditing(true); 
                    setShowCreateModal({show:false,type:'file',parent:''}); 
                    setNewName('');
                  });
                }
            }}>Créer</button>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={() => setShowCreateModal({show: false, type: 'file', parent: ''})}>Annuler</button>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', sans-serif; height: 100vh; overflow: hidden; background: #f8fafc; }
        .app-container { display: flex; flex-direction: column; height: 100vh; }
        .main-header { height: 60px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; padding: 0 30px; flex-shrink: 0; }
        .logo { font-size: 22px; font-weight: 900; }
        .logo-ivry { color: #E30613; }
        .logo-dsi { color: #003366; opacity: 0.8; }
        .version-badge { background: #f1f5f9; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 800; margin-left: 20px; color: #64748b; border: 1px solid #e2e8f0; }
        .main-layout { display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 20px; }
        .sidebar { width: 280px; flex-shrink: 0; background: white; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-header { padding: 15px; border-bottom: 1px solid #f1f5f9; font-weight: 800; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-action-btn { background: #fff1f2; color: #E30613; border: none; padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .sidebar-action-btn:hover { background: #E30613; color: white; transform: scale(1.1); }
        .tree-container { flex: 1; overflow-y: auto; padding: 10px; }
        .tree-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 15px; cursor: pointer; border-radius: 12px; font-weight: 600; font-size: 14px; color: #475569; margin-bottom: 4px; transition: all 0.2s; }
        .tree-item-content { display: flex; align-items: center; gap: 10px; flex: 1; }
        .tree-item:hover { background: #f8fafc; }
        .tree-item.active { background: #f1f5f9; color: #E30613; }
        .delete-btn { opacity: 0; background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s; display: flex; }
        .tree-item:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: #fff1f2; color: #E30613; }
        .content { flex: 1; height: 100%; overflow: hidden; }
        .content-inner { height: 100%; display: flex; flex-direction: column; }
        .document-card { flex: 1; background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 25px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .doc-header { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
        .breadcrumb { font-weight: 800; color: #94a3b8; font-size: 11px; text-transform: uppercase; }
        .scrollable-container { flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px; }
        .split-editor { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; min-height: 0; }
        .editor-side { display: flex; flex-direction: column; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #f8fafc; position: relative; min-height: 0; }
        .side-label { padding: 8px 15px; font-size: 10px; font-weight: 900; color: #94a3b8; border-bottom: 1px solid #e2e8f0; background: white; flex-shrink: 0; }
        .quill { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
        .ql-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; border: none !important; min-height: 0; }
        .ql-editor { flex: 1; overflow-y: auto !important; background: white; padding: 30px; font-size: 16px; line-height: 1.6; }
        textarea { flex: 1; border: none; padding: 25px; background: #1e293b; color: #e2e8f0; font-family: monospace; outline: none; resize: none; font-size: 14px; line-height: 1.7; overflow-y: auto; }        .image-handle { width: 16px; height: 16px; background: #E30613; border: 3px solid white; border-radius: 4px; cursor: nwse-resize; z-index: 1001; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .image-floating-toolbar { background: #003366; padding: 6px; border-radius: 12px; display: flex; gap: 4px; z-index: 1000; box-shadow: 0 8px 25px rgba(0,0,0,0.4); }
        .image-floating-toolbar button { background: transparent; border: none; color: white; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; }
        .image-floating-toolbar button:hover { background: rgba(255,255,255,0.15); transform: scale(1.1); }
        .markdown-body { padding: 10px 20px; line-height: 1.8; font-size: 16px; color: #334155; }
        .markdown-body img { border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .btn { padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 10px; border: none; cursor: pointer; }
        .btn-primary { background: #E30613; color: white; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .premium-modal { background: white; padding: 35px; border-radius: 24px; width: 400px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .premium-modal h3 { margin-top: 0; color: #003366; font-size: 20px; font-weight: 800; }
        .premium-modal input { width: 100%; padding: 15px; margin: 20px 0; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 16px; outline: none; font-weight: 600; }
        .btn-primary-premium { width: 100%; background: #E30613; color: white; border: none; padding: 15px; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer; }
        .welcome-screen { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: #94a3b8; }
        .ql-editor img { cursor: pointer; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default App;
