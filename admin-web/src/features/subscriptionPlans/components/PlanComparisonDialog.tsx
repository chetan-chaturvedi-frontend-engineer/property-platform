import Check from '@mui/icons-material/Check';
import Remove from '@mui/icons-material/Remove';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

import type { SubscriptionPlan } from '../types/subscriptionPlan.types';
import {
  billingCycleLabel,
  monthlyEquivalent,
  planPriceLabel,
  propertyLimitLabel,
  teamLimitLabel,
  trialLabel,
} from '../utils/planDisplay';

import { PlanStatusChip, PopularChip } from './PlanStatusChip';

interface Row {
  label: string;
  cell: (plan: SubscriptionPlan) => ReactNode;
}

const ROWS: readonly Row[] = [
  {
    label: 'Price',
    cell: (plan) => {
      const perMonth = monthlyEquivalent(plan);
      return (
        <>
          <strong>{planPriceLabel(plan)}</strong>
          {perMonth && <span className="text-muted block text-xs">≈ {perMonth}</span>}
        </>
      );
    },
  },
  {
    label: 'Billing cycle',
    cell: (plan) => billingCycleLabel(plan.billingInterval, plan.billingIntervalCount),
  },
  { label: 'Trial', cell: (plan) => trialLabel(plan.trialDays) },
  { label: 'Property listings', cell: (plan) => propertyLimitLabel(plan.noOfProperties) },
  { label: 'Team members', cell: (plan) => teamLimitLabel(plan.noOfTeamMembers) },
  { label: 'Status', cell: (plan) => <PlanStatusChip status={plan.status} /> },
  { label: 'Popular', cell: (plan) => (plan.popular ? <PopularChip /> : 'No') },
];

/** Every feature of the selected plans, in first-seen order, matched ignoring case. */
function allFeatures(plans: readonly SubscriptionPlan[]): string[] {
  const seen = new Map<string, string>();
  for (const plan of plans) {
    for (const feature of plan.features) {
      const key = feature.toLowerCase();
      if (!seen.has(key)) seen.set(key, feature);
    }
  }
  return [...seen.values()];
}

interface PlanComparisonDialogProps {
  plans: readonly SubscriptionPlan[];
  onClose: () => void;
}

/** Side-by-side comparison of the selected plans. */
export function PlanComparisonDialog({ plans, onClose }: PlanComparisonDialogProps) {
  const features = allFeatures(plans);
  const has = (plan: SubscriptionPlan, feature: string) =>
    plan.features.some((value) => value.toLowerCase() === feature.toLowerCase());

  return (
    <Modal
      open
      title={`Compare ${plans.length} plans`}
      onClose={onClose}
      maxWidth="lg"
      scroll="paper"
      actions={
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
      }
    >
      <TableContainer>
        <Table size="small" sx={{ minWidth: 160 + plans.length * 180 }}>
          <caption className="sr-only">Plan comparison</caption>
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">
                <span className="sr-only">Attribute</span>
              </TableCell>
              {plans.map((plan) => (
                <TableCell key={plan.id} component="th" scope="col">
                  <Typography variant="subtitle2" fontWeight={700}>
                    {plan.title}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.label}>
                <TableCell component="th" scope="row" className="font-semibold whitespace-nowrap">
                  {row.label}
                </TableCell>
                {plans.map((plan) => (
                  <TableCell key={plan.id}>{row.cell(plan)}</TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={plans.length + 1} className="pt-5">
                <Typography variant="subtitle2" component="h3" fontWeight={700}>
                  Features
                </Typography>
              </TableCell>
            </TableRow>
            {features.length === 0 && (
              <TableRow>
                <TableCell colSpan={plans.length + 1}>
                  <Typography variant="body2" color="text.secondary">
                    None of these plans lists any features.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {features.map((feature) => (
              <TableRow key={feature} hover>
                <TableCell component="th" scope="row" className="break-words">
                  {feature}
                </TableCell>
                {plans.map((plan) => (
                  <TableCell key={plan.id}>
                    {has(plan, feature) ? (
                      <Check color="success" fontSize="small" aria-label="Included" />
                    ) : (
                      <Remove color="disabled" fontSize="small" aria-label="Not included" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Modal>
  );
}
