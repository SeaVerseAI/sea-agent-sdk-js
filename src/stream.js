export function createChatStreamProcessor(handlers = {}) {
  let buffer = "";
  let text = "";

  const handleEvent = (event) => {
    if (handlers.onEvent) {
      handlers.onEvent(event);
    }
    const delta = textFromStreamEvent(event);
    if (!delta) {
      return;
    }
    text += delta;
    if (handlers.onTextDelta) {
      handlers.onTextDelta(delta, event);
    }
  };

  return {
    writeSSEChunk(chunk) {
      buffer += chunk;
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const event of parseSSE(part)) {
          handleEvent(event);
        }
      }
    },
    writeWebSocketMessage(message) {
      handleEvent(parseWebSocketEvent(message));
    },
    end() {
      if (buffer.trim()) {
        for (const event of parseSSE(buffer)) {
          handleEvent(event);
        }
        buffer = "";
      }
      return text;
    },
  };
}

export function parseSSE(text) {
  const events = [];
  for (const block of text.split(/\r?\n\r?\n+/)) {
    const lines = block.split(/\r?\n/);
    let event = "message";
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }

    if (dataLines.length === 0) {
      continue;
    }

    const dataText = dataLines.join("\n");
    let data = dataText;
    try {
      data = JSON.parse(dataText);
    } catch {
      // Keep non-JSON data as raw text.
    }
    events.push({ event, data });
  }

  return events;
}

export function parseWebSocketEvent(message) {
  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch {
    return { event: "message", data: message };
  }

  if (!parsed || typeof parsed !== "object") {
    return { event: "message", data: parsed };
  }

  const event = typeof parsed.event === "string" && parsed.event ? parsed.event : "message";
  if (event === "error") {
    const code = typeof parsed.code === "string" && parsed.code ? `${parsed.code}: ` : "";
    const errorText = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed);
    throw new Error(`${code}${errorText}`);
  }

  return { event, data: parsed.data };
}

export function textFromStreamEvent(event) {
  if (event.event === "response.text.delta" || event.event === "response.output_text.delta") {
    return stringField(event.data, "delta");
  }
  if (event.event === "chat.response" || event.event === "message.delta") {
    return (
      stringField(event.data, "content") ||
      stringField(event.data, "text") ||
      stringField(event.data, "delta")
    );
  }
  return "";
}

function stringField(data, field) {
  if (!data || typeof data !== "object") {
    return "";
  }
  const value = data[field];
  return typeof value === "string" ? value : "";
}
