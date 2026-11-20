// Kontrak data FE <-> BE. Sumber kebenaran: backend-finance-app/prisma/schema.prisma + API_DOCS.md

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  message: string;
  user: { id: string; email?: string };
  access_token: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  userId: string;
}

export interface Pocket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  emoji?: string | null;
  userId: string;
}

/** GET /auth/profile */
export interface Profile {
  id: string;
  email: string;
  accounts: Account[];
  pockets: Pocket[];
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER_TO_POCKET';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string; // ISO string, mis. "2026-06-16T00:00:00.000Z"
  accountId?: string | null;
  pocketId?: string | null;
  account?: { id: string; name: string } | null;
  pocket?: { id: string; name: string } | null;
}

/** Body POST /transactions */
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date?: string; // "YYYY-MM-DD"
  accountId?: string; // wajib untuk INCOME, atau EXPENSE dari rekening
  pocketId?: string; // EXPENSE dari kantong
}

/** Body POST /pockets/:id/topup */
export interface TopupPocketInput {
  accountId: string;
  amount: number;
  description?: string;
}

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  dueDate: number; // tanggal 1–31
  isPaid: boolean;
}

export interface GoldAsset {
  id: string;
  weightInGrams: number;
  buyPrice: number; // harga per gram
  purchaseDate: string;
}

/** GET /gold-assets/summary */
export interface GoldAssetSummary {
  totalWeightGrams: number;
  totalInvestment: number;
  avgBuyPrice: number;
  totalRecords: number;
}

/** GET /dashboard/summary */
export interface DashboardSummary {
  totalBalance: number;
  accounts: Account[];
  pockets: (Pocket & { progressPercent: number })[];
  fixedCosts: {
    total: number;
    paid: number;
    unpaid: number;
    totalMonthlyAmount: number;
    unpaidAmount: number;
  };
  goldAssets: Omit<GoldAssetSummary, 'totalRecords'>;
  recentTransactions: Transaction[];
  fromCache: boolean;
}
