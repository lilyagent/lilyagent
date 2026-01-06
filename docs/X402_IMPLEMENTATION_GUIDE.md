# x402 Payment Protocol - Complete Implementation Guide

## Overview

This document provides a comprehensive guide for implementing the x402 payment protocol in your Lily AI platform. The x402 protocol enables frictionless HTTP-based micropayments for AI agents, APIs, and web services using Solana blockchain.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Integration Patterns](#integration-patterns)
4. [API Reference](#api-reference)
5. [Security Best Practices](#security-best-practices)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ x402 Modal   │  │ Session Mgr  │  │ Credit Dash  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    x402 Middleware Layer                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  x402Protocol  │  x402Middleware  │  x402CreditMgr  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Payment Processing Layer                    │
│  ┌────────────────┐           ┌────────────────┐           │
│  │ Solana Payment │  ◄──────► │ Reown Wallet   │           │
│  │    Service     │           │  Integration   │           │
│  └────────────────┘           └────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Supabase)                 │
│  ┌─────────────┬──────────────┬─────────────┬─────────────┐ │
│  │  Sessions   │  Credits     │ Transactions│  Analytics  │ │
│  └─────────────┴──────────────┴─────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Payment Authorization**: User authorizes payment via Reown wallet
2. **Session Creation**: x402 session is created with preauthorized amount
3. **Request Processing**: HTTP requests include x402 headers
4. **Payment Deduction**: Session balance is decremented automatically
5. **Transaction Logging**: All transactions logged for auditing
6. **Analytics**: Real-time analytics and monitoring

---

## Core Components

### 1. x402Protocol Service

**Purpose**: Core protocol handler for x402 payment operations

**Key Methods**:

```typescript
// Create a payment session
X402Protocol.createPaymentSession(
  walletAddress: string,
  authorizedAmount: number,
  resourcePattern: string,
  durationHours: number,
  autoRenew: boolean
): Promise<{ success: boolean; sessionToken?: string }>

// Validate session
X402Protocol.validateSession(
  sessionToken: string,
  amount: number
): Promise<{ valid: boolean; error?: string }>

// Deduct from session
X402Protocol.deductFromSession(
  sessionToken: string,
  amount: number,
  resourceUrl: string,
  resourceType: 'agent_execution' | 'api_call' | 'data_access',
  httpMethod: string
): Promise<X402PaymentResult>
```

### 2. x402Middleware

**Purpose**: HTTP middleware for automatic payment handling

**Key Methods**:

```typescript
// Make x402-enabled request
x402Middleware.makeX402Request<T>({
  url: string,
  method: string,
  serviceId: string,
  serviceType: 'agent' | 'api' | 'web_service',
  walletAddress: string,
  sessionToken?: string,
  paymentProof?: string
}): Promise<X402Response<T>>

// Create fetch interceptor
x402Middleware.createFetchInterceptor(
  walletAddress: string,
  getSessionToken: () => Promise<string | undefined>
)
```

### 3. x402CreditManager

**Purpose**: Credit balance and top-up management

**Key Methods**:

```typescript
// Get credit balance
x402CreditManager.getCreditBalance(
  walletAddress: string,
  serviceId: string | null,
  serviceType: 'agent' | 'api' | 'web_service'
): Promise<number>

// Top up credits
x402CreditManager.topUpCredits(
  wallet: SolanaWallet,
  serviceId: string | null,
  serviceType: 'agent' | 'api' | 'web_service',
  amountUSDC: number
): Promise<CreditTopUpResult>

// Spend credits
x402CreditManager.spendCredits(
  walletAddress: string,
  serviceId: string | null,
  serviceType: 'agent' | 'api' | 'web_service',
  amount: number
): Promise<CreditSpendResult>
```

---

## Integration Patterns

### Pattern 1: AI Agent Execution with Session Payment

```typescript
import { x402Middleware } from '../services/x402Middleware';
import { useWallet } from '../hooks/useWallet';

async function executeAgent(agentId: string, inputData: any) {
  const { publicKey } = useWallet();

  // Get or create session token
  const sessionToken = await getActiveSession(agentId);

  // Make x402 request
  const response = await x402Middleware.makeX402Request({
    url: `/api/agents/${agentId}/execute`,
    method: 'POST',
    body: inputData,
    serviceId: agentId,
    serviceType: 'agent',
    walletAddress: publicKey!,
    sessionToken
  });

  if (response.success) {
    console.log('Agent executed:', response.data);
    console.log('Remaining balance:', response.remainingBalance);
  } else if (response.paymentRequired) {
    // Show payment modal
    showPaymentModal(response.requiredAmount);
  }
}
```

### Pattern 2: API Marketplace Integration

```typescript
import { X402Protocol } from '../services/x402Protocol';

async function configureAPIForX402(apiId: string) {
  // Create service configuration
  const config = await X402Protocol.createServiceConfig({
    service_id: apiId,
    service_type: 'api',
    service_name: 'My API',
    owner_wallet: walletAddress,
    accepts_x402: true,
    pricing_model: 'per_request',
    base_price: 0.001, // $0.001 per request
    min_payment: 0.001,
    max_payment: 10.0,
    currency: 'USDC',
    requires_preauth: false,
    max_session_amount: 100.0,
    allowed_origins: ['*'],
    webhook_url: 'https://api.example.com/webhooks/x402',
    is_active: true
  });

  console.log('API configured for x402:', config);
}

// Call API with x402 payment
async function callAPI(apiId: string, endpoint: string, data: any) {
  const response = await x402Middleware.makeX402Request({
    url: `https://api.example.com${endpoint}`,
    method: 'POST',
    body: data,
    serviceId: apiId,
    serviceType: 'api',
    walletAddress: currentWallet,
    sessionToken: activeSession
  });

  return response;
}
```

### Pattern 3: Autonomous Agent with Auto-Renewal

```typescript
import { X402Protocol } from '../services/x402Protocol';

// Setup autonomous agent with auto-renewing session
async function setupAutonomousAgent(agentId: string) {
  const result = await X402Protocol.createPaymentSession(
    walletAddress,
    10.0, // $10 preauthorized
    `agent/${agentId}/*`,
    168, // 7 days
    true // auto-renew enabled
  );

  if (result.success) {
    // Store session token
    localStorage.setItem(`x402_session_${agentId}`, result.sessionToken!);

    // Agent can now make unlimited calls within budget
    return result.sessionToken;
  }
}
```

### Pattern 4: Credit-Based Payment

```typescript
import { x402CreditManager } from '../services/x402CreditManager';

// Purchase credits for a service
async function purchaseCredits(serviceId: string, amount: number) {
  const wallet = await getConnectedWallet();

  const result = await x402CreditManager.topUpCredits(
    wallet,
    serviceId,
    'agent',
    amount
  );

  if (result.success) {
    console.log('Credits purchased:', result.newBalance);
    console.log('Transaction:', result.transactionSignature);
  }
}

// Use credits for instant payment
async function payWithCredits(serviceId: string, cost: number) {
  const result = await x402CreditManager.spendCredits(
    walletAddress,
    serviceId,
    'agent',
    cost
  );

  if (result.success) {
    console.log('Payment successful, remaining:', result.newBalance);
  }
}
```

### Pattern 5: Web Service Integration

```typescript
// Server-side middleware (Edge Function)
import { X402Protocol } from './x402Protocol';

export async function x402Middleware(req: Request): Promise<Response> {
  const x402Header = req.headers.get('X-402-Payment');

  if (!x402Header) {
    return new Response(JSON.stringify({
      error: 'Payment required',
      amount: 0.01,
      currency: 'USDC'
    }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const parsed = X402Protocol.parseX402Header(x402Header);

  if (parsed?.sessionToken) {
    const validation = await X402Protocol.validateSession(
      parsed.sessionToken,
      0.01
    );

    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error,
        paymentRequired: true
      }), { status: 402 });
    }

    // Deduct payment and process request
    const result = await X402Protocol.deductFromSession(
      parsed.sessionToken,
      0.01,
      req.url,
      'api_call',
      req.method
    );

    if (result.success) {
      // Continue with request processing
      return processRequest(req);
    }
  }

  return new Response('Payment validation failed', { status: 402 });
}
```

---

## API Reference

### x402 HTTP Header Format

```
X-402-Payment: session={TOKEN}; wallet={ADDRESS}; amount={AMOUNT}; currency=USDC; timestamp={UNIX_TIME}
```

**Example**:
```
X-402-Payment: session=a1b2c3d4e5f6; wallet=FbRDjtZR...; amount=0.001; currency=USDC; timestamp=1704380400000
```

### Response Codes

- `200 OK` - Payment successful, request processed
- `402 Payment Required` - Session expired or insufficient balance
- `403 Forbidden` - Invalid session or unauthorized
- `429 Too Many Requests` - Rate limit exceeded

### Database Schema

#### x402_payment_sessions
```sql
{
  id: uuid,
  wallet_address: text,
  session_token: text (unique),
  authorized_amount: numeric(18,6),
  spent_amount: numeric(18,6),
  remaining_amount: numeric(18,6),
  resource_pattern: text,
  status: enum('active', 'expired', 'revoked', 'depleted'),
  expires_at: timestamptz,
  auto_renew: boolean,
  renewal_amount: numeric(18,6),
  last_used_at: timestamptz,
  created_at: timestamptz
}
```

#### x402_payment_credits
```sql
{
  id: uuid,
  wallet_address: text,
  service_id: uuid,
  service_type: enum('agent', 'api', 'web_service'),
  credit_balance: numeric(18,6),
  total_purchased: numeric(18,6),
  total_spent: numeric(18,6),
  auto_topup_enabled: boolean,
  auto_topup_threshold: numeric(18,6),
  auto_topup_amount: numeric(18,6)
}
```

#### x402_transactions
```sql
{
  id: uuid,
  session_id: uuid,
  wallet_address: text,
  resource_url: text,
  resource_type: enum('agent_execution', 'api_call', 'data_access'),
  http_method: text,
  amount_charged: numeric(18,6),
  x402_header: text,
  payment_proof: text,
  status: enum('pending', 'completed', 'failed', 'refunded'),
  response_code: integer,
  response_time_ms: integer,
  metadata: jsonb
}
```

---

## Security Best Practices

### 1. Session Token Security
- Generate cryptographically secure tokens (32+ bytes)
- Never expose full tokens in logs
- Implement token rotation for long-lived sessions
- Store tokens securely (encrypted localStorage or memory)

### 2. Payment Validation
- Always validate session on server-side
- Verify wallet signatures for proof-based payments
- Implement rate limiting per session
- Log all payment attempts for audit

### 3. Amount Validation
- Enforce minimum and maximum payment amounts
- Validate amounts match service pricing
- Prevent over-charging attacks
- Implement transaction amount caps

### 4. Access Control
- Use RLS policies for database access
- Verify wallet ownership for all operations
- Implement origin checking for web requests
- Rate limit by wallet address

### 5. Monitoring
- Track failed payment attempts
- Alert on suspicious patterns
- Monitor session abuse
- Regular security audits

---

## Testing Strategy

### Unit Tests

```typescript
describe('X402Protocol', () => {
  test('creates valid payment session', async () => {
    const result = await X402Protocol.createPaymentSession(
      testWallet,
      10.0,
      'agent/test/*',
      24,
      false
    );
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBeDefined();
  });

  test('validates session correctly', async () => {
    const validation = await X402Protocol.validateSession(
      validToken,
      0.01
    );
    expect(validation.valid).toBe(true);
  });

  test('deducts correct amount', async () => {
    const result = await X402Protocol.deductFromSession(
      validToken,
      0.01,
      'test-url',
      'agent_execution',
      'POST'
    );
    expect(result.success).toBe(true);
    expect(result.remainingBalance).toBeLessThan(10.0);
  });
});
```

### Integration Tests

```typescript
describe('x402 End-to-End', () => {
  test('complete payment flow', async () => {
    // 1. Create session
    const session = await createSession();

    // 2. Make x402 request
    const response = await makeX402Request(session.token);

    // 3. Verify deduction
    expect(response.success).toBe(true);
    expect(response.remainingBalance).toBeLessThan(10.0);

    // 4. Verify transaction logged
    const tx = await getTransaction(response.transactionId);
    expect(tx.status).toBe('completed');
  });
});
```

### Load Tests

```typescript
// Test concurrent requests
test('handles 1000 concurrent requests', async () => {
  const promises = Array.from({ length: 1000 }, () =>
    x402Middleware.makeX402Request(config)
  );

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;

  expect(successful).toBeGreaterThan(950); // 95% success rate
});
```

---

## Deployment Guide

### Prerequisites

1. Supabase project with migrations applied
2. Reown wallet integration configured
3. Solana RPC endpoint (Helius recommended)
4. Environment variables configured

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_HELIUS_API_KEY=your_helius_key
VITE_REOWN_PROJECT_ID=your_reown_project_id
```

### Deployment Steps

1. **Apply Database Migrations**
```bash
# Migrations are automatically applied via Supabase
# Verify tables exist: x402_payment_sessions, x402_payment_credits, etc.
```

2. **Build Application**
```bash
npm run build
```

3. **Deploy Frontend**
```bash
# Deploy to your preferred hosting (Vercel, Netlify, etc.)
```

4. **Configure Services**
```typescript
// Initialize x402 for each service
await configureService(agentId, 'agent', pricing);
await configureService(apiId, 'api', pricing);
```

5. **Monitor**
- Set up alerts for failed payments
- Monitor session creation rate
- Track credit balances
- Review analytics daily

### Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Payment flows tested on mainnet
- [ ] Session creation working
- [ ] Credit top-ups working
- [ ] Transaction logging verified
- [ ] Analytics dashboard functional
- [ ] Error monitoring configured
- [ ] Rate limiting tested
- [ ] Security audit completed

---

## Troubleshooting

### Common Issues

**Issue**: Session validation fails
- Check session expiration
- Verify wallet address matches
- Confirm session is active
- Check remaining balance

**Issue**: Payment deduction fails
- Verify session has sufficient balance
- Check transaction logs
- Ensure service configuration is correct
- Verify RPC connection

**Issue**: Credit top-up fails
- Confirm wallet has sufficient SOL for fees
- Check Solana network status
- Verify transaction signature
- Review error logs

### Support

For issues or questions:
- Check transaction logs in database
- Review Supabase logs
- Monitor Solana explorer
- Contact support with transaction IDs

---

## Performance Optimization

1. **Session Caching**: Cache active sessions in memory
2. **Batch Operations**: Group multiple deductions
3. **Index Optimization**: Ensure proper database indexes
4. **RPC Selection**: Use fastest Solana RPC endpoint
5. **Connection Pooling**: Reuse database connections

---

## Future Enhancements

- [ ] Multi-currency support (SOL, BONK, etc.)
- [ ] Subscription management
- [ ] Batch payment processing
- [ ] Advanced analytics dashboard
- [ ] Mobile SDK
- [ ] API rate limiting by tier
- [ ] Refund management
- [ ] Dispute resolution
- [ ] Smart contract integration for escrow
- [ ] Cross-chain support

---

## License

MIT License - See LICENSE file for details

## Contributing

We welcome contributions! Please see CONTRIBUTING.md for guidelines.
