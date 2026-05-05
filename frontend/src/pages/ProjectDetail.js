import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getTasks, createTask, updateTask, deleteTask, getUsers, addMember, removeMember } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const STATUS_LABELS = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done' };
const STATUS_COLORS = { 'todo': 'var(--text3)', 'in-progress': 'var(--blue)', 'review': 'var(--yellow)', 'done': 'var(--green)' };
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLORS = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', urgent: 'var(--red)' };

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, cursor: 'pointer' }}
      onClick={() => onEdit(task)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] || 'var(--text3)', marginTop: 4, flexShrink: 0 }} />
        <button onClick={e => { e.stopPropagation(); onDelete(task._id); }}
          style={{ background: 'none', color: 'var(--text3)', fontSize: 14, padding: '2px 6px', borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>✕</button>
      </div>
      <div style={{ fontWeight: 500, marginBottom: 6, paddingRight: 4, lineHeight: 1.4 }}>{task.title}</div>
      {task.description && <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {task.assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{task.assignee.name[0].toUpperCase()}</div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : <span style={{ fontSize: 11, color: 'var(--text3)' }}>Unassigned</span>}
        {task.dueDate && <span style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--text3)' }}>{isOverdue ? '⚠️ ' : ''}{new Date(task.dueDate).toLocaleDateString()}</span>}
      </div>
      {/* Quick status change */}
      <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
        {STATUSES.filter(s => s !== task.status).map(s => (
          <button key={s} onClick={e => { e.stopPropagation(); onStatusChange(task._id, s); }}
            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg2)', border: '1px solid var(--border)', color: STATUS_COLORS[s], cursor: 'pointer' }}>
            → {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: '' });
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isProjectAdmin = useCallback(() => {
    if (!project || !user) return false;
    if (project.owner?._id === user._id) return true;
    const m = project.members?.find(m => m.user?._id === user._id);
    return m?.role === 'admin' || user.role === 'admin';
  }, [project, user]);

  const load = useCallback(async () => {
    try {
      const [pRes, tRes, uRes] = await Promise.all([getProject(id), getTasks({ project: id }), getUsers()]);
      setProject(pRes.data.data);
      setTasks(tRes.data.data);
      setUsers(uRes.data.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: '' });
    setError('');
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title, description: task.description || '',
      assignee: task.assignee?._id || '', status: task.status,
      priority: task.priority, dueDate: task.dueDate ? task.dueDate.substring(0, 10) : ''
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editingTask) {
        await updateTask(editingTask._id, { ...taskForm, project: id, assignee: taskForm.assignee || null });
      } else {
        await createTask({ ...taskForm, project: id, assignee: taskForm.assignee || null });
      }
      setShowTaskModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task.');
    } finally { setSaving(false); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try { await deleteTask(taskId); load(); } catch (err) { alert('Failed to delete task.'); }
  };

  const handleStatusChange = async (taskId, status) => {
    try { await updateTask(taskId, { status }); load(); } catch (err) { alert('Failed to update status.'); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await addMember(id, memberForm);
      setShowMemberModal(false);
      setMemberForm({ userId: '', role: 'member' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member.');
    } finally { setSaving(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try { await removeMember(id, userId); load(); } catch (err) { alert('Failed to remove member.'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  if (!project) return null;

  const tasksByStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s) }), {});
  const nonMembers = users.filter(u => !project.members?.some(m => m.user?._id === u._id));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button onClick={() => navigate('/projects')} style={{ background: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>← Projects</button>
          <span style={{ color: 'var(--text3)' }}>/</span>
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>{project.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color }} />
              <h1 style={{ fontSize: 24 }}>{project.name}</h1>
            </div>
            {project.description && <p style={{ color: 'var(--text2)' }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isProjectAdmin() && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setError(''); setShowMemberModal(true); }}>+ Member</button>
            )}
            <button className="btn btn-primary btn-sm" onClick={openCreateTask}>+ Task</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[['board', 'Board'], ['list', 'List'], ['members', `Members (${project.members?.length || 0})`]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', background: 'none', color: activeTab === tab ? 'var(--text)' : 'var(--text3)',
            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: activeTab === tab ? 600 : 400, marginBottom: -1, transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {/* Board view */}
      {activeTab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
          {STATUSES.map(status => (
            <div key={status}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 10 }}>{tasksByStatus[status].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 60 }}>
                {tasksByStatus[status].map(task => (
                  <TaskCard key={task._id} task={task} onEdit={openEditTask} onDelete={handleDeleteTask} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks yet. Create the first one!</p></div>
          ) : tasks.map(task => (
            <div key={task._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => openEditTask(task)}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
              <div style={{ flex: 1, fontWeight: 500 }}>{task.title}</div>
              <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 80, textAlign: 'right' }}>{task.assignee?.name || '—'}</span>
              {task.dueDate && <span style={{ fontSize: 12, color: new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'var(--red)' : 'var(--text3)', minWidth: 90, textAlign: 'right' }}>{new Date(task.dueDate).toLocaleDateString()}</span>}
              <button onClick={e => { e.stopPropagation(); handleDeleteTask(task._id); }} style={{ background: 'none', color: 'var(--text3)', fontSize: 14, padding: '4px' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div style={{ maxWidth: 600 }}>
          {project.members?.map(({ user: member, role }) => (
            <div key={member?._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div className="avatar">{member?.name?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{member?.name} {member?._id === project.owner?._id && <span style={{ fontSize: 11, color: 'var(--accent)' }}>Owner</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{member?.email}</div>
              </div>
              <span style={{ fontSize: 12, color: role === 'admin' ? 'var(--accent)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{role}</span>
              {isProjectAdmin() && member?._id !== project.owner?._id && member?._id !== user._id && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRemoveMember(member._id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-backdrop" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'Edit Task' : 'New Task'}</h3>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Title *</label>
                <input placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} placeholder="Details..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select value={taskForm.assignee} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members?.map(({ user: m }) => m && <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingTask ? 'Update' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="modal-backdrop" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Add Member</h3>
              <button className="modal-close" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>Select User</label>
                <select value={memberForm.userId} onChange={e => setMemberForm({ ...memberForm, userId: e.target.value })} required>
                  <option value="">Choose user...</option>
                  {nonMembers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !memberForm.userId}>{saving ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
