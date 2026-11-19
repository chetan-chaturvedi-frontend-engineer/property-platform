import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import GavelOutlined from '@mui/icons-material/GavelOutlined';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS, propertyRoutes } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';

import type { Property, PublicationAction, PublicationStatus } from '../../types/property.types';
import {
  ACTION_META,
  availableActions,
  fieldLabel,
  isEditable,
  toWorkflowTarget,
} from '../../utils/propertyDisplay';
import { LegalReviewDialog } from '../LegalReviewDialog';
import { LegalStatusChip, PublicationStatusChip } from '../PropertyStatusChips';
import { WorkflowActionDialog } from '../WorkflowActionDialog';

const STAGES = [
  { label: 'Submitted', action: 'submitted' },
  { label: 'Under review', action: null },
  { label: 'Approved', action: 'approved' },
  { label: 'Published', action: 'published' },
] as const;

/** How far along the review pipeline each status is (index of the last completed stage, -1 = none). */
const STAGE_REACHED: Record<PublicationStatus, number> = {
  draft: -1,
  pending_review: 0,
  rejected: 1,
  approved: 2,
  suspended: 2,
  published: 3,
  archived: -1,
};

function lastChange(property: Property, action: string) {
  return [...property.statusHistory].reverse().find((change) => change.action === action);
}

export function PropertyWorkflowPanel({ property }: { property: Property }) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [action, setAction] = useState<PublicationAction | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const status = property.publicationStatus;
  const reached = STAGE_REACHED[status];
  const actions = availableActions(status, can);
  const canLegalReview = can(PERMISSIONS.propertyLegalReview) && status !== 'archived';
  const canEdit = can(PERMISSIONS.propertyUpdateAny) && isEditable(status);
  const latestReason =
    status === 'rejected'
      ? lastChange(property, 'rejected')
      : status === 'suspended'
        ? lastChange(property, 'suspended')
        : undefined;
  const legalChange = lastChange(property, 'legal_status_changed');
  const reviewSteps = property.wizard.steps.filter((step) => step.step < 7);

  return (
    <div className="flex flex-col gap-4">
      <Paper className="p-4">
        <Typography variant="h6" component="h2">
          Approval status
        </Typography>
        <Stepper
          activeStep={reached + 1}
          alternativeLabel
          className="mt-4"
          aria-label="Review progress"
        >
          {STAGES.map((stage, index) => {
            const change = stage.action ? lastChange(property, stage.action) : undefined;
            const failed = status === 'rejected' && index === 1;
            return (
              <Step key={stage.label} completed={index <= reached && !failed}>
                <StepLabel
                  error={failed}
                  optional={
                    change && index <= reached ? (
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(change.createdAt)}
                      </Typography>
                    ) : undefined
                  }
                >
                  {failed ? 'Rejected' : stage.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
        <Divider className="my-4" />
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted">Current status</dt>
          <dd className="justify-self-end">
            <PublicationStatusChip status={status} />
          </dd>
          <dt className="text-muted">Legal review</dt>
          <dd className="justify-self-end">
            <LegalStatusChip status={property.projectInfo.legalApprovalStatus} />
          </dd>
          <dt className="text-muted">Last updated</dt>
          <dd className="justify-self-end">{formatDateTime(property.updatedAt)}</dd>
          {property.publishedAt && (
            <>
              <dt className="text-muted">Published</dt>
              <dd className="justify-self-end">{formatDateTime(property.publishedAt)}</dd>
            </>
          )}
        </dl>
        {latestReason?.reason && (
          <Alert severity="error" className="mt-4">
            <strong>{status === 'rejected' ? 'Rejected' : 'Suspended'}:</strong>{' '}
            {latestReason.reason}
          </Alert>
        )}
        {legalChange?.reason && (
          <Alert severity="info" icon={<GavelOutlined />} className="mt-3">
            <strong>Legal note:</strong> {legalChange.reason}
          </Alert>
        )}
      </Paper>

      {(actions.length > 0 || canLegalReview || canEdit) && (
        <Paper className="flex flex-col gap-2 p-4">
          <Typography variant="h6" component="h2" className="mb-1">
            Actions
          </Typography>
          {actions.map((candidate) => {
            const meta = ACTION_META[candidate];
            return (
              <Button
                key={candidate}
                fullWidth
                variant={meta.destructive ? 'outlined' : 'contained'}
                color={meta.destructive ? 'error' : candidate === 'approve' ? 'success' : 'primary'}
                onClick={() => setAction(candidate)}
              >
                {meta.label}
              </Button>
            );
          })}
          {canLegalReview && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GavelOutlined />}
              onClick={() => setLegalOpen(true)}
            >
              Legal review
            </Button>
          )}
          {canEdit && (
            <Button
              fullWidth
              variant="text"
              onClick={() => void navigate(propertyRoutes.edit(property.id))}
            >
              Edit property
            </Button>
          )}
          {actions.includes('submit') && !property.wizard.readyToSubmit && (
            <Typography variant="caption" color="text.secondary">
              Complete the missing steps below before submitting.
            </Typography>
          )}
        </Paper>
      )}

      <Paper className="p-4">
        <Typography variant="h6" component="h2">
          Review checklist
        </Typography>
        <ul className="mt-3 flex flex-col gap-2.5">
          {reviewSteps.map((step) => (
            <li key={step.step} className="flex items-start justify-between gap-3">
              <span className="flex items-start gap-2">
                {step.complete ? (
                  <CheckCircle fontSize="small" color="success" aria-hidden />
                ) : (
                  <RadioButtonUnchecked fontSize="small" color="warning" aria-hidden />
                )}
                <span>
                  <Typography variant="body2" fontWeight={600}>
                    {step.title}
                  </Typography>
                  {!step.complete && step.missing.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Missing: {step.missing.map(fieldLabel).join(', ')}
                    </Typography>
                  )}
                </span>
              </span>
              <Typography
                variant="caption"
                fontWeight={600}
                color={step.complete ? 'success.main' : 'warning.main'}
                className="shrink-0"
              >
                {step.complete ? 'Complete' : 'Incomplete'}
              </Typography>
            </li>
          ))}
        </ul>
        {!property.wizard.readyToSubmit && (
          <Alert severity="warning" icon={<ErrorOutline />} className="mt-4">
            Submission, approval and publishing need every step complete.
          </Alert>
        )}
      </Paper>

      {action && (
        <WorkflowActionDialog
          target={toWorkflowTarget(property)}
          action={action}
          onClose={() => setAction(null)}
        />
      )}
      {legalOpen && (
        <LegalReviewDialog
          target={toWorkflowTarget(property)}
          onClose={() => setLegalOpen(false)}
        />
      )}
    </div>
  );
}
