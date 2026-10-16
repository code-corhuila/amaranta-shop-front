import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { sessionStore } from './core/auth/sessionStore';
import { SessionProvider } from './core/auth/SessionProvider';
import { remotes } from './remotes/registry';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <SessionProvider store={sessionStore}>
      <BrowserRouter>
        <App remotes={remotes} />
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
);
