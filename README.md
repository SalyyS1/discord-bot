# 🤖 SylaBot — Discord Bot Platform

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)

**Full-featured Discord bot with modern web dashboard & multi-tenant support**

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Commands](#-commands) • [Multi-Tenant](#-multi-tenant-mode)

</div>

---

## ✨ Features

### 🤖 Bot Modules

| Category | Features |
|----------|----------|
| **🛡️ Moderation** | Ban, Kick, Timeout, Warn, Purge, Anti-Spam, Anti-Link, Word Filter, Mention Spam |
| **📝 Logging** | Message logs, Moderation actions, Member events, Voice activity |
| **👋 Welcome** | Custom messages, Canvas images, Auto-role, Verification system |
| **🎮 Engagement** | XP/Leveling, Rank cards, Leaderboard, Suggestions, Giveaways |
| **🎫 Support** | Ticket system, Transcripts, Rating system, Multi-panel support |
| **🎤 Voice** | Join-to-Create channels, Custom controls, Permission management |
| **🎭 Roles** | Button roles, Reaction roles, Auto-responder, Sticky messages |

### 🖥️ Web Dashboard

- **Modern UI** — Glass-morphism design with dark theme
- **Real-time Sync** — Redis Pub/Sub for instant updates
- **Multi-language** — Vietnamese & English support
- **Secure Auth** — Better-Auth with session management

### 🏢 Multi-Tenant

- **Custom Bots** — Users can connect their own bot tokens
- **Database Isolation** — Separate PostgreSQL schemas per tenant
- **Encrypted Tokens** — AES-256-GCM encryption for security
- **Process Isolation** — Each bot runs in isolated process

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 22.0.0 |
| pnpm | ≥ 10.0.0 |
| PostgreSQL | ≥ 14 |
| Redis | ≥ 7 |

### Installation

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/discord-bot.git
cd discord-bot

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env  # Then edit .env with your values

# 4. Setup database
pnpm db:generate
pnpm db:push

# 5. Deploy slash commands
pnpm bot:deploy

# 6. Start development
pnpm dev
```

---

## ⚙️ Configuration

Create `.env` file in root directory:

```env
# ═══════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@localhost:5432/discord_bot"

# ═══════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════
REDIS_URL="redis://localhost:6379"

# ═══════════════════════════════════════════════
# DISCORD BOT
# ═══════════════════════════════════════════════
DISCORD_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"

# ═══════════════════════════════════════════════
# DASHBOARD (Optional)
# ═══════════════════════════════════════════════
BETTER_AUTH_SECRET="your_32_char_secret"
DASHBOARD_PORT=3000

# ═══════════════════════════════════════════════
# MULTI-TENANT (Optional)
# ═══════════════════════════════════════════════
TENANT_ENCRYPTION_KEY="your-32-char-minimum-secret"

# ═══════════════════════════════════════════════
# CLOUDFLARE R2 (Optional - for image uploads)
# ═══════════════════════════════════════════════
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

### Getting Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. **New Application** → Name it → **Create**
3. **Bot** tab → **Reset Token** → Copy
4. Enable **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Administrator`
6. Copy invite URL and add bot to server

---

## 📁 Project Structure

```
.
├── apps/
│   ├── bot/                    # Discord bot (discord.js)
│   │   └── src/
│   │       ├── commands/       # Slash commands
│   │       ├── events/         # Discord event handlers
│   │       ├── modules/        # Feature modules
│   │       └── services/       # Business logic
│   │
│   ├── dashboard/              # Web dashboard (Next.js 15)
│   │   └── src/
│   │       ├── app/            # App router pages
│   │       ├── components/     # React components
│   │       └── hooks/          # Custom hooks
│   │
│   └── manager/                # Bot process manager (multi-tenant)
│
├── packages/
│   ├── config/                 # Shared configuration
│   ├── database/               # Prisma schema & client
│   ├── security/               # Encryption utilities
│   └── types/                  # Shared TypeScript types
│
├── scripts/                    # Utility scripts
├── docker-compose.prod.yml     # Production Docker config
└── turbo.json                  # Turborepo configuration
```

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (Redis + Bot + Dashboard) |
| `pnpm bot:dev` | Start bot only (watch mode) |
| `pnpm dashboard:dev` | Start dashboard only |
| `pnpm build` | Build all apps for production |
| `pnpm bot:deploy` | Register slash commands |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript check |

---

## 🎯 Commands

<details>
<summary><strong>🛡️ Moderation</strong></summary>

| Command | Description |
|---------|-------------|
| `/ban <user> [reason]` | Ban a member |
| `/unban <user_id>` | Unban a member |
| `/kick <user> [reason]` | Kick a member |
| `/timeout <user> <duration>` | Timeout a member |
| `/warn <user> <reason>` | Warn a member |
| `/purge <amount>` | Bulk delete messages |

</details>

<details>
<summary><strong>👋 Welcome & Automation</strong></summary>

| Command | Description |
|---------|-------------|
| `/setwelcome <channel>` | Set welcome channel |
| `/setgoodbye <channel>` | Set goodbye channel |
| `/autorole <role>` | Set auto-role for new members |
| `/verify setup` | Setup verification system |
| `/antispam enable/disable` | Toggle anti-spam |
| `/antilink enable/disable` | Toggle anti-link |

</details>

<details>
<summary><strong>🎮 Engagement</strong></summary>

| Command | Description |
|---------|-------------|
| `/rank [user]` | View rank card |
| `/leaderboard` | View XP leaderboard |
| `/suggest <idea>` | Submit a suggestion |
| `/giveaway start <prize> <duration>` | Start a giveaway |

</details>

<details>
<summary><strong>🎫 Tickets</strong></summary>

| Command | Description |
|---------|-------------|
| `/ticket setup <category>` | Setup ticket system |
| `/ticket close [reason]` | Close ticket |
| `/ticket add <user>` | Add user to ticket |
| `/ticket remove <user>` | Remove user from ticket |

</details>

<details>
<summary><strong>🎤 Temp Voice</strong></summary>

| Command | Description |
|---------|-------------|
| `/tempvoice setup` | Setup join-to-create |
| `/tempvoice rename <name>` | Rename your channel |
| `/tempvoice limit <number>` | Set user limit |
| `/tempvoice lock / unlock` | Lock/unlock channel |
| `/tempvoice permit / reject` | Allow/deny users |

</details>

---

## 🏢 Multi-Tenant Mode

Allow users to connect their own Discord bots with isolated databases.

### Quick Setup

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env
TENANT_ENCRYPTION_KEY="your-generated-key"
```

### Pricing Tiers

| Tier | Max Bots | Max Guilds/Bot |
|------|----------|----------------|
| 🆓 Free | 1 | 1 |
| ⭐ Pro | 1 | 2 |
| 👑 Ultra | 1 | 3 |

### Usage

1. Login to Dashboard
2. Navigate to **My Bots**
3. Click **Create Bot**
4. Enter Bot Token (encrypted automatically)
5. Click **Start Bot**

---

## 🐳 Docker Production

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🔧 Troubleshooting

<details>
<summary><strong>Bot doesn't respond to commands</strong></summary>

1. Check bot is online in Discord
2. Run `pnpm bot:deploy` to register commands
3. Wait 1-2 minutes for Discord to update
4. Check bot has required permissions

</details>

<details>
<summary><strong>Database errors</strong></summary>

1. Verify `DATABASE_URL` is correct
2. Run `pnpm db:push` to sync schema
3. Check PostgreSQL is running

</details>

<details>
<summary><strong>Redis connection failed</strong></summary>

1. Verify Redis is running
2. Check `REDIS_URL` is correct
3. On Windows, use WSL: `wsl redis-server`

</details>

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ❤️ by SalyVn**

</div>
