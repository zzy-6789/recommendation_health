import { useState } from 'react';
import { request } from '../api';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const data = await request('/auth/login', { method: 'POST', body: form });
      onLogin(data);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="card small">
      <h2>登录</h2>
      <p className="helper">管理员: admin@demo.com / Admin123!；评审: reviewer@demo.com / Reviewer123!</p>
      <form onSubmit={submit}>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">登录</button>
      </form>
    </section>
  );
}
