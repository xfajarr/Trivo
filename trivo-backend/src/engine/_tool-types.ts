import type OpenAI from 'openai'

// OpenAI SDK v6 discriminates tool calls by type
// This helper provides a clean interface regardless of SDK version
export type FunctionToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export function getFunctionCalls(message: OpenAI.ChatCompletionMessage): FunctionToolCall[] {
  return ((message.tool_calls ?? []) as unknown as FunctionToolCall[]).filter(
    (tc) => tc.type === 'function' && tc.function != null,
  )
}
