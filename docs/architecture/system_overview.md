# System Architecture Overview

## Technologies
- **Frontend**: Next.js (Dashboard)
- **Backend**: Next.js API Routes
- **Bot**: Discord.js
- **Database**: PostgreSQL (via Prisma)
- **Monorepo**: TurboRepo

## Modules
### 1. Ticket System
- **Core**: `apps/bot/src/modules/tickets`
- **Dashboard**: `apps/dashboard/src/app/(dashboard)/dashboard/tickets`
- **Features**:
  - Multi-product support via Select Menu
  - Modal-based ticket creation
  - Rating system (1-5 stars + review)
  - Transcript generation (HTML)

### 2. Giveaway System
- **Core**: `apps/bot/src/modules/giveaway`
- **Dashboard**: `apps/dashboard/src/app/(dashboard)/dashboard/giveaway`
- **Logic**:
  - Cron-based scheduling (BullMQ/Agenda or custom scheduler)
  - Role/Invitation/Level requirements
  - Optimized chunk-based notification system

### 3. Template Engine
- **Core**: `apps/bot/src/lib/template.ts`
- **Usage**: Welcome, Goodbye, Level Up, Giveaway, Ticket messages
- **Formatting**: Supports `{{placeholder}}` replacement.

## Database Schema
Defined in `packages/database/prisma/schema.prisma`.
Key models: `GuildSettings`, `Ticket`, `TicketProduct`, `TicketRating`, `Giveaway`, `MessageTemplate`.
