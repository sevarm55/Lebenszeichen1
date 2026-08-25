'use client'

import { useEffect, useRef } from 'react'

import { trackEvent } from '@/server/analytics/events'

/**
 * Scroll-depth + view tracking for a single article, and the view counter ping.
 *
 * Depth milestones are what tell us whether a Facebook visitor actually read
 * the piece or bounced off the headline — the single most useful signal for
 * deciding what to commission next.
 */
export function ReadingTracker({
  postId,
  slug,
  category,
}: {
  postId: string
  slug: string
  category: string
}) {
  const fired = useRef(new Set<string>())
  const counted = useRef(false)

  useEffect(() => {
    trackEvent('article_view', { post_id: postId, slug, category })

    // Count the view once, and only after a few seconds — an instant bounce is
    // not a read, and counting it inflates the "popular" rail with noise.
    const timer = setTimeout(() => {
      if (counted.current) return
      counted.current = true
      fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
        keepalive: true,
      }).catch(() => {})
    }, 5000)

    const milestones: [number, 'article_25' | 'article_50' | 'article_75' | 'article_complete'][] = [
      [25, 'article_25'],
      [50, 'article_50'],
      [75, 'article_75'],
      [95, 'article_complete'],
    ]

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        if (scrollable <= 0) return
        const percent = (window.scrollY / scrollable) * 100
        for (const [threshold, event] of milestones) {
          if (percent >= threshold && !fired.current.has(event)) {
            fired.current.add(event)
            trackEvent(event, { post_id: postId, slug })
          }
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [postId, slug, category])

  return null
}
