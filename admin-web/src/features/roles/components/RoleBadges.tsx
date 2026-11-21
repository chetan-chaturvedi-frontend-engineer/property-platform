import Chip from '@mui/material/Chip';

import type { Role } from '../types/role.types';

interface RoleBadgesProps {
  role: Pick<Role, 'defaultRole' | 'status' | 'ownRole'>;
}

/** Default, inactive and "your role" markers, always as text (not color alone). */
export function RoleBadges({ role }: RoleBadgesProps) {
  return (
    <>
      {role.defaultRole && (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label="Default"
          sx={{ height: 20, fontSize: 11 }}
        />
      )}
      {role.status === 'inactive' && (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label="Inactive"
          sx={{ height: 20, fontSize: 11 }}
        />
      )}
      {role.ownRole && (
        <Chip size="small" variant="outlined" label="Your role" sx={{ height: 20, fontSize: 11 }} />
      )}
    </>
  );
}
