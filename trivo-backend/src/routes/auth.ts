import { Hono } from 'hono'
import { PrivyClient } from '@privy-io/server-auth'
import { config } from '../config'
import { db } from '../lib/db'
import { users } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'
import { eq } from 'drizzle-orm'

const privy = new PrivyClient(config.PRIVY_APP_ID, config.PRIVY_APP_SECRET)
export const authRoutes = new Hono()

authRoutes.post('/verify', async (c) => {
  const { accessToken } = await c.req.json()
  if (!accessToken) return c.json({ error: 'accessToken required' }, 400)

  try {
    const verified = await privy.verifyAuthToken(accessToken)
    const privyUserId = verified.userId

    const existing = await db.select().from(users).where(eq(users.id, privyUserId))
    if (existing.length === 0) {
      await db.insert(users).values({ id: privyUserId })
    }

    const user = await db.select().from(users).where(eq(users.id, privyUserId))
    return c.json({ user: user[0] })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await db.select().from(users).where(eq(users.id, userId))
  if (user.length === 0) return c.json({ error: 'User not found' }, 404)
  return c.json({ user: user[0] })
})
