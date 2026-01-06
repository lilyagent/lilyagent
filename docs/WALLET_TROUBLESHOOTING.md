# Wallet Connection & Payment Troubleshooting Guide

## Issue Fixed: Incorrect Reown Project ID

**Problem:** Your `.env` file had a demo project ID instead of your actual Reown project ID.

**Fixed:** Updated `.env` with your project ID: `3e9a6d5f6f101bff8055ae7b21693379`

---

## CRITICAL: Restart Your Dev Server

**Environment variables are loaded when the dev server starts.** After updating `.env`, you MUST restart:

1. Stop your current dev server (Ctrl+C or Cmd+C)
2. Start it again: `npm run dev`
3. Or hard refresh your browser if using the built version

---

## Quick Testing Steps

### 1. Verify Configuration
Open browser console (F12) and check:
```javascript
console.log(import.meta.env.VITE_REOWN_PROJECT_ID)
// Should show: 3e9a6d5f6f101bff8055ae7b21693379
```

If it shows the old demo value, restart your dev server.

### 2. Test Wallet Connection
1. Click "Connect Wallet" in navigation
2. Reown modal should open
3. Select your wallet
4. Approve connection
5. Verify address shows in navigation

### 3. Test Payment
1. Go to any agent detail page
2. Enter a query
3. Click "Pay Per Use" button
4. Payment modal should open without errors
5. Click "Pay Now"
6. Wallet should prompt for approval

---

## Common Issues

### Payment Modal Shows "Wallet not connected" Error

**Cause:** Dev server not restarted after changing `.env`

**Solution:**
```bash
# Stop server (Ctrl+C), then:
npm run dev
```

Then hard refresh browser (Ctrl+Shift+R)

### Reown Modal Doesn't Open

**Cause:** Cached old configuration

**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Try incognito/private window

### Wallet Connects But Payment Fails

**Possible causes:**
- Insufficient SOL balance (need ~0.001 SOL)
- Network issues
- Wallet extension needs update

**Check balance:**
```javascript
// In console after connecting
const { balance } = useWallet();
console.log(balance); // Should show SOL amount
```

---

## Success Checklist

After restarting dev server, verify:

- [ ] Console shows correct project ID: `3e9a6d5f6f101bff8055ae7b21693379`
- [ ] "Connect Wallet" opens Reown modal
- [ ] Wallet connects successfully
- [ ] Payment modal opens without errors
- [ ] "Pay Now" button is enabled
- [ ] Wallet prompts for transaction approval

---

## Still Not Working?

1. Check console for errors
2. Verify wallet extension is installed and unlocked
3. Ensure you have SOL in wallet
4. Try different wallet (Phantom vs Solflare)
5. Check Solana network status: status.solana.com

**Report what you see:**
- Any console errors?
- Does Reown modal open?
- Does wallet connect?
- What happens when clicking "Pay Now"?
