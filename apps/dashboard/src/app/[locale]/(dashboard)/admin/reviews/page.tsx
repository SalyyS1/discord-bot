'use client';

import { useEffect, useState } from 'react';
import { Star, Check, X, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  text: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      const response = await fetch('/api/admin/reviews');
      if (response.ok) {
        const data = await response.json();
        setReviews(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateReviewStatus(reviewId: string, status: 'APPROVED' | 'REJECTED') {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update local state
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
        );
      }
    } catch (error) {
      console.error('Failed to update review:', error);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  }

  const filteredReviews = reviews.filter((review) =>
    filter === 'ALL' ? true : review.status === filter
  );

  const pendingCount = reviews.filter((r) => r.status === 'PENDING').length;
  const approvedCount = reviews.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = reviews.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Review Moderation</h1>
          <p className="text-gray-400">Manage user reviews for the landing page</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-surface-1 border-white/10">
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{reviews.length}</div>
              <div className="text-sm text-gray-400">Total Reviews</div>
            </CardContent>
          </Card>
          <Card className="bg-surface-1 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-surface-1 border-green-500/20">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-400">{approvedCount}</div>
              <div className="text-sm text-gray-400">Approved</div>
            </CardContent>
          </Card>
          <Card className="bg-surface-1 border-red-500/20">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-400">{rejectedCount}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map((status) => (
            <Button
              key={status}
              onClick={() => setFilter(status)}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              className={
                filter === status
                  ? 'bg-cyan-500 hover:bg-cyan-600'
                  : 'border-white/20 hover:bg-white/5'
              }
            >
              {status}
              {status !== 'ALL' && (
                <span className="ml-1 text-xs">
                  ({status === 'PENDING' ? pendingCount : status === 'APPROVED' ? approvedCount : rejectedCount})
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No {filter.toLowerCase()} reviews found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="bg-surface-1 border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {review.user.image ? (
                          <img
                            src={review.user.image}
                            alt={review.user.name || 'User'}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span>{(review.user.name || 'U')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{review.user.name || 'Anonymous User'}</div>
                        <div className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.status === 'PENDING' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Pending
                        </span>
                      )}
                      {review.status === 'APPROVED' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          Approved
                        </span>
                      )}
                      {review.status === 'REJECTED' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Rating */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-gray-300 mb-4">&ldquo;{review.text}&rdquo;</p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {review.status !== 'APPROVED' && (
                      <Button
                        onClick={() => updateReviewStatus(review.id, 'APPROVED')}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    {review.status !== 'REJECTED' && (
                      <Button
                        onClick={() => updateReviewStatus(review.id, 'REJECTED')}
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteReview(review.id)}
                      size="sm"
                      variant="outline"
                      className="border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 ml-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
