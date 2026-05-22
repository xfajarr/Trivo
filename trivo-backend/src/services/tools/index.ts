import { registerTool } from './registry'
import { getPriceTool } from './get-price.tool'
import { openTradeTool } from './open-trade.tool'
import { closeTradeTool } from './close-trade.tool'

export function registerAllTools() {
  registerTool(getPriceTool)
  registerTool(openTradeTool)
  registerTool(closeTradeTool)
  console.log(`🔧 Registered ${3} tools`)
}

export { getAllTools, getTool, buildToolsSystemPrompt, getToolNames } from './registry'
export type { ToolDefinition, ToolResult, ToolHandler } from './registry'
