/**
 * League Dues Tracker Configuration
 *
 * Since LeagueSafe has no public API, dues payment status is manually maintained here.
 * Update this file each season when managers make payments.
 *
 * How to update:
 * 1. When a manager pays, set their `paid` status to true and add the `paidDate`
 * 2. The `deposit` field tracks the one-season continuity deposit
 * 3. Push the updated file — the site will reflect the changes on next deploy
 */

export interface ManagerDuesStatus {
  /** Sleeper display name (for matching/display) */
  displayName: string;
  /** Annual entry fee paid */
  paid: boolean;
  /** Date paid (ISO string) */
  paidDate?: string;
  /** Continuity deposit status */
  depositPaid: boolean;
  /** Any notes (e.g., "Late penalty applied") */
  notes?: string;
}

export interface SeasonDues {
  season: string;
  entryFee: number;
  deposit: number;
  latePenalty: number;
  paymentMethod: string;
  payouts: {
    first: number;
    second: number;
    third: number;
  };
  managers: ManagerDuesStatus[];
}

/**
 * Dues data for each season. Update this when payments come in.
 */
export const DUES_DATA: SeasonDues[] = [
  {
    season: "2025",
    entryFee: 50,
    deposit: 50,
    latePenalty: 10,
    paymentMethod: "LeagueSafe",
    payouts: {
      first: 300,
      second: 150,
      third: 50,
    },
    managers: [
      { displayName: "sherstar", paid: true, paidDate: "2025-08-01", depositPaid: true },
      { displayName: "Dsmith9265", paid: true, paidDate: "2025-08-05", depositPaid: true },
      { displayName: "Billyxmac02", paid: true, paidDate: "2025-08-03", depositPaid: true },
      { displayName: "DKProteinStyle", paid: true, paidDate: "2025-08-02", depositPaid: true },
      { displayName: "AlexxThe2xChamp", paid: true, paidDate: "2025-08-10", depositPaid: true },
      { displayName: "mpinochi", paid: true, paidDate: "2025-08-07", depositPaid: true },
      { displayName: "takingalacrap", paid: true, paidDate: "2025-08-04", depositPaid: true },
      { displayName: "bigTINY28", paid: true, paidDate: "2025-08-06", depositPaid: true },
      { displayName: "nic2nasty", paid: true, paidDate: "2025-08-08", depositPaid: true },
      { displayName: "sourdoughsam415", paid: true, paidDate: "2025-08-09", depositPaid: true },
    ],
  },
  {
    season: "2026",
    entryFee: 50,
    deposit: 50,
    latePenalty: 10,
    paymentMethod: "LeagueSafe",
    payouts: {
      first: 300,
      second: 150,
      third: 50,
    },
    managers: [
      { displayName: "sherstar", paid: false, depositPaid: true },
      { displayName: "Dsmith9265", paid: false, depositPaid: true },
      { displayName: "Billyxmac02", paid: false, depositPaid: true },
      { displayName: "DKProteinStyle", paid: false, depositPaid: true },
      { displayName: "AlexxThe2xChamp", paid: false, depositPaid: true },
      { displayName: "mpinochi", paid: false, depositPaid: true },
      { displayName: "takingalacrap", paid: false, depositPaid: true },
      { displayName: "bigTINY28", paid: false, depositPaid: true },
      { displayName: "nic2nasty", paid: false, depositPaid: true },
      { displayName: "sourdoughsam415", paid: false, depositPaid: true },
    ],
  },
];
