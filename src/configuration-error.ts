export class ConfigurationError extends Error {
  readonly code = "Configuration";

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
