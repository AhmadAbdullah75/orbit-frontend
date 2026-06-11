<div align="center">

# 🛸 Orbit

### Production-grade SaaS Project Management Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-6366f1?style=for-the-badge)](https://orbit-frontend-app.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

**Live Demo:** https://orbit-frontend-app.vercel.app

</div>

---

## What is Orbit?

Orbit is a full-stack SaaS project management platform built for teams. It provides Kanban-style workflow management with real-time collaboration, multi-organization support, and role-based access control — inspired by Jira, Linear, and ClickUp.

---

## Features

- Kanban board with drag-and-drop (desktop + mobile touch)
- Real-time notifications via Socket.io (zero page refresh)
- Multi-organization workspaces with instant switching
- 3-tier RBAC — Owner, Admin, Member
- Email invitations with 30-day expiry tokens
- Google OAuth sign-in
- Analytics dashboard with completion rates and contributor output
- Global task view across all projects with filters
- File uploads via Cloudinary (avatars + attachments)
- Forgot password with email reset link
- Dark and light theme with animated gradient backgrounds
- Fully responsive — mobile-first with touch drag-and-drop
- Real-time optimistic UI updates

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Framework | React 19 + Vite 7 |
| State | Redux Toolkit + Redux Persist |
| Real-time | Socket.io-client |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Animations | Framer Motion |
| Rich Text | Tiptap |
| HTTP | Axios with interceptors |
| Icons | Material Symbols (self-hosted) |
| Routing | React Router DOM v6 |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/AhmadAbdullah75/orbit-frontend.git
cd orbit-frontend
npm install
```

### Environment Variables

Create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Run locally

```bash
npm run dev
# http://localhost:5173
```

### Build

```bash
npm run build
```

---

## Project Structure
src/
├── components/       # Reusable UI (OrbitLogo, Footer, EmptyOrg)
├── context/          # ThemeContext (dark/light)
├── hooks/            # useAutoRefresh
├── layouts/          # DashboardLayout (sidebar, header, bottom nav)
├── pages/            # Route pages (Dashboard, Board, Tasks...)
├── services/         # Axios instance with interceptors
├── store/            # Redux store + auth slice
└── utils/            # permissions.js (RBAC matrix)

---

## Role-Based Access Control

| Feature | Owner | Admin | Member |
|---|---|---|---|
| Create Project | Yes | Yes | No |
| Invite Members | Yes | Yes | No |
| Change Roles | Yes | Yes (others only) | No |
| Delete Organization | Yes | No | No |
| Create Tasks | Yes | Yes | Yes |
| View Analytics | Yes | Yes | Yes |

---

## Deployment

Deployed on **Vercel** free tier — permanent.

Required `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Related

- Backend: https://github.com/AhmadAbdullah75/orbit-backend
- API Docs: https://orbit-backend-production-76bf.up.railway.app/api/docs

---

## Author

**Ahmad Abdullah**
iamahmad3027@gmail.com | [GitHub](https://github.com/AhmadAbdullah75/orbit-frontend)

---

<div align="center">Built with React, Node.js, MongoDB and Socket.io</div>
