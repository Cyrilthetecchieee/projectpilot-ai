export type AIProviderMode = 'mock' | 'nemotron'

// Keep this in one place so the real provider can be enabled after a backend exists.
export const AI_PROVIDER_MODE: AIProviderMode = 'mock'

export const aiProvider = {
  isMock: AI_PROVIDER_MODE === 'mock',
  model: AI_PROVIDER_MODE === 'mock' ? 'Simulation' : 'Nemotron',
  provider: AI_PROVIDER_MODE === 'mock' ? 'Local Mock' : 'Nebius Token Factory',
  attribution: 'Powered by NVIDIA Nemotron • Built with Nebius Token Factory',
}
