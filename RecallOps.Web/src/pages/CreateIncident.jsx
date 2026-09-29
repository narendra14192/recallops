import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader } from 'lucide-react';
import { incidentApi } from '../api';

const SERVICES = [
  'Payment API', 'Authentication API', 'Order Service', 'Notification Service',
  'User API', 'Search Service', 'API Gateway', 'Redis Cache',
  'PostgreSQL Database', 'File Storage Service'
];

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const ENVIRONMENTS = ['Production', 'Staging', 'Development'];

export default function CreateIncident() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    Service: '', Severity: 'High', Environment: 'Production',
    Error: '', Description: '', RecentChanges: '', Logs: '', Symptoms: ''
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const incident = await incidentApi.create(form);
      navigate(`/incidents/${incident.Id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: '14px',
    background: 'rgba(10, 14, 26, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px', color: '#e2e8f0', outline: 'none', transition: 'all 0.2s'
  };

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: '#3b82f6' }}>Dashboard</span>
          <ChevronRight size={14} />
          <span>New Incident</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Create Incident</h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>RecallOps will search memory for similar past incidents</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px', padding: '12px 16px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '28px' }}>
        {/* Row 1: Service + Severity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Service *</label>
            <select value={form.Service} onChange={set('Service')} required style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">Select service...</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Severity *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SEVERITIES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, Severity: s }))}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600, border: '1px solid',
                    transition: 'all 0.2s',
                    background: form.Severity === s
                      ? s === 'Critical' ? 'rgba(220, 38, 38, 0.3)'
                        : s === 'High' ? 'rgba(239, 68, 68, 0.2)'
                        : s === 'Medium' ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(10, 14, 26, 0.5)',
                    borderColor: form.Severity === s
                      ? s === 'Critical' ? '#dc2626'
                        : s === 'High' ? '#ef4444'
                        : s === 'Medium' ? '#f59e0b'
                        : '#10b981'
                      : 'rgba(59, 130, 246, 0.15)',
                    color: form.Severity === s
                      ? s === 'Critical' || s === 'High' ? '#fca5a5'
                        : s === 'Medium' ? '#fcd34d'
                        : '#6ee7b7'
                      : '#64748b'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Environment + Error */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Environment *</label>
            <select value={form.Environment} onChange={set('Environment')} required style={{ ...inputStyle, appearance: 'none' }}>
              {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Error / Alert *</label>
            <input
              type="text"
              value={form.Error}
              onChange={set('Error')}
              required
              placeholder="e.g. 502 Bad Gateway, Connection timeout..."
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={form.Description}
            onChange={set('Description')}
            rows={3}
            placeholder="Describe the incident and its impact..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
          />
        </div>

        {/* Recent Changes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Recent Changes</label>
          <input
            type="text"
            value={form.RecentChanges}
            onChange={set('RecentChanges')}
            placeholder="e.g. Payment gateway timeout increased, new deployment v2.3.1..."
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
          />
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            💡 Recent changes help RecallOps correlate with similar incidents in memory
          </div>
        </div>

        {/* Symptoms */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Symptoms</label>
          <input
            type="text"
            value={form.Symptoms}
            onChange={set('Symptoms')}
            placeholder="e.g. High error rate, slow response times, users unable to checkout..."
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
          />
        </div>

        {/* Logs */}
        <div style={{ marginBottom: '28px' }}>
          <label style={labelStyle}>Relevant Logs</label>
          <textarea
            value={form.Logs}
            onChange={set('Logs')}
            rows={4}
            placeholder="Paste relevant log lines or error messages..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
            onFocus={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : '🚨 Create Incident'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
