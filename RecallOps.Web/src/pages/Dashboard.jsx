import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Brain, Zap, TrendingUp, Plus, ArrowRight, Activity } from 'lucide-react';
import { dashboardApi } from '../api';
import { getSeverityDot, getSeverityClass, getStatusClass, formatDate } from '../utils';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardApi.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));

    const iv = setInterval(() => {
      dashboardApi.stats().then(setStats).catch(console.error);
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return <LoadingSkeleton />;

  const statCards = [
    {
      label: 'Active Incidents',
      value: stats?.ActiveIncidents || 0,
      icon: <AlertTriangle size={20} />,
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.2)',
      sub: `${stats?.InvestigatingIncidents || 0} investigating, ${stats?.MonitoringIncidents || 0} monitoring`
    },
    {
      label: 'Resolved Incidents',
      value: stats?.ResolvedIncidents || 0,
      icon: <CheckCircle size={20} />,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.2)',
      sub: `${stats?.TotalIncidents || 0} total incidents`
    },
    {
      label: 'Memory Records',
      value: stats?.MemoryRecords || 0,
      icon: <Brain size={20} />,
      color: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.2)',
      sub: stats?.MemoryMode || 'Local mode'
    },
    {
      label: 'Learned Patterns',
      value: stats?.LearnedPatterns || 0,
      icon: <TrendingUp size={20} />,
      color: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.2)',
      sub: 'From engineer feedback'
    },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
              Incident Dashboard
            </h1>
            {stats?.MemoryFallbackActive && (
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
              }}>
                ⚠️ Memory Fallback Active
              </span>
            )}
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Remember the incident. Learn the solution. Solve the next one smarter.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/incidents/create')}
        >
          <Plus size={16} /> New Incident
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="glass-card animate-slide-up"
            style={{
              padding: '20px',
              animationDelay: `${i * 0.1}s`,
              cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {card.label}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: card.glow, color: card.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {card.icon}
              </div>
            </div>
            <div style={{
              fontSize: '36px', fontWeight: 800,
              color: card.color, lineHeight: 1,
              marginBottom: '6px',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {card.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Active Incidents + Top Services */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Active Incidents */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} style={{ color: '#3b82f6' }} />
              Recent Incidents
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{stats?.RecentIncidents?.length || 0} shown</span>
          </div>

          {!stats?.RecentIncidents?.length ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <CheckCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No incidents yet</p>
              <button className="btn-primary" style={{ marginTop: '16px', fontSize: '13px', padding: '8px 16px' }}
                onClick={() => navigate('/incidents/create')}>
                Create first incident
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.RecentIncidents.map(inc => (
                <div
                  key={inc.Id}
                  onClick={() => navigate(`/incidents/${inc.Id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                    background: 'rgba(10, 14, 26, 0.5)',
                    border: '1px solid rgba(59, 130, 246, 0.08)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.08)'}
                >
                  <span style={{ fontSize: '16px' }}>{getSeverityDot(inc.Severity)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{inc.IncidentNumber}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>{inc.Service}</span>
                      <span className={`severity-${inc.Severity.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>{inc.Severity}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inc.Error}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={getStatusClass(inc.Status)} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      {inc.Status}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(inc.CreatedAt)}</span>
                  </div>
                  <ArrowRight size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Services */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
            Top Services
          </h2>
          {!stats?.TopServices?.length ? (
            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.TopServices.map((s, i) => (
                <div key={s.Service}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{s.Service}</span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{s.Count}</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(59, 130, 246, 0.1)' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      width: `${(s.Count / (stats.TopServices[0]?.Count || 1)) * 100}%`,
                      background: `hsl(${220 + i * 20}, 80%, 60%)`,
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Memory bank status */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Brain size={14} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Memory Bank</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>
              {(stats?.MemoryRecords || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Mode: <span style={{ color: '#94a3b8' }}>{stats?.MemoryMode || 'Local'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        textAlign: 'center', padding: '24px',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.1)',
        borderRadius: '12px', marginTop: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
          <Zap size={14} style={{ color: '#3b82f6' }} />
          <span>Every production incident becomes a lesson that helps solve the next one faster.</span>
          <Zap size={14} style={{ color: '#3b82f6' }} />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '32px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '12px' }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />
    </div>
  );
}
