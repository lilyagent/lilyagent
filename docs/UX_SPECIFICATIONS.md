# LABORY.FUN - UX Specifications & Feature Requirements
## Solana AI Agent Platform with x402 Payment Protocol

---

## 1. USER PERSONAS

### Persona A: Crypto-Native Developer
- **Background**: Experienced with blockchain, holds crypto, familiar with Web3
- **Goals**: Build and monetize AI agents, integrate APIs, earn USDC
- **Pain Points**: Complex payment integration, unclear pricing models
- **Needs**: Clear documentation, seamless wallet integration, transparent earnings

### Persona B: AI Enthusiast (Crypto Beginner)
- **Background**: Interested in AI, limited crypto experience
- **Goals**: Use pre-built AI agents for tasks, simple payment flow
- **Pain Points**: Wallet setup confusion, transaction anxiety, cost uncertainty
- **Needs**: Guided onboarding, cost transparency, error recovery

### Persona C: Business User
- **Background**: Looking for AI automation, wants predictable costs
- **Goals**: Access reliable AI agents, track usage and spending
- **Pain Points**: Unpredictable costs, complicated blockchain concepts
- **Needs**: Clear pricing, usage dashboard, receipt tracking

---

## 2. USER JOURNEY MAPS

### Journey 1: First-Time User Executing an Agent

**Stage 1: Discovery (Landing Page)**
- User arrives at landing page
- Sees compelling value proposition
- Views "SCROLL TO EXPLORE" prompt
- Scrolls to dashboard

**Stage 2: Onboarding**
- **Trigger**: First visit detected via sessionStorage
- **Flow**:
  1. Welcome screen with platform overview
  2. Wallet connection explanation
  3. Payment protocol education
  4. Quick start guide
- **Success Criteria**: User understands payment flow before executing

**Stage 3: Wallet Connection**
- **Trigger**: User clicks "Connect Wallet" button
- **Flow**:
  1. Modal displays supported wallets (Phantom, Solflare, Backpack)
  2. User selects wallet
  3. Wallet extension prompts for approval
  4. Connection confirmed with visual feedback
  5. Wallet address displayed in nav (truncated format)
- **Error Handling**:
  - Wallet not installed → Link to installation page
  - Connection rejected → Clear message, retry option
  - Network error → Retry with exponential backoff
- **Success Criteria**: Green dot indicator, address visible

**Stage 4: Agent Discovery**
- User browses marketplace
- Filters by category, cost, rating
- Views agent details:
  - Description
  - Cost in USDC
  - Creator info
  - Example use cases
  - Expected execution time

**Stage 5: Agent Execution Request**
- User clicks "Execute" on agent
- If payment required:
  - **Payment Review Screen**:
    - Agent name
    - Exact USDC cost
    - Network fee estimate
    - Total cost
    - Educational tooltip about x402 protocol
  - User clicks "Pay Now"

**Stage 6: Payment Flow (x402 Protocol)**

**Step 1: Creating Transaction**
- Visual: Animated loader
- Message: "Creating Transaction"
- Backend: Generates USDC transfer transaction
- Duration: ~800ms

**Step 2: Wallet Signature Request**
- Visual: Pulsing wallet icon
- Message: "Approve in Wallet"
- Action: User approves in wallet extension
- Timeout: 60 seconds
- Cancel option available

**Step 3: Transaction Sent**
- Transaction submitted to Solana blockchain
- Visual: Spinning confirmation icon

**Step 4: Blockchain Verification**
- Progress bar shows confirmations (0/3 → 3/3)
- Real-time updates via WebSocket/polling
- Each confirmation: ~400-600ms on Solana
- Visual: Confirmation counter, progress bar

**Step 5: x-Payment Header Creation**
- Backend creates x-Payment header with transaction signature
- Header structure:
  ```json
  {
    "transaction_signature": "...",
    "amount": 0.01,
    "timestamp": "...",
    "wallet_address": "..."
  }
  ```

**Step 6: Payment Verification**
- Backend verifies:
  1. Transaction exists on-chain
  2. Transaction is confirmed
  3. Amount matches required payment
  4. Transaction not already used
  5. Recipient address is correct
- Database marks transaction as "used"

**Stage 7: Agent Execution**
- Payment verified → Agent starts processing
- **Execution Tracker Shows**:
  - Status indicator (Processing)
  - Elapsed time counter
  - Cost display
  - Transaction link to Solscan
  - Progress bar (estimated)
- **Real-time Updates**: Status changes via Supabase realtime
- **Completion**: Results displayed in formatted view

**Stage 8: Post-Execution**
- Success message
- Results displayed
- Options:
  - View transaction on Solscan
  - Execute again
  - Try different agent
  - Share results
- History saved in "My Executions"

---

### Journey 2: Error Recovery Flow

**Scenario A: Insufficient Funds**
- **Trigger**: Wallet has insufficient USDC
- **Detection**: Pre-flight check before transaction
- **User Experience**:
  1. Clear error message: "Insufficient USDC Balance"
  2. Current balance displayed
  3. Required amount highlighted
  4. Action buttons:
     - "Get USDC" (link to exchange)
     - "Try Different Agent"
     - "Cancel"
- **Database**: Error logged in transaction_errors table

**Scenario B: User Rejects Signature**
- **Trigger**: User clicks "Reject" in wallet
- **User Experience**:
  1. Payment flow returns to review screen
  2. Message: "Signature request was cancelled"
  3. Options:
     - "Try Again"
     - "Cancel"
- **No penalty**: User can retry immediately

**Scenario C: Network Timeout**
- **Trigger**: Transaction not confirmed in 30 seconds
- **User Experience**:
  1. Loader changes to warning state
  2. Message: "Taking longer than usual..."
  3. Options:
     - "Keep Waiting" (extends timeout)
     - "Check Status" (queries blockchain directly)
     - "Cancel and Retry"
- **Backend**: Continues monitoring transaction

**Scenario D: Payment Verification Failed**
- **Trigger**: Transaction found but invalid
- **Possible Reasons**:
  - Insufficient amount
  - Wrong recipient
  - Already used (replay attack)
- **User Experience**:
  1. Clear error with specific reason
  2. Transaction link for user verification
  3. Support contact option
  4. "Try New Payment" button
- **Database**: Full error context logged

**Scenario E: Agent Execution Failed**
- **Trigger**: Agent returns error after payment
- **User Experience**:
  1. Payment was successful (shown)
  2. Agent execution failed (shown separately)
  3. Error message from agent
  4. Options:
     - "Retry Execution" (free, payment already made)
     - "Contact Support"
     - "View Transaction"
- **Refund Policy**: Displayed with support contact

---

## 3. FEATURE SPECIFICATIONS

### Feature 1: Wallet Connection Interface

**Priority**: P0 (Critical)

**Requirements**:
- Support Phantom, Solflare, Backpack wallets
- Auto-detect installed wallets
- Display connection status persistently
- Show truncated address (4 chars...4 chars)
- Green dot indicator when connected
- One-click disconnect
- Reconnect on page refresh if previously connected

**Technical Implementation**:
- Use window.solana, window.solflare, window.backpack
- Store connection in localStorage + Supabase
- Event listeners for wallet account changes
- Graceful handling of wallet switching

**Success Metrics**:
- >95% successful connections
- <3 seconds average connection time
- <1% connection errors

---

### Feature 2: Payment Flow with x402 Protocol

**Priority**: P0 (Critical)

**User Interface Requirements**:
- **Step Indicator**: Visual progress (5 steps)
- **Cost Transparency**:
  - Agent cost (USDC)
  - Network fee (~$0.0001 SOL)
  - Total cost
  - No hidden fees
- **Real-time Feedback**: Each step shows visual progress
- **Timeout Handling**: 60s wallet, 30s blockchain
- **Cancel Anytime**: Before signature
- **Transaction Link**: Always accessible after submission

**Backend Integration Points**:

1. **Payment Request Initiation**
   ```typescript
   POST /api/agent/:agentId/execute
   Response: { paymentRequired: true, cost: 0.01, recipientAddress: "..." }
   ```

2. **Transaction Creation**
   - Frontend creates USDC transfer transaction
   - Uses @solana/web3.js
   - Sets recipient from agent creator
   - Amount from API response

3. **Signature Request**
   - wallet.signTransaction()
   - User approval in extension
   - Signed transaction returned

4. **Blockchain Submission**
   - sendRawTransaction()
   - Get transaction signature
   - Wait for confirmations

5. **Verification Request**
   ```typescript
   POST /api/agent/:agentId/execute
   Headers: { 'X-Payment': '<base64-encoded-payment-data>' }
   Body: { executionParams: {...} }
   ```

6. **Backend Verification**
   - Decode X-Payment header
   - Query Solana blockchain for transaction
   - Verify: amount, recipient, confirmation, not-used
   - Mark transaction as used in database
   - Return 200 OK or 402 with reason

**Error Codes**:
- 402: Payment Required
- 400: Invalid payment header
- 409: Transaction already used
- 402: Insufficient amount
- 402: Transaction not found
- 402: Transaction not confirmed

**Database Schema** (Created):
- `payment_transactions`: Full transaction records
- `agent_executions`: Links payments to executions
- `transaction_errors`: Error logging

**Success Metrics**:
- >98% successful payments
- <5 seconds average payment time
- <2% user-initiated cancellations

---

### Feature 3: Agent Execution Tracker

**Priority**: P0 (Critical)

**Requirements**:
- Real-time status updates (Supabase realtime)
- Status indicators:
  - Pending (gray, clock icon)
  - Payment Required (yellow)
  - Processing (blue, animated)
  - Completed (green, checkmark)
  - Failed (red, error icon)
  - Rejected (orange, payment issue)
- Elapsed time counter during processing
- Progress estimation (if agent provides)
- Transaction link always visible
- Cost display
- Results formatting (JSON, text, links)
- Error messages with recovery options

**Technical Implementation**:
- Supabase subscription to agent_executions table
- Update UI on postgres_changes event
- Poll as fallback if realtime unavailable
- Store execution history locally + database

**Success Metrics**:
- <500ms status update latency
- 100% uptime on status tracking
- >95% user satisfaction on progress visibility

---

### Feature 4: Onboarding Flow

**Priority**: P1 (High)

**Requirements**:
- 4-step tutorial on first visit
- Progressive disclosure of features
- Skip option at any time
- Never show again after completion
- Track progress in database
- Contextual help tooltips
- Video/GIF demonstrations

**Steps**:
1. Welcome + Value Proposition
2. Wallet Connection Explanation
3. Payment Protocol Education
4. Quick Start Guide

**Technical Implementation**:
- Check user_onboarding table on mount
- Show if not completed
- Update progress after each step
- Store completed_at timestamp

**Success Metrics**:
- <10% skip rate
- >80% completion rate
- >90% reduced support inquiries from onboarded users

---

### Feature 5: Error Handling & Recovery

**Priority**: P0 (Critical)

**Requirements**:
- Clear, non-technical error messages
- Specific recovery actions for each error type
- No dead-ends: always offer next step
- Error logging for debugging
- Support contact easily accessible
- Transaction history for user reference

**Error Types & Handling**:

| Error Type | User Message | Recovery Actions | Logged Data |
|------------|--------------|------------------|-------------|
| Insufficient Funds | "Not enough USDC in wallet" | Get USDC, Cancel | Wallet balance, required amount |
| User Rejected | "Signature cancelled" | Try Again, Cancel | Transaction details |
| Network Timeout | "Transaction pending..." | Wait, Check Status, Retry | Tx signature, timestamp |
| Invalid Payment | "Payment verification failed" | View Details, Support, Retry | Verification reason, tx data |
| Agent Error | "Execution failed" | Retry Free, Support | Agent error, stack trace |
| Wallet Disconnected | "Wallet disconnected" | Reconnect | Last connected wallet type |

**Technical Implementation**:
- try/catch all async operations
- Specific error types mapped to user messages
- transaction_errors table for analytics
- Error boundaries for React components
- Sentry/LogRocket integration

**Success Metrics**:
- >90% error recovery rate
- <5% support tickets from errors
- 100% errors logged and traceable

---

## 4. TECHNICAL INTEGRATION POINTS

### Wallet Integration

**Supported Wallets**:
```typescript
interface SolanaWallet {
  publicKey: PublicKey;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
}

// Detection
window.solana // Phantom
window.solflare // Solflare
window.backpack // Backpack
```

**Connection Flow**:
1. Check if wallet installed
2. Call wallet.connect()
3. Get publicKey
4. Store in state + localStorage + Supabase
5. Subscribe to accountChanged events
6. Handle disconnections gracefully

---

### Payment Protocol (x402)

**Transaction Creation**:
```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: walletPublicKey,
    toPubkey: new PublicKey(recipientAddress),
    lamports: amountInLamports,
  })
);

transaction.feePayer = walletPublicKey;
transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

const signed = await wallet.signTransaction(transaction);
const signature = await connection.sendRawTransaction(signed.serialize());
```

**X-Payment Header Format**:
```json
{
  "version": "1.0",
  "network": "solana-mainnet",
  "token": "USDC",
  "transaction_signature": "5Xz...",
  "amount": "0.01",
  "sender": "7Xv...",
  "recipient": "9Xy...",
  "timestamp": "2025-11-03T10:30:00Z"
}
```

Base64 encode before sending:
```typescript
const header = btoa(JSON.stringify(paymentData));
headers['X-Payment'] = header;
```

**Backend Verification Steps**:
1. Decode Base64 header
2. Parse JSON
3. Query Solana RPC:
   ```typescript
   const tx = await connection.getTransaction(signature);
   ```
4. Verify transaction exists
5. Check confirmation status (min 1 confirmation)
6. Validate amount matches
7. Validate recipient matches
8. Check not previously used (database query)
9. Mark as used if valid
10. Return 200 or 402 with specific error

---

### Real-time Updates

**Supabase Realtime**:
```typescript
const subscription = supabase
  .channel(`execution_${executionId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'agent_executions',
    filter: `id=eq.${executionId}`
  }, (payload) => {
    // Update UI
  })
  .subscribe();
```

**Fallback Polling**:
```typescript
if (!realtimeWorking) {
  setInterval(async () => {
    const { data } = await supabase
      .from('agent_executions')
      .select('status')
      .eq('id', executionId)
      .single();
    // Update UI
  }, 2000);
}
```

---

### Mobile Responsiveness

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile-Specific Adjustments**:
- Full-screen modals on mobile
- Bottom sheet for payment flow
- Larger touch targets (min 44px)
- Simplified navigation
- Collapsible sections
- Horizontal scrolling for agent cards
- Mobile wallet deep-linking

**Touch Gestures**:
- Swipe to dismiss modals
- Pull to refresh execution list
- Long-press for details

---

## 5. SUCCESS METRICS & VALIDATION

### Key Performance Indicators (KPIs)

**User Acquisition**:
- New wallet connections per day
- Onboarding completion rate: Target >80%
- Time to first execution: Target <5 minutes

**Engagement**:
- Daily active wallets
- Average executions per user: Target >3/week
- Return user rate: Target >60%

**Payment Success**:
- Payment completion rate: Target >98%
- Average payment time: Target <5 seconds
- Payment error rate: Target <2%

**User Satisfaction**:
- Task completion rate: Target >95%
- Error recovery rate: Target >90%
- NPS score: Target >50

**Technical Performance**:
- Page load time: Target <2 seconds
- Time to interactive: Target <3 seconds
- API response time: Target <500ms
- 99.9% uptime

---

### A/B Testing Plan

**Test 1: Onboarding Flow**
- **Variant A**: 4-step tutorial (current)
- **Variant B**: Single-page interactive guide
- **Variant C**: Video-first onboarding
- **Metric**: Completion rate, time to first execution

**Test 2: Payment Review Screen**
- **Variant A**: Detailed breakdown (current)
- **Variant B**: Simplified one-line cost
- **Metric**: Payment abandonment rate

**Test 3: Wallet Connection**
- **Variant A**: Modal (current)
- **Variant B**: Inline drawer
- **Metric**: Connection success rate

---

### User Feedback Collection

**Methods**:
1. **In-App Surveys**: After first execution, after errors
2. **Support Chat**: Integrated help widget
3. **Analytics**: Hotjar, PostHog for session recordings
4. **Exit Surveys**: When user disconnects wallet
5. **Community**: Discord, Twitter feedback

**Questions**:
- "How easy was it to connect your wallet?" (1-5)
- "Did you understand the payment process?" (Yes/No)
- "What was confusing or frustrating?"
- "What feature would you like to see next?"

---

## 6. FUTURE ENHANCEMENTS

### Phase 2 Features
- Multi-signature transactions for team accounts
- Scheduled agent executions
- Subscription plans (prepaid credits)
- Agent output export (PDF, CSV)
- API key generation for developers

### Phase 3 Features
- Mobile app (React Native)
- Batch agent execution
- Agent chaining (output → input)
- Analytics dashboard for creators
- Revenue sharing for agent referrals

### Phase 4 Features
- Cross-chain support (Ethereum, Polygon)
- Fiat on-ramps (credit card to USDC)
- White-label platform for enterprises
- Advanced agent marketplace features
- Social features (following, favorites, reviews)

---

## IMPLEMENTATION CHECKLIST

- [x] Database schema created
- [x] Wallet connection component built
- [x] Payment flow UI implemented
- [x] Agent execution tracker created
- [x] Onboarding flow designed
- [ ] Error handling comprehensive
- [ ] Mobile responsive testing
- [ ] x402 backend verification
- [ ] Real-time updates tested
- [ ] Analytics integration
- [ ] User testing sessions
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation complete

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Owner**: Product & UX Team
**Status**: Implementation In Progress
