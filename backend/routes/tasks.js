const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Helper: check project membership
const checkProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', project: null };
  const isMember = project.owner.toString() === userId.toString() ||
    project.members.some(m => m.user.toString() === userId.toString());
  return { project, isMember };
};

// GET /api/tasks?project=:id — tasks for a project
router.get('/', async (req, res) => {
  try {
    const { project, status, assignee, priority } = req.query;
    
    // Dashboard: get all tasks for user's projects
    if (!project) {
      const userProjects = await Project.find({
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
      }).select('_id');
      const projectIds = userProjects.map(p => p._id);

      const filter = { project: { $in: projectIds } };
      if (status) filter.status = status;
      if (assignee) filter.assignee = assignee;
      if (priority) filter.priority = priority;

      const tasks = await Task.find(filter)
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email')
        .populate('project', 'name color')
        .sort({ createdAt: -1 });
      return res.json({ success: true, data: tasks });
    }

    const { project: proj, isMember } = await checkProjectAccess(project, req.user._id);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const filter = { project };
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/dashboard — summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).select('_id name color');
    const projectIds = userProjects.map(p => p._id);

    const now = new Date();
    const [total, todo, inProgress, review, done, overdue, myTasks] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'todo' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'in-progress' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'review' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'done' }),
      Task.countDocuments({ project: { $in: projectIds }, dueDate: { $lt: now }, status: { $ne: 'done' } }),
      Task.find({ assignee: req.user._id, status: { $ne: 'done' } })
        .populate('project', 'name color')
        .sort({ dueDate: 1 })
        .limit(5)
    ]);

    res.json({
      success: true,
      data: {
        stats: { total, todo, inProgress, review, done, overdue },
        myTasks,
        projects: userProjects
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks — create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('project').notEmpty().withMessage('Project ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { title, description, project, assignee, priority, dueDate, status, tags } = req.body;

    const { project: proj, isMember } = await checkProjectAccess(project, req.user._id);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const task = await Task.create({
      title, description, project, assignee: assignee || null,
      priority, dueDate, status, tags,
      createdBy: req.user._id
    });

    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const { project: proj, isMember } = await checkProjectAccess(task.project, req.user._id);
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const { title, description, assignee, status, priority, dueDate, tags } = req.body;
    Object.assign(task, {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(assignee !== undefined && { assignee }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(dueDate !== undefined && { dueDate }),
      ...(tags && { tags })
    });

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const { project: proj, isMember } = await checkProjectAccess(task.project, req.user._id);
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const isOwnerOrAdmin = task.createdBy.toString() === req.user._id.toString() || req.user.role === 'admin';
    if (!isOwnerOrAdmin) return res.status(403).json({ success: false, message: 'Not authorized to delete this task.' });

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
