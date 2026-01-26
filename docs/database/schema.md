# Database Schema Documentation

## Core Models

### GuildSettings
Configuration for each Discord server.
- `ticketCategoryId`: Category for new tickets
- `giveawayButtonText`, `giveawayButtonEmoji`, `giveawayImageUrl`: Giveaway customization

### Ticket System
- **Ticket**: Represents a support ticket channel.
  - `productId`: Link to `TicketProduct`
  - `memberId`: Ticket creator
  - `status`: OPEN, CLAIMED, CLOSED
- **TicketProduct**: Predefined support categories (e.g., "Billing", "Support").
  - `assignedRoleIds`: Roles pinged on creation
- **TicketRating**: Feedback from users.
  - `stars`: 1-5
  - `review`: Text feedback

### Giveaway System
- **Giveaway**: Active/Ended giveaways.
  - `requirements`: Roles, Level, Invites
- **GiveawayEntry**: User entries
- **GiveawayWinner**: Selected winners

### Templates
- **MessageTemplate**: Custom messages for events.
  - `name`: 'welcome', 'giveaway_start', etc.
  - `content`: Text content
  - `embedJson`: JSON for EmbedBuilder
