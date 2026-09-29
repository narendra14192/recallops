export function getSeverityDot(severity) {
  const map = {
    Critical: '🔴',
    High: '🔴',
    Medium: '🟡',
    Low: '🟢',
  };
  return map[severity] || '⚪';
}

export function getSeverityClass(severity) {
  const map = {
    Critical: 'severity-critical',
    High: 'severity-high',
    Medium: 'severity-medium',
    Low: 'severity-low',
  };
  return map[severity] || 'severity-low';
}

export function getStatusClass(status) {
  const map = {
    Investigating: 'status-investigating',
    Monitoring: 'status-monitoring',
    Resolved: 'status-resolved',
  };
  return map[status] || '';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDuration(start, end) {
  if (!end) return 'Ongoing';
  const ms = new Date(end) - new Date(start);
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function getEventIcon(type) {
  const icons = {
    created: '📋',
    analysis_started: '🔍',
    memory_search: '🧠',
    memory_found: '✨',
    memory_not_found: '⭕',
    memory_fallback: '⚠️',
    memory_error: '❌',
    llm_analysis: '🤖',
    analysis_complete: '✅',
    analysis_error: '❌',
    resolved: '✅',
    feedback_saved: '💾',
    memory_stored: '🧬',
    memory_store_error: '❌',
  };
  return icons[type] || '📌';
}
