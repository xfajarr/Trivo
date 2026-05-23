export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  txHash?: string
}

export interface ToolHandler {
  definition: ToolDefinition
  execute: (agentId: string, args: Record<string, unknown>) => Promise<ToolResult>
}

const toolRegistry = new Map<string, ToolHandler>()

export function registerTool(handler: ToolHandler) {
  toolRegistry.set(handler.definition.name, handler)
}

export function getTool(name: string): ToolHandler | undefined {
  return toolRegistry.get(name)
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map((h) => h.definition)
}

export function getToolNames(): string[] {
  return Array.from(toolRegistry.keys())
}

// System prompt snippet: tells agent what tools are available
export function buildToolsSystemPrompt(): string {
  const tools = getAllTools()
  if (tools.length === 0) return ''

  return `\n\nAvailable tools:\n${tools
    .map((t) => `  - ${t.name}: ${t.description}`)
    .join('\n')}\n\nTo call a tool, respond with JSON: { "tool": "tool_name", "args": { ... } }`
}
