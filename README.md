# Discord Bot + Web Dashboard

Bot Discord đa chức năng cho cộng đồng gaming với bảng điều khiển web hỗ trợ tiếng Việt và tiếng Anh.

![Node.js](https://img.shields.io/badge/Node.js-22+-green)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-purple)

## Tính năng

### Bot Discord
| Module | Mô tả |
|--------|-------|
| **Moderation** | Ban, kick, timeout, warn, purge messages |
| **Logging** | Ghi log tất cả hành động moderation và tin nhắn |
| **Welcome/Goodbye** | Tin nhắn chào mừng/tạm biệt với ảnh canvas |
| **Leveling** | Hệ thống XP với rank card và leaderboard |
| **Auto-Role** | Tự động cấp role khi member join |
| **Auto-Responder** | Phản hồi tự động theo từ khóa |
| **Anti-Spam** | Chống spam tin nhắn |
| **Anti-Link** | Chống gửi link với whitelist |
| **Verification** | Xác minh thành viên qua nút bấm |
| **Giveaways** | Tổ chức giveaway với yêu cầu tham gia |
| **Tickets** | Hệ thống hỗ trợ với transcript |
| **Temp Voice** | Kênh voice tạm thời (join-to-create) |
| **Button Roles** | Reaction roles qua button |
| **Suggestions** | Hệ thống đề xuất với vote |
| **Sticky Messages** | Tin nhắn ghim tự động |
| **Embed Builder** | Tạo embed tùy chỉnh |

### Web Dashboard
- Quản lý tất cả cài đặt bot qua giao diện web
- Hỗ trợ đa ngôn ngữ (Tiếng Việt / English)
- Đồng bộ real-time với bot qua Redis Pub/Sub
- Xác thực local với Better-Auth

## Yêu cầu hệ thống

- **Node.js** 22.0.0 trở lên
- **pnpm** 10.0.0 trở lên
- **PostgreSQL** 14+
- **Redis** 7+

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/YOUR_USERNAME/discord-bot.git
cd discord-bot
```

### 2. Cài đặt dependencies

```bash
pnpm install
```

### 3. Cấu hình môi trường

Tạo file `.env` ở thư mục gốc:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/discord_bot"

# Redis
REDIS_URL="redis://localhost:6379"

# Discord Bot
DISCORD_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"

# Dashboard (optional)
DASHBOARD_PORT=3000
DASHBOARD_SECRET="your_secret_key_here"
BETTER_AUTH_SECRET="your_auth_secret_here"

# R2 Storage (optional - for image uploads)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

### 4. Khởi tạo database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### 5. Đăng ký slash commands

```bash
pnpm bot:deploy
```

### 6. Chạy ứng dụng

```bash
# Chạy cả bot và dashboard (development)
pnpm dev

# Chỉ chạy bot
pnpm bot:dev

# Chỉ chạy dashboard
pnpm dashboard:dev
```

## Cấu trúc thư mục

```
.
├── apps/
│   ├── bot/                  # Discord bot
│   │   └── src/
│   │       ├── commands/     # Slash commands
│   │       ├── events/       # Discord events
│   │       ├── handlers/     # Command & event handlers
│   │       ├── modules/      # Feature modules
│   │       ├── services/     # Business logic
│   │       └── utils/        # Utilities
│   └── dashboard/            # Next.js web dashboard
│       └── src/
│           ├── app/          # App router pages
│           ├── components/   # React components
│           └── lib/          # Utilities
├── packages/
│   ├── config/               # Shared configuration
│   ├── database/             # Prisma schema & client
│   └── types/                # Shared TypeScript types
├── turbo.json                # Turborepo config
└── package.json              # Root package.json
```

## Lấy Discord Bot Token

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
2. Nhấn **New Application** → đặt tên → **Create**
3. Vào tab **Bot** → **Reset Token** → Copy token
4. Bật các **Privileged Gateway Intents**:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Vào tab **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (hoặc chọn từng quyền)
6. Copy URL và mời bot vào server

## Các lệnh có sẵn

### Moderation
| Lệnh | Mô tả |
|------|-------|
| `/ban <user> [reason]` | Cấm thành viên |
| `/unban <user_id>` | Bỏ cấm thành viên |
| `/kick <user> [reason]` | Đuổi thành viên |
| `/timeout <user> <duration> [reason]` | Timeout thành viên |
| `/warn <user> <reason>` | Cảnh cáo thành viên |
| `/purge <amount>` | Xóa tin nhắn hàng loạt |

### Automation
| Lệnh | Mô tả |
|------|-------|
| `/setwelcome <channel> [message]` | Cấu hình tin nhắn chào mừng |
| `/setgoodbye <channel> [message]` | Cấu hình tin nhắn tạm biệt |
| `/autorole <role>` | Cấu hình auto-role |
| `/antispam <enable/disable>` | Bật/tắt anti-spam |
| `/antilink <enable/disable>` | Bật/tắt anti-link |
| `/verify setup` | Thiết lập hệ thống xác minh |

### Engagement
| Lệnh | Mô tả |
|------|-------|
| `/rank [user]` | Xem rank card |
| `/leaderboard` | Xem bảng xếp hạng XP |
| `/suggest <idea>` | Gửi đề xuất |

### Giveaway
| Lệnh | Mô tả |
|------|-------|
| `/giveaway start <prize> <duration> [winners]` | Tạo giveaway |

### Tickets
| Lệnh | Mô tả |
|------|-------|
| `/ticket setup <category>` | Thiết lập hệ thống ticket |
| `/ticket close [reason]` | Đóng ticket |
| `/ticket add <user>` | Thêm user vào ticket |
| `/ticket remove <user>` | Xóa user khỏi ticket |

### Temp Voice
| Lệnh | Mô tả |
|------|-------|
| `/tempvoice setup <channel> <category>` | Thiết lập temp voice |
| `/tempvoice rename <name>` | Đổi tên kênh |
| `/tempvoice limit <number>` | Giới hạn số người |
| `/tempvoice lock` | Khóa kênh |
| `/tempvoice unlock` | Mở khóa kênh |

### Utility
| Lệnh | Mô tả |
|------|-------|
| `/ping` | Kiểm tra độ trễ |
| `/help [command]` | Xem hướng dẫn |
| `/embed <json>` | Tạo embed tùy chỉnh |
| `/buttonrole <channel> <role> <label>` | Tạo button role |
| `/sticky <message>` | Tạo tin nhắn ghim |

### Auto-Responder
| Lệnh | Mô tả |
|------|-------|
| `/autoresponder add <trigger> <response>` | Thêm trigger |
| `/autoresponder list` | Xem danh sách |
| `/autoresponder remove <trigger>` | Xóa trigger |

## Biến trong tin nhắn

Sử dụng trong welcome/goodbye messages:

| Biến | Mô tả |
|------|-------|
| `{user}` | Mention thành viên |
| `{user.tag}` | Username#0000 |
| `{user.name}` | Username |
| `{server}` | Tên server |
| `{memberCount}` | Số thành viên |

## Scripts

```bash
# Development
pnpm dev              # Chạy tất cả apps
pnpm bot:dev          # Chạy bot (watch mode)
pnpm dashboard:dev    # Chạy dashboard

# Build
pnpm build            # Build tất cả
pnpm bot:build        # Build bot
pnpm dashboard:build  # Build dashboard

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes
pnpm db:studio        # Mở Prisma Studio

# Utilities
pnpm lint             # Chạy ESLint
pnpm typecheck        # Kiểm tra TypeScript
pnpm format           # Format code với Prettier
pnpm bot:deploy       # Đăng ký slash commands
```

## Production

### Build

```bash
pnpm build
```

### Chạy

```bash
# Bot only
pnpm bot:start

# Dashboard only
pnpm dashboard:start
```

### Docker (optional)

```dockerfile
FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm build
CMD ["pnpm", "bot:start"]
```

## Troubleshooting

### Bot không phản hồi lệnh
1. Kiểm tra bot có online không
2. Chạy `pnpm bot:deploy` để đăng ký lệnh
3. Đợi 1-2 phút để Discord cập nhật

### Lỗi database
1. Kiểm tra `DATABASE_URL` đúng chưa
2. Chạy `pnpm db:push` để đồng bộ schema

### Lỗi Redis
1. Kiểm tra Redis đang chạy
2. Kiểm tra `REDIS_URL` đúng chưa

## License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## Đóng góp

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi (`git commit -m 'Add amazing feature'`)
4. Push lên branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request
