/**
 * Offline Transaction Security Layer
 * Provides encryption, signing, and tamper protection for offline transactions
 */

import { 
  encryptData, 
  decryptData, 
  getUserSeed, 
  isCryptoAvailable,
  signTransaction,
  logSecurityEvent,
  getDeviceSeed
} from './crypto';

// Storage keys
const ENCRYPTED_SALES_KEY = 'bvbooks_offline_sales_encrypted';
const TRANSACTION_AUDIT_KEY = 'bvbooks_transaction_audit';

export interface SignedTransaction<T = unknown> {
  id: string;
  payload: T;
  metadata: {
    device_id: string;
    business_id: string;
    branch_id?: string;
    created_at: string;
    version: number;
  };
  signature: string;
  audit_hash: string;
}

export interface TransactionAuditEntry {
  transaction_id: string;
  action: 'created' | 'modified' | 'synced' | 'rejected';
  timestamp: string;
  hash: string;
  previous_hash: string | null;
}

/**
 * Create a signed and encrypted offline transaction
 */
export async function createSecureTransaction<T>(
  id: string,
  payload: T,
  businessId: string,
  branchId?: string,
  userId?: string
): Promise<SignedTransaction<T>> {
  const deviceId = getDeviceSeed();
  const timestamp = new Date().toISOString();
  
  // Sign the transaction
  const signature = await signTransaction(payload, deviceId, businessId, timestamp);
  
  // Create audit hash (chain with previous)
  const auditHash = await createAuditHash(id, payload, timestamp);
  
  const signedTransaction: SignedTransaction<T> = {
    id,
    payload,
    metadata: {
      device_id: deviceId,
      business_id: businessId,
      branch_id: branchId,
      created_at: timestamp,
      version: 1,
    },
    signature,
    audit_hash: auditHash,
  };
  
  // Record in audit trail
  await recordAuditEntry(id, 'created', auditHash);
  
  return signedTransaction;
}

/**
 * Create audit hash using append-only chain
 */
async function createAuditHash(
  transactionId: string, 
  payload: unknown, 
  timestamp: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify({ id: transactionId, payload, timestamp });
  
  if (isCryptoAvailable()) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer), b => 
      b.toString(16).padStart(2, '0')
    ).join('');
  }
  
  // Fallback for non-crypto environments
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
}

/**
 * Record entry in append-only audit trail
 */
async function recordAuditEntry(
  transactionId: string,
  action: TransactionAuditEntry['action'],
  hash: string
): Promise<void> {
  try {
    const auditLog = getAuditLog();
    const previousEntry = auditLog[auditLog.length - 1];
    
    const entry: TransactionAuditEntry = {
      transaction_id: transactionId,
      action,
      timestamp: new Date().toISOString(),
      hash,
      previous_hash: previousEntry?.hash || null,
    };
    
    auditLog.push(entry);
    
    // Keep last 1000 entries
    if (auditLog.length > 1000) {
      auditLog.splice(0, auditLog.length - 1000);
    }
    
    localStorage.setItem(TRANSACTION_AUDIT_KEY, JSON.stringify(auditLog));
  } catch (error) {
    logSecurityEvent('signature_failure', { 
      action: 'audit_record_failed', 
      transactionId,
      error: String(error)
    });
  }
}

/**
 * Get the audit log
 */
function getAuditLog(): TransactionAuditEntry[] {
  try {
    const stored = localStorage.getItem(TRANSACTION_AUDIT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Encrypt and store offline sales queue
 */
export async function encryptAndStoreSales<T>(
  sales: T[],
  userId: string,
  businessId: string
): Promise<void> {
  if (!isCryptoAvailable()) {
    logSecurityEvent('encryption_failure', { 
      reason: 'crypto_unavailable',
      fallback: true 
    });
    // Store with basic obfuscation as fallback (not secure, but better than plaintext)
    const obfuscated = btoa(encodeURIComponent(JSON.stringify({
      d: sales,
      b: businessId,
      t: Date.now(),
    })));
    localStorage.setItem(ENCRYPTED_SALES_KEY, obfuscated);
    return;
  }
  
  try {
    const encryptionPayload = {
      sales,
      business_id: businessId,
      encrypted_at: new Date().toISOString(),
      device_id: getDeviceSeed(),
    };
    
    const encrypted = await encryptData(encryptionPayload, getUserSeed(userId));
    localStorage.setItem(ENCRYPTED_SALES_KEY, encrypted);
  } catch (error) {
    logSecurityEvent('encryption_failure', { 
      reason: 'encryption_error',
      error: String(error)
    });
    throw new Error('Failed to encrypt offline sales');
  }
}

/**
 * Decrypt and retrieve offline sales queue
 */
export async function decryptStoredSales<T>(
  userId: string,
  businessId: string
): Promise<T[]> {
  const stored = localStorage.getItem(ENCRYPTED_SALES_KEY);
  if (!stored) return [];
  
  if (!isCryptoAvailable()) {
    // Attempt to decode obfuscated fallback
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(stored)));
      if (decoded.b === businessId) {
        return decoded.d || [];
      }
      return [];
    } catch {
      return [];
    }
  }
  
  try {
    const decrypted = await decryptData<{
      sales: T[];
      business_id: string;
      encrypted_at: string;
      device_id: string;
    }>(stored, getUserSeed(userId));
    
    if (!decrypted) {
      logSecurityEvent('decryption_failure', { 
        reason: 'decryption_returned_null',
        businessId
      });
      return [];
    }
    
    // Validate business ID matches
    if (decrypted.business_id !== businessId) {
      logSecurityEvent('decryption_failure', { 
        reason: 'business_id_mismatch',
        expected: businessId,
        found: decrypted.business_id
      });
      return [];
    }
    
    // Validate device ID matches (binding to device)
    if (decrypted.device_id !== getDeviceSeed()) {
      logSecurityEvent('decryption_failure', { 
        reason: 'device_id_mismatch'
      });
      return [];
    }
    
    return decrypted.sales;
  } catch (error) {
    logSecurityEvent('decryption_failure', { 
      reason: 'decryption_error',
      error: String(error)
    });
    return [];
  }
}

/**
 * Clear encrypted sales storage
 */
export function clearEncryptedSales(): void {
  localStorage.removeItem(ENCRYPTED_SALES_KEY);
}

/**
 * Verify transaction hasn't been tampered with
 */
export async function verifyTransactionIntegrity<T>(
  transaction: SignedTransaction<T>
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Regenerate signature and compare
    const expectedSignature = await signTransaction(
      transaction.payload,
      transaction.metadata.device_id,
      transaction.metadata.business_id,
      transaction.metadata.created_at
    );
    
    if (expectedSignature !== transaction.signature) {
      return { valid: false, reason: 'signature_mismatch' };
    }
    
    // Verify audit hash
    const expectedHash = await createAuditHash(
      transaction.id,
      transaction.payload,
      transaction.metadata.created_at
    );
    
    if (expectedHash !== transaction.audit_hash) {
      return { valid: false, reason: 'audit_hash_mismatch' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'verification_error' };
  }
}

/**
 * Prepare transactions for sync with signatures
 */
export async function prepareTransactionsForSync<T>(
  transactions: SignedTransaction<T>[]
): Promise<{
  valid: SignedTransaction<T>[];
  invalid: { transaction: SignedTransaction<T>; reason: string }[];
}> {
  const valid: SignedTransaction<T>[] = [];
  const invalid: { transaction: SignedTransaction<T>; reason: string }[] = [];
  
  for (const tx of transactions) {
    const verification = await verifyTransactionIntegrity(tx);
    if (verification.valid) {
      valid.push(tx);
    } else {
      invalid.push({ transaction: tx, reason: verification.reason || 'unknown' });
      logSecurityEvent('signature_failure', {
        transactionId: tx.id,
        reason: verification.reason
      });
    }
  }
  
  return { valid, invalid };
}

/**
 * Get audit trail for a specific transaction
 */
export function getTransactionAuditTrail(transactionId: string): TransactionAuditEntry[] {
  const auditLog = getAuditLog();
  return auditLog.filter(entry => entry.transaction_id === transactionId);
}

/**
 * Validate audit chain integrity
 */
export function validateAuditChain(): { valid: boolean; brokenAt?: number } {
  const auditLog = getAuditLog();
  
  for (let i = 1; i < auditLog.length; i++) {
    if (auditLog[i].previous_hash !== auditLog[i - 1].hash) {
      return { valid: false, brokenAt: i };
    }
  }
  
  return { valid: true };
}
