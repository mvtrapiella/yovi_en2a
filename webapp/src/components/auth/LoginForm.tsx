import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { useUser } from '../../contexts/UserContext';
import { useCsrf } from '../../security/useCsrf';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, refreshUser } = useUser();
  const csrfToken = useCsrf();
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Prevents the useEffect below from redirecting when we just logged in through
  // the form — in that case the setTimeout handles the redirect after showing the message.
  const justLoggedIn = useRef(false);

  useEffect(() => {
    if (isLoggedIn && !justLoggedIn.current) navigate('/gameSelection');
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponseMessage(null);
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        justLoggedIn.current = true;
        await refreshUser();
        setResponseMessage(data.message);
        setTimeout(() => navigate('/gameSelection'), 1200);
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('Could not connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.authForm}>
      <h2>Login</h2>

      <div className={styles.formGroup}>
        <label htmlFor="login-email">Email address</label>
        <input
          type="email"
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="login-password">Password</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Processing...' : 'Login'}
      </button>

      <Link to="/register" className={styles.linkText}>
        If you haven't registered yet, click here
      </Link>

      {responseMessage && <div className={styles.successMessage}>{responseMessage}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </form>
  );
};

export default LoginForm;
