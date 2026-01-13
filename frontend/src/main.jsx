import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. Importamos el Proveedor
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Envolvemos la App. Ahora toda la app tiene "poderes" para cambiar el head */}
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)