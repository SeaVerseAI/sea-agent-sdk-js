# agentctl-sdk

基于当前 `agentctl` CLI 项目整理出的 Node.js SDK，用于调用 agent-gateway 的注册、查询和聊天接口。

## 安装

```bash
npm install agentctl-sdk
```

如果你当前是本地开发：

```bash
npm install
```

## 初始化

```js
import { AgentctlClient } from "agentctl-sdk";

const client = new AgentctlClient({
  endpoint: "http://127.0.0.1:8080",
  apiKey: "sa-xxxxxxxx",
});
```

也可以复用 CLI 的默认配置文件：

```js
import { AgentctlClient } from "agentctl-sdk";

const client = await AgentctlClient.fromConfig();
```

默认读取 `~/.agentctl/config.yaml`，格式与 CLI 一致：

```yaml
endpoint: http://127.0.0.1:8080
apiKey: sa-xxxxxxxx
```

## 示例

```js
import { AgentctlClient } from "agentctl-sdk";

const client = new AgentctlClient({
  endpoint: "http://127.0.0.1:8080",
  apiKey: process.env.AGENT_GATEWAY_API_KEY,
});

const health = await client.system.health();
console.log(health);

const tools = await client.tools.list({
  provider: "web-tools-mcp",
  status: "active",
});

const result = await client.chat.run({
  agentId: "web_assistant:v1",
  message: "Search recent AI news",
});

console.log(result);
```

注册 Hook endpoint：

```js
const hook = await client.hooks.register({
  name: "production-line-hook",
  endpoint: "https://example.com/agent-hook",
  description: "Receives Agent Worker events for the configured API key.",
  metadata: {},
});

console.log(hook);
```

Hook 使用 `apiKey` 作为 `Authorization: Bearer ...`，payload 中不要传 `api_key`。Worker 固定用 `POST` 调用 endpoint，业务方按事件 payload 中的 `event_id` 自行过滤。

流式聊天：

```js
const text = await client.chat.runStream(
  {
    agentId: "web_assistant:v1",
    message: "Fetch https://example.com",
  },
  {
    transport: "sse",
    onTextDelta(delta) {
      process.stdout.write(delta);
    },
  },
);

console.log("\nFinal text:", text);
```

## 资源接口

- `client.system.health()`
- `client.system.metrics()`
- `client.catalog.list(options)`
- `client.tools.register(payload)`
- `client.tools.list(options)`
- `client.tools.get(toolId)`
- `client.tools.update(toolId, payload)`
- `client.tools.delete(toolId, { operatorId })`
- `client.tools.resolve(toolId)`
- `client.skills.register(payload)`
- `client.skills.list(options)`
- `client.skills.get(skillId)`
- `client.skills.update(skillId, payload)`
- `client.skills.delete(skillId, { operatorId })`
- `client.agents.register(payload)`
- `client.agents.list(options)`
- `client.agents.update(agentId, payload)`
- `client.agents.delete(agentId, { operatorId })`
- `client.agents.capabilities(agentId)`
- `client.hooks.register(payload)`
- `client.hooks.list(options)`
- `client.hooks.get(hookId)`
- `client.hooks.update(hookId, payload)`
- `client.hooks.delete(hookId)`
- `client.chat.createCompletion(payload)`
- `client.chat.streamCompletion(payload, handlers)`
- `client.chat.run(options)`
- `client.chat.runStream(options, handlers)`
- `client.chat.get(chatId)`
- `client.chat.events(chatId, options)`
- `client.chat.stream(chatId, handlers)`
- `client.chat.cancel(chatId)`
