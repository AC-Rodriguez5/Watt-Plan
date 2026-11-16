/**
 * Every rate, charge and tax value the Meralco bill formula uses. This file is the only place they live:
 * when Meralco publishes new rates, change the numbers here and `asOf`, nothing else.
 *
 * Source: design/FORMULAMERALCO.txt, "Legend & Active Values (November 2026)".
 * Peso figures are per kWh unless the name says otherwise; percentages are fractions (0.0965 = 9.65%).
 */

/** A bracket of a tiered table: applies up to and including `upToKwh`. The last bracket is open-ended. */
export type Bracket = { upToKwh: number; value: number };

export type MeralcoRates = {
  /** Month the values were published, "YYYY-MM". Shown in Bill settings. */
  asOf: string;

  generation: number;
  /** Transmission wheeling (NGCP). */
  transmission: number;
  /** Ancillary services / reserves (NGCP). */
  ancillary: number;
  systemLoss: number;

  /** Distribution rate by consumption bracket (1RP). */
  distributionTiers: Bracket[];
  supply: number;
  /** Supply fixed charge, pesos per month. */
  supplyFixed: number;
  metering: number;
  /** Metering fixed charge, pesos per month. */
  meteringFixed: number;
  /** Combined active AWAT refunds. Negative: it reduces the distribution charge. */
  awat: number;

  /** Senior citizen: the discount applies up to `discountMaxKwh`, as a fraction of Gen + Trans + SysLoss + Dist. */
  seniorDiscount: number;
  /** Subsidy rate everyone else pays on the senior line. */
  seniorSubsidy: number;
  /** Lifeline: discount fraction by bracket, as a fraction of Gen + Trans + SysLoss + Dist. */
  lifelineDiscountTiers: Bracket[];
  /** Subsidy rate everyone else pays on the lifeline line. */
  lifelineSubsidy: number;
  /** Highest consumption that still qualifies for the senior and lifeline discounts. */
  discountMaxKwh: number;

  /** Universal charges, summed per kWh: SPUG + RED-CI + environmental + stranded contract costs. */
  universalCharges: { spug: number; redCi: number; environmental: number; strandedContract: number };
  /** Feed-in tariff allowance. */
  fitAll: number;
  /** Green energy auction allowance (suspended: 0 while suspended, the base rate is kept for reference). */
  geaAll: number;
  geaAllBase: number;

  vat: { generation: number; transmission: number; ancillary: number; systemLoss: number; distribution: number };
  /** Real property tax (charge + adjustment). */
  realPropertyTax: number;
  /** Local franchise tax varies by LGU. This is the default; `computeBill` takes the household's own. */
  localFranchiseTax: { default: number; min: number; max: number };
  /** BP Blg. 36 energy tax, pesos per kWh by consumption bracket. */
  energyTaxTiers: Bracket[];
};

const OPEN_ENDED = Number.POSITIVE_INFINITY;

export const MERALCO_RATES: MeralcoRates = {
  asOf: '2026-11',

  generation: 10.6349,
  transmission: 0.7143,
  ancillary: 0.4379,
  systemLoss: 0.9705,

  distributionTiers: [
    { upToKwh: 200, value: 1.0404 },
    { upToKwh: 300, value: 1.3532 },
    { upToKwh: 400, value: 1.6484 },
    { upToKwh: OPEN_ENDED, value: 2.1627 },
  ],
  supply: 0.4617,
  supplyFixed: 17,
  metering: 0.3126,
  meteringFixed: 6,
  awat: -1.1872,

  seniorDiscount: 0.05,
  seniorSubsidy: 0.0001,
  lifelineDiscountTiers: [
    { upToKwh: 50, value: 1 },
    { upToKwh: 70, value: 0.35 },
    { upToKwh: 100, value: 0.2 },
  ],
  lifelineSubsidy: 0.01,
  discountMaxKwh: 100,

  universalCharges: { spug: 0.3296, redCi: 0.0101, environmental: 0.0025, strandedContract: 0.0428 },
  fitAll: 0.3359,
  geaAll: 0,
  geaAllBase: 0.0371,

  vat: { generation: 0.0965, transmission: 0.1199, ancillary: 0.0936, systemLoss: 0, distribution: 0.12 },
  realPropertyTax: 0.0105,
  localFranchiseTax: { default: 0.005, min: 0.005, max: 0.0075 },
  energyTaxTiers: [
    { upToKwh: 650, value: 0 },
    { upToKwh: 1000, value: 0.1 },
    { upToKwh: 1500, value: 0.2 },
    { upToKwh: OPEN_ENDED, value: 0.35 },
  ],
};

/** Effective ₱ per kWh used when the household picks the custom rate and has not given one. */
export const DEFAULT_CUSTOM_RATE_PER_KWH = 12.5;

/** Consumption used to quote an effective ₱ per kWh when there is no bill or appliance usage to quote it at. */
export const REFERENCE_KWH = 200;
