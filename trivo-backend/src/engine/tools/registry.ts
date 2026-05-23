export interface ToolSchema {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export interface EngineTool {
  schema: ToolSchema
  execute(args: Record<string, unknown>): Promise<unknown>
}

export class ToolRegistry {
  private tools = new Map<string, EngineTool>()

  register(tool: EngineTool): this {
    this.tools.set(tool.schema.name, tool)
    return this
  }

  getSchemas(): ToolSchema[] {
    return [...this.tools.values()].map(t => t.schema)
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    return tool.execute(args)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }
}
