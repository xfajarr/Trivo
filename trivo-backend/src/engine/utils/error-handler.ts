// engine/utils/error-handler.ts
// Phase 6 - Ticket TP2: Error Handling & Edge Cases
// Retry logic, graceful degradation, fallback strategies

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffFactor: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'operation'
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, backoffFactor } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(backoffFactor, attempt), maxDelayMs)
        console.warn(`[Retry] ${context} attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms: ${lastError.message}`)
        await sleep(delay)
      }
    }
  }

  throw new Error(`${context} failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

/**
 * Execute a function with a timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context: string = 'operation'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${context} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

/**
 * Execute with fallback — tries primary, falls back to secondary on error
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  context: string = 'operation'
): Promise<T> {
  try {
    return await primary()
  } catch (primaryError) {
    console.warn(`[Fallback] ${context} primary failed, using fallback: ${(primaryError as Error).message}`)
    try {
      return await fallback()
    } catch (fallbackError) {
      throw new Error(
        `${context}: primary and fallback both failed. ` +
        `Primary: ${(primaryError as Error).message}. ` +
        `Fallback: ${(fallbackError as Error).message}`,
        { cause: fallbackError }
      )
    }
  }
}

/**
 * Graceful degradation wrapper — tries the LLM, falls back to deterministic on failure
 */
export async function withLLMFallback<T>(
  llmCall: () => Promise<T>,
  deterministicFallback: () => T,
  context: string = 'llm_call'
): Promise<T> {
  try {
    return await withTimeout(llmCall, 15000, context)
  } catch (error) {
    console.warn(`[Degrade] ${context} failed, using deterministic fallback: ${(error as Error).message}`)
    return deterministicFallback()
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
