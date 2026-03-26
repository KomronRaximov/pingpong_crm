import { useState } from 'react';
import './index.css';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

  const handleLogin = (newToken: string) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
