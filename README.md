# PropFlow CRM

A modern real estate CRM inspired by Lofty/Chime, built with Next.js, Supabase, and Tailwind CSS.

## Features

- **CRM** — Lead database, profiles, notes, tasks, tags, smart plan assignments
- **Sales Pipeline** — Drag-and-drop Kanban with 9 stages and deal value tracking
- **Automations (Smart Plans)** — Multi-step workflows with 11 step types and 5 triggers

## Tech Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth)
- @dnd-kit for drag-and-drop
- Vercel-ready deployment

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in Supabase credentials
npm run dev
```

Run `supabase/migrations/001_schema.sql` and `supabase/migrations/002_seed.sql` in your Supabase SQL editor.

## Demo Login

Create a user in Supabase Auth → Users:
- Email: `admin@propflow.com`
- Password: `password123`

## Deploy

Push to GitHub, connect to Vercel, set env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
