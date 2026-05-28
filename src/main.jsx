import '@fontsource-variable/material-symbols-outlined';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import store from './store/index.js';
import App from './App.jsx';
import './index.css';

// Remove initial body background set in index.html
document.body.style.background = ''

// Mark fonts as loaded when ready
document.fonts.ready.then(() => {
  document.documentElement.classList.add('fonts-loaded')
})

// Fallback: force-show after 1 second even if fonts.ready doesn't fire
setTimeout(() => {
  document.documentElement.classList.add('fonts-loaded')
}, 1000)

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
);
