import ArrowBack from '@mui/icons-material/ArrowBack';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import NavigateNext from '@mui/icons-material/NavigateNext';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { ConfirmDialog } from '@/components/common/Modal';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS, propertyRoutes, ROUTES } from '@/utils/constants';

import {
  ActivitySection,
  AmenitiesLocationSection,
  BuilderSection,
  MediaSection,
  OverviewSection,
  UnitsSection,
} from '../components/details/PropertyDetailSections';
import { PropertyHero } from '../components/details/PropertyHero';
import { PropertyWorkflowPanel } from '../components/details/PropertyWorkflowPanel';
import { useDeleteProperty, useProperty } from '../hooks/useProperties';
import type { Property } from '../types/property.types';
import { isEditable, parsePropertyId } from '../utils/propertyDisplay';

type DetailTab = 'overview' | 'media' | 'units' | 'amenities' | 'builder' | 'activity';

function tabsFor(property: Property): Array<{ value: DetailTab; label: string }> {
  return [
    { value: 'overview', label: 'Property details' },
    { value: 'media', label: `Media (${property.media.length})` },
    { value: 'units', label: `Pricing & units (${property.apartments.length})` },
    { value: 'amenities', label: `Amenities & location (${property.amenities.length})` },
    { value: 'builder', label: 'Builder info' },
    { value: 'activity', label: 'Activity log' },
  ];
}

export function PropertyDetailsPage() {
  const params = useParams();
  const id = parsePropertyId(params.id);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: property, isPending, error, refetch } = useProperty(id);
  const deleteProperty = useDeleteProperty();

  const canEdit =
    can(PERMISSIONS.propertyUpdateAny) && property && isEditable(property.publicationStatus);
  const canDelete = can(PERMISSIONS.propertyDeleteAny);

  const back = () => {
    // Back to the list keeps its filters (they live in its URL) when we came from there.
    if (window.history.length > 1) {
      void navigate(-1);
    } else {
      void navigate(ROUTES.properties);
    }
  };

  const header = (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Typography variant="h1">Property details</Typography>
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
          <Typography color="text.secondary" aria-current="page" noWrap>
            {property?.details.projectName ?? 'Property'}
          </Typography>
        </Breadcrumbs>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={back}>
          Back to list
        </Button>
        {canEdit && property && (
          <Button
            startIcon={<EditOutlined />}
            onClick={() => void navigate(propertyRoutes.edit(property.id))}
          >
            Edit
          </Button>
        )}
        {canDelete && property && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutline />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </header>
  );

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
        <Skeleton variant="rounded" height={240} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
          <Skeleton variant="rounded" height={360} />
          <Skeleton variant="rounded" height={360} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <PropertyHero property={property} />
          <Tabs
            value={tab}
            onChange={(_, value: DetailTab) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Property sections"
            textColor="inherit"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: 'var(--app-primary-strong)' },
              '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
            }}
          >
            {tabsFor(property).map((item) => (
              <Tab key={item.value} value={item.value} label={item.label} />
            ))}
          </Tabs>
          <div role="tabpanel" aria-label={tabsFor(property).find((t) => t.value === tab)?.label}>
            {tab === 'overview' && <OverviewSection property={property} />}
            {tab === 'media' && <MediaSection property={property} />}
            {tab === 'units' && <UnitsSection property={property} />}
            {tab === 'amenities' && <AmenitiesLocationSection property={property} />}
            {tab === 'builder' && <BuilderSection property={property} />}
            {tab === 'activity' && <ActivitySection property={property} />}
          </div>
        </div>
        <aside aria-label="Review and workflow" className="lg:sticky lg:top-20">
          <PropertyWorkflowPanel property={property} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete property?"
        description={
          <Typography component="span">
            <strong>{property.details.projectName}</strong> (ID {property.id}) will be removed from
            every list and from the public site. Its units, media and history are kept.
          </Typography>
        }
        confirmLabel="Delete property"
        destructive
        loading={deleteProperty.isPending}
        onConfirm={() =>
          deleteProperty.mutate(
            { id: property.id, version: property.version },
            { onSuccess: () => void navigate(ROUTES.properties, { replace: true }) },
          )
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
