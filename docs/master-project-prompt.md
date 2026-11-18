# MASTER PROJECT PROMPT: GROWTHPILOT AI

## 1. ROLE

Act as a Principal Software Architect, Senior Full-Stack Engineer, SaaS Product Designer, AI Engineer and DevOps Architect.

Your responsibility is to design and build a production-ready, scalable, multi-tenant AI-powered Digital Marketing Agency Management Platform.

Do not build a simple landing page or static dashboard.

Build a complete working application with functional frontend, backend, database, authentication, payment processing, AI integration, marketing workflows, customer management and administrative controls.

Work incrementally, maintain clean architecture and ensure every module is integrated.

## 2. PRODUCT OBJECTIVE

Product name: GrowthPilot AI

Product type: Multi-tenant Digital Marketing Agency Platform.

Business model:
- Subscription-based digital marketing services.
- Monthly and annual customer plans.
- Custom agency packages.
- Optional add-on services.
- Central agency administration.
- AI-powered marketing content and campaign management.

The agency owner should be able to manage multiple customers from one dashboard.

Each customer should have a separate account and access only to their own business information.

The platform should support customers across India initially, with architecture suitable for international expansion.

## 3. USER ROLES

Implement role-based access control.

### Super Admin
- Complete platform access.
- Manage agency customers.
- Manage subscription plans.
- Manage pricing and add-ons.
- Manage payments and invoices.
- View revenue and customer analytics.
- Manage AI configuration.
- Manage API integrations.
- Manage marketing campaigns.
- Configure system settings.

### Agency Team Member
- Access assigned customers.
- Manage marketing content.
- Create and manage campaigns.
- Manage customer enquiries.
- Generate reports.
- Update task status.

### Customer
- Register and manage their business.
- Select marketing packages.
- Make payments.
- Connect social media accounts.
- Request AI-generated content.
- Approve or reject campaigns.
- View campaign performance.
- Manage leads.
- Download reports.
- Raise support requests.

## 4. CUSTOMER REGISTRATION AND ONBOARDING

Implement complete customer onboarding.

Registration:
- Full name.
- Email address.
- Mobile number.
- Password.
- OTP verification.
- Google authentication.

Business profile:
- Business name.
- Business category.
- Industry.
- Website.
- Business address.
- City.
- State.
- Country.
- Business description.
- Target audience.
- Target location.
- Logo.
- Brand colours.
- Preferred language.
- Marketing objectives.

Support multiple business locations.

Create an onboarding wizard with progress tracking.

After onboarding, automatically generate an initial AI marketing strategy using the business profile.

## 5. SUBSCRIPTION AND PAYMENT MODULE

Create a configurable subscription management system.

Subscription plans:

STARTER:
- Basic social media management.
- AI content generation.
- Monthly marketing calendar.
- Basic analytics.

GROWTH:
- Everything in Starter.
- Advanced AI content.
- Campaign management.
- Lead management.
- Landing page integration.
- Monthly performance report.

PREMIUM:
- Everything in Growth.
- Advanced automation.
- Multi-channel campaign management.
- Advanced analytics.
- Priority support.

Allow Super Admin to configure:
- Monthly pricing.
- Annual pricing.
- Features.
- Usage limits.
- Number of connected accounts.
- Number of monthly posts.
- AI credits.
- Campaign limits.
- Add-on pricing.

Payment integration:
- Razorpay.
- UPI.
- Cards.
- Net banking.
- Payment verification through secure webhooks.
- Subscription activation.
- Subscription renewal.
- Failed payment handling.
- Refund management.
- GST invoice generation.
- Payment history.

Never activate subscriptions based only on a frontend payment success response.

Verify payment signatures and webhook events on the server.

## 6. AI MARKETING ASSISTANT

Integrate Claude API through a secure backend service.

Do not expose API keys in frontend code.

Create an AI Marketing Assistant that understands the customer's business profile.

Capabilities:

- Marketing strategy generation.
- Social media content generation.
- Advertising copy generation.
- Promotional campaign ideas.
- Blog content.
- SEO recommendations.
- Hashtag recommendations.
- Email marketing content.
- WhatsApp marketing drafts.
- Gujarati, Hindi and English content.
- Competitor analysis based on authorised public information.
- Monthly marketing calendar.

AI content should follow the customer's brand voice and target audience.

Create reusable prompt templates.

Save generated content in the database.

Allow editing, regenerating, approving and rejecting content.

Track AI usage and credit consumption per customer.

## 7. SOCIAL MEDIA MANAGEMENT

Create a unified social media management module.

Integrations:
- Facebook Pages.
- Instagram Professional Accounts.
- LinkedIn Company Pages.
- YouTube Channels.

Features:
- Secure OAuth account connection.
- Multiple social account management.
- Content calendar.
- Post creation.
- Image and video uploads.
- Caption generation.
- Hashtag generation.
- Scheduling.
- Publishing.
- Publishing status.
- Failed publishing retry.
- Post history.
- Engagement analytics where APIs permit.

All integrations must use official APIs.

Respect API permissions, publishing limitations and platform policies.

Never store user passwords for external social media accounts.

Use encrypted OAuth tokens with refresh and revocation handling.

Create a publishing abstraction layer so each social platform can have its own adapter.

## 8. META ADS MANAGEMENT

Integrate Meta Marketing API.

Capabilities:
- Connect Meta Business accounts.
- View available ad accounts.
- View campaigns.
- View ad sets.
- View ads.
- Create campaign drafts.
- Generate AI advertising copy.
- Recommend audiences.
- Track campaign performance.
- Monitor expenditure.
- Display campaign reports.

Campaign publishing must require explicit customer or authorised agency approval.

Never automatically spend advertising money without approved budgets and permissions.

## 9. GOOGLE MARKETING INTEGRATION

Integrate:
- Google Business Profile API.
- Google Ads API.
- Google Analytics 4.
- Google Search Console.

Capabilities:
- Local SEO monitoring.
- Business profile management where API access permits.
- Google Ads campaign reporting.
- Website traffic analysis.
- Search performance.
- Keyword performance.
- AI SEO recommendations.
- Local business visibility reports.

Clearly distinguish actual API data from AI-generated recommendations.

## 10. CRM AND LEAD MANAGEMENT

Create a complete CRM module.

Lead sources:
- Website forms.
- Landing pages.
- Facebook lead forms.
- Instagram enquiries where supported.
- WhatsApp enquiries.
- Manual entry.
- Google campaign integrations.

Lead fields:
- Name.
- Phone.
- Email.
- Source.
- Interested service.
- Status.
- Assigned employee.
- Follow-up date.
- Notes.

Pipeline:
- New.
- Contacted.
- Qualified.
- Proposal sent.
- Converted.
- Lost.

Features:
- Lead assignment.
- Follow-up reminders.
- Lead history.
- Customer notes.
- Conversion reports.
- Duplicate detection.

Support customer-specific CRM data isolation.

## 11. WHATSAPP AND EMAIL AUTOMATION

WhatsApp integration through official Meta WhatsApp Business Cloud API.

Features:
- Approved message templates.
- Customer enquiry notifications.
- Appointment reminders.
- Lead follow-ups.
- Customer support messages.
- Delivery status.
- Conversation history.

Email:
- Welcome emails.
- Payment confirmation.
- Subscription reminders.
- Campaign approvals.
- Monthly marketing reports.
- Support notifications.

Implement opt-in and opt-out management.

Do not send unsolicited bulk promotional messages.

## 12. AI VOICE CALLING

Create an optional AI voice integration module.

Capabilities:
- Inbound enquiry handling.
- Appointment confirmation.
- Customer support.
- Lead follow-up with appropriate consent.
- Call summaries.
- CRM updates.

Requirements:
- Configurable voice provider.
- Clearly identify AI-generated voice interactions.
- Obtain and track required consent.
- Respect applicable TRAI regulations and DND preferences.
- Provide opt-out mechanisms.
- Restrict outbound calling to legally permitted use cases.
- Maintain audit logs.

Do not implement unsolicited automated promotional calling.

## 13. WEBSITE AND LANDING PAGE BUILDER

Create a simple landing page builder for agency customers.

Features:
- Predefined templates.
- Business branding.
- Drag-and-drop sections if practical.
- Lead capture forms.
- Contact forms.
- WhatsApp enquiry button.
- Mobile responsive layouts.
- SEO metadata.
- Analytics integration.

Allow customers to preview and publish their landing pages.

## 14. CONTENT CALENDAR AND APPROVAL WORKFLOW

Create a visual calendar.

Features:
- Monthly view.
- Weekly view.
- Draft content.
- Pending approval.
- Approved content.
- Scheduled posts.
- Published posts.
- Failed posts.

Customer must be able to approve or reject content before publishing.

Maintain an audit trail of approvals.

## 15. REPORTING AND ANALYTICS

Create separate customer and admin analytics dashboards.

Customer dashboard:
- Total leads.
- New enquiries.
- Campaign performance.
- Social media performance.
- Website traffic.
- Ad expenditure.
- Cost per lead when supported by actual data.
- Conversion trends.
- Monthly report.

Admin dashboard:
- Total customers.
- Active subscriptions.
- Monthly recurring revenue.
- Annual recurring revenue.
- Churn.
- Revenue by plan.
- Payment failures.
- AI usage.
- Customer acquisition.
- Agency workload.

Generate downloadable PDF reports.

Never fabricate marketing metrics.

Clearly indicate unavailable integrations and incomplete data.

## 16. SUPER ADMIN PANEL

Create a comprehensive agency management dashboard.

Modules:
- Dashboard.
- Customers.
- Subscriptions.
- Plans.
- Payments.
- Invoices.
- Marketing campaigns.
- Content calendar.
- Social integrations.
- CRM.
- Team management.
- AI configuration.
- Usage management.
- Support tickets.
- Reports.
- Audit logs.
- System settings.

Allow the admin to configure services and pricing without code changes.

## 17. DESIGN REQUIREMENTS

Build a premium SaaS interface.

Design direction:
- Modern.
- Minimal.
- Professional.
- Premium.
- Responsive.
- Mobile-friendly.

Use:
- Next.js.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- Reusable components.
- Consistent design tokens.

Create two distinct experiences:
1. Public marketing website.
2. Authenticated application dashboard.

Public website pages:
- Home.
- Features.
- Services.
- Pricing.
- About.
- Contact.
- Login.
- Registration.

Use meaningful empty states, loading states, error messages and confirmation dialogs.

Avoid excessive animations and visual clutter.

## 18. RECOMMENDED ARCHITECTURE

Frontend:
- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.

Backend:
- NestJS or structured Next.js server modules.
- REST API.
- PostgreSQL.
- Prisma ORM.
- Redis.
- BullMQ.

Authentication:
- Auth.js or equivalent secure authentication.
- Role-based access control.
- Secure session management.

AI:
- Claude API.
- Centralised AI service.
- Prompt template management.
- Usage metering.

Infrastructure:
- AWS S3.
- Background workers.
- Email provider.
- Razorpay.
- Sentry.

Use modular architecture with separate services for:
- Authentication.
- Customers.
- Subscriptions.
- Payments.
- AI.
- Social integrations.
- CRM.
- Campaigns.
- Analytics.
- Notifications.

## 19. SECURITY AND COMPLIANCE

Implement:
- Multi-tenant database isolation.
- Server-side permission validation.
- Input validation.
- Rate limiting.
- Secure password hashing.
- Encrypted external API tokens.
- Webhook signature verification.
- Audit logging.
- Data backups.
- Error monitoring.
- Consent records.
- Account deletion workflows.
- Privacy policy and terms pages.

Follow applicable Indian data protection, consumer, advertising and platform requirements.

Never expose secrets in client-side bundles.

Never trust user-provided payment status.

## 20. DEVELOPMENT STRATEGY

Do not try to implement all modules in one uncontrolled code-generation step.

First create:
1. Product requirements document.
2. System architecture document.
3. Database ER diagram.
4. API specification.
5. Project folder structure.
6. Development roadmap.

Then implement in phases.

PHASE 1:
- Project setup.
- Authentication.
- Customer onboarding.
- Multi-tenant architecture.
- Database schema.
- Super Admin dashboard.

PHASE 2:
- Subscription plans.
- Razorpay integration.
- Payments.
- Invoices.

PHASE 3:
- Claude AI integration.
- AI content generation.
- Marketing calendar.
- Content approval.

PHASE 4:
- Social media integrations.
- Publishing workflows.
- Meta Ads.
- Google integrations.

PHASE 5:
- CRM.
- Lead management.
- WhatsApp.
- Email automation.

PHASE 6:
- Voice integrations.
- Reporting.
- Analytics.
- PDF reports.

PHASE 7:
- Security audit.
- Performance testing.
- Deployment.
- Production readiness.

## 21. IMPORTANT DEVELOPMENT RULES

- Write actual working code.
- Do not use fake API responses in production workflows.
- Do not leave buttons non-functional.
- Do not create placeholder dashboards pretending to contain real data.
- Use mock adapters only in clearly labelled development environments.
- Add database migrations.
- Add automated tests.
- Add proper error handling.
- Add API documentation.
- Maintain strict tenant isolation.
- Maintain clean TypeScript types.
- Avoid unnecessary dependencies.
- Make integrations configurable.
- Include setup documentation.
- Include environment variable examples.
- Include local development instructions.
- Include deployment documentation.

## 22. FIRST TASK

Do not start coding the entire system immediately.

Start by delivering:

A. Complete product requirements document.

B. High-level architecture.

C. Database ER diagram.

D. Detailed module breakdown.

E. API integration requirements and platform permission dependencies.

F. Recommended folder structure.

G. Development milestones.

H. Estimated development complexity.

I. Infrastructure and operating cost estimates.

After presenting these, begin Phase 1.

Build each phase completely, run tests and verify functionality before proceeding.

At the end of each phase, provide:
- Files created.
- Features completed.
- Database changes.
- Tests executed.
- Known limitations.
- Next implementation steps.

The final product must be a genuine, deployable digital marketing agency platform, not a UI prototype.