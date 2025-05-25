export type Transaction = {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};

const STORAGE_KEY = "transactions";

export function getTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTransaction(tx: Transaction) {
  const current = getTransactions();
  const updated = [tx, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
