Brainstorm – Dashboard and Discord Bot Issues & Improvements

Project: D:\Project.2_PROJECT_BOT_DISCORD

Context:
The current Dashboard and Discord Bot platform contains multiple critical functional issues, data synchronization problems, and UI/UX limitations. This document consolidates all identified bugs and improvement requests in a structured, professional format to support planning, implementation, and prioritization.

1. Voice Management

* Unable to save changes in the Voice Management page.
* If voice channels are already configured on Discord, they must be correctly reflected in the Dashboard.
* Support configuration of multiple voice channels.
* Voice customization panel needs enhancement:

  * Image upload support.
  * More customization options (layout, behavior, visual settings).

2. Music System

* Music Player page has the same save/sync issues as Voice Management.
* All music commands are currently non-functional (critical issue).
* Major feature and UX improvements required:

  * Custom, visually polished music embeds inspired by YouTube, Spotify, Apple Music, and other platforms.
  * Personal playlists per user.
  * Playlist sharing between users.
  * Ability to configure music embed options directly from the Discord bot.
  * Feature parity benchmarking against popular Discord music bots.

3. Dashboard – Statistics and Analytics

* Real-time statistics are inaccurate.

  * Example: If a server has 500 members, the Dashboard must display exactly 500.
* Remove the "Messages sent" metric (hard to track and low value).
* Remove redundant sections already covered elsewhere:

  * Warnings
  * Level roles
  * Auto responses
* State inconsistency issues:

  * Leveling, Anti-spam, and Anti-link are enabled but shown as disabled in UI.
  * Top members, level distribution, and recent moderation sections do not display data.

4. Auto Moderation

* Unable to save configuration changes.

5. Select Components (Role / Channel / Category)

* Selection components do not work across multiple systems, including:

  * Auto Moderation
  * Giveaway System
  * Ticket System
* Unable to send test messages from the bot.
* Templates cannot be saved.

6. Giveaway System

* Cannot select role, channel, or category.
* Giveaways created on Discord are not reflected in the Dashboard.
* Active giveaways are not displayed.
* Giveaway history is not persisted.

7. Ticket System

* Cannot select role, channel, or category.
* Tickets opened via Discord are not stored or visible in the Dashboard.
* Ticket creation panel issues:

  * After creating a ticket, the embed must automatically reset.
  * Current behavior causes select components to remain bound to the previous embed, blocking creation of similar tickets.

8. Bot Management and Dashboard Configuration

* "Manage your custom Discord bots" page is non-functional.
* "Dashboard and bot configuration" page lacks meaningful settings.
* Quick links section is empty.

9. Profile Page

* Profile page is overly minimal and lacks useful information.
* Required enhancements:

  * Badges
  * Achievements
  * Tags
  * Custom avatar and display name
  * Subscription expiration date
  * Activity and audit logs (e.g., saved music, edited message).

10. Language and Internationalization

* English language selection does not persist.
* Navigating to other Dashboard pages forces the language back to Vietnamese.
* Language state must be globally consistent across all routes.

11. Authentication and Login

* Critical login flow bug:

  * User logs in on the Landing page.
  * Upon accessing the Dashboard, the user is forced to log in again.

12. Review System

* Current review section is static or fake.
* No real user-generated reviews.
* A proper user review and rating system is required.

13. Documentation and Landing Page

* Documentation pages are inaccessible.
* Missing navigation back to the Landing page.
* "Trusted by growing communities" section issues:

  * Not real-time.
  * Incorrect server count (currently shows 2 while actual count is 3).
  * Missing or incorrect server avatars.

Objectives:

* Fix all save, sync, and select-related issues.
* Ensure full data consistency between Discord and the Dashboard.
* Improve UI/UX quality and feature completeness.
* Prepare the platform for production readiness.
