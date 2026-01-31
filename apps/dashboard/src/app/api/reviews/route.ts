import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@repo/database';
import { z } from 'zod';

/**
 * Reviews API Route
 * Public GET for approved reviews, authenticated POST for submission
 */

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(500),
});

/**
 * GET /api/reviews
 * Public endpoint - returns approved reviews only
 */
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        status: 'APPROVED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        approvedAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Authenticated - submit a new review
 * Rate limit: 1 review per user per 30 days
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { rating, text } = validation.data;

    // Check rate limit: 1 review per 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReview = await prisma.review.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    if (recentReview) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'You can only submit one review per month',
          nextAllowedDate: new Date(
            recentReview.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
          ),
        },
        { status: 429 }
      );
    }

    // Sanitize text (basic XSS prevention)
    const sanitizedText = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Create review with PENDING status
    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        rating,
        text: sanitizedText,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        data: review,
        message:
          'Review submitted successfully! It will be visible after admin approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
