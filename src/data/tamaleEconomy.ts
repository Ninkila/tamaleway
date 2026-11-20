/**
 * Centralized Tamale 3D Economy & Service Pricing Configuration
 * Keeps prices, service fees, fares, banking rates, and business yields balanced
 * across restaurants, markets, banks, MoMo agents, salons, mechanics, and gigs.
 */

export const TAMALE_ECONOMY_CONFIG = {
  banking: {
    depositFeeRate: 0,
    withdrawalFeeRate: 0,
    savingsInterestDailyRate: 0.015, // 1.5% per completed Tamale in-game day
    momoCashOutFeeRate: 0.01, // 1% Ghana MoMo standard agent fee (rounded, min GH₵ 1 for >= GH₵ 20)
    momoMinCashOutFee: 1,
    initialBankBonusFactor: 1.5, // Initial bank balance = cash * factor
    initialMomoCedis: 65,
  },
  services: {
    barberBasicFade: 25,
    barberBeardTrim: 15,
    barberBraidsOrWeave: 65,
    barberFullGrooming: 40,
    clinicConsultation: 35,
    clinicFullRecovery: 60,
    guesthouseShortRest: 45,
    guesthouseOvernight: 110,
    mechanicBasicTuneUp: 35,
    mechanicFullOverhaul: 75,
    gymSessionFee: 20,
    printingAndBindingFee: 12,
  },
  restaurants: {
    dineInServiceTipCedis: 0,
    dineInEnergyBonus: 8, // Eating freshly seated at a table gives +8% extra energy vs takeaway
    prepWaitSeconds: 2.2,
  },
  supermarket: {
    bulkDiscountThresholdCedis: 80,
    bulkDiscountRate: 0.08, // 8% discount on supermarket baskets >= GH₵ 80
  },
  housing: {
    compoundRestEnergy: 100,
    compoundRestMinutes: 180,
  },
  businessDividends: {
    defaultDailyShareYield: 35,
  },
} as const;

export function calculateMomoCashOutFee(amountCedis: number): number {
  if (amountCedis <= 0) return 0;
  if (amountCedis < 20) return 0;
  return Math.max(
    TAMALE_ECONOMY_CONFIG.banking.momoMinCashOutFee,
    Math.round(amountCedis * TAMALE_ECONOMY_CONFIG.banking.momoCashOutFeeRate)
  );
}

export function calculateSupermarketCheckout(subtotalCedis: number): {
  subtotal: number;
  discount: number;
  total: number;
} {
  const qualifies = subtotalCedis >= TAMALE_ECONOMY_CONFIG.supermarket.bulkDiscountThresholdCedis;
  const discount = qualifies
    ? Math.round(subtotalCedis * TAMALE_ECONOMY_CONFIG.supermarket.bulkDiscountRate)
    : 0;
  return {
    subtotal: subtotalCedis,
    discount,
    total: Math.max(0, subtotalCedis - discount),
  };
}
