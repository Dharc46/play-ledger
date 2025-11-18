import './index.css';
import App from './App';
import React from 'react';
import { createRoot } from 'react-dom/client';

// ← 2 dòng QUAN TRỌNG NHẤT – nếu thiếu thì CSS không chạy
import './index.css'   // ← phải có dòng này
import './App.css'      // ← nếu bạn vẫn muốn giữ App.css thì cũng thêm

createRoot(document.getElementById('root')).render(
  <App />
);
