# Security Audit Report - Lily AI Agent Platform

**Audit Date:** January 6, 2026
**Repository:** https://github.com/lilyagent/lilyagent
**Auditor:** Security Analysis Team
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## Executive Summary

This comprehensive security audit identified **3 CRITICAL**, **2 HIGH**, **3 MEDIUM**, and **2 LOW** severity issues. Immediate action is required to address critical vulnerabilities related to exposed credentials and overly permissive database access controls.

**Risk Level:** 🔴 **HIGH** - Immediate remediation required

---

## Critical Findings (Priority 1 - Fix Immediately)

### 🔴 CRITICAL-01: Production Credentials Exposed in .env File

**Severity:** CRITICAL
**Impact:** Complete system compromise, data breach, unauthorized access
**CVSS Score:** 9.8

**Issue:**
The `.env` file exists in the working directory with production credentials:
- Supabase Project URL: `https://lhqetzpqbcusmtmtiegb.supabase.co`
- Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (exposed)
- Helius API Key: `dc2009c8-8ef0-444b-9bf4-bf677d121b81` (exposed)
- Reown Project ID: `3e9a6d5f6f101bff8055ae7b21693379` (exposed)

**Risk:**
- Anyone with repository access can read database
- API quotas can be exhausted
- Impersonation attacks possible
- Financial loss from API usage

**Remediation:**
```bash
# IMMEDIATE ACTION REQUIRED:

# 1. Remove .env from working directory
rm .env

# 2. Rotate ALL exposed credentials immediately:
#    - Generate new Supabase anon key
#    - Generate new Helius API key
#    - Generate new Reown project ID

# 3. Verify .env is in .gitignore (already done ✓)

# 4. Use environment variables in production:
#    - Set via hosting platform (Vercel, Netlify, etc.)
#    - Never commit .env to version control
```

**Status:** ✅ .env is in .gitignore (good), but ❌ file exists with real credentials

---

### 🔴 CRITICAL-02: Overly Permissive Database RLS Policies

**Severity:** CRITICAL
**Impact:** Data manipulation, unauthorized access, data integrity compromise
**CVSS Score:** 8.9

**Issue:**
Multiple database tables have RLS policies that allow anonymous users to INSERT, UPDATE, or DELETE data:

**Affected Tables:**
1. `user_wallets` - "Anyone can insert/update wallets"
2. `agent_executions` - "Anonymous can insert executions"
3. `payment_transactions` - "Anonymous can insert transactions"
4. `x402_payment_sessions` - "Anonymous can update sessions"
5. `x402_payment_credits` - "Anonymous can manage credits"
6. `api_keys` - "Anyone can create API keys"
7. `agents` - "Anyone can insert agents"
8. `apis` - "Anyone can insert APIs"

**Example Vulnerable Policy:**
```sql
-- supabase/migrations/20251103202041_create_ux_payment_flow_tables.sql:117
CREATE POLICY "Anonymous can insert wallets"
ON user_wallets FOR INSERT
TO anon
WITH CHECK (true);  -- ⚠️ NO VALIDATION!
```

**Risk:**
- Malicious actors can inject fake payment records
- Wallet data can be manipulated
- Agent execution history can be forged
- API keys can be created without authorization
- Data integrity completely compromised

**Remediation:**
```sql
-- IMMEDIATE FIX REQUIRED for each table:

-- Example for user_wallets:
DROP POLICY IF EXISTS "Anyone can insert wallets" ON user_wallets;
DROP POLICY IF EXISTS "Anyone can update wallets" ON user_wallets;

CREATE POLICY "Users can insert their own wallet"
ON user_wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON user_wallets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Repeat similar pattern for ALL affected tables
-- REQUIRE authentication and ownership validation
```

**Status:** ❌ CRITICAL - Multiple tables vulnerable

---

### 🔴 CRITICAL-03: Supabase Anon Key Exposed in Client Code

**Severity:** CRITICAL
**Impact:** Database access from any source, rate limiting bypass
**CVSS Score:** 8.1

**Issue:**
While using `VITE_SUPABASE_ANON_KEY` is standard practice for Supabase, the exposed key combined with weak RLS policies creates a critical vulnerability path.

**Location:**
- `src/lib/supabase.ts:4`

**Risk:**
- Combined with weak RLS policies, allows full database manipulation
- API key can be extracted from built JavaScript bundles
- Rate limiting can be bypassed

**Remediation:**
```typescript
// This is actually standard practice for Supabase
// BUT requires proper RLS policies (see CRITICAL-02)

// REQUIRED ACTIONS:
// 1. Fix all RLS policies (CRITICAL-02)
// 2. Rotate the anon key after fixing policies
// 3. Implement rate limiting at edge function level
// 4. Add IP-based rate limiting
// 5. Monitor for suspicious patterns
```

**Status:** ⚠️ Standard practice, but dangerous with current RLS policies

---

## High Severity Findings (Priority 2)

### 🟠 HIGH-01: Dependency Vulnerabilities

**Severity:** HIGH
**Impact:** Potential DoS, code execution, performance degradation
**CVSS Score:** 6.2-7.5

**Issues Found:**
1. **@babel/helpers** (MODERATE - CVSS 6.2)
   - CVE: GHSA-968p-4wvh-cqc8
   - Issue: Inefficient RegExp complexity (ReDoS)
   - Version: <7.26.10

2. **@solana/spl-token** (HIGH)
   - Vulnerability in transitive dependency
   - Affects: @reown/appkit-adapter-solana

3. **@eslint/plugin-kit** (LOW - CVSS 3.5)
   - CVE: GHSA-7q7g-4xm8-89cq, GHSA-xffm-g5w8-qvg7
   - Issue: ReDoS vulnerabilities
   - Version: <=0.3.3

**Remediation:**
```bash
# Update vulnerable packages
npm audit fix

# If automatic fix doesn't work:
npm update @babel/helpers
npm update @eslint/plugin-kit

# For @reown/appkit-adapter-solana:
# Check for updates or contact vendor
npm outdated @reown/appkit-adapter-solana
```

**Status:** ❌ Multiple vulnerabilities present

---

### 🟠 HIGH-02: API Key Exposure in URL (Helius RPC)

**Severity:** HIGH
**Impact:** API quota theft, rate limiting, service disruption
**CVSS Score:** 7.2

**Issue:**
Helius API key is passed in URL query parameters:

```typescript
// src/hooks/useWallet.ts:8
return apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : 'https://api.mainnet-beta.solana.com';
```

**Risk:**
- API keys in URLs are logged in browser history
- Can be leaked via Referer headers
- Exposed in network logs and debugging tools
- Visible in developer tools

**Remediation:**
```typescript
// Use HTTP headers instead:
const connection = new Connection(
  'https://mainnet.helius-rpc.com',
  {
    httpHeaders: {
      'Authorization': `Bearer ${apiKey}`
    }
  }
);

// Or use environment-based RPC endpoint selection
// without exposing the key in URLs
```

**Status:** ❌ API key in URL

---

## Medium Severity Findings (Priority 3)

### 🟡 MEDIUM-01: Insufficient Input Validation

**Severity:** MEDIUM
**Impact:** Data integrity issues, potential injection attacks
**CVSS Score:** 5.3

**Issue:**
Limited input validation on user-provided data before database operations.

**Locations:**
- API key creation (no length validation)
- Agent/API creation (limited sanitization)
- Wallet address validation (basic format check only)

**Remediation:**
```typescript
// Add comprehensive validation:
import { z } from 'zod';

const WalletAddressSchema = z.string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .min(32).max(44);

const APIKeyNameSchema = z.string()
  .min(1).max(100)
  .regex(/^[a-zA-Z0-9\s\-_]+$/);

// Validate before database operations
const validated = WalletAddressSchema.parse(address);
```

**Status:** ⚠️ Minimal validation present

---

### 🟡 MEDIUM-02: Session Storage Usage

**Severity:** MEDIUM
**Impact:** Potential XSS-based session theft
**CVSS Score:** 4.8

**Issue:**
```typescript
// src/App.tsx:86
sessionStorage.setItem('hasLoaded', 'true');
```

**Risk:**
- Session storage accessible via XSS
- No sensitive data currently stored (good)
- Future risk if sensitive data added

**Remediation:**
```typescript
// Document that sessionStorage should NEVER contain:
// - API keys
// - Auth tokens
// - Private keys
// - User PII

// Consider using httpOnly cookies for sensitive data
// Keep only non-sensitive UI state in sessionStorage
```

**Status:** ⚠️ Currently safe, but document restrictions

---

### 🟡 MEDIUM-03: Missing Rate Limiting Implementation

**Severity:** MEDIUM
**Impact:** DoS, resource exhaustion, API abuse
**CVSS Score:** 5.0

**Issue:**
Rate limiting logic exists in code but enforcement unclear:

```typescript
// src/services/apiKeyService.ts:302
async checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining: number }>
```

**Risk:**
- API endpoints can be abused
- Database can be overloaded
- Credit system can be exploited

**Remediation:**
```typescript
// Implement rate limiting middleware
// Use Supabase Edge Functions with rate limiting
// Add IP-based rate limiting
// Implement exponential backoff

// Example Supabase Edge Function:
export default async function handler(req: Request) {
  const ip = req.headers.get('x-forwarded-for');
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Process request...
}
```

**Status:** ⚠️ Logic exists but enforcement unclear

---

## Low Severity Findings (Informational)

### 🟢 LOW-01: Console Logging in Production

**Severity:** LOW
**Impact:** Information disclosure, log clutter
**CVSS Score:** 2.1

**Issue:**
Multiple console.log statements in production code:
- `src/services/apiKeyService.ts` (lines 71, 104, 108, 186, 207)
- Other service files

**Remediation:**
```typescript
// Use environment-based logging
const isDev = import.meta.env.DEV;
if (isDev) {
  console.log('[APIKeyService] Creating API key for:', params);
}

// Or use a proper logging library
import { logger } from './utils/logger';
logger.debug('Creating API key', { params });
```

**Status:** ℹ️ Minor information leak

---

### 🟢 LOW-02: Example Private Key in Documentation

**Severity:** LOW
**Impact:** None (clearly marked as example)
**CVSS Score:** 1.0

**Issue:**
```typescript
// docs/PAYMENT_QUICK_REFERENCE.md:300
const privateKey = 'abc123...';  // Example in "NEVER do this" section
```

**Status:** ✅ Acceptable - clearly marked as anti-pattern example

---

## Repository Configuration Audit

### ✅ Good Practices Found:

1. **`.gitignore` Properly Configured**
   - `.env` is excluded ✓
   - `node_modules` excluded ✓
   - Build artifacts excluded ✓

2. **No Private Keys in Code**
   - No hardcoded private keys ✓
   - No seed phrases ✓
   - Wallet integration uses external providers ✓

3. **Secure Random Generation**
   - Uses `crypto.getRandomValues()` ✓
   - Proper key hashing with SHA-256 ✓

4. **No SQL Injection Vulnerabilities**
   - Parameterized queries via Supabase ✓
   - No raw SQL with user input ✓

5. **No XSS Vulnerabilities**
   - No `dangerouslySetInnerHTML` usage ✓
   - No `eval()` calls ✓
   - No direct `innerHTML` manipulation ✓

---

## Remediation Priority

### Immediate Action (Today):
1. ✅ **Remove .env file from working directory**
2. ✅ **Rotate all exposed credentials**
3. ✅ **Fix critical RLS policies**

### This Week:
4. Update vulnerable dependencies
5. Fix API key URL exposure
6. Implement comprehensive input validation

### This Month:
7. Add rate limiting enforcement
8. Remove console.log statements
9. Add security monitoring
10. Implement automated security scanning

---

## Security Recommendations

### 1. Credential Management
```bash
# Use environment variables via hosting platform
# Vercel example:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_HELIUS_API_KEY
vercel env add VITE_REOWN_PROJECT_ID
```

### 2. Database Security
```sql
-- Template for secure RLS policies:
CREATE POLICY "policy_name"
ON table_name FOR operation
TO authenticated  -- Never use 'anon' for write operations
USING (auth.uid() = user_id)  -- Always verify ownership
WITH CHECK (auth.uid() = user_id);  -- Validate on insert/update
```

### 3. API Security
- Implement API key rotation policy (90 days)
- Add IP whitelisting for sensitive operations
- Monitor for unusual patterns
- Set up alerts for failed auth attempts

### 4. Monitoring & Logging
```typescript
// Implement structured logging
import { logger } from './utils/logger';

logger.security({
  event: 'unauthorized_access_attempt',
  ip: req.ip,
  resource: req.path,
  timestamp: new Date().toISOString()
});
```

### 5. CI/CD Security
```yaml
# Add to GitHub Actions:
- name: Security Scan
  run: |
    npm audit --audit-level=moderate
    npm run test:security

- name: Check for secrets
  uses: trufflesecurity/trufflehog@main
```

---

## Compliance Checklist

- [ ] OWASP Top 10 Review
- [ ] PCI DSS Compliance (if handling payments)
- [ ] GDPR Compliance (if EU users)
- [ ] SOC 2 Controls
- [ ] Penetration Testing
- [ ] Bug Bounty Program

---

## Next Steps

1. **Immediate (Next 24 hours):**
   - Remove .env file
   - Rotate ALL credentials
   - Deploy RLS policy fixes

2. **Short Term (This Week):**
   - Update dependencies
   - Fix URL-based API key exposure
   - Implement rate limiting

3. **Medium Term (This Month):**
   - Security audit of Edge Functions
   - Implement automated security scanning
   - Create security documentation

4. **Ongoing:**
   - Monthly dependency audits
   - Quarterly security reviews
   - Continuous monitoring

---

## Contact

For security issues, please contact:
- Security Team: security@lilyagent.io
- Report vulnerabilities via GitHub Security Advisories

---

**Report Version:** 1.0
**Last Updated:** January 6, 2026
**Next Review:** February 6, 2026
