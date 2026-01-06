import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

if (!projectId) {
  console.warn('VITE_REOWN_PROJECT_ID is not set. Wallet connection may not work properly.')
}

const solanaWeb3JsAdapter = new SolanaAdapter()

const metadata = {
  name: 'Lily AI Agents',
  description: 'AI Agent Marketplace on Solana - Build, deploy, and monetize AI agents with instant crypto payments',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://lily-agents.com',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.svg` : 'https://lily-agents.com/favicon.svg']
}

export const modal = createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  defaultNetwork: solana,
  projectId: projectId || 'demo',
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: false
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#0EA5E9',
    '--w3m-border-radius-master': '8px'
  }
})
