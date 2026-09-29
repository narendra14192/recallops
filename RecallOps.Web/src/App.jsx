import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateIncident from './pages/CreateIncident';
import IncidentDetail from './pages/IncidentDetail';
import Investigation from './pages/Investigation';
import MemoryTimeline from './pages/MemoryTimeline';
import MemorySearch from './pages/MemorySearch';
import PostMortem from './pages/PostMortem';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidents/create" element={<CreateIncident />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="incidents/:id/investigate" element={<Investigation />} />
            <Route path="incidents/:id/postmortem" element={<PostMortem />} />
            <Route path="memory" element={<MemoryTimeline />} />
            <Route path="memory/search" element={<MemorySearch />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
