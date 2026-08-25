export interface User {
    id: string;
    email: string;
    name?: string;
}

export interface AuthResponse {
    access_token: string;
}

export interface Pocket {
    id: string;
    name:string;
    targetAmount: number;
    emoji?: string;
    currentAmount: number;

}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER_TO_POCKET' ;

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
   category: string;
   accountId?:string;
   pocketId?: string;
   description?: string;
   date: string;
}

export interface FixedCost {
    id: string;
    name: string;
    amount: number;
    dueDate: number;
    idPaid: boolean;

}

export interface GoldAsset {
    id: string;
    weightInGrams: number;
    buyPrice: number;
    purchaseDate: string;
}

export interface GoldAssetSummary {
    totalWightInGrams: number;
    totalBuyValue: number;
    [key:string]: number;
}
