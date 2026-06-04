@AGENTS.md

# PropFlow CRM

Real estate CRM for managing leads, tasks, pipeline, listings, and reporting.
Deployed at: https://real-estate-crm-olive.vercel.app

## Stack
- Next.js 16 (App Router, server + client components)
- React 19, TypeScript
- Supabase — auth, PostgreSQL database, Realtime subscriptions
- Tailwind CSS 4
- Lucide React icons
- Deployed on Vercel (auto-deploys on push to `main`)

## Key files
- `lib/types.ts` — all TypeScript interfaces (Lead, Task, GlobalTask, LeadNote, etc.)
- `lib/utils.ts` — constants: LEAD_SOURCES, LEAD_TYPES, LEAD_STATUSES, NOTE_TYPES, PIPELINE_TYPES, color helpers, formatters
- `app/(dashboard)/layout.tsx` — authenticated layout, wraps all dashboard pages
- `components/layout/Sidebar.tsx` — nav for admin (all pages) and agent (CRM, Tasks, Calendar, Listings)

## Pages (`app/(dashboard)/`)
| Route | File | Notes |
|-------|------|-------|
| /dashboard | dashboard/page.tsx | Admin only, server component |
| /crm | crm/page.tsx | Lead list, server component |
| /crm/[id] | crm/[id]/page.tsx | Lead profile, server component |
| /tasks | tasks/page.tsx | Tasks page, server component |
| /calendar | calendar/page.tsx | Calendar, server component |
| /listings | listings/page.tsx | Listings (MIBOR placeholder) |
| /reporting | reporting/page.tsx | Live stats from Supabase |
| /sales | sales/page.tsx | Kanban pipeline |
| /automations | automations/page.tsx | Smart Plans |
| /settings | settings/page.tsx | System settings |

## Components
- `components/crm/LeadsTable.tsx` — sortable, filterable leads table (client)
- `components/crm/LeadProfile.tsx` — tabbed lead detail: Overview, Notes (w/ type selector), Tasks, Smart Plans, Activity (client)
- `components/crm/AddLeadButton.tsx` — add lead modal with pipeline toggle (client)
- `components/dashboard/DashboardTasks.tsx` — 4-panel task widget with Supabase Realtime (client)
- `components/tasks/TasksView.tsx` — full tasks page with realtime sync (client)
- `components/calendar/CalendarView.tsx` — monthly calendar with day panel and realtime sync (client)
- `components/reporting/ReportingView.tsx` — charts and KPIs (client)

## Architecture patterns
- **Server components** fetch initial data from Supabase, pass as props to client components
- **Client components** use `router.refresh()` after mutations to revalidate server data
- **Realtime sync**: DashboardTasks, TasksView, CalendarView all subscribe to `postgres_changes` on the `tasks` table — completing a task anywhere updates all open pages instantly
- **Auth**: Supabase Auth; roles are `admin`, `agent`, `assistant` stored in `profiles` table
- **DB queries use `users` table** in most pages (legacy alias) but layout uses `profiles` — both work

## Database
- Supabase project ID: `bnliuvmylxafggxacihl`
- Apply schema changes via Supabase MCP tool (`apply_migration`), not manually
- Migrations in `supabase/migrations/` (numbered SQL files)
- Realtime is enabled on `tasks` and `lead_notes` tables

## Key DB tables
| Table | Purpose |
|-------|---------|
| profiles | Users (extends auth.users), has `role` field |
| leads | Core lead records; has `pipeline_type` (company/personal) |
| lead_notes | Notes on leads; has `note_type` (call/text/email/showing/doc/note) |
| tasks | Tasks; `lead_id` nullable (standalone tasks allowed) |
| lead_activity | Activity log / timeline |
| lead_tags / tags | Tag system |
| smart_plan_enrollments | Automation enrollments |

## Lead Sources (LEAD_SOURCES in utils.ts)
Facebook Page, Call In, Email, Open House, Other, Past Client, Personal, Referral, Veterans United, Website, Zillow

## Do not
- Push to Vercel without user approval (unless explicitly told to push)
- Modify the lawn-saas project — it is a separate Vercel project
- Add `created_by_id` to task inserts (column does not exist in schema)
- Wrap the dashboard layout with providers without reading layout.tsx first
