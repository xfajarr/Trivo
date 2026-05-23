import { createMiddleware } from 'hono/factory'
import { PrivyClient } from '@privy-io/server-auth'
import { config } from '../config'

const privy = new PrivyClient(config.PRIVY_APP_ID, config.PRIVY_APP_SECRET)

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json({ error: 'Missing authorization token' }, 401) as any
  }

  const token = authHeader.slice(7)
  try {
    const verified = await privy.verifyAuthToken(token)
    c.set('userId', verified.userId)
    await next()
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json({ error: 'Invalid or expired token' }, 401) as any
  }
})
