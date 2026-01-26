# API Documentation

Base URL: `/api/guilds/[guildId]`

## Tickets
### GET /tickets/products
- List all ticket products.

### POST /tickets/products
- Create a new product.
- Body: `{ name, emoji, currentDescription, messageStr, assignedRoleIds }`

### GET /tickets/ratings
- List recent ticket ratings.
- Response: `[{ stars, review, ticketId, ... }]`

## Giveaways
### GET /giveaways
- List giveaways (Active/Ended).

### GET/PATCH /giveaways/settings
- Get or Update giveaway customization.
- Body: `{ giveawayButtonText, giveawayButtonEmoji, giveawayImageUrl }`

## Messages (Templates)
### GET /messages
- List all templates.

### POST /messages
- Create/Update template.
- Body: `{ name, content, imageUrl, embedJson }`
