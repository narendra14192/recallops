import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Brain, Search, LayoutDashboard, 
  Plus, RefreshCw, LogOut, LogIn
} from 'lucide-react';
import { adminApi, healthApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [health, setHealth] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // 8. Do not allow fake/local credentials to bypass authentication
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    healthApi.check().then(setHealth).catch(() => {});
    const iv = setInterval(() => {
      healthApi.check().then(setHealth).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSeedMemory = async () => {
    setSeedLoading(true);
    try {
      const result = await adminApi.seedMemory();
      showNotification(result.message || 'Memory seeded successfully!');
    } catch (e) {
      showNotification(e.message, 'error');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset demo? This will delete demo incidents and clear memory bank.')) return;
    setResetLoading(true);
    try {
      const result = await adminApi.resetDemo();
      showNotification(result.message || 'Demo reset!');
      navigate('/');
    } catch (e) {
      showNotification(e.message, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // 5. Logout must call: supabase.auth.signOut()
  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Verifying Supabase Session...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard', end: true },
    { to: '/incidents/create', icon: <Plus size={16} />, label: 'New Incident' },
    { to: '/memory', icon: <Brain size={16} />, label: 'Memory Timeline' },
    { to: '/memory/search', icon: <Search size={16} />, label: 'Memory Search' },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0e1a' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        minHeight: '100vh',
        background: 'rgba(15, 22, 41, 0.95)',
        borderRight: '1px solid rgba(59, 130, 246, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
            }}>
              <Brain size={19} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.06em' }}>RECALL OPS</div>
              <div style={{ fontSize: '9.5px', color: '#60a5fa', letterSpacing: '0.12em', fontWeight: 600 }}>AUTONOMOUS SRE</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, padding: '4px 10px 8px', letterSpacing: '0.1em' }}>
            CORE OPERATIONS
          </div>
          {navItems.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px',
                textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                transition: 'all 0.2s',
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : '#94a3b8',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid transparent',
              })}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Health indicator */}
        {health && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Cluster Status
            </div>
            {[
              { label: 'API Gateway', ok: health.ApiHealthy },
              { label: 'State Database', ok: health.DatabaseHealthy },
              { label: `Hindsight (${health.HindsightMode?.includes('Local') ? 'Local' : 'Live'})`, ok: health.HindsightHealthy },
              { label: 'Groq LLM', ok: health.GroqHealthy },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: ok ? '#10b981' : '#ef4444',
                  boxShadow: ok ? '0 0 6px rgba(16, 185, 129, 0.6)' : '0 0 6px rgba(239, 68, 68, 0.6)'
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Seed & Admin actions */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button onClick={handleSeedMemory} disabled={seedLoading} className="btn-ghost" style={{ fontSize: '11px', padding: '7px 10px', justifyContent: 'center' }}>
            {seedLoading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Seeding...</> : <><Brain size={12} /> Seed Memory Bank</>}
          </button>
          <button onClick={handleResetDemo} disabled={resetLoading} style={{
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '11px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'
          }}>
            <RefreshCw size={11} /> Reset Demo
          </button>
        </div>

        {/* User Profile Card */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(59, 130, 246, 0.15)', background: 'rgba(10, 14, 26, 0.6)' }}>
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #3b82f6' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: user.color || '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                    {user.initials || 'U'}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                    {user.badge || 'On-Call'}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Sign Out / Switch Persona"
                style={{
                  background: 'transparent', border: 'none', color: '#94a3b8',
                  cursor: 'pointer', padding: '5px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '7px 10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', textDecoration: 'none',
                fontSize: '11px', fontWeight: 600
              }}
            >
              <LogIn size={13} /> Sign In / Switch Persona
            </Link>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar */}
        <header style={{
          height: '56px',
          background: 'rgba(15, 22, 41, 0.85)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 90,
          backdropFilter: 'blur(12px)'
        }}>
          {/* Left breadcrumb info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ color: '#64748b' }}>Operations</span>
              <span style={{ color: '#475569' }}>/</span>
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Production Cluster</span>
            </div>
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)', color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 600
            }}>
              LIVE TELEMETRY
            </span>
          </div>

          {/* Right quick actions & auth info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Hindsight Cloud Bank badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '11px', color: '#93c5fd'
            }}>
              <Brain size={13} className="text-blue-400" />
              <span>Bank: <strong style={{ color: '#e0e7ff' }}>recallops-incidents</strong></span>
            </div>

            {/* User status */}
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{user.name}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{user.role}</div>
                </div>
                <Link to="/login" title="Switch User / View Login" style={{ textDecoration: 'none' }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #3b82f6' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: user.color || '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                      {user.initials || 'U'}
                    </div>
                  )}
                </Link>
              </div>
            ) : (
              <Link 
                to="/login"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '8px',
                  background: '#3b82f6', color: 'white', textDecoration: 'none',
                  fontSize: '12px', fontWeight: 600
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowX: 'hidden' }}>
          {/* Notification */}
          {notification && (
            <div style={{
              position: 'fixed', top: 70, right: 24, zIndex: 1000,
              padding: '12px 20px', borderRadius: '10px', maxWidth: '420px',
              background: notification.type === 'error' ? 'rgba(220, 38, 38, 0.95)' : 'rgba(5, 150, 105, 0.95)',
              color: 'white', fontSize: '13px', fontWeight: 500,
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              animation: 'slide-in-up 0.3s ease-out'
            }}>
              {notification.msg}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
