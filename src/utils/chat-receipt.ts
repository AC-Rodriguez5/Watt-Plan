import type { ChatReceiptProps } from '@/components/chat-receipt';
import { changedCuts, targetMargin } from '@/optimizer/plan-revision';
import type { PlanRevision } from '@/types/chat';
import type { Appliance } from '@/types/energy';

/** 4.5 -> "4.5 h", 6 -> "6 h" */
function hours(value: number): string {
  return `${Number(value.toFixed(1))} h`;
}

/**
 * Turns one chat revision into what the compact receipt prints. The first revision lists every
 * cut; later ones list only the cuts that changed, plus a line for each appliance the user kept.
 */
export function toChatReceiptProps(revision: PlanRevision, appliances: Appliance[]): ChatReceiptProps {
  const isInitial = revision.number === 1;
  const cuts = isInitial ? revision.plan.cuts : changedCuts(revision.plan, revision.previousPlan);

  const lines = cuts.flatMap((cut) => {
    const appliance = appliances.find(({ id }) => id === cut.applianceId);
    if (!appliance) return [];
    return {
      id: appliance.id,
      label: `${appliance.name} ${hours(cut.fromHoursPerDay)} → ${hours(cut.toHoursPerDay)} a day`,
      saving: cut.saving,
    };
  });

  const kept = isInitial
    ? []
    : revision.keptApplianceIds.flatMap((id) => {
        const appliance = appliances.find((candidate) => candidate.id === id);
        return appliance ? { id, label: `${appliance.name} ${hours(appliance.hoursPerDay)} a day` } : [];
      });

  return {
    title: isInitial ? 'INITIAL CUTS' : 'PLAN REVISION',
    subtitle: isInitial ? undefined : 'Changes only',
    revisionNumber: revision.number,
    lines,
    kept,
    status: revision.plan.status,
    projectedBill: revision.plan.projectedBill,
    margin: targetMargin(revision.plan),
  };
}
