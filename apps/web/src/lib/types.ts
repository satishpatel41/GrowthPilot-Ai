export type Role = 'SUPER_ADMIN' | 'AGENCY_STAFF' | 'CUSTOMER';

export interface User {
  id: string; email: string; name: string; phone: string | null; role: Role;
  phoneVerified: boolean; emailVerified: boolean;
  tenant: { id: string; name: string; onboardingCompleted: boolean; onboardingStep: number } | null;
}

export interface Tenant {
  id: string; name: string; status: 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED';
  onboardingStep: number; onboardingCompleted: boolean;
  category: string | null; industry: string | null; website: string | null; description: string | null;
  targetAudience: string | null; targetLocation: string | null; language: 'en' | 'gu' | 'hi';
  objectives: string[]; brandColors: string[]; createdAt: string;
}

export interface Location { id: string; name: string; address: string | null; city: string; state: string; country: string }

export const CATEGORIES: [string, string][] = [
  ['retail', 'Retail'], ['restaurant', 'Restaurant'], ['salon_wellness', 'Salon and wellness'],
  ['real_estate', 'Real estate'], ['clinic', 'Clinic'], ['coaching', 'Coaching'], ['other', 'Other'],
];
export const OBJECTIVES: [string, string][] = [
  ['more_leads', 'Get more leads'], ['brand_awareness', 'Build brand awareness'], ['more_store_visits', 'Bring more store visits'],
  ['online_sales', 'Increase online sales'], ['grow_social', 'Grow social media'], ['retain_customers', 'Keep customers coming back'],
];
export const LANGUAGES: [string, string][] = [['en', 'English'], ['gu', 'ગુજરાતી'], ['hi', 'हिन्दी']];

export function homeFor(user: User): string {
  if (user.role !== 'CUSTOMER') return '/admin';
  if (!user.phoneVerified) return '/verify';
  if (!user.tenant?.onboardingCompleted) return '/onboarding';
  return '/dashboard';
}

export const statusClass: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800', ONBOARDING: 'bg-amber-100 text-amber-900', SUSPENDED: 'bg-red-100 text-red-800',
};
