import type { ChannelProviderAdapter } from './types';

/**
 * Registro simple de adaptadores de canal disponibles en tiempo de
 * ejecución. apps/api y apps/worker registran aquí cada adaptador
 * construido (con sus credenciales, si aplica) y el resto del dominio
 * los resuelve por nombre de proveedor, sin conocer la implementación.
 */
export class ChannelRegistry {
  private readonly adapters = new Map<string, ChannelProviderAdapter>();

  register(adapter: ChannelProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): ChannelProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No hay adaptador registrado para el proveedor "${provider}"`);
    }
    return adapter;
  }

  has(provider: string): boolean {
    return this.adapters.has(provider);
  }
}
