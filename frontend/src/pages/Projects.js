import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#7c6af5', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#f97316', '#ec4899', '#14b8a6'];

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', dueDate: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getProjects().then(res => setProjects(res.data.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await createProject(form);
      setShowModal(false);
      setForm({ name: '', description: '', dueDate: '', color: COLORS[0] });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try { await deleteProject(id); load(); } catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
  };

  const progress = (p) => p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Projects</h1>
          <p style={{ color: 'var(--text2)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <h3>No projects yet</h3>
          <p>{user?.role === 'admin' ? 'Create your first project to get started.' : 'You haven\'t been added to any projects yet.'}</p>
          {user?.role === 'admin' && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Project</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {projects.map(project => (
            <Link key={project._id} to={`/projects/${project._id}`}
              style={{ textDecoration: 'none', display: 'block', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, transition: 'border-color 0.15s, transform 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = project.color || 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${project.color || '#7c6af5'}20`, border: `1px solid ${project.color || '#7c6af5'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  📁
                </div>
                {user?.role === 'admin' && project.owner?._id === user._id && (
                  <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(project._id, e)}
                    style={{ color: 'var(--red)', borderColor: 'transparent', padding: '4px 8px' }}>✕</button>
                )}
              </div>

              <h3 style={{ marginBottom: 6, fontSize: 16 }}>{project.name}</h3>
              {project.description && <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>}

              {/* Progress */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                  <span>{project.taskCount || 0} tasks</span>
                  <span style={{ color: project.color }}>{progress(project)}%</span>
                </div>
                <div style={{ background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                  <div style={{ width: `${progress(project)}%`, background: project.color || 'var(--accent)', height: '100%', transition: 'width 0.5s', borderRadius: 4 }} />
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: project.color }}>{project.owner?.name?.[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{project.members?.length || 0} members</span>
                </div>
                {project.dueDate && (
                  <span style={{ fontSize: 12, color: new Date(project.dueDate) < new Date() ? 'var(--red)' : 'var(--text3)' }}>
                    {new Date(project.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Project</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Name *</label>
                <input placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} placeholder="What's this project about?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '3px solid transparent', outline: form.color === c ? `2px solid ${c}` : 'none', transition: 'all 0.15s' }} />
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
