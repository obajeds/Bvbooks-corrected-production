# BVBooks Dependency Policy (MVP-safe)

## Core Rules

| Rule | Enforcement |
|------|-------------|
| **Version Locking** | All dependencies must use exact versions (no `^` or `~`) |
| **Vulnerability Scanning** | Automated scans run on every PR via CI |
| **Critical Blocking** | Critical/High CVEs block deployment |
| **Major Upgrades** | Require manual review + staging test before merge |

---

## High-Risk Dependencies

These libraries require **extra scrutiny** on any update:

### Authentication & Sessions
- `@supabase/supabase-js` - Core auth provider
- Session management utilities

### Cryptography & Security
- `crypto` (Web Crypto API) - Encryption operations
- Any HMAC/hashing utilities

### Offline Storage
- IndexedDB wrappers
- Local encryption libraries

### Payments
- Paystack SDK/webhooks
- Any payment processing code

---

## Update Procedure

### Patch Updates (x.x.PATCH)
1. Review changelog for security fixes
2. Run automated tests
3. Deploy if green

### Minor Updates (x.MINOR.x)
1. Review changelog thoroughly
2. Check for breaking changes in types
3. Test affected features manually
4. Deploy after staging validation

### Major Updates (MAJOR.x.x)
1. Create dedicated branch
2. Full regression test suite
3. Manual QA on staging
4. Security team sign-off for high-risk deps
5. Rollback plan documented

---

## Vulnerability Response

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | 24 hours | Immediate patch or disable feature |
| High | 72 hours | Patch in next release cycle |
| Medium | 2 weeks | Schedule for upcoming sprint |
| Low | Next major | Address during planned upgrades |

---

## Current Dependency Audit Status

### Locked Versions ✅
All production dependencies in `package.json` use exact versions.

### High-Risk Dependencies Tracked
- `@supabase/supabase-js@2.87.3` - Auth/Database
- `zod@3.25.76` - Input validation
- `dompurify@3.3.1` - XSS prevention

---

## CI Integration Notes

For future GitHub Actions setup:
```yaml
# Example workflow snippet
- name: Audit dependencies
  run: npm audit --audit-level=high
  
- name: Check for outdated
  run: npm outdated || true
```

---

*Last updated: 2026-01-30*
