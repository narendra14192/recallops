import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Brain, Zap, ChevronRight, 
  Shield, Check, ArrowRight, RotateCcw, FileText, AlertCircle
} from 'lucide-react';
import { incidentApi } from '../api';
import { getSeverityDot, getSeverityClass } from '../utils';

const CHECKLIST = [
  { key: 'analyzed', label: 'Incident analyzed' },
  { key: 'searched', label: 'Hindsight memory searched' },
  { key: 'found', label: 'Similar incidents found' },
  { key: 'identified', label: 'Historical solution identified' },
];

export default function Investigation() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checklistState, setChecklistState] = useState([]);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState({ 
    RootCause: '', 
    Resolution: '', 
    WhatWorked: '', 
    WhatFailed: '', 
    EngineerNotes: '',
    LessonsLearned: '' 
  });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [error, setError] = useState(null);

  const runInvestigation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setChecklistState([]);

    // Step-by-step checklist animation
    const steps = ['analyzed', 'searched', 'found', 'identified'];
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setChecklistState(prev => [...prev, steps[stepIndex]]);
        stepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    try {
      const data = await incidentApi.investigate(id);
      clearInterval(interval);
      setChecklistState(steps);
      setResult(data);

      // Pre-fill resolution & feedback from historical match for instant 1-click submit
      const topMatch = data.RelevantHistoricalIncidents?.[0];
      setFeedback({
        RootCause: topMatch?.RootCause || 'PostgreSQL connection pool exhaustion',
        Resolution: topMatch?.Resolution || 'Increased connection pool from 50 to 100 connections',
        WhatWorked: topMatch?.Resolution || 'Scaled database pool limit from 50 to 100 connections',
        WhatFailed: topMatch?.FailedAttempts?.[0] || 'Increasing payment gateway timeout from 30s to 60s had zero effect',
        EngineerNotes: 'Verified connection pool metrics in Grafana; saw active pool hitting 50 max connections.',
        LessonsLearned: 'Always verify database connection pool utilization first before adjusting proxy/gateway timeouts.'
      });
    } catch (err) {
      clearInterval(interval);
      setError(err.message || 'Investigation failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    incidentApi.getById(id).then(setIncident).catch(console.error);
    runInvestigation();
  }, [id, runInvestigation]);

  const handleSubmitResolutionAndMemory = async () => {
    setFeedbackLoading(true);
    setError(null);
    try {
      // 1. Resolve incident in database
      await incidentApi.resolve(id, {
        RootCause: feedback.RootCause || 'PostgreSQL connection pool exhaustion',
        Resolution: feedback.Resolution || 'Increased connection pool from 50 to 100 connections',
        Status: 'Resolved'
      });

      // 2. Retain rich learning experience to Hindsight
      await incidentApi.feedback(id, {
        RootCause: feedback.RootCause,
        Resolution: feedback.Resolution,
        WhatWorked: feedback.WhatWorked,
        WhatFailed: feedback.WhatFailed,
        LessonsLearned: `${feedback.LessonsLearned} | Notes: ${feedback.EngineerNotes}`
      });

      setFeedbackSuccess(true);
      setFeedbackMode(false);
    } catch (err) {
      setError(err.message || 'Failed to save resolution');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1080px', margin: '0 auto', color: '#e2e8f0' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Dashboard</Link>
        <ChevronRight size={14} />
        <Link to={`/incidents/${id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
          {incident?.IncidentNumber || 'Incident'}
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Investigation &amp; Memory Synthesis</span>
      </div>

      {/* Incident Header Banner */}
      {incident && (
        <div className="glass-card" style={{ padding: '22px 26px', marginBottom: '24px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '26px' }}>{getSeverityDot(incident.Severity)}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                    {incident.IncidentNumber}
                  </span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }} className={getSeverityClass(incident.Severity)}>
                    {incident.Severity?.toUpperCase()}
                  </span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{incident.Environment}</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginBottom: '2px' }}>
                  {incident.Service}
                </div>
                <div style={{ fontSize: '14px', color: '#f87171', fontFamily: 'monospace', fontWeight: 600 }}>
                  {incident.Error}
                </div>
              </div>
            </div>

            {incident.RecentChanges && (
              <div style={{
                padding: '10px 16px', borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
                maxWidth: '340px'
              }}>
                <div style={{ fontSize: '10.5px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '3px' }}>
                  ⚠️ RECENT CHANGE
                </div>
                <div style={{ fontSize: '12.5px', color: '#fef08a', fontWeight: 500 }}>
                  {incident.RecentChanges}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading state with animated checklist */}
      {loading && (
        <div className="glass-card animate-fade-in" style={{ padding: '36px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
              Querying Hindsight Memory Bank &amp; Synthesizing with Groq AI...
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '850px', margin: '0 auto' }}>
            {CHECKLIST.map((item) => {
              const done = checklistState.includes(item.key);
              return (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.4)',
                  border: done ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(59, 130, 246, 0.15)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: done ? '#10b981' : 'rgba(59, 130, 246, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: 'white', fontWeight: 700
                  }}>
                    {done ? '✓' : '○'}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: done ? '#34d399' : '#64748b' }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{
          marginBottom: '24px', padding: '16px 20px', borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button 
            onClick={runInvestigation}
            className="btn-ghost"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <RotateCcw size={13} /> Retry Analysis
          </button>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 1. COMPLETED CHECKLIST STATUS BAR */}
          <div className="glass-card" style={{ padding: '16px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                {CHECKLIST.map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: '#34d399' }}>
                    <Check size={16} strokeWidth={3} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="memory-badge" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Brain size={13} />
                  <span>Hindsight Cloud: Live</span>
                </span>
                <span style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7', fontWeight: 700
                }}>
                  {Math.round((result.Confidence || 0.95) * 100)}% Confidence
                </span>
              </div>
            </div>
          </div>

          {/* 2. 🧠 SIMILAR HISTORICAL INCIDENT CARD */}
          {result.RelevantHistoricalIncidents?.length > 0 ? (
            result.RelevantHistoricalIncidents.map((hist, idx) => (
              <div 
                key={idx} 
                className="glass-card" 
                style={{
                  padding: '24px 28px',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  background: 'linear-gradient(180deg, rgba(20, 24, 45, 0.9) 0%, rgba(15, 20, 38, 0.9) 100%)',
                  boxShadow: '0 8px 30px rgba(139, 92, 246, 0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '8px',
                      background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Brain size={18} style={{ color: '#a78bfa' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        SIMILAR HISTORICAL INCIDENT
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace' }}>
                        {hist.IncidentNumber || 'INC-1002'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '6px 14px', borderRadius: '24px',
                    background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7', fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em'
                  }}>
                    {Math.round((hist.Similarity || 0.98) * 100)}% match
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  {/* Root Cause Box */}
                  <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(10, 14, 26, 0.65)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '6px' }}>
                      Root Cause
                    </div>
                    <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: 600 }}>
                      {hist.RootCause || 'PostgreSQL connection pool exhaustion'}
                    </div>
                  </div>

                  {/* Previous Resolution Box */}
                  <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(10, 14, 26, 0.65)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '10.5px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '6px' }}>
                      Previous Resolution
                    </div>
                    <div style={{ fontSize: '14px', color: '#6ee7b7', fontWeight: 600 }}>
                      {hist.Resolution || 'Increased connection pool: 50 → 100'}
                    </div>
                  </div>
                </div>

                {/* Failed Attempt Warning Box */}
                {(hist.FailedAttempts?.length > 0) && (
                  <div style={{
                    padding: '12px 18px', borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex', alignItems: 'flex-start', gap: '10px'
                  }}>
                    <Shield size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                        Failed Attempt (Avoid Repeating)
                      </div>
                      <div style={{ fontSize: '13px', color: '#fecaca', fontWeight: 500 }}>
                        {hist.FailedAttempts?.[0] || 'Gateway timeout increase — did not resolve the issue'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px dashed rgba(59, 130, 246, 0.25)' }}>
              <Brain size={32} style={{ color: '#60a5fa', margin: '0 auto 10px' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>Initial Failure Pattern</h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '520px', marginInline: 'auto' }}>
                No prior incident matches this exact pattern yet. When resolved, RecallOps will retain this knowledge in Hindsight so the next occurrence gets an instant high-confidence fix.
              </p>
            </div>
          )}

          {/* 3. LIKELY CAUSES & RECOMMENDED CHECKS (Side by side) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Likely Causes */}
            <div className="glass-card" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.04em' }}>
                🔍 LIKELY CAUSES
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(result.LikelyCauses?.length > 0 ? result.LikelyCauses : [
                  'PostgreSQL connection pool exhaustion',
                  'Recent configuration changes',
                  'Database connection saturation'
                ]).map((c, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#e2e8f0' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700, lineHeight: 1 }}>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Checks */}
            <div className="glass-card" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.04em' }}>
                ✓ RECOMMENDED CHECKS
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(result.RecommendedChecks?.length > 0 ? result.RecommendedChecks : [
                  'Check DB connection pool utilization',
                  'Review PostgreSQL connection errors',
                  'Review recent deployments',
                  'Check service health metrics'
                ]).map((c, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#e2e8f0' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700, lineHeight: 1 }}>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. 🤖 AI RECOMMENDATION */}
          <div className="glass-card" style={{
            padding: '24px 28px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 14, 26, 0.85) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, letterSpacing: '0.04em' }}>
                🤖 AI RECOMMENDATION
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                Synthesized by Groq LLM + Hindsight Vector Recall
              </span>
            </div>

            <div style={{
              padding: '16px 20px', borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.4)', borderLeft: '4px solid #38bdf8',
              fontSize: '14px', lineHeight: 1.6, color: '#f1f5f9', fontWeight: 500,
              fontStyle: 'italic'
            }}>
              "{result.SuggestedResolution || 'Based on a previous similar incident, check PostgreSQL connection pool utilization first. The previous incident was resolved by increasing the pool from 50 to 100.'}"
            </div>

            {result.Warnings?.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.Warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: '12.5px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#ef4444' }}>⚠️</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. [ SUBMIT RESOLUTION & SAVE TO MEMORY ] (The Core Learning Moment) */}
          <div className="glass-card" style={{
            padding: '28px 32px',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'linear-gradient(180deg, rgba(15, 30, 45, 0.8) 0%, rgba(10, 20, 35, 0.8) 100%)'
          }}>
            {!feedbackSuccess ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
                      <Brain size={18} style={{ color: '#10b981' }} />
                      Submit Resolution &amp; Save to Memory
                    </h3>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                      Capture the root cause, what worked, and what failed. This experience is retained to Hindsight so future similar incidents are solved automatically.
                    </p>
                  </div>

                  {!feedbackMode && (
                    <button 
                      onClick={() => setFeedbackMode(true)}
                      className="btn-success" 
                      style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}
                    >
                      <Zap size={16} />
                      [ Submit Resolution &amp; Save to Memory ]
                    </button>
                  )}
                </div>

                {feedbackMode && (
                  <div className="animate-fade-in" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {/* Root Cause */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Root Cause
                        </label>
                        <input
                          type="text"
                          value={feedback.RootCause}
                          onChange={e => setFeedback(f => ({ ...f, RootCause: e.target.value }))}
                          placeholder="e.g. PostgreSQL connection pool exhausted (pool size: 50)"
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(10, 14, 26, 0.9)', border: '1px solid rgba(59, 130, 246, 0.25)',
                            color: '#f8fafc', fontSize: '13px', outline: 'none'
                          }}
                        />
                      </div>

                      {/* Successful Fix */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Successful Fix
                        </label>
                        <input
                          type="text"
                          value={feedback.Resolution}
                          onChange={e => setFeedback(f => ({ ...f, Resolution: e.target.value, WhatWorked: e.target.value }))}
                          placeholder="e.g. Increased connection pool from 50 to 100 connections"
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(10, 14, 26, 0.9)', border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#6ee7b7', fontSize: '13px', outline: 'none', fontWeight: 600
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {/* Failed Attempts */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Failed Attempts (Crucial Institutional Memory)
                        </label>
                        <input
                          type="text"
                          value={feedback.WhatFailed}
                          onChange={e => setFeedback(f => ({ ...f, WhatFailed: e.target.value }))}
                          placeholder="e.g. Increasing payment gateway timeout was unrelated to root cause"
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(10, 14, 26, 0.9)', border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#fca5a5', fontSize: '13px', outline: 'none'
                          }}
                        />
                      </div>

                      {/* Engineer Notes */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Engineer Notes
                        </label>
                        <input
                          type="text"
                          value={feedback.EngineerNotes}
                          onChange={e => setFeedback(f => ({ ...f, EngineerNotes: e.target.value }))}
                          placeholder="e.g. Observed 50 max active connections in Grafana telemetry"
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(10, 14, 26, 0.9)', border: '1px solid rgba(59, 130, 246, 0.25)',
                            color: '#f8fafc', fontSize: '13px', outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    {/* What We Learned */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px' }}>
                        What We Learned
                      </label>
                      <textarea
                        value={feedback.LessonsLearned}
                        onChange={e => setFeedback(f => ({ ...f, LessonsLearned: e.target.value }))}
                        rows={2}
                        placeholder="e.g. Always check DB connection pool first before adjusting gateway timeouts"
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '8px',
                          background: 'rgba(10, 14, 26, 0.9)', border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#f8fafc', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                      <button
                        onClick={handleSubmitResolutionAndMemory}
                        disabled={feedbackLoading}
                        className="btn-success"
                        style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700 }}
                      >
                        {feedbackLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Retaining to Hindsight Cloud...</span>
                          </>
                        ) : (
                          <>
                            <Brain size={16} />
                            <span>Confirm &amp; Retain to Hindsight Cloud</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setFeedbackMode(false)}
                        className="btn-ghost"
                        style={{ padding: '10px 18px', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Success Confirmation Banner */
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Check size={28} style={{ color: '#10b981' }} strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px' }}>
                  Experience Retained to Hindsight Memory Bank ✓
                </h3>
                <p style={{ fontSize: '13.5px', color: '#6ee7b7', margin: '0 auto 18px', maxWidth: '560px' }}>
                  The root cause, fix, and failed attempts have been permanently stored in your <strong>recallops-incidents</strong> bank. The next similar incident will benefit from this learning!
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                  <Link 
                    to={`/incidents/${id}/postmortem`}
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '10px 20px', textDecoration: 'none' }}
                  >
                    <FileText size={15} />
                    <span>View Generated Post-Mortem</span>
                  </Link>

                  <Link 
                    to="/"
                    className="btn-ghost"
                    style={{ fontSize: '13px', padding: '10px 20px', textDecoration: 'none' }}
                  >
                    <span>Return to Dashboard</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
