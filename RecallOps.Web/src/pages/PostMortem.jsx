import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, Loader, Brain, Download } from 'lucide-react';
import { incidentApi } from '../api';
import { formatDate, formatDuration, getSeverityClass } from '../utils';

export default function PostMortem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [postmortem, setPostmortem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [incident, setIncident] = useState(null);

  useEffect(() => {
    incidentApi.getById(id).then(setIncident).catch(console.error);
  }, [id]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentApi.postmortem(id);
      setPostmortem(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: '#3b82f6' }}>Dashboard</span>
        <ChevronRight size={14} />
        <span onClick={() => navigate(`/incidents/${id}`)} style={{ cursor: 'pointer', color: '#3b82f6' }}>
          {incident?.IncidentNumber}
        </span>
        <ChevronRight size={14} />
        <span>Post-Mortem</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(59, 130, 246, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <FileText size={20} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Post-Mortem Generator</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>AI-generated structured post-mortem, retained to organizational memory</p>
        </div>
      </div>

      {!postmortem && !loading && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Brain size={48} style={{ color: '#3b82f6', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Generate Post-Mortem</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            RecallOps will analyze the incident and generate a structured post-mortem. It will also be retained to Hindsight for organizational knowledge.
          </p>
          <button className="btn-primary" onClick={generate} style={{ fontSize: '15px', padding: '12px 28px' }}>
            <FileText size={16} /> Generate Post-Mortem
          </button>
        </div>
      )}

      {loading && (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
          <Loader size={32} style={{ color: '#3b82f6', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Generating post-mortem with AI...</p>
          <p style={{ color: '#64748b', fontSize: '12px' }}>This will be retained to Hindsight memory bank.</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', marginBottom: '16px' }}>
          ❌ {error}
          <button onClick={generate} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px' }}>Retry</button>
        </div>
      )}

      {postmortem && (
        <div className="animate-fade-in">
          {/* Metadata */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Post-Mortem</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 4px' }}>
                  {postmortem.IncidentNumber} — {postmortem.Service}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className={getSeverityClass(postmortem.Severity)} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                    {postmortem.Severity}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{postmortem.Environment}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([postmortem.GeneratedMarkdown], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `${postmortem.IncidentNumber}-postmortem.md`; a.click();
                }}
                className="btn-ghost"
                style={{ fontSize: '12px' }}
              >
                <Download size={14} /> Download .md
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { label: 'Occurred', value: formatDate(postmortem.OccurredAt) },
                { label: 'Resolved', value: postmortem.ResolvedAt ? formatDate(postmortem.ResolvedAt) : 'Ongoing' },
                { label: 'Duration', value: postmortem.TimeToResolve || 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(10, 14, 26, 0.5)' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          {[
            { label: 'Impact', value: postmortem.Impact, color: '#ef4444' },
            { label: 'Root Cause', value: postmortem.RootCause, color: '#f59e0b' },
            { label: 'Resolution', value: postmortem.Resolution, color: '#10b981' },
            { label: 'Lessons Learned', value: postmortem.LessonsLearned, color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card" style={{ padding: '20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>{label}</div>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{value}</p>
            </div>
          ))}

          {postmortem.FailedAttempts?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px', marginBottom: '12px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '12px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>⚠️ Failed Attempts (Do Not Repeat)</div>
              {postmortem.FailedAttempts.map((a, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                  <span>•</span> {a}
                </div>
              ))}
            </div>
          )}

          {/* Markdown */}
          {postmortem.GeneratedMarkdown && (
            <div className="glass-card" style={{ padding: '24px', marginTop: '20px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Full Post-Mortem (Markdown)</div>
              <pre style={{
                whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px',
                color: '#94a3b8', margin: 0, lineHeight: 1.7,
                background: 'rgba(10, 14, 26, 0.5)', padding: '16px', borderRadius: '8px'
              }}>
                {postmortem.GeneratedMarkdown}
              </pre>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontSize: '13px' }}>
            🧠 Post-mortem has been retained to Hindsight organizational memory.
          </div>
        </div>
      )}
    </div>
  );
}
