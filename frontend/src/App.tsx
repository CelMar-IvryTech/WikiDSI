import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WikiPage from './pages/WikiPage';
import SharedPage from './pages/SharedPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/share/*" element={<SharedPage />} />
        <Route path="/" element={<WikiPage />} />
      </Routes>
    </Router>
  );
}

export default App;
