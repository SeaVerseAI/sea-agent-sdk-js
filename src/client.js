import { loadAgentctlConfig } from "./config.js";
import { AgentsResource } from "./resources/agents.js";
import { CatalogResource } from "./resources/catalog.js";
import { ChatResource } from "./resources/chat.js";
import { HooksResource } from "./resources/hooks.js";
import { SkillsResource } from "./resources/skills.js";
import { SystemResource } from "./resources/system.js";
import { ToolsResource } from "./resources/tools.js";
import { AgentctlTransport } from "./transport.js";

export class AgentctlClient {
  constructor(options) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.transport = new AgentctlTransport(options.endpoint, options.apiKey);
    this.system = new SystemResource(this.transport);
    this.catalog = new CatalogResource(this.transport);
    this.tools = new ToolsResource(this.transport);
    this.skills = new SkillsResource(this.transport);
    this.agents = new AgentsResource(this.transport);
    this.hooks = new HooksResource(this.transport);
    this.chat = new ChatResource(this.transport);
  }

  static async fromConfig(path) {
    const config = await loadAgentctlConfig(path);
    if (!config.endpoint) {
      throw new Error("endpoint is not configured. Expected ~/.agentctl/config.yaml or a custom config path.");
    }

    return new AgentctlClient({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
    });
  }
}
