export class SystemResource {
  constructor(transport) {
    this.transport = transport;
  }

  async health() {
    return this.transport.getText("/health");
  }

  async metrics() {
    return this.transport.getText("/metrics");
  }
}
