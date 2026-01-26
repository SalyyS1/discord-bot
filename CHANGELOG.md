# Changelog

## [2026-01-25] - Agent Session

### Added
- **Ticket System Revamp**:
  - Added `TicketRating` and `TicketProduct` to schema.
  - Implemented Ticket Products Management in Dashboard.
  - Implemented Ticket Ratings Dashboard.
  - Added "Rate this ticket" flow (DM + Review Modal).
- **Giveaway Customization**:
  - Added Settings for Button Text, Emoji, and Default Image.
  - Integrated settings into Dashboard and Bot Logic.
- **Documentation**:
  - Created `docs/` structure.
  - Added Architecture, Schema, and API docs.

### Changed
- **Bot Logic**:
  - `interactionCreate.ts`: Refactor started (planned), added handlers for Rate/Review.
  - `GiveawayModule`: Optimized notification loop to use Promise.all (concurrency limit 5).
  - `TicketModule`: Added Modal support for ticket creation.

### Fixed
- Fixed duplicate imports in `interactionCreate.ts`.
- Fixed duplicate variable declaration in `GiveawayModule`.
