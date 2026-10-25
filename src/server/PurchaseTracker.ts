import fs from "fs";
import path from "path";

export interface PurchaseRecord {
  id: string;
  timestamp: number;
  type: "stripe" | "crate" | "pack" | "skin_pass" | "admin_grant";
  email: string;
  username: string;
  itemId: string;
  itemName: string;
  priceEur?: number;
  pricePlutonium?: number;
  priceCaps?: number;
  granted?: {
    plutonium?: number;
    caps?: number;
    cosmetics?: string[];
  };
}

const PURCHASES_FILE = path.join(process.cwd(), "data", "purchases.json");

export class PurchaseTracker {
  private purchases: PurchaseRecord[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const dir = path.dirname(PURCHASES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(PURCHASES_FILE)) {
        const raw = fs.readFileSync(PURCHASES_FILE, "utf-8");
        this.purchases = JSON.parse(raw);
      }
    } catch (err) {
      console.error("[PurchaseTracker] Failed to load purchases:", err);
      this.purchases = [];
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(
        PURCHASES_FILE,
        JSON.stringify(this.purchases, null, 2),
        "utf-8",
      );
    } catch (err) {
      console.error("[PurchaseTracker] Failed to save purchases:", err);
    }
  }

  public record(record: Omit<PurchaseRecord, "id">): PurchaseRecord {
    const fullRecord: PurchaseRecord = {
      ...record,
      id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    this.purchases.unshift(fullRecord);
    // Keep last 1,000 purchases
    if (this.purchases.length > 1000) {
      this.purchases = this.purchases.slice(0, 1000);
    }
    this.save();
    return fullRecord;
  }

  public getPurchases(limit = 100): PurchaseRecord[] {
    return this.purchases.slice(0, limit);
  }

  public getStats(): {
    totalRevenueEur: number;
    totalPlutoniumSpent: number;
    totalCapsSpent: number;
    totalTransactions: number;
    stripeTransactions: number;
    crateTransactions: number;
    packTransactions: number;
    recentPurchases: PurchaseRecord[];
  } {
    let totalRevenueEur = 0;
    let totalPlutoniumSpent = 0;
    let totalCapsSpent = 0;
    let stripeTransactions = 0;
    let crateTransactions = 0;
    let packTransactions = 0;

    for (const p of this.purchases) {
      if (p.priceEur) totalRevenueEur += p.priceEur;
      if (p.pricePlutonium) totalPlutoniumSpent += p.pricePlutonium;
      if (p.priceCaps) totalCapsSpent += p.priceCaps;

      if (p.type === "stripe") stripeTransactions++;
      else if (p.type === "crate") crateTransactions++;
      else if (p.type === "pack") packTransactions++;
    }

    return {
      totalRevenueEur: Math.round(totalRevenueEur * 100) / 100,
      totalPlutoniumSpent,
      totalCapsSpent,
      totalTransactions: this.purchases.length,
      stripeTransactions,
      crateTransactions,
      packTransactions,
      recentPurchases: this.purchases.slice(0, 50),
    };
  }
}

export const purchaseTracker = new PurchaseTracker();
