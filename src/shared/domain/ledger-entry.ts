// ============================================================
// Canonical Ledger Entry Domain Types
// ============================================================
// Single source of truth for Wallet/Ledger entity

// ============================================================
// Type Unions
// ============================================================

export type LedgerEntryType = 'credit' | 'debit' | 'hold' | 'release';
export type LedgerEntryStatus = 'pending' | 'completed' | 'failed';

// ============================================================
// Database Row Type (what Supabase returns)
// ============================================================
// NOTE: Table is named 'wallet_transactions' in 003_wallet_canonical_model.sql

export interface WalletTransactionRow {
  id: string;
  wallet_id: string;
  user_id: string;
  type: LedgerEntryType;
  amount_usd: number;
  status: LedgerEntryStatus;
  source: string;
  reference_id: string | null;
  created_at: string;
}

// ============================================================
// API Response Types (what client consumes)
// ============================================================

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: LedgerEntryType;
  amount_usd: number;
  status: LedgerEntryStatus;
  source: string;
  reference_id: string | null;
  created_at: string;
}

export interface Wallet {
  wallet_id: string;
  user_id?: string;
  available_usd: number;
  pending_usd: number;
  ledger_usd?: number;
  held_usd?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// Mappers (database row → API response)
// ============================================================

export function mapWalletTransactionRow(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    wallet_id: row.wallet_id,
    user_id: row.user_id,
    type: row.type,
    amount_usd: row.amount_usd,
    status: row.status,
    source: row.source,
    reference_id: row.reference_id,
    created_at: row.created_at,
  };
}
