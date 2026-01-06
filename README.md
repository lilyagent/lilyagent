# Lily - AI Agent Marketplace on Solana

![Lily](public/labory-logo.png)

## 🚀 Overview

**Lily** is a decentralized marketplace for AI agents and APIs built on the Solana blockchain. It enables creators to build, deploy, and monetize AI agents with instant USDC micropayments using a pay-per-use model with no subscriptions.

### Key Features

- **🤖 AI Agent Marketplace**: Browse, deploy, and execute AI agents across multiple categories (Research, Code, Finance, Writing, Data)
- **🔌 API Marketplace**: Discover and integrate third-party APIs with transparent, usage-based pricing
- **💰 Instant Micropayments**: Pay-per-use pricing with instant USDC payments on Solana
- **🔐 Advanced Wallet Integration**: Robust Solana wallet support with comprehensive troubleshooting
- **📊 Creator Dashboard**: Track agent performance, revenue, and analytics
- **⚡ Real-time Execution**: Execute agents instantly with transparent pricing
- **🔧 Wallet Diagnostics**: Built-in troubleshooting tools for wallet connection issues

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **TailwindCSS** for modern, responsive UI
- **React Router** for navigation
- **Lucide React** for icons

### Blockchain & Payments
- **Solana Web3.js** for blockchain interactions
- **Phantom Wallet** integration
- **USDC** for stable micropayments
- Helius RPC for reliable Solana connections

### Backend & Database
- **Supabase** for database and real-time features
- PostgreSQL with Row Level Security (RLS)
- Edge Functions for serverless API endpoints

## 🏗 Architecture

### Smart Contract Integration
- Direct Solana wallet integration via Phantom
- Pay-per-execution model with instant settlement
- Transaction verification and payment tracking
- Support for SOL and USDC payments

### Database Schema
- **agents**: AI agent metadata, pricing, and performance
- **apis**: Third-party API listings and configurations
- **agent_executions**: Execution history and results
- **agent_payments**: Payment transaction records
- **api_pricing_models**: Flexible pricing tiers for APIs
- **user_wallets**: User wallet addresses and balances

### Security Features
- Row Level Security (RLS) on all tables
- Wallet-based authentication
- Secure transaction signing
- API key management for third-party integrations

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or pnpm
- Phantom Wallet extension

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd lily-ai-agents
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy .env.example to .env and fill in your values
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_HELIUS_API_KEY=your_helius_api_key (optional)
```

4. Run database migrations:
```bash
# Migrations are in supabase/migrations/
# Apply them through Supabase dashboard or CLI
```

5. Start the development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

## 🔧 Wallet Troubleshooting

The platform includes comprehensive wallet troubleshooting features to ensure smooth operation:

### Quick Access
- Visit `/diagnostics` for the interactive diagnostics dashboard
- Access from the navigation bar (Activity icon) when logged into dashboard

### Features
- **Real-time Diagnostics**: Check wallet connection, RPC endpoints, and balance retrieval
- **RPC Testing**: Test all RPC endpoints and view latency
- **Error Detection**: Identify and explain common wallet issues
- **One-Click Solutions**: Reconnect wallet, refresh balance, switch RPC endpoints
- **Console Commands**: Browser console commands for advanced debugging

### Common Issues Resolved
- Balance showing 0 SOL
- Transactions failing silently
- "Wallet not connected" errors
- Network/RPC connection problems
- Slow transaction confirmations

For detailed troubleshooting information, see [WALLET_TROUBLESHOOTING.md](./WALLET_TROUBLESHOOTING.md)

### Developer Tools
```typescript
// Use the wallet hook in your components
import { useWallet } from './hooks/useWallet';

const { connected, balance, connect, disconnect } = useWallet();

// Safe transaction handling
import { safeTransfer } from './utils/transactionUtils';

const result = await safeTransfer(wallet, connection, recipient, amount);
```

See [WalletUsageExample.tsx](./src/examples/WalletUsageExample.tsx) for complete examples.

## 🎯 How It Works

### For Users
1. **Connect Wallet**: Connect your Phantom wallet to get started
2. **Browse Marketplace**: Explore AI agents and APIs across various categories
3. **Execute Agents**: Pay per execution with transparent USDC pricing
4. **Track Usage**: Monitor your executions and spending in the dashboard

### For Creators
1. **Create Agent**: Deploy your AI agent with a one-time 0.01 SOL fee
2. **Set Pricing**: Configure per-execution pricing (default: $0.10 USDC)
3. **Earn Revenue**: Receive instant payments when users execute your agent
4. **Monitor Performance**: Track executions, revenue, and ratings

### For API Providers
1. **List Your API**: Add your API with documentation and pricing
2. **Flexible Pricing**: Support for free tier, pay-per-call, or subscription models
3. **Rate Limiting**: Configure usage limits and rate restrictions
4. **Get Discovered**: Verified APIs get featured in the marketplace

## 💡 Use Cases

- **Research Agents**: Web scraping, data aggregation, market research
- **Code Agents**: Code generation, debugging, documentation
- **Finance Agents**: Portfolio analysis, trading signals, risk assessment
- **Writing Agents**: Content creation, copywriting, translation
- **Data Agents**: Data processing, analysis, visualization

## 🔒 Security & Privacy

- All payments processed on-chain with transparent verification
- Row Level Security enforces data access controls
- Wallet signatures required for all transactions
- No centralized custody of user funds
- API keys encrypted and securely stored

## 🚀 Roadmap

- [ ] AI agent execution environment with sandboxing
- [ ] Enhanced analytics and performance metrics
- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Social features (ratings, reviews, discussions)
- [ ] Advanced API versioning and webhooks
- [ ] Mobile app for iOS and Android
- [ ] Agent collaboration and chaining

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

- Website: Lily AI Agents on Solana
- Twitter: [@lilyagent_ai](https://x.com/lilyagent_ai)
- GitHub: [lilyagent/lilyagent](https://github.com/lilyagent/lilyagent)

## 🙏 Acknowledgments

Built with ❤️ for the Solana ecosystem

- Solana Foundation for the amazing blockchain infrastructure
- Phantom Wallet for seamless wallet integration
- Supabase for the backend infrastructure
- The open-source community

---

**Made for [Hackathon Name] - 2025**
