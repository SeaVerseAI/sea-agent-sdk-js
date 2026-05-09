import { request, WebSocket } from "undici";

export class AgentctlTransport {
  constructor(endpoint, apiKey) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async get(path, query) {
    return this.requestJSON("GET", this.buildURL(path, query));
  }

  async getText(path, query) {
    return this.requestText("GET", this.buildURL(path, query));
  }

  async getStream(path, query, onChunk) {
    await this.requestStream("GET", this.buildURL(path, query), undefined, onChunk);
  }

  async post(path, body) {
    return this.requestJSON("POST", this.buildURL(path), body);
  }

  async postText(path, body) {
    return this.requestText("POST", this.buildURL(path), body);
  }

  async postStream(path, body, onChunk) {
    await this.requestStream("POST", this.buildURL(path), body, onChunk);
  }

  async put(path, body) {
    return this.requestJSON("PUT", this.buildURL(path), body);
  }

  async delete(path, query) {
    return this.requestJSON("DELETE", this.buildURL(path, query));
  }

  async websocket(path, query, initialMessage, onMessage) {
    const url = this.buildWebSocketURL(path, query);
    const headers = {};
    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }
    if (isDebugEnabled()) {
      console.error(`WS ${url}`);
    }

    await new Promise((resolve, reject) => {
      let settled = false;
      let opened = false;
      const ws = new WebSocket(url, { headers });

      const settle = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        if (error) {
          reject(error);
          return;
        }
        resolve();
      };

      ws.addEventListener("open", () => {
        opened = true;
        if (initialMessage !== undefined) {
          ws.send(JSON.stringify(initialMessage));
        }
      });

      ws.addEventListener("message", (event) => {
        try {
          onMessage(webSocketMessageToString(event.data));
        } catch (error) {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
          settle(error instanceof Error ? error : new Error(String(error)));
        }
      });

      ws.addEventListener("error", (event) => {
        settle(new Error(errorMessageFromWebSocketEvent(event)));
      });

      ws.addEventListener("close", (event) => {
        if (!opened) {
          settle(new Error(`websocket connection closed before open: ${event.code} ${event.reason}`.trim()));
          return;
        }
        if (event.code !== 1000 && event.code !== 1005) {
          settle(new Error(`websocket connection closed: ${event.code} ${event.reason}`.trim()));
          return;
        }
        settle();
      });
    });
  }

  buildURL(path, query) {
    const base = new URL(this.endpoint);
    const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
    const relativePath = path.replace(/^\/+/, "");
    base.pathname = `${basePath}${relativePath}`.replace(/\/{2,}/g, "/");
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        base.searchParams.set(key, String(value));
      }
    }
    return base.toString();
  }

  buildWebSocketURL(path, query) {
    const url = new URL(this.buildURL(path, query));
    if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol === "https:") {
      url.protocol = "wss:";
    }
    return url.toString();
  }

  async requestJSON(method, url, body) {
    const text = await this.requestText(method, url, body, "application/json");
    return parseJSONResponse(text, url);
  }

  async requestText(method, url, body, accept = "*/*") {
    const { headers, payload } = this.buildRequest(method, url, body, accept);
    const response = await request(url, {
      method,
      headers,
      body: payload,
    });
    const text = await response.body.text();
    if (response.statusCode >= 400) {
      throw new Error(`${response.statusCode}: ${errorMessageFromResponse(text)}`);
    }
    return text;
  }

  async requestStream(method, url, body, onChunk) {
    const { headers, payload } = this.buildRequest(method, url, body, "text/event-stream");
    const response = await request(url, {
      method,
      headers,
      body: payload,
    });
    if (response.statusCode >= 400) {
      const text = await response.body.text();
      throw new Error(`${response.statusCode}: ${errorMessageFromResponse(text)}`);
    }

    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
      onChunk(decoder.decode(chunk, { stream: true }));
    }
    const rest = decoder.decode();
    if (rest) {
      onChunk(rest);
    }
  }

  buildRequest(method, url, body, accept = "*/*") {
    const headers = { accept };
    let payload;

    if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }

    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    if (isDebugEnabled()) {
      console.error(`${method} ${url}`);
    }

    return { headers, payload };
  }
}

function isDebugEnabled() {
  return process.env.AGENTCTL_DEBUG === "1" || process.env.SEAAGENT_DEBUG === "1";
}

function errorMessageFromResponse(text) {
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }

  if (typeof parsed === "object" && parsed && "error" in parsed) {
    return String(parsed.error);
  }

  return text;
}

function parseJSONResponse(text, url) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 240);
    throw new Error(`expected JSON response from ${url}, got: ${preview}`);
  }
}

function webSocketMessageToString(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data);
  }
  return String(data);
}

function errorMessageFromWebSocketEvent(event) {
  if ("message" in event && typeof event.message === "string" && event.message) {
    return event.message;
  }
  if ("error" in event && event.error instanceof Error) {
    return event.error.message;
  }
  return "websocket error";
}
