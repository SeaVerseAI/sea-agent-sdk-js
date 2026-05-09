import { createChatStreamProcessor } from "../stream.js";

export class ChatResource {
  constructor(transport) {
    this.transport = transport;
  }

  async createCompletion(payload) {
    return this.transport.post("/v1/chat/completions", payload);
  }

  async streamCompletion(payload, handlers = {}) {
    const processor = createChatStreamProcessor(handlers);
    const streamPayload = {
      ...payload,
      stream: true,
    };

    if (handlers.transport === "ws") {
      await this.transport.websocket(
        "/v1/chat/completions/ws",
        undefined,
        streamPayload,
        processor.writeWebSocketMessage,
      );
    } else {
      await this.transport.postStream(
        "/v1/chat/completions",
        streamPayload,
        processor.writeSSEChunk,
      );
    }

    return processor.end();
  }

  async run(options) {
    return this.createCompletion(buildRunPayload(options, false));
  }

  async runStream(options, handlers = {}) {
    return this.streamCompletion(buildRunPayload(options, true), handlers);
  }

  async get(chatId) {
    return this.transport.get(`/v1/chats/${encodeURIComponent(chatId)}`);
  }

  async events(chatId, options = {}) {
    return this.transport.get(`/v1/chats/${encodeURIComponent(chatId)}/events`, {
      after_seq: options.afterSeq ?? 0,
      limit: options.limit ?? 100,
    });
  }

  async stream(chatId, handlers = {}, options = {}) {
    const processor = createChatStreamProcessor(handlers);

    if (handlers.transport === "ws") {
      await this.transport.websocket(
        `/v1/chats/${encodeURIComponent(chatId)}/ws`,
        {
          after_seq: options.afterSeq ?? 0,
        },
        undefined,
        processor.writeWebSocketMessage,
      );
    } else {
      await this.transport.getStream(
        `/v1/chats/${encodeURIComponent(chatId)}/stream`,
        {
          after_seq: options.afterSeq ?? 0,
        },
        processor.writeSSEChunk,
      );
    }

    return processor.end();
  }

  async cancel(chatId) {
    return this.transport.post(`/v1/chats/${encodeURIComponent(chatId)}/cancel`);
  }
}

function buildRunPayload(options, stream) {
  if (!options.agentId && !options.agentConfig) {
    throw new Error("agentId or agentConfig is required");
  }

  const messages = normalizeMessages(options.message, options.messages);
  return {
    ...(options.agentId ? { agent_id: options.agentId } : {}),
    ...(options.agentConfig ? { agent_config: options.agentConfig } : {}),
    ...(options.extraBody ?? {}),
    messages,
    stream,
  };
}

function normalizeMessages(message, messages) {
  if (messages && messages.length > 0) {
    return messages;
  }
  return [{ role: "user", content: message ?? "" }];
}
