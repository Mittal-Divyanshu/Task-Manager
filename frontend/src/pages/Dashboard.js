import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, color, icon }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 28, fontFamily: 'Syne', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  </div>
);

const priorityColor = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', urgent: 'var(--red)' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 80 }}><div className="spinner" /></div>;

  const stats = data?.stats || {};
  const isOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text2)' }}>Here's what's happening across your projects.</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Tasks" value={stats.total || 0} color="var(--accent)" icon="📋" />
        <StatCard label="In Progress" value={stats.inProgress || 0} color="var(--blue)" icon="🔄" />
        <StatCard label="Completed" value={stats.done || 0} color="var(--green)" icon="✅" />
        <StatCard label="Overdue" value={stats.overdue || 0} color="var(--red)" icon="⚠️" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* My Tasks */}
        <div className="card">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📌</span> My Tasks
          </h3>
          {data?.myTasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No tasks assigned to you yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.myTasks?.map(task => (
                <div key={task._id} style={{ padding: '12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{task.project?.name}</div>
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: priorityColor[task.priority] || 'var(--text3)', flexShrink: 0, marginTop: 4 }} title={task.priority} />
                  </div>
                  {task.dueDate && (
                    <div style={{ fontSize: 12, marginTop: 6, color: isOverdue(task) ? 'var(--red)' : 'var(--text3)' }}>
                      {isOverdue(task) ? '⚠️ ' : '📅 '}Due {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects overview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>📁</span> Projects</h3>
            <Link to="/projects" style={{ fontSize: 13, color: 'var(--accent)' }}>View all →</Link>
          </div>
          {data?.projects?.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No projects yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.projects?.slice(0, 5).map(project => (
                <Link key={project._id} to={`/projects/${project._id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', transition: 'border-color 0.15s' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color || 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, flex: 1 }}>{project.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Overall Progress</h3>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>{Math.round((stats.done / stats.total) * 100)}%</span>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden', height: 10, display: 'flex' }}>
            {[
              { width: (stats.done / stats.total) * 100, color: 'var(--green)' },
              { width: (stats.review / stats.total) * 100, color: 'var(--yellow)' },
              { width: (stats.inProgress / stats.total) * 100, color: 'var(--blue)' },
              { width: (stats.todo / stats.total) * 100, color: 'var(--border)' },
            ].map((seg, i) => (
              <div key={i} style={{ width: `${seg.width}%`, background: seg.color, transition: 'width 0.5s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
            {[
              { label: 'Done', color: 'var(--green)', count: stats.done },
              { label: 'Review', color: 'var(--yellow)', count: stats.review },
              { label: 'In Progress', color: 'var(--blue)', count: stats.inProgress },
              { label: 'To Do', color: 'var(--border)', count: stats.todo }
            ].map(({ label, color, count }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {label} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
