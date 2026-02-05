# Fractal Bootcamp Website - Overview Report

## Pages (8 total)

| Page | Purpose |
|------|---------|
| **index.html** | Main landing - hero, stats, 16 partner logos, testimonials, FAQ preview |
| **apply.html** | 2-step application form with Cal.com booking integration |
| **hire.html** | B2B page for companies to hire Fractal engineers |
| **team.html** | 5 instructor profiles (ex-Netflix, Google, Stripe) |
| **faq.html** | 15+ questions across 4 categories |
| **scholarship.html** | 2 full scholarships per cohort, links to Tally form |
| **outcomes.html** | Alumni success stories, placement metrics, CIRR methodology |
| **privacy-policy.html** | Legal compliance (8 sections) |

---

## Functionality Built

### Application Flow
- Multi-step form (info → booking)
- Real-time validation
- Submits to HubSpot CRM (creates contact + deal)
- Redirects to Cal.com scheduling

### Career Action Plan Modal (Homepage)
- Captures name + email
- Sends PDF via Resend email
- Creates HubSpot contact + deal
- Adds to email list

### API Endpoints (2 Vercel serverless functions)
- `/api/submit-application.js` - Application form handler
- `/api/send-action-plan.js` - PDF email sender + CRM integration

---

## Tools & Services

| Service | Purpose |
|---------|---------|
| **Vercel** | Hosting + serverless functions |
| **Resend** | Email delivery (PDF attachments) |
| **HubSpot CRM** | Lead management, contacts, deals, lists |
| **Cal.com** | Interview scheduling (embedded iframe) |
| **Tally Forms** | Scholarship applications |

### Tech Stack
- Static HTML/CSS (no framework)
- Vanilla JavaScript (no libraries)
- Node.js 18+ serverless functions
- CSS: 1,625 lines, custom "Classic Macintosh" design system

---

## Assets

- 5 brand assets (SVG logos, icons)
- 16 partner company logos
- 1 PDF (action plan attachment)
