import { MERALCO_RATES, type MeralcoRates } from '@/config/meralco-rates';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import type { Appliance, PlanMode } from '@/types/energy';

import { calibrate } from '../bill-calibration';
import { computePlan } from '../compute-plan';
import { computeBill } from '../meralco-bill';
import { buildBaseline } from '../optimizer';
import { planApplianceRows } from '../plan-appliances';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('computeBill', () => {
  it('charges ₱3,110.20 for 200 kWh, within ₱1, using the default 0.5% franchise tax', () => {
    const { total } = computeBill(200, MERALCO_RATES, { lftRate: 0.005 });
    expect(Math.abs(total - 3110.2)).toBeLessThan(1);
    // The defaults are the same: 0.5% LFT, no senior, no lifeline.
    expect(computeBill(200).total).toBe(total);
  });

  it('adds the lines up to the total, without the previous balance', () => {
    const bill = computeBill(200);
    const lines = [
      bill.generation,
      bill.transmission,
      bill.systemLoss,
      bill.distribution,
      bill.senior,
      bill.universalCharges,
      bill.fitAll,
      bill.geaAll,
      bill.lifeline,
      bill.governmentTaxes,
    ];
    expect(sum(lines)).toBeCloseTo(bill.total, 9);
    expect(bill.governmentTaxes).toBeCloseTo(bill.vat + bill.realPropertyTax + bill.localFranchiseTax + bill.energyTax, 9);
    expect(Object.keys(bill)).not.toContain('previousBalance');
  });

  it('computes each line from the published rates', () => {
    const bill = computeBill(200);
    expect(bill.generation).toBeCloseTo(200 * 10.6349, 6);
    expect(bill.transmission).toBeCloseTo(200 * (0.7143 + 0.4379), 6);
    expect(bill.systemLoss).toBeCloseTo(200 * 0.9705, 6);
    // 0 to 200 kWh tier, plus supply, metering and the AWAT refund, plus the two fixed monthly charges.
    expect(bill.distribution).toBeCloseTo(200 * (1.0404 + 0.4617 + 0.3126 - 1.1872) + 17 + 6, 6);
    expect(bill.senior).toBeCloseTo(200 * 0.0001, 9);
    expect(bill.universalCharges).toBeCloseTo(200 * (0.3296 + 0.0101 + 0.0025 + 0.0428), 6);
    expect(bill.fitAll).toBeCloseTo(200 * 0.3359, 6);
    expect(bill.geaAll).toBe(0);
    expect(bill.lifeline).toBeCloseTo(200 * 0.01, 9);
    expect(bill.realPropertyTax).toBeCloseTo(200 * 0.0105, 9);
    expect(bill.energyTax).toBe(0);
    expect(bill.vat).toBeCloseTo(
      bill.generation * 0.0965 + 200 * 0.7143 * 0.1199 + 200 * 0.4379 * 0.0936 + (bill.distribution + bill.senior) * 0.12,
      6,
    );
  });

  it('is monotonic in kWh', () => {
    let previous = computeBill(0).total;
    for (let kwh = 1; kwh <= 2000; kwh++) {
      const { total } = computeBill(kwh);
      expect(total).toBeGreaterThanOrEqual(previous);
      previous = total;
    }
    // Fractional kWh too, including either side of each distribution and energy tax boundary.
    for (const boundary of [200, 300, 400, 650, 1000, 1500]) {
      expect(computeBill(boundary + 0.001).total).toBeGreaterThanOrEqual(computeBill(boundary).total);
      expect(computeBill(boundary).total).toBeGreaterThanOrEqual(computeBill(boundary - 0.001).total);
    }
  });

  it('is monotonic with the senior or lifeline discounts too', () => {
    for (const options of [{ isRegisteredSenior: true }, { isLifelineBeneficiary: true }, { isRegisteredSenior: true, isLifelineBeneficiary: true }]) {
      let previous = computeBill(0, MERALCO_RATES, options).total;
      for (let kwh = 1; kwh <= 600; kwh++) {
        const { total } = computeBill(kwh, MERALCO_RATES, options);
        expect(total).toBeGreaterThanOrEqual(previous);
        previous = total;
      }
    }
  });

  it('bills the fixed charges and nothing else at zero kWh, and treats bad input as zero', () => {
    expect(computeBill(0).generation).toBe(0);
    expect(computeBill(0).distribution).toBe(17 + 6);
    expect(computeBill(-5).total).toBe(computeBill(0).total);
    expect(computeBill(Number.NaN).total).toBe(computeBill(0).total);
  });

  describe('distribution tiers', () => {
    // UNVERIFIED ASSUMPTION (see distributionTierRate): the bracket's rate applies to the whole consumption.
    const tierRate = (kwh: number) => {
      const { distribution } = computeBill(kwh);
      return (distribution - 23) / kwh - (0.4617 + 0.3126 - 1.1872);
    };

    it.each([
      [1, 1.0404],
      [200, 1.0404],
      [201, 1.3532],
      [300, 1.3532],
      [301, 1.6484],
      [400, 1.6484],
      [401, 2.1627],
      [900, 2.1627],
    ])('applies the bracket rate to all %d kWh', (kwh, rate) => {
      expect(tierRate(kwh)).toBeCloseTo(rate, 9);
    });

    it('does not tip into the next tier on float noise at a boundary', () => {
      expect(computeBill(200.00000000000003).total).toBeCloseTo(computeBill(200).total, 9);
      expect(computeBill(300 + 1e-9).total).toBeCloseTo(computeBill(300).total, 6);
    });
  });

  describe('energy tax', () => {
    it('is zero up to 650 kWh and per kWh above', () => {
      expect(computeBill(650).energyTax).toBe(0);
      expect(computeBill(651).energyTax).toBeCloseTo(651 * 0.1, 9);
      expect(computeBill(1200).energyTax).toBeCloseTo(1200 * 0.2, 9);
      expect(computeBill(2000).energyTax).toBeCloseTo(2000 * 0.35, 9);
    });
  });

  describe('options', () => {
    it('takes the local franchise tax rate from the option', () => {
      const base = computeBill(200, MERALCO_RATES, { lftRate: 0.005 });
      const higher = computeBill(200, MERALCO_RATES, { lftRate: 0.0075 });
      expect(higher.localFranchiseTax / base.localFranchiseTax).toBeCloseTo(1.5, 9);
      expect(higher.total - base.total).toBeCloseTo(higher.localFranchiseTax - base.localFranchiseTax, 9);
    });

    it('gives a registered senior 5% off the base charges at 100 kWh or less', () => {
      const bill = computeBill(100, MERALCO_RATES, { isRegisteredSenior: true });
      expect(bill.senior).toBeCloseTo(-0.05 * (bill.generation + bill.transmission + bill.systemLoss + bill.distribution), 9);
      expect(bill.total).toBeLessThan(computeBill(100).total);
      // VAT is not reduced by the discount: only a positive (subsidy) senior line is vatable, so the
      // discounted bill's VAT is the plain bill's less the 12% VAT on that small subsidy.
      const plain = computeBill(100);
      expect(bill.vat).toBeCloseTo(plain.vat - plain.senior * 0.12, 9);
    });

    it('charges the subsidy, not the discount, above 100 kWh or when not registered', () => {
      expect(computeBill(101, MERALCO_RATES, { isRegisteredSenior: true }).senior).toBeCloseTo(101 * 0.0001, 9);
      expect(computeBill(100).senior).toBeCloseTo(100 * 0.0001, 9);
    });

    it.each([
      [50, 1],
      [51, 0.35],
      [70, 0.35],
      [71, 0.2],
      [100, 0.2],
    ])('gives a lifeline beneficiary the sliding discount at %d kWh', (kwh, fraction) => {
      const bill = computeBill(kwh, MERALCO_RATES, { isLifelineBeneficiary: true });
      expect(bill.lifeline).toBeCloseTo(-fraction * (bill.generation + bill.transmission + bill.systemLoss + bill.distribution), 9);
    });

    it('charges the lifeline subsidy above 100 kWh', () => {
      expect(computeBill(150, MERALCO_RATES, { isLifelineBeneficiary: true }).lifeline).toBeCloseTo(150 * 0.01, 9);
    });

    it('takes the discounts off the franchise tax base', () => {
      const plain = computeBill(80);
      const lifeline = computeBill(80, MERALCO_RATES, { isLifelineBeneficiary: true });
      expect(lifeline.localFranchiseTax).toBeLessThan(plain.localFranchiseTax);
    });
  });

  it('reads every rate from the rates argument', () => {
    const doubled: MeralcoRates = { ...MERALCO_RATES, generation: MERALCO_RATES.generation * 2 };
    expect(computeBill(200, doubled).generation).toBeCloseTo(2 * computeBill(200).generation, 9);
  });
});

describe('rates config', () => {
  it('is dated November 2026', () => {
    expect(MERALCO_RATES.asOf).toBe('2026-11');
  });
});

describe('exact sums', () => {
  const MODES: PlanMode[] = ['fewest-changes', 'comfort-first'];
  const households: { name: string; appliances: Appliance[]; bill: typeof SAMPLE_BILL_SETTINGS; factor: number }[] = [
    { name: 'Meralco, calibrated', appliances: SAMPLE_APPLIANCES, bill: SAMPLE_BILL_SETTINGS, factor: SAMPLE_CALIBRATION_FACTOR },
    { name: 'Meralco, no last bill', appliances: SAMPLE_APPLIANCES, bill: { ...SAMPLE_BILL_SETTINGS, lastBillKwh: null, lastBillTotal: null }, factor: 1 },
    {
      name: 'custom rate',
      appliances: SAMPLE_APPLIANCES,
      bill: { ...SAMPLE_BILL_SETTINGS, rateMode: 'custom', customRatePerKwh: 12 },
      factor: SAMPLE_CALIBRATION_FACTOR,
    },
  ];

  it.each(households.flatMap((household) => MODES.flatMap((mode) => [0.95, 0.8, 0.6, 0.45, 0.01].map((fraction) => ({ ...household, mode, fraction })))))(
    '$name, $mode, target at $fraction of the bill: appliance costs sum to the bill, row savings to the total savings',
    ({ appliances, bill, factor, mode, fraction }) => {
      const baseline = buildBaseline(appliances, bill, factor);
      const plan = computePlan(appliances, bill, factor, baseline.cost * fraction, mode)!;
      const rows = planApplianceRows(baseline, plan);

      // Bill split by kWh share: the appliances' costs are exactly the bill.
      expect(sum(rows.map(({ defaultCost }) => defaultCost))).toBeCloseTo(plan.currentEstimate, 9);
      expect(plan.currentEstimate).toBeCloseTo(baseline.cost, 9);
      // Savings: bill before minus bill after, split by share of kWh cut, so the rows add up to it exactly.
      expect(plan.totalCuts).toBeCloseTo(plan.currentEstimate - plan.projectedBill, 9);
      expect(sum(rows.map(({ saving }) => saving))).toBeCloseTo(plan.totalCuts, 9);
      expect(sum(plan.cuts.map(({ saving }) => saving))).toBeCloseTo(plan.totalCuts, 9);
    },
  );
});

describe('calibrate', () => {
  it('compares the formula with the entered bill when both are given', () => {
    const result = calibrate(SAMPLE_APPLIANCES, 3400, 283);
    expect(result.isCalibrated).toBe(true);
    expect(result.yourBill).toBe(3400);
    expect(result.formulaEstimate).toBeCloseTo(computeBill(283).total, 9);
    expect(result.matchedBill).toBe(3400);
  });

  it('calibrates on the kWh alone, with the formula as the estimate', () => {
    const result = calibrate(SAMPLE_APPLIANCES, null, 200);
    expect(result.isCalibrated).toBe(true);
    expect(result.yourBill).toBeNull();
    expect(result.formulaEstimate).toBeCloseTo(computeBill(200).total, 9);
    expect(result.matchedBill).toBeCloseTo(computeBill(200).total, 9);
    expect(result.gapKwh).not.toBeNull();
  });

  it('is not calibrated without a kWh, even with a total', () => {
    const result = calibrate(SAMPLE_APPLIANCES, 3400, null);
    expect(result.isCalibrated).toBe(false);
    expect(result.formulaEstimate).toBeNull();
    expect(result.gapKwh).toBeNull();
  });

  it('has no formula estimate in custom rate mode, and prices with the custom rate', () => {
    const result = calibrate(SAMPLE_APPLIANCES, null, 200, { rateMode: 'custom', customRatePerKwh: 10 });
    expect(result.formulaEstimate).toBeNull();
    expect(result.ratePerKwh).toBeCloseTo(10, 9);
    expect(result.matchedBill).toBeCloseTo(2000, 9);
  });
});
