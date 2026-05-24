import OpenAI from 'openai'
import type { ThinkingOutput } from '../types.js'
import type { ToolRegistry } from '../tools/registry.js'
import { getFunctionCalls } from '../_tool-types.js'
import { z } from 'zod'

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

  /**
   * Complete a prompt with structured output (Zod schema validation)
   * Used by the new AI Engine v2 agents for typed LLM calls
   */
  async completeWithSchema<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>,
    maxTokens: number = 2048
  ): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI provider')
    }

    // Parse JSON from response
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch?.[1]) jsonStr = jsonMatch[1]
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) jsonStr = objectMatch[0]

    const parsed = JSON.parse(jsonStr)

    // Validate with Zod schema
    const result = schema.parse(parsed)
    return result
  }

  /**
   * Get the current model version/name
   */
  getModelVersion(): string {
    return this.model
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
