import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { marked } from 'marked';
import { BookOpen, FileText } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

const SharedPage: React.FC = () => {
    const { '*': filePath } = useParams();
    const [contentHTML, setContentHTML] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadFile = async () => {
            if (!filePath) return;
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE}/file`, { params: { filePath: filePath } });
                const html = await marked.parse(res.data.content);
                setContentHTML(typeof html === 'string' ? html : String(html));
                setTitle(filePath.replace('.md', '').split('/').pop() || 'Procédure');
                setError(null);
            } catch (err) {
                console.error(err);
                setError('Procédure non trouvée ou inaccessible.');
            } finally {
                setLoading(false);
            }
        };

        loadFile();
    }, [filePath]);

    if (loading) {
        return (
            <div className="share-loading">
                <div className="spinner"></div>
                <p>Chargement de la procédure...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="share-error">
                <FileText size={48} color="#cbd5e1" />
                <h1>Oups !</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="share-container">
            <header className="share-header">
                <div className="share-logo">
                    <span className="logo-ivry">ivry</span>
                    <span className="logo-dsi"> - Wiki DSI</span>
                </div>
                <div className="share-badge">Lecture seule</div>
            </header>

            <main className="share-content">
                <div className="share-card">
                    <div className="share-doc-header">
                        <div className="share-breadcrumb">{title}</div>
                    </div>
                    <div className="share-scrollable">
                        <div 
                            className="markdown-body"
                            dangerouslySetInnerHTML={{ __html: contentHTML }}
                        />
                    </div>
                </div>
            </main>

            <style>{`
                .share-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: #f8fafc;
                    font-family: 'Montserrat', sans-serif;
                }
                .share-header {
                    height: 60px;
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 30px;
                    flex-shrink: 0;
                }
                .share-logo {
                    font-size: 22px;
                    font-weight: 900;
                }
                .logo-ivry { color: #E30613; }
                .logo-dsi { color: #003366; opacity: 0.8; }
                .share-badge {
                    background: #f1f5f9;
                    padding: 4px 12px;
                    border-radius: 50px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                    text-transform: uppercase;
                }
                .share-content {
                    flex: 1;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    overflow: hidden;
                }
                .share-card {
                    width: 100%;
                    max-width: 1000px;
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                }
                .share-doc-header {
                    margin-bottom: 30px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 15px;
                }
                .share-breadcrumb {
                    font-weight: 800;
                    color: #003366;
                    font-size: 24px;
                }
                .share-scrollable {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                }
                .markdown-body {
                    line-height: 1.8;
                    font-size: 16px;
                    color: #334155;
                    max-width: 900px;
                    margin: 0 auto;
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                    word-break: break-word;
                }
                .markdown-body img {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    margin: 25px auto;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                }
                .share-loading, .share-error {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    color: #64748b;
                    background: #f8fafc;
                    font-family: 'Montserrat', sans-serif;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f1f5f9;
                    border-top: 4px solid #E30613;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .share-error h1 {
                    color: #003366;
                    margin: 0;
                }

                /* Styles Markdown pour correspondre au Wiki */
                .markdown-body h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; color: #003366; }
                .markdown-body h2 { color: #003366; margin-top: 30px; }
                .markdown-body h3 { color: #003366; }
                .markdown-body pre { 
                    background: #f1f5f9; 
                    padding: 15px; 
                    border-radius: 8px; 
                    overflow-x: auto; 
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    margin: 15px 0;
                }
                .markdown-body code { 
                    font-family: monospace; 
                    background: #f1f5f9; 
                    padding: 2px 5px; 
                    border-radius: 4px; 
                    word-break: break-all;
                }
                .markdown-body blockquote { border-left: 4px solid #E30613; padding-left: 20px; color: #64748b; font-style: italic; }
            `}</style>
        </div>
    );
};

export default SharedPage;
