import { Brain, ArrowRight, Zap, Database, ChevronRight } from 'lucide-react';

// Before/After comparison data
const BEFORE = {
  label: 'Before Learning (No Memory)',
  color: '#64748b',
  items: [
    '🔍 Likely causes: Service unavailability, Network issues, Upstream errors',
    '📋 Check: Service health metrics, Error logs, Recent deployments',
    '💡 Suggestion: Review infrastructure logs and escalate to on-call team',
    '📊 Confidence: 25% | 🧠 Memory Used: No'
  ]
};

const AFTER = {
  label: 'After Learning INC-1042 (With Memory)',
  color: '#10b981',
  items: [
    '🧠 Similar incident: INC-1042 (91% match) — Payment API, same environment',
    '🎯 Root cause: PostgreSQL connection pool exhaustion (pool size: 50)',
    '✅ Resolution: Increased connection pool from 50 to 100 — WORKED',
    '⚠️ Warning: Gateway timeout increase was unrelated to root cause — DO NOT TRY',
    '📊 Confidence: 91% | 🧠 Memory Used: Yes'
  ]
};

const TIMELINE_STEPS = [
  {
    icon: '🚨',
    title: 'Incident Created',
    desc: 'INC-1042: Payment API 502 Bad Gateway. Engineer reports high error rate.',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.3)',
    side: 'left'
  },
  {
    icon: '🧠',
    title: 'RecallOps Investigates',
    desc: 'Searches Hindsight memory bank. First time — no relevant history found.',
    color: '#64748b',
    glow: 'rgba(100, 116, 139, 0.3)',
    side: 'right'
  },
  {
    icon: '🔧',
    title: 'Root Cause Identified',
    desc: 'PostgreSQL connection pool exhausted (50 connections). Recent change: gateway timeout increased.',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)',
    side: 'left'
  },
  {
    icon: '✅',
    title: 'Incident Resolved',
    desc: 'Pool size increased from 50 → 100. Gateway timeout was unrelated — wasted 20 min.',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.3)',
    side: 'right'
  },
  {
    icon: '💬',
    title: 'Engineer Feedback',
    desc: 'What worked: pool increase. What failed: gateway timeout change. Lesson: check DB pool first.',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.3)',
    side: 'left'
  },
  {
    icon: '🧬',
    title: 'Memory Stored in Hindsight',
    desc: 'Full experience (root cause, resolution, failed attempts, lesson) retained to memory bank.',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.3)',
    side: 'right'
  },
  {
    icon: '🔴',
    title: 'New Incident: INC-1087',
    desc: 'Payment API 502 again! Recent change: payment gateway timeout increased.',
    color: '#ef4444',
    glow: 'rgba(239, 68, 38, 0.3)',
    side: 'left'
  },
  {
    icon: '⚡',
    title: 'Memory Recalled',
    desc: '91% similarity match found! INC-1042 retrieved from Hindsight with full context.',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.4)',
    side: 'right'
  },
  {
    icon: '🎯',
    title: 'Improved Recommendation',
    desc: 'Check PostgreSQL connection pool first. Avoid gateway timeout changes. Confidence: 91%.',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    side: 'left'
  },
];

export default function MemoryTimeline() {
  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Brain size={28} style={{ color: '#8b5cf6' }} />
          Memory Timeline
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          How RecallOps learns from every incident and uses that knowledge to resolve the next one faster.
        </p>
      </div>

      {/* Core loop banner */}
      <div style={{
        padding: '16px 24px', borderRadius: '12px', marginBottom: '40px',
        background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        flexWrap: 'wrap', fontSize: '13px', fontWeight: 600
      }}>
        {['Incident', 'Recall', 'Investigate', 'Resolve', 'Learn', 'Remember', 'Improve'].map((step, i, arr) => (
          <>
            <span key={step} style={{ color: i === 0 || i === arr.length - 1 ? '#60a5fa' : '#94a3b8' }}>{step}</span>
            {i < arr.length - 1 && <ChevronRight key={`arrow-${i}`} size={14} style={{ color: '#3b82f6' }} />}
          </>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '60px', marginBottom: '48px' }}>
        {/* Center line */}
        <div style={{
          position: 'absolute', left: '29px', top: 0, bottom: 0, width: '2px',
          background: 'linear-gradient(to bottom, #3b82f6, rgba(59, 130, 246, 0.1))'
        }} />

        {TIMELINE_STEPS.map((step, i) => (
          <div key={i} className="animate-slide-left" style={{
            display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px',
            animationDelay: `${i * 0.1}s`
          }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: '10px',
              width: 40, height: 40, borderRadius: '50%',
              background: `rgba(${step.color === '#ef4444' ? '239,68,68' : step.color === '#10b981' ? '16,185,129' : step.color === '#f59e0b' ? '245,158,11' : step.color === '#8b5cf6' ? '139,92,246' : step.color === '#3b82f6' ? '59,130,246' : '100,116,139'}, 0.15)`,
              border: `2px solid ${step.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
              boxShadow: `0 0 16px ${step.glow}`
            }}>
              {step.icon}
            </div>

            {/* Content */}
            <div className="glass-card" style={{ padding: '16px 20px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: step.color, marginBottom: '4px' }}>
                {step.title}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                {step.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Before / After comparison */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
          The Learning Moment
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Same incident. Same service. Completely different recommendations.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'stretch' }}>
          {/* Before */}
          <div className="glass-card" style={{ padding: '24px', borderColor: 'rgba(100, 116, 139, 0.3)' }}>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
              🔴 {BEFORE.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {BEFORE.items.map((item, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', background: 'rgba(100, 116, 139, 0.05)' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Brain size={32} style={{ color: '#8b5cf6' }} />
            <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center' }}>Hindsight<br/>Memory</div>
            <ArrowRight size={24} style={{ color: '#3b82f6' }} />
          </div>

          {/* After */}
          <div className="glass-card" style={{ padding: '24px', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '12px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
              🟢 {AFTER.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {AFTER.items.map((item, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '2px solid rgba(16, 185, 129, 0.3)' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        textAlign: 'center', padding: '32px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05))',
        border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '16px'
      }}>
        <Brain size={40} style={{ color: '#8b5cf6', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
          "Remember the incident. Learn the solution. Solve the next one smarter."
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          RecallOps — AI Incident Response with Hindsight-powered memory
        </p>
      </div>
    </div>
  );
}
