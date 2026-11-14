import { SellerLead, SellerListing } from '../../types';
import { ApiLeadSummary, ApiOwnerProperty, ApiPublicationStatus } from '../../types/api';
import { formatListTime } from '../../utils/dates';
import { initialsOf } from '../../utils/format';

const LISTING_STATUS: Record<ApiPublicationStatus, SellerListing['status']> = {
  draft: 'Incomplete',
  pending_review: 'Under Review',
  approved: 'Under Review',
  published: 'Active',
  rejected: 'Inactive',
  suspended: 'Inactive',
  archived: 'Inactive',
};

/** The backend lists projects for sale only (no rent flag), so anything but a draft is "For Sale". */
export function toSellerListing(p: ApiOwnerProperty): SellerListing {
  return {
    id: String(p.id),
    title: p.projectName,
    area: [p.locality, p.city].filter(Boolean).join(', '),
    price: '',
    sqft: '',
    purpose: p.publicationStatus === 'draft' ? 'Draft' : 'For Sale',
    status: LISTING_STATUS[p.publicationStatus],
  };
}

/** Backend bhk is a bedroom count such as "3" or "2.5", or studio / 1rk. */
function bhkLabel(bhk: string | null): string | null {
  if (!bhk) {
    return null;
  }
  return /^\d+(\.\d)?$/.test(bhk) ? `${bhk} BHK` : bhk.toUpperCase();
}

export function toSellerLead(l: ApiLeadSummary, now: Date = new Date()): SellerLead {
  const wants = [bhkLabel(l.bhk), l.preferredLocation ? `in ${l.preferredLocation}` : null]
    .filter(Boolean)
    .join(' ');
  return {
    id: String(l.id),
    name: l.leadName,
    initials: initialsOf(l.leadName),
    kind: l.status === 'new' ? 'New Lead' : 'Lead',
    message: wants ? `Looking for ${wants}` : 'No requirements added yet',
    time: formatListTime(l.createdAt, now),
    unread: l.status === 'new' ? 1 : 0,
  };
}
