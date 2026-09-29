import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, Zap, CheckCircle, Clock, AlertTriangle,
  Brain, Search, FileText, MessageSquare, Loader
} from 'lucide-react';
import { incidentApi } from '../api';
import { getSeverityDot, getSeverityClass, getStatusClass, formatDate, formatDuration } from '../utils';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolveMode, setResolveMode] = useState(false);
  const [resolveForm, setResolveForm] = useState({ RootCause: '', Resolution: '', Status: 'Resolved' });
  const [resolveLoading, setResolveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    incidentApi.getById(id).then(setIncident).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleResolve = async () => {
    setResolveLoading(true);
    try {
      const updated = await incidentApi.resolve(id, resolveForm);
      setIncident(updated);
      setResolveMode(false);
      setSuccess('Incident resolved. Storing experience in Hindsight memory...');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResolveLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
      <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
      Loading incident...
    </div>
  );

  if (!incident) return <div style={{ padding: '32px', color: '#ef4444' }}>Incident not found</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: '#3b82f6' }}>Dashboard</span>
        <ChevronRight size={14} />
        <span>{incident.IncidentNumber}</span>
      </div>

      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{getSeverityDot(incident.Severity)}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#64748b' }}>{incident.IncidentNumber}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityClass(incident.Severity)}`} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>
                {incident.Severity}
              </span>
              <span className={getStatusClass(incident.Status)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>
                {incident.Status}
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', margin: 0, marginBottom: '4px' }}>
              {incident.Service}
            </h1>
            <p style={{ color: '#ef4444', fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>{incident.Error}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
            <div>Created: {formatDate(incident.CreatedAt)}</div>
            {incident.ResolvedAt && <div style={{ color: '#10b981' }}>Resolved: {formatDate(incident.ResolvedAt)}</div>}
            {incident.ResolvedAt && <div>Duration: {formatDuration(incident.CreatedAt, incident.ResolvedAt)}</div>}
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: incident.Description ? '16px' : 0 }}>
          {[
            { label: 'Environment', value: incident.Environment },
            { label: 'Service', value: incident.Service },
            { label: 'Status', value: incident.Status },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(10, 14, 26, 0.5)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {incident.Description && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(10, 14, 26, 0.5)', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Description</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{incident.Description}</div>
          </div>
        )}

        {incident.RecentChanges && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '4px', textTransform: 'uppercase' }}>⚠️ Recent Changes</div>
            <div style={{ fontSize: '13px', color: '#fcd34d' }}>{incident.RecentChanges}</div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {(error || success) && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
          background: error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          color: error ? '#fca5a5' : '#6ee7b7'
        }}>
          {error || success}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button className="btn-primary" onClick={() => navigate(`/incidents/${id}/investigate`)}>
          <Brain size={16} /> Investigate with AI
        </button>
        {incident.Status !== 'Resolved' && (
          <button className="btn-ghost" onClick={() => setResolveMode(!resolveMode)}>
            <CheckCircle size={16} /> Mark Resolved
          </button>
        )}
        {incident.Status === 'Resolved' && (
          <button className="btn-ghost" onClick={() => navigate(`/incidents/${id}/postmortem`)}>
            <FileText size={16} /> Generate Post-Mortem
          </button>
        )}
        {incident.Status === 'Resolved' && (
          <button className="btn-ghost" onClick={() => navigate(`/incidents/${id}?tab=feedback`)}>
            <MessageSquare size={16} /> Add Feedback
          </button>
        )}
      </div>

      {/* Resolve form */}
      {resolveMode && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} style={{ color: '#10b981' }} /> Resolve Incident
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {['Resolved', 'Monitoring'].map(s => (
              <button key={s} type="button" onClick={() => setResolveForm(f => ({ ...f, Status: s }))}
                style={{
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  border: '1px solid', transition: 'all 0.2s',
                  background: resolveForm.Status === s ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  borderColor: resolveForm.Status === s ? '#10b981' : 'rgba(59, 130, 246, 0.2)',
                  color: resolveForm.Status === s ? '#6ee7b7' : '#94a3b8'
                }}>
                {s}
              </button>
            ))}
          </div>
          <textarea placeholder="Root Cause *" value={resolveForm.RootCause}
            onChange={e => setResolveForm(f => ({ ...f, RootCause: e.target.value }))}
            rows={2} required style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(10, 14, 26, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#e2e8f0', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }} />
          <textarea placeholder="Resolution steps taken" value={resolveForm.Resolution}
            onChange={e => setResolveForm(f => ({ ...f, Resolution: e.target.value }))}
            rows={2} style={{ width: '100%', marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(10, 14, 26, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#e2e8f0', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-success" onClick={handleResolve} disabled={resolveLoading || !resolveForm.RootCause}>
              {resolveLoading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : '✅ Confirm Resolution'}
            </button>
            <button className="btn-ghost" onClick={() => setResolveMode(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Resolution display */}
      {incident.RootCause && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', marginBottom: '12px' }}>✅ Resolution</h3>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Root Cause</span>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0' }}>{incident.RootCause}</p>
          </div>
          {incident.Resolution && (
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Resolution</span>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0' }}>{incident.Resolution}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
