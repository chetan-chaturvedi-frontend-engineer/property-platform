import NavigateNext from '@mui/icons-material/NavigateNext';
import Alert from '@mui/material/Alert';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { propertyRoutes, ROUTES } from '@/utils/constants';

import { AmenitiesStep } from '../components/wizard/AmenitiesStep';
import { ApartmentsStep } from '../components/wizard/ApartmentsStep';
import { DetailsStep } from '../components/wizard/DetailsStep';
import { LocationStep } from '../components/wizard/LocationStep';
import { MediaStep } from '../components/wizard/MediaStep';
import { PreviewStep } from '../components/wizard/PreviewStep';
import { ProjectInfoStep } from '../components/wizard/ProjectInfoStep';
import { useProperty } from '../hooks/useProperties';
import type { Property } from '../types/property.types';
import { isEditable, parsePropertyId } from '../utils/propertyDisplay';

/** Titles as the backend names the steps; completion always comes from the server. */
const STEP_TITLES = [
  'Property details',
  'Location',
  'Unit types',
  'Project information',
  'Amenities',
  'Media',
  'Preview and submit',
] as const;
const LAST_STEP = STEP_TITLES.length;

function parseStep(raw: string | null): number | null {
  const step = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(step) && step >= 1 && step <= LAST_STEP ? step : null;
}

function WizardStepper({
  property,
  active,
  onSelect,
}: {
  property: Property | null;
  active: number;
  onSelect: (step: number) => void;
}) {
  const completed = new Set(property?.wizard.completedSteps ?? []);
  // Every step saves on its own, so once the draft exists any step can be opened in any order.
  const reachable = property !== null;
  const done = property?.wizard.steps.filter((s) => s.step < LAST_STEP && s.complete).length ?? 0;
  return (
    <Paper className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
        <Typography variant="subtitle2">
          Step {active} of {LAST_STEP}: {STEP_TITLES[active - 1]}
        </Typography>
      </div>
      <div className="mb-3 flex items-center gap-3">
        <LinearProgress
          variant="determinate"
          value={(done / (LAST_STEP - 1)) * 100}
          className="flex-1"
          aria-label="Wizard completion"
        />
        <Typography variant="caption" color="text.secondary" className="shrink-0">
          {done} of {LAST_STEP - 1} steps complete
        </Typography>
      </div>
      <div className="overflow-x-auto">
        <Stepper nonLinear activeStep={active - 1} alternativeLabel sx={{ minWidth: 720 }}>
          {STEP_TITLES.map((title, index) => {
            const step = index + 1;
            return (
              <Step key={title} completed={completed.has(step)}>
                <StepButton
                  onClick={() => onSelect(step)}
                  disabled={!reachable}
                  aria-current={step === active ? 'step' : undefined}
                >
                  {title}
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </div>
    </Paper>
  );
}

export function PropertyWizardPage() {
  const params = useParams();
  const isNew = params.id === undefined;
  const id = isNew ? null : parsePropertyId(params.id);
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const { data: property, isPending, error, refetch } = useProperty(id);

  // The step lives in the URL, so a refresh resumes where the admin was; without one, the first
  // incomplete step (computed by the server) is opened.
  const active = isNew ? 1 : (parseStep(search.get('step')) ?? property?.wizard.currentStep ?? 1);
  const goTo = (step: number) => setSearch({ step: String(step) });
  // Saving moves to the following step even when an earlier one is incomplete; the preview lists gaps.
  const advance = () => goTo(Math.min(active + 1, LAST_STEP));

  const title = isNew ? 'Add property' : 'Edit property';
  const header = (
    <header>
      <Typography variant="h1">{title}</Typography>
      <Breadcrumbs
        aria-label="Breadcrumb"
        separator={<NavigateNext fontSize="small" />}
        className="mt-1"
      >
        <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
          Dashboard
        </Link>
        <Link component={RouterLink} to={ROUTES.properties} underline="hover">
          Properties
        </Link>
        {property && (
          <Link component={RouterLink} to={propertyRoutes.detail(property.id)} underline="hover">
            {property.details.projectName}
          </Link>
        )}
        <Typography color="text.secondary" aria-current="page">
          {title}
        </Typography>
      </Breadcrumbs>
    </header>
  );

  if (isNew) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <WizardStepper property={null} active={1} onSelect={() => undefined} />
        <DetailsStep
          property={null}
          onSaved={(created) =>
            void navigate(propertyRoutes.edit(created.id, 2), { replace: true })
          }
        />
      </div>
    );
  }

  if (id === null || error?.status === 404) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState message="This property does not exist or has been deleted." />
      </div>
    );
  }
  if (error && !property) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (isPending || !property) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        {header}
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={420} />
      </div>
    );
  }

  if (!isEditable(property.publicationStatus)) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Alert severity="info">
          Archived properties are read-only.{' '}
          <Link component={RouterLink} to={propertyRoutes.detail(property.id)}>
            View the property
          </Link>
        </Alert>
      </div>
    );
  }

  const back = () => goTo(Math.max(1, active - 1));
  const stepProps = { property, onSaved: advance, onBack: back };

  return (
    <div className="flex flex-col gap-6">
      {header}
      {property.publicationStatus !== 'draft' && property.publicationStatus !== 'rejected' && (
        <Alert severity="info">
          This property is already in the review workflow. Your changes are saved right away and do
          not change its status.
        </Alert>
      )}
      <WizardStepper property={property} active={active} onSelect={goTo} />
      {/* Keyed by property and step, so each step's form starts from the latest saved values. */}
      <div key={`${property.id}-${active}`}>
        {active === 1 && <DetailsStep property={property} onSaved={advance} />}
        {active === 2 && <LocationStep {...stepProps} />}
        {active === 3 && <ApartmentsStep {...stepProps} />}
        {active === 4 && <ProjectInfoStep {...stepProps} />}
        {active === 5 && <AmenitiesStep {...stepProps} />}
        {active === 6 && <MediaStep {...stepProps} />}
        {active === 7 && (
          <PreviewStep
            property={property}
            onEditStep={goTo}
            onBack={back}
            onSubmitted={(submitted) => void navigate(propertyRoutes.detail(submitted.id))}
          />
        )}
      </div>
    </div>
  );
}
