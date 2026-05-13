export class HooksResource {
  constructor(transport) {
    this.transport = transport;
  }

  async register(payload) {
    return this.transport.post("/v1/hooks/register", payload);
  }

  async list(options = {}) {
    return this.transport.get("/v1/hooks", {
      search: options.search,
      limit: options.limit,
      offset: options.offset,
    });
  }

  async get(hookId) {
    return this.transport.get(`/v1/hooks/${encodeURIComponent(hookId)}`);
  }

  async update(hookId, payload) {
    return this.transport.put(`/v1/hooks/${encodeURIComponent(hookId)}`, payload);
  }

  async delete(hookId) {
    return this.transport.delete(`/v1/hooks/${encodeURIComponent(hookId)}`);
  }
}
