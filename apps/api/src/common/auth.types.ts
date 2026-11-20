export type Role = 'SUPER_ADMIN' | 'AGENCY_STAFF' | 'CUSTOMER';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
}
