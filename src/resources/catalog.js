export class CatalogResource {
  constructor(transport) {
    this.transport = transport;
  }

  async list(options = {}) {
    return this.transport.get("/v1/catalog", {
      capability_type: options.capabilityType,
      search: options.search,
      status: options.status,
      source_kind: options.sourceKind,
      public: options.public,
      provider: options.provider,
      limit: options.limit,
      offset: options.offset,
    });
  }
}
