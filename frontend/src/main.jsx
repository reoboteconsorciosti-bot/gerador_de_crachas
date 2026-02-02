import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("React Mounting Check: SCRIPT LOADED");

try {
  const root = document.getElementById('root');
  if (!root) throw new Error("ROOT ELEMENT NOT FOUND");

  console.log("Found Root, Rendering App...");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log("Render Called Successfully");
} catch (e) {
  console.error("CRITICAL REACT ERROR:", e);
  document.body.innerHTML = `<h1 style="color:red">REACT CRASH: ${e.message}</h1>`;
}
