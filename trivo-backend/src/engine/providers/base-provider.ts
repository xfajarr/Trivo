import OpenAI from 'openai'
import type { ThinkingOutput } from '../types.js'
import type { ToolRegistry } from '../tools/registry.js'
import { getFunctionCalls } from '../_tool-types.js'

export abstract class BaseProvider {
  protected abstract client: OpenAI
  protected abstract model: string

  async runReActLoop(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolRegistry,
    maxIterations: number = 5,
  ): Promise<ThinkingOutput> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [{ role: 'user', content: userPrompt }]

    for (let i = 0; i < maxIterations; i++) {
      const toolSchemas = tools.getSchemas().map((s) => ({
        type: 'function' as const,
        function: { name: s.name, description: s.description, parameters: s.input_schema },
      }))

      // DEBUG: Log what we're sending
      console.log('🔍 DEBUG: Sending to AI:', {
        model: this.model,
        messageCount: messages.length + 1,
        toolCount: toolSchemas.length,
        tools: toolSchemas.map((t) => t.function.name),
      })

      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          tools: toolSchemas,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 2048,
        })

        const choice = response.choices[0]
        if (!choice) throw new Error('No response from AI provider')

        const msg = choice.message
        const functionCalls = getFunctionCalls(msg)

        console.log('✅ AI response:', {
          finishReason: choice.finish_reason,
          hasToolCalls: functionCalls.length > 0,
          contentLength: (msg.content ?? '').length,
        })

        if (functionCalls.length > 0) {
          messages.push(msg)
          for (const tc of functionCalls) {
            try {
              const result = await tools.execute(tc.function.name, JSON.parse(tc.function.arguments))
              messages.push({ role: 'tool' as const, tool_call_id: tc.id, content: JSON.stringify(result) })
            } catch (error) {
              messages.push({
                role: 'tool' as const,
                tool_call_id: tc.id,
                content: JSON.stringify({ error: String(error) }),
              })
            }
          }
          continue
        }

        return this.parseResponse(msg.content ?? '')
      } catch (error) {
        console.error('❌ AI API error:', error)
        throw error
      }
    }

    throw new Error('ReAct loop exceeded max iterations')
  }

  protected parseResponse(content: string): ThinkingOutput {
    let jsonStr = content
    const jsonMatch: RegExpMatchArray | null = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch?.[1]) jsonStr = jsonMatch[1]
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) jsonStr = objectMatch[0]

    try {
      const p = JSON.parse(jsonStr)
      return {
        observation: String(p.observation ?? ''),
        analysis: String(p.analysis ?? ''),
        action: (p.action ?? 'hold') as ThinkingOutput['action'],
        tool: p.tool ?? null,
        args: p.args ?? null,
        confidence: Number(p.confidence ?? 0),
        riskLevel: (['low', 'medium', 'high'].includes(p.riskLevel)
          ? p.riskLevel
          : 'medium') as ThinkingOutput['riskLevel'],
        reasoning: String(p.reasoning ?? ''),
        abortConditions: Array.isArray(p.abortConditions) ? p.abortConditions : [],
      }
    } catch {
      console.warn(`[${this.constructor.name}] Failed to parse AI response`)
      return {
        observation: '',
        analysis: content,
        action: 'hold',
        tool: null,
        args: null,
        confidence: 0,
        riskLevel: 'low',
        reasoning: 'Response parsing failed',
        abortConditions: [],
      }
    }
  }
}
