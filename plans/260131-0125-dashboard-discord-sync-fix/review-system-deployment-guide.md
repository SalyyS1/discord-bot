# Review System - Deployment Guide

## Overview

Complete user-generated review system with admin moderation for landing/pricing pages.

## Features Implemented

✅ User review submission (authenticated, rate-limited)
✅ Admin moderation dashboard with filtering
✅ Public display on landing/pricing pages
✅ Discord user verification (avatar, name)
✅ XSS protection and input validation
✅ Responsive design (mobile/tablet/desktop)

## Files Created

### API Routes (4 files)
```
apps/dashboard/src/app/api/reviews/route.ts
apps/dashboard/src/app/api/reviews/[id]/route.ts
apps/dashboard/src/app/api/admin/reviews/route.ts
```

### Components (3 files)
```
apps/dashboard/src/components/reviews/review-card-display.tsx
apps/dashboard/src/components/reviews/review-carousel-section.tsx
apps/dashboard/src/components/reviews/review-submission-form.tsx
```

### Admin Page (1 file)
```
apps/dashboard/src/app/[locale]/(dashboard)/admin/reviews/page.tsx
```

## Files Modified

### Database Schema (1 file)
```
packages/database/prisma/schema.prisma
- Added Review model
- Added ReviewStatus enum
- Added reviews relation to User
```

### Landing Pages (2 files)
```
apps/dashboard/src/app/[locale]/page.tsx
apps/dashboard/src/app/[locale]/pricing/page.tsx
- Added ReviewCarouselSection component
```

## Database Migration

Run migration after deployment:

```bash
cd packages/database
npx prisma migrate dev --name add_review_model
# or for production:
npx prisma migrate deploy
```

## Environment Variables

Add to `.env` or deployment environment:

```bash
# Comma-separated list of admin user IDs
ADMIN_USER_IDS="user_clxxxxx,user_clyyyyy"
```

To get user IDs:
1. Log in to dashboard
2. Check database `user` table for your ID
3. Add to ADMIN_USER_IDS

## Testing Checklist

### User Flow
- [ ] Navigate to landing page
- [ ] Log in with Discord
- [ ] Find "Leave a Review" section (needs to be added to navbar/profile)
- [ ] Submit review with rating and text
- [ ] Verify rate limit (1 per 30 days)
- [ ] Check review shows as "pending"

### Admin Flow
- [ ] Log in as admin user
- [ ] Navigate to `/admin/reviews`
- [ ] See pending reviews
- [ ] Approve a review
- [ ] Verify it appears on landing/pricing pages
- [ ] Reject a review
- [ ] Delete a review
- [ ] Filter by status

### Public Display
- [ ] Check landing page shows approved reviews
- [ ] Check pricing page shows approved reviews
- [ ] Verify responsive design (mobile/tablet/desktop)
- [ ] Verify Discord avatars display correctly

## Optional: Seed Initial Reviews

Create some initial reviews from team/beta testers:

```sql
INSERT INTO review (id, "userId", rating, text, status, "createdAt", "approvedAt", "approvedBy")
VALUES
  ('clxxxxx1', 'user_id_1', 5, 'Amazing platform! The moderation tools are exactly what we needed.', 'APPROVED', NOW(), NOW(), 'admin_user_id'),
  ('clxxxxx2', 'user_id_2', 5, 'Great dashboard, easy to use. Highly recommended for Discord communities!', 'APPROVED', NOW(), NOW(), 'admin_user_id'),
  ('clxxxxx3', 'user_id_3', 4, 'Very solid bot. The leveling system keeps our members engaged.', 'APPROVED', NOW(), NOW(), 'admin_user_id');
```

## API Endpoints

### Public Endpoints
- `GET /api/reviews` - Get approved reviews (no auth required)

### Authenticated Endpoints
- `POST /api/reviews` - Submit review (requires login, rate limited)

### Admin Endpoints
- `GET /api/admin/reviews` - Get all reviews (any status)
- `PUT /api/reviews/:id` - Update review status
- `DELETE /api/reviews/:id` - Delete review

## Rate Limiting

- **User submissions:** 1 review per 30 days
- **Validation:** Rating 1-5, text 10-500 characters
- **Security:** XSS sanitization, HTML stripped

## Admin Access

Admins are identified by user IDs in `ADMIN_USER_IDS` env var.

To find your user ID:
```sql
SELECT id, name, email FROM "user" WHERE email = 'your@email.com';
```

## Future Enhancements (Optional)

- [ ] Add "Leave a Review" button to user dashboard
- [ ] Email notifications for new reviews (admin)
- [ ] Review edit functionality (allow users to edit pending reviews)
- [ ] Advanced filtering (date range, rating)
- [ ] Export reviews to CSV
- [ ] Public review statistics
- [ ] Review response from admin/staff

## Support

If issues arise:
1. Check database migration ran successfully
2. Verify ADMIN_USER_IDS is set correctly
3. Check browser console for API errors
4. Verify Prisma client regenerated after migration
