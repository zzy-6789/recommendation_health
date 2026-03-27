import { useState } from 'react';
import { request } from '../api';

export default function RegisterPage({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const data = await request('/auth/register', { method: 'POST', body: form });
      onLogin(data);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="card small">
      <h2>申请者注册</h2>
      <form onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">注册并登录</button>
      </form>
    </section>
  );
}
