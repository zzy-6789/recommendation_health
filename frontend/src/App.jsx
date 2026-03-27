import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ApplicantPage from './pages/ApplicantPage';
import AdminPage from './pages/AdminPage';
import ReviewerPage from './pages/ReviewerPage';

const loadAuth = () => {
  const raw = localStorage.getItem('auth');
  return raw ? JSON.parse(raw) : null;
};

const Protected = ({ auth, roles, children }) => {
  if (!auth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(auth.user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const [auth, setAuth] = useState(loadAuth());
  const navigate = useNavigate();

  const onLogin = (payload) => {
    setAuth(payload);
    localStorage.setItem('auth', JSON.stringify(payload));
    navigate('/');
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('auth');
    navigate('/login');
  };

  const homePath = useMemo(() => {
    if (!auth) return '/login';
    if (auth.user.role === 'admin') return '/admin';
    if (auth.user.role === 'reviewer') return '/reviewer';
    return '/applicant';
  }, [auth]);

  return (
    <div>
      <header className="topbar">
        <h1>Proposal Review MVP</h1>
        <nav>
          {auth ? (
            <>
              <span className="badge">{auth.user.role}</span>
              <span>{auth.user.name}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to={homePath} replace />} />
          <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
          <Route path="/register" element={<RegisterPage onLogin={onLogin} />} />
          <Route
            path="/applicant"
            element={
              <Protected auth={auth} roles={['applicant']}>
                <ApplicantPage auth={auth} />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected auth={auth} roles={['admin']}>
                <AdminPage auth={auth} />
              </Protected>
            }
          />
          <Route
            path="/reviewer"
            element={
              <Protected auth={auth} roles={['reviewer']}>
                <ReviewerPage auth={auth} />
              </Protected>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
