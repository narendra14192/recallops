import { useState } from 'react';
import { Brain, Search as SearchIcon, Loader, X } from 'lucide-react';
import { memoryApi } from '../api';

export default function MemorySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await memoryApi.search(query);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLE_QUERIES = [
    'Payment API 502 bad gateway',
    'JWT authentication failure',
    'database connection pool',
    'Redis memory exhaustion',
    'queue consumer stopped',
    'API Gateway timeout',
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Brain size={24} style={{ color: '#8b5cf6' }} />
          Memory Search
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Search the Hindsight memory bank for historical incidents and solutions</p>
      </div>

      {/* Search box */}
      <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <SearchIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Payment API 502 connection pool"
              style={{
                width: '100%', padding: '12px 40px 12px 42px', fontSize: '14px',
                background: 'rgba(10, 14, 26, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px', color: '#e2e8f0', outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setResults(null); }}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !query.trim()}>
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <SearchIcon size={16} />}
            Search
          </button>
        </div>
      </form>

      {/* Example queries */}
      {!results && !loading && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Try searching for:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {EXAMPLE_QUERIES.map(q => (
              <button key={q} onClick={() => { setQuery(q); handleSearch(); }}
                style={{
                  padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                  background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(59, 130, 246, 0.2)'; e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(59, 130, 246, 0.1)'; e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)'; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            {results.count === 0 ? 'No memories found for this query.' : `Found ${results.count} relevant memory record${results.count !== 1 ? 's' : ''}`}
          </div>

          {results.count === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <Brain size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '14px' }}>No historical incidents matching this query.</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>The memory bank may be empty. Try seeding with <strong>Seed Memory</strong>.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.results?.map((mem, i) => (
                <div key={i} className="glass-card animate-slide-up" style={{ padding: '20px', animationDelay: `${i * 0.08}s` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{mem.DocumentId}</span>
                      {mem.Tags?.length > 0 && mem.Tags.map(tag => (
                        <span key={tag} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                      background: mem.Score > 0.7 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: mem.Score > 0.7 ? '#6ee7b7' : '#93c5fd',
                      border: `1px solid ${mem.Score > 0.7 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                    }}>
                      {Math.round(mem.Score * 100)}% relevance
                    </div>
                  </div>
                  <pre style={{
                    whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px',
                    color: '#94a3b8', margin: 0, lineHeight: 1.6
                  }}>
                    {mem.Content}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
