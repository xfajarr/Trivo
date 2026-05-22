import { Hono } from 'hono'
import { desc } from 'drizzle-orm'
import { db } from '../lib/db'
import { feedEvents as feedTable } from '../lib/schema'

export const feedRoutes = new Hono()

feedRoutes.get('/', async (c) => {
  const venue = c.req.query('venue')
  const type = c.req.query('type')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = parseInt(c.req.query('offset') || '0')

  let events = await db.select().from(feedTable).orderBy(desc(feedTable.createdAt))

  if (venue) events = events.filter((e: typeof feedTable.$inferSelect) => e.venue === venue)
  if (type) events = events.filter((e: typeof feedTable.$inferSelect) => e.type === type)

  const total = events.length
  const page = events.slice(offset, offset + limit)

  return c.json({ feed: page, total, limit, offset })
})
