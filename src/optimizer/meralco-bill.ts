import { MERALCO_RATES, type Bracket, type MeralcoRates } from '@/config/meralco-rates';

/**
 * The Meralco residential bill, line by line (design/FORMULAMERALCO.txt). Plain arithmetic, no AI.
 * Every rate comes from the `rates` argument (src/config/meralco-rates.ts); none lives here.
 *
 * `Previous_Balance` is left out on purpose: it is money already owed, not a function of this
 * month's consumption, so it has no place in an estimate or a plan.
 *
 * Amounts are not rounded: the lines add up to `total` exactly, and screens round for display.
 */

export type BillOptions = {
  /** Local franchise tax rate, as a fraction. Defaults to the rates' default (0.5%). */
  lftRate?: number;
  /** Registered senior citizen: 5% off the base charges at 100 kWh or less. Defaults to false. */
  isRegisteredSenior?: boolean;
  /** Lifeline beneficiary: a sliding discount on the base charges at 100 kWh or less. Defaults to false. */
  isLifelineBeneficiary?: boolean;
};

export type BillBreakdown = {
  kwh: number;
  generation: number;
  transmission: number;
  systemLoss: number;
  distribution: number;
  /** Negative when the senior discount applies, a small positive subsidy otherwise. */
  senior: number;
  universalCharges: number;
  fitAll: number;
  geaAll: number;
  /** Negative when the lifeline discount applies, a small positive subsidy otherwise. */
  lifeline: number;
  vat: number;
  realPropertyTax: number;
  localFranchiseTax: number;
  energyTax: number;
  /** VAT + real property tax + local franchise tax + energy tax. */
  governmentTaxes: number;
  /** Total amount due for this month's consumption. */
  total: number;
};

/**
 * Slack for comparing kWh with a bracket ceiling. Calibrated kWh is a product of floats, so a household
 * billed exactly 200 kWh can come out as 200.00000000000003 and would otherwise fall into the next tier.
 */
const KWH_TOLERANCE = 1e-6;

/** True when `kwh` is at or under `ceiling`, ignoring float noise. */
const atOrUnder = (kwh: number, ceiling: number) => kwh <= ceiling + KWH_TOLERANCE;

/** The first bracket whose ceiling holds `kwh`; the last bracket when `kwh` is above all of them. */
function bracketValue(brackets: Bracket[], kwh: number): number {
  return (brackets.find(({ upToKwh }) => atOrUnder(kwh, upToKwh)) ?? brackets[brackets.length - 1]).value;
}

/**
 * The tiered part of the distribution rate (R_dist_tier), in pesos per kWh.
 *
 * ASSUMPTION, UNVERIFIED: the bracket's rate applies to the WHOLE consumption (200 kWh at the 0-200
 * rate, 201 kWh entirely at the 201-300 rate), so the bill jumps at each boundary. Meralco may instead
 * bill progressively, each bracket's rate on only the kWh inside it. If so, this is the one place to
 * change: return the blended per-kWh rate (progressive charge / kWh) instead of the bracket's rate.
 */
function distributionTierRate(kwh: number, rates: MeralcoRates): number {
  return bracketValue(rates.distributionTiers, kwh);
}

/**
 * BP Blg. 36 energy tax for `kwh`, in pesos. Read the same way as the distribution tiers (the whole
 * consumption at the bracket's rate), which is equally unverified. Zero up to 650 kWh, so it does not
 * touch ordinary households.
 */
function energyTax(kwh: number, rates: MeralcoRates): number {
  return kwh * bracketValue(rates.energyTaxTiers, kwh);
}

/** Pesos off (negative) when the household is eligible and uses `discountMaxKwh` or less, else the subsidy line. */
function discountLine(
  kwh: number,
  eligible: boolean,
  discountedBase: number,
  discountFraction: number,
  subsidyRate: number,
  rates: MeralcoRates,
): number {
  if (eligible && atOrUnder(kwh, rates.discountMaxKwh)) return -discountFraction * discountedBase;
  return kwh * subsidyRate;
}

/** The bill for `kwh` under `rates`. Negative or non-finite consumption is treated as zero. */
export function computeBill(kwh: number, rates: MeralcoRates = MERALCO_RATES, options: BillOptions = {}): BillBreakdown {
  const { lftRate = rates.localFranchiseTax.default, isRegisteredSenior = false, isLifelineBeneficiary = false } = options;
  const used = Number.isFinite(kwh) && kwh > 0 ? kwh : 0;

  const generation = used * rates.generation;
  const transmission = used * (rates.transmission + rates.ancillary);
  const systemLoss = used * rates.systemLoss;
  const distribution =
    used * (distributionTierRate(used, rates) + rates.supply + rates.metering + rates.awat) + rates.supplyFixed + rates.meteringFixed;

  // The discounts are taken off these four lines.
  const base = generation + transmission + systemLoss + distribution;

  const senior = discountLine(used, isRegisteredSenior, base, rates.seniorDiscount, rates.seniorSubsidy, rates);
  const lifelineFraction = atOrUnder(used, rates.discountMaxKwh) ? bracketValue(rates.lifelineDiscountTiers, used) : 0;
  const lifeline = discountLine(used, isLifelineBeneficiary, base, lifelineFraction, rates.lifelineSubsidy, rates);

  const { spug, redCi, environmental, strandedContract } = rates.universalCharges;
  const universalCharges = used * (spug + redCi + environmental + strandedContract);
  const fitAll = used * rates.fitAll;
  const geaAll = used * rates.geaAll;

  const { vat: v } = rates;
  const vat =
    generation * v.generation +
    used * rates.transmission * v.transmission +
    used * rates.ancillary * v.ancillary +
    systemLoss * v.systemLoss +
    (distribution + Math.max(0, senior)) * v.distribution;
  const realPropertyTax = used * rates.realPropertyTax;
  // The franchise tax is charged on the vatable base after any senior or lifeline discount; a subsidy line is not part of it.
  const localFranchiseTax = (base + Math.min(0, senior) + Math.min(0, lifeline)) * lftRate;
  const energyTaxCharge = energyTax(used, rates);
  const governmentTaxes = vat + realPropertyTax + localFranchiseTax + energyTaxCharge;

  const total =
    generation + transmission + systemLoss + distribution + senior + universalCharges + fitAll + geaAll + lifeline + governmentTaxes;

  return {
    kwh: used,
    generation,
    transmission,
    systemLoss,
    distribution,
    senior,
    universalCharges,
    fitAll,
    geaAll,
    lifeline,
    vat,
    realPropertyTax,
    localFranchiseTax,
    energyTax: energyTaxCharge,
    governmentTaxes,
    total,
  };
}
