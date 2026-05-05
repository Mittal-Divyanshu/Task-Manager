# ⚡ TaskFlow — Team Task Manager

A full-stack web application for managing projects, assigning tasks, and tracking progress with role-based access control (Admin/Member).

---

## 🗂️ Project Structure

```
taskmanager/
├── backend/            # Node.js + Express + MongoDB API
│   ├── models/         # Mongoose schemas (User, Project, Task)
│   ├── routes/         # REST API routes
│   ├── middleware/      # JWT auth middleware
│   ├── server.js       # Entry point
│   └── package.json
└── frontend/           # React app
    ├── src/
    │   ├── pages/      # Login, Signup, Dashboard, Projects, ProjectDetail
    │   ├── components/ # Layout, Sidebar
    │   ├── context/    # AuthContext (JWT)
    │   └── utils/      # Axios API wrapper
    └── package.json
```

---

## ✅ Features Implemented

| Feature | Details |
|---|---|
| **Authentication** | JWT-based Signup/Login, protected routes |
| **Role-Based Access** | Admin: create/delete projects, manage members. Member: view & work on tasks |
| **Projects** | Create, view, delete projects with color labels and due dates |
| **Team Management** | Add/remove members per project, assign roles |
| **Task Management** | Create, edit, delete tasks with status, priority, assignee, due date |
| **Kanban Board** | Drag-through-buttons board view (To Do → In Progress → Review → Done) |
| **List View** | Table-style task list per project |
| **Dashboard** | Stats cards, my tasks, project list, overall progress bar |
| **Overdue Detection** | Tasks past due date highlighted in red |
| **Validations** | Server-side (express-validator) + client-side form validation |

---


### Step 1 — Clone & Setup Backend

```bash
cd taskmanager/backend
npm install
```

Create `.env` file (copy from `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/taskmanager
JWT_SECRET=any_long_random_string_here_32chars+
FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev       # Development (with nodemon)
# OR
npm start         # Production
```

Backend runs on: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

---

### Step 2 — Setup Frontend

```bash
cd taskmanager/frontend
npm install
```

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm start
```

Frontend runs on: `http://localhost:3000`

---

### Step 3 — Create First Admin User

1. Open `http://localhost:3000/signup`
2. Fill in name, email, password
3. Select role: **Admin**
4. Sign up → you're redirected to Dashboard

---

## 🌐 Railway Deployment (Step by Step)

### Step 1 — Prepare MongoDB Atlas

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free account
2. Create a free cluster (M0)
3. Database Access → Add user (username + password)
4. Network Access → Add `0.0.0.0/0` (allow all IPs)
5. Copy the connection string:
   `mongodb+srv://username:password@cluster.mongodb.net/taskmanager`

---

### Step 2 — Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → Sign up / Login
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub → select your repository
4. Railway auto-detects the Node.js app
5. Set **Root Directory** to `backend`
6. Add environment variables:

| Key | Value |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random secret string |
| `FRONTEND_URL` | Will set after frontend deploys |
| `NODE_ENV` | `production` |

7. Click **Deploy** — Railway gives you a URL like `https://taskmanager-backend.up.railway.app`

---

### Step 3 — Deploy Frontend on Railway

1. In Railway → **New Service** → **Deploy from same GitHub repo**
2. Set **Root Directory** to `frontend`
3. Add environment variables:

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | `https://YOUR-BACKEND-URL.up.railway.app/api` |

4. Click **Deploy** — Frontend URL: `https://taskmanager-frontend.up.railway.app`

---

### Step 4 — Update CORS

Go back to your **Backend** service environment variables and update:
```
FRONTEND_URL=https://YOUR-FRONTEND-URL.up.railway.app
```

Redeploy backend.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |

### Projects
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/api/projects` | Yes | Any |
| POST | `/api/projects` | Yes | Admin |
| GET | `/api/projects/:id` | Yes | Member+ |
| PUT | `/api/projects/:id` | Yes | Project Admin |
| DELETE | `/api/projects/:id` | Yes | Owner/Admin |
| POST | `/api/projects/:id/members` | Yes | Project Admin |
| DELETE | `/api/projects/:id/members/:userId` | Yes | Project Admin |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tasks?project=:id` | Yes | Tasks for project |
| GET | `/api/tasks/dashboard` | Yes | Dashboard stats |
| POST | `/api/tasks` | Yes | Create task |
| PUT | `/api/tasks/:id` | Yes | Update task |
| DELETE | `/api/tasks/:id` | Yes | Delete task |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Yes | List all users |
| PUT | `/api/users/:id/role` | Admin | Change user role |

---

## 🗄️ Database Schema

**User**: `name`, `email`, `password (hashed)`, `role (admin/member)`

**Project**: `name`, `description`, `owner (ref User)`, `members [{user, role}]`, `status`, `dueDate`, `color`

**Task**: `title`, `description`, `project (ref)`, `assignee (ref User)`, `createdBy (ref)`, `status (todo/in-progress/review/done)`, `priority (low/medium/high/urgent)`, `dueDate`, `tags`

---

## 🔒 Role-Based Access Summary

| Action | Admin | Member |
|---|---|---|
| Create project | ✅ | ❌ |
| Delete project | ✅ (owner) | ❌ |
| Add/remove members | ✅ (project admin) | ❌ |
| Create tasks | ✅ | ✅ (if project member) |
| Edit tasks | ✅ | ✅ (if project member) |
| Delete tasks | ✅ | Own tasks only |
| View dashboard | ✅ | ✅ |
| Change user roles | ✅ | ❌ |

---

## 🛠️ Tech Stack

**Backend**: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, express-validator

**Frontend**: React 18, React Router v6, Axios, Context API

**Deployment**: Railway (Backend + Frontend as separate services)
