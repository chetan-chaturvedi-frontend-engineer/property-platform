import type {
  AssigneeValue,
  LeadPriority,
  LeadPropertyType,
  LeadPurpose,
  LeadSource,
} from '../types/lead.types';

/** The filters this panel edits; applied together with "Apply filters". */
export interface LeadPanelFilters {
  source: LeadSource | '';
  priority: LeadPriority | '';
  purpose: LeadPurpose | '';
  propertyType: LeadPropertyType | '';
  assignee: AssigneeValue | null;
  preferredLocation: string;
  /** `yyyy-MM-dd`, local days. */
  createdFrom: string;
  createdTo: string;
}

export const EMPTY_PANEL_FILTERS: LeadPanelFilters = {
  source: '',
  priority: '',
  purpose: '',
  propertyType: '',
  assignee: null,
  preferredLocation: '',
  createdFrom: '',
  createdTo: '',
};
