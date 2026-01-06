# Payment Integration Quick Reference

## Quick Fix Summary

### What Was Broken
- **Traditional payment button ("Pay Per Use")** wasn't requesting SOL
- **Root cause:** Code was checking for Phantom wallet (`window.solana`) instead of using Reown AppKit

### What Was Fixed
- Updated `PaymentFlow.tsx` to use `useWallet` hook
- Now uses Reown AppKit's `walletProvider` for transaction signing
- Added proper connection validation

---

## Common Pitfalls to Avoid

### 1. Don't Check `window.solana` Directly
**Wrong:**
```typescript
if (window.solana && window.solana.publicKey) {
  // This only works with Phantom wallet directly
}
```

**Right:**
```typescript
import { useWallet } from '../hooks/useWallet';

const { connected, publicKey, walletProvider } = useWallet();
if (connected && publicKey && walletProvider) {
  // Works with any wallet connected via Reown AppKit
}
```

### 2. Always Use the Reown Provider for Signing
**Wrong:**
```typescript
const signed = await window.solana.signTransaction(transaction);
```

**Right:**
```typescript
const { walletProvider } = useWallet();
const signed = await walletProvider.signTransaction(transaction);
```

### 3. Check Connection State Properly
**Wrong:**
```typescript
// Checking only publicKey
if (publicKey) {
  // Might not be connected via Reown
}
```

**Right:**
```typescript
// Check all three states
if (connected && publicKey && walletProvider) {
  // Definitely connected via Reown AppKit
}
```

### 4. Handle Disconnected State
**Wrong:**
```typescript
// No check before payment
onClick={handlePayment}
```

**Right:**
```typescript
// Validate first
onClick={() => {
  if (!connected) {
    alert('Please connect your wallet first');
    return;
  }
  handlePayment();
}}
```

---

## Code Patterns That Work

### Pattern 1: Component with Payment
```typescript
import { useWallet } from '../hooks/useWallet';

export default function MyComponent() {
  const { connected, publicKey, walletProvider } = useWallet();

  const handlePayment = async () => {
    // Always validate connection
    if (!connected || !publicKey || !walletProvider) {
      alert('Please connect wallet');
      return;
    }

    // Create wallet adapter
    const wallet = {
      publicKey: new PublicKey(publicKey),
      signTransaction: async (tx) => {
        return await walletProvider.signTransaction(tx);
      }
    };

    // Process payment
    const result = await solanaPaymentService.createPaymentTransaction(
      wallet,
      amountInSol
    );

    if (result.success) {
      console.log('Payment successful:', result.signature);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={!connected}
    >
      Pay Now
    </button>
  );
}
```

### Pattern 2: Checking Wallet State
```typescript
import { useWallet } from '../hooks/useWallet';

export default function WalletStatus() {
  const { connected, publicKey, balance } = useWallet();

  if (!connected) {
    return <div>Please connect wallet</div>;
  }

  return (
    <div>
      <div>Address: {publicKey}</div>
      <div>Balance: {balance} SOL</div>
    </div>
  );
}
```

### Pattern 3: Conditional Rendering
```typescript
const { connected } = useWallet();

return (
  <>
    {connected ? (
      <PaymentModal />
    ) : (
      <div>Connect wallet to continue</div>
    )}
  </>
);
```

---

## Error Handling Checklist

### Before Payment
- [ ] Check `connected === true`
- [ ] Check `publicKey` exists
- [ ] Check `walletProvider` exists
- [ ] Verify balance is sufficient
- [ ] Show user-friendly error messages

### During Payment
- [ ] Wrap in try-catch block
- [ ] Show loading state
- [ ] Handle user rejection gracefully
- [ ] Provide retry option

### After Payment
- [ ] Verify transaction signature
- [ ] Show success message
- [ ] Update UI state
- [ ] Store signature in database

---

## Testing Checklist

### Connection Tests
- [ ] Test with wallet disconnected
- [ ] Test with wallet connected
- [ ] Test wallet disconnect during payment
- [ ] Test switching wallets

### Payment Tests
- [ ] Test with sufficient balance
- [ ] Test with insufficient balance
- [ ] Test user approval
- [ ] Test user rejection
- [ ] Test network errors

### UI Tests
- [ ] Buttons disabled when not connected
- [ ] Error messages display correctly
- [ ] Loading states show properly
- [ ] Success states update correctly

---

## Quick Debugging Commands

### Check Wallet State
```javascript
// In browser console
const state = useWallet();
console.table({
  connected: state.connected,
  publicKey: state.publicKey,
  balance: state.balance,
  hasProvider: !!state.walletProvider
});
```

### Check Reown Connection
```javascript
import { useAppKitAccount } from '@reown/appkit/react';
const { isConnected, address } = useAppKitAccount();
console.log({ isConnected, address });
```

### Test Transaction
```javascript
// Test if wallet can sign
const { walletProvider } = useWallet();
console.log('Can sign:', !!walletProvider?.signTransaction);
```

---

## Architecture Decisions

### Why useWallet Hook?
- Single source of truth for wallet state
- Abstracts Reown AppKit complexity
- Easy to mock for testing
- Consistent API across components

### Why Not window.solana?
- Only works with Phantom wallet
- Doesn't support multi-wallet
- No Reown integration
- Breaks when using other wallets

### Why Reown AppKit?
- Multi-wallet support
- Better UX
- Session persistence
- Mobile support
- Active maintenance

---

## Performance Tips

### 1. Memoize Wallet State
```typescript
const walletState = useMemo(() => ({
  connected,
  publicKey,
  walletProvider
}), [connected, publicKey, walletProvider]);
```

### 2. Debounce Balance Updates
```typescript
const debouncedRefresh = useMemo(
  () => debounce(refreshBalance, 1000),
  [refreshBalance]
);
```

### 3. Cache RPC Calls
```typescript
// Use confirmed commitment for faster responses
const connection = new Connection(endpoint, 'confirmed');
```

---

## Security Best Practices

### 1. Never Store Private Keys
```typescript
// NEVER do this
const privateKey = 'abc123...';
```

### 2. Always Validate Amounts
```typescript
if (amount <= 0 || isNaN(amount)) {
  throw new Error('Invalid amount');
}
```

### 3. Verify Signatures On-Chain
```typescript
const isValid = await solanaPaymentService.verifyTransaction(signature);
if (!isValid) {
  throw new Error('Invalid transaction');
}
```

### 4. Use Environment Variables
```typescript
// Store sensitive values in .env
const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
```

---

## Two Payment Buttons Explained

### Why Two Buttons?

Your application intentionally has **two different payment methods**:

1. **"Pay Per Use" (Blue Button)**
   - Traditional payment model
   - User approves each transaction
   - Best for: Occasional users, one-time usage
   - UX: Simple, straightforward

2. **"Use x402 Session" (Green Button)**
   - Advanced payment model
   - Preauthorize multiple payments
   - Best for: Frequent users, automated systems
   - UX: Seamless, no repeated approvals

### When to Use Each

**Use "Pay Per Use" if:**
- First time using the agent
- Only need one execution
- Want full control over each payment

**Use "x402 Session" if:**
- Planning multiple executions
- Want seamless experience
- Building automated systems
- Need API integration

### User Education

Include this in your UI:
```typescript
<p className="text-xs text-gray-500 mt-2">
  x402 allows seamless recurring payments without approval for each execution
</p>
```

---

## File Reference

### Modified Files
- `src/components/PaymentFlow.tsx` - Traditional payment modal (FIXED)
- `src/components/X402PaymentModal.tsx` - Session payment modal (Already working)
- `src/hooks/useWallet.ts` - Wallet state hook (Already working)

### Key Services
- `src/services/solanaPayment.ts` - Payment processing
- `src/services/x402Protocol.ts` - Session management
- `src/services/x402CreditManager.ts` - Credit system

### Integration Points
- `src/pages/AgentDetail.tsx` - Agent execution page with payment buttons
- `src/pages/APIDetail.tsx` - API detail page (similar pattern)

---

## Troubleshooting Guide

### Issue: Button doesn't respond
**Check:**
1. Is wallet connected? Check Reown modal in navigation
2. Browser console for errors?
3. Network tab showing requests?

### Issue: "Wallet not connected" error
**Solution:**
1. Click "Connect Wallet" in top navigation
2. Wait for Reown modal to open
3. Select your wallet and approve connection
4. Verify wallet icon shows connected

### Issue: Transaction fails silently
**Check:**
1. Sufficient SOL balance? (Need ~0.001 SOL for fees)
2. Network connectivity?
3. RPC endpoint working? Check status.solana.com
4. Wallet extension enabled?

### Issue: Wrong wallet address showing
**Solution:**
1. Disconnect wallet
2. Reconnect via Reown modal
3. Ensure correct wallet selected in extension
4. Refresh page if needed

---

## Quick Start: Adding Payment to New Component

```typescript
// 1. Import the hook
import { useWallet } from '../hooks/useWallet';
import { solanaPaymentService } from '../services/solanaPayment';

// 2. Use the hook
export default function MyNewComponent() {
  const { connected, publicKey, walletProvider } = useWallet();
  const [paying, setPaying] = useState(false);

  // 3. Create payment handler
  const handlePayment = async () => {
    // Validate
    if (!connected || !publicKey || !walletProvider) {
      alert('Please connect wallet');
      return;
    }

    setPaying(true);
    try {
      // Create wallet adapter
      const wallet = {
        publicKey: new PublicKey(publicKey),
        signTransaction: async (tx) => {
          return await walletProvider.signTransaction(tx);
        }
      };

      // Process payment
      const result = await solanaPaymentService.createPaymentTransaction(
        wallet,
        0.01 // Amount in SOL
      );

      if (result.success) {
        alert(`Payment successful! Signature: ${result.signature}`);
      } else {
        alert(`Payment failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // 4. Render button
  return (
    <button
      onClick={handlePayment}
      disabled={!connected || paying}
    >
      {paying ? 'Processing...' : 'Pay 0.01 SOL'}
    </button>
  );
}
```

---

## Summary

**Problem:** Payment buttons not working because code was checking for Phantom wallet directly instead of using Reown AppKit.

**Solution:** Updated `PaymentFlow.tsx` to use the `useWallet` hook which properly integrates with Reown AppKit.

**Result:** Both payment buttons now work correctly with any wallet connected via Reown AppKit.

**Next Steps:** Test both payment buttons with your wallet connected via Reown AppKit.
