'use client';

import { motion } from 'framer-motion';
import { Star, Quote, Verified, Users, ArrowRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    id: '1',
    stars: 5,
    review: "SylaBot transformed how we manage our 50k+ member gaming community. The moderation tools are incredible, and the ticket system saves us hours every day.",
    author: 'Alex Chen',
    role: 'Community Director',
    server: 'GamersHub',
    members: '52K members',
    avatar: 'A',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: '2',
    stars: 5,
    review: "The leveling system keeps our members engaged like never before. We've seen a 40% increase in daily activity since switching to SylaBot!",
    author: 'Sarah Kim',
    role: 'Server Owner',
    server: 'Creative Studio',
    members: '28K members',
    avatar: 'S',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: '3',
    stars: 5,
    review: "Best dashboard I've ever used for a Discord bot. Everything is intuitive and the real-time sync is seamless. Support team is also fantastic!",
    author: 'Marcus Johnson',
    role: 'Tech Lead',
    server: 'Dev Community',
    members: '35K members',
    avatar: 'M',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: '4',
    stars: 5,
    review: "Giveaways are so easy to set up now. The requirement features ensure only active members participate, which has improved our engagement metrics significantly.",
    author: 'Emily Davis',
    role: 'Community Manager',
    server: 'Crypto Traders',
    members: '18K members',
    avatar: 'E',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 transition-all duration-300 ${i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'
            }`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-cyan-500/5 via-purple-500/10 to-pink-500/5 blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6 hover:bg-yellow-500/15 hover:border-yellow-500/30 transition-all duration-300 cursor-default">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">4.9/5 average rating</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Loved by</span>{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              server admins
            </span>
          </h2>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            See what community managers and server owners are saying about SylaBot
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 hover:bg-white/[0.03] transition-all duration-500 overflow-hidden">
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                {/* Quote icon */}
                <div className="absolute top-6 right-6">
                  <Quote className="w-10 h-10 text-cyan-500/10 group-hover:text-cyan-500/20 group-hover:scale-110 transition-all duration-300" />
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-6">
                  <StarRating stars={testimonial.stars} />
                  <span className="text-sm text-gray-500">Verified review</span>
                </div>

                {/* Review text */}
                <p className="text-gray-300 leading-relaxed text-lg mb-8 group-hover:text-white transition-colors duration-300">
                  &ldquo;{testimonial.review}&rdquo;
                </p>

                {/* Author info */}
                <div className="flex items-center gap-4">
                  <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {testimonial.avatar}
                    {/* Avatar glow */}
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${testimonial.gradient} blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{testimonial.author}</span>
                      <Verified className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.role} • {testimonial.server}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-medium text-cyan-400">
                      <Users className="w-3.5 h-3.5" />
                      {testimonial.members}
                    </div>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${testimonial.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 mb-6">
            Ready to see the difference? Join thousands of happy communities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`} target="_blank">
              <Button className="h-12 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 group">
                Add to Discord — Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="https://discord.gg/your-server" target="_blank">
              <Button variant="outline" className="h-12 px-6 border-white/20 hover:bg-white/5 hover:border-white/30 text-white rounded-xl font-medium hover:scale-105 active:scale-95 transition-all duration-300 group">
                <MessageSquare className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                Join Support Server
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
