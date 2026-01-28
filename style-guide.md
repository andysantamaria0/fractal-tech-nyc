# Fractal Style Guide

> **Note:** This is a text reference version. See `style-guide.html` for live visual examples of components.

**Design philosophy:** Fractal's visual identity is inspired by the **Classic Macintosh "Snow White" era** — geometric borders, crisp drop shadows, monochromatic surfaces with a single accent color, and clean typographic hierarchy. The overall effect is precise, confident, and deliberately retro in a way that signals craftsmanship.

---

## Contents

1. [Color Palette](#1-color-palette)
2. [Typography](#2-typography)
3. [Spacing Scale](#3-spacing-scale)
4. [Layout & Grid](#4-layout--grid)
5. [Buttons](#5-buttons)
6. [Window Components](#6-window-components)
7. [Section Patterns](#7-section-patterns)
8. [Forms & Inputs](#8-forms--inputs)
9. [Modals](#9-modals)
10. [Navigation & Footer](#10-navigation--footer)
11. [Imagery & Assets](#11-imagery--assets)
12. [Responsive Behavior](#12-responsive-behavior)
13. [Voice & Tone](#13-voice--tone)
14. [CTA Patterns](#14-cta-patterns)
15. [Writing Do's & Don'ts](#15-writing-dos--donts)

---

## 1. Color Palette

The palette is deliberately restrained — monochromatic grays with a single accent color. This reflects the Classic Mac aesthetic and keeps the focus on content. The accent pink/mauve is used exclusively for interactive elements (buttons, CTAs) to draw attention to actions.

### Core Colors

| Name | Hex | CSS Variable |
|------|-----|--------------|
| Fog | `#F5F5F0` | `--color-fog` |
| Platinum | `#E8E8E8` | `--color-platinum` |
| Line | `#D0D0D0` | `--color-line` |
| Slate | `#5A5A5A` | `--color-slate` |
| Charcoal | `#2C2C2C` | `--color-charcoal` |
| White | `#FFFFFF` | `--color-white` |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| Mauve / Pink | `#C7547C` | Buttons, CTAs only |
| Error | `#8B0000` | `--color-error` |

### Usage Rules

| Color | Use For | Never Use For |
|-------|---------|---------------|
| **Fog** (#F5F5F0) | Page background (body) | Component backgrounds, text |
| **Platinum** (#E8E8E8) | Header/footer background, window title bars, stat boxes, highlighted areas | Body background, text |
| **White** (#FFFFFF) | Window/card content areas, button default background, form inputs | Body background |
| **Charcoal** (#2C2C2C) | Primary text, borders, headings, final CTA background | Large background fills (except final CTA section) |
| **Slate** (#5A5A5A) | Secondary text, subtitles, labels, descriptions | Headings, borders, backgrounds |
| **Mauve** (#C7547C) | Button borders, button shadows, button hover fills, CTAs | Text (except button text), backgrounds (except button hover), decorative elements |

---

## 2. Typography

### Font Family

The primary (and only) typeface is **Geneva**, falling back through Chicago and system sans-serif fonts. This references the original Macintosh system fonts. Do not introduce additional typefaces.

```
--font-primary: "Geneva", "Chicago", -apple-system, BlinkMacSystemFont, sans-serif
```

### Type Scale

| Variable | Size | Usage |
|----------|------|-------|
| `--text-4xl` | 48px | Hero Headlines |
| `--text-3xl` | 36px | Section Titles |
| `--text-2xl` | 24px | Card Headings, Modal Titles |
| `--text-xl` | 18px | Subheadings, FAQ Questions, Buttons |
| `--text-base` | 16px | Body text, paragraphs, form inputs, descriptions |
| `--text-lg` | 14px | Subtitles, Testimonial Names, Bold Labels |
| `--text-sm` | 11px | Navigation links, form labels, footer links, window title bars |
| `--text-xs` | 9px | Section labels, meta info, error messages |

### Typographic Patterns

**Section Label Pattern**
- 9px, uppercase, 0.1em letter-spacing, bold, slate color
- Used above every section title

**Section Title Pattern**
- 36px, bold, charcoal
- Section titles are typically uppercase on the site

**Uppercase Nav/Link Pattern**
- 11px, bold, uppercase, 0.05em letter-spacing
- Used for nav links, footer links, section links, and inline CTAs

**Inline Highlight**
- Platinum background, 1px charcoal border, bold
- Use sparingly for key stats or claims

### Rules

- Body text line-height is always **1.6**. Headlines use **1.2**.
- Labels and small UI text are always **bold, uppercase, with letter-spacing**.
- Never use font weights below 400. The system uses **400 (normal)** and **700 (bold)** only.
- Italics are reserved for **testimonial quotes only**.
- Do not use colored text except slate for secondary content and error red for validation.

---

## 3. Spacing Scale

All spacing is defined on a fixed scale. Use these tokens — don't use arbitrary pixel values. The scale is intentionally non-linear.

| Variable | Value |
|----------|-------|
| `--space-1` | 2px |
| `--space-2` | 4px |
| `--space-3` | 8px |
| `--space-4` | 12px |
| `--space-5` | 16px |
| `--space-6` | 24px |
| `--space-7` | 32px |
| `--space-8` | 48px |
| `--space-9` | 64px |

### Common Usage

| Context | Token | Value |
|---------|-------|-------|
| Gap between small inline elements | `--space-2` to `--space-3` | 4–8px |
| Padding inside window title bars | `--space-3` / `--space-4` | 8 / 12px |
| Grid gaps and card gaps | `--space-4` to `--space-6` | 12–24px |
| Window content padding | `--space-6` | 24px |
| Between major elements within a section | `--space-7` | 32px |
| Section vertical padding | `--space-8` | 48px |
| Hero and final CTA section padding | `--space-9` | 64px |

---

## 4. Layout & Grid

### Container Widths

| Class | Max Width | Use For |
|-------|-----------|---------|
| `.container` | 960px | All standard page content. Centered with `--space-6` (24px) side padding. |
| `.container-narrow` | 600px | Forms, single-column text content |

### Grid Patterns

The site uses CSS Grid for all multi-column layouts:

- **4-Column** — Stats (team page)
- **3-Column** — Stats (homepage), Cohort Details
- **2-Column** — Value Props, Testimonials, Differentiators, Timeline
- **1-Column** — FAQ list, Forms, Content text
- **Flex Wrap** — Partners grid, CTA buttons

---

## 5. Buttons

Buttons are the only place the accent color (#C7547C) appears. They follow the "Snow White" aesthetic with thick borders and offset drop shadows.

### Button Anatomy

| Property | Value |
|----------|-------|
| Background | White (default), #C7547C (hover) |
| Text Color | #C7547C (default), White (hover) |
| Border | 3px solid #C7547C |
| Box Shadow | 4px 4px 0 #C7547C |
| Padding | 16px 32px |
| Font | 18px, bold, uppercase, 0.05em letter-spacing |
| Active | Inset shadow, 1px translate (pressed effect) |
| Disabled | Platinum bg, slate text, slate border, no shadow |

### Button Types

- **Primary Button** — Use for the highest-priority action on any page or section. Usually "Apply Now" or the main CTA.
- **Secondary Button** — Use for the secondary action alongside a primary button. Visually identical to primary for now — reserved for future differentiation.
- **Full-Width Button** — Used in forms and modals. Same styling as primary but `width: 100%`.

### Text Links (Inline CTAs)

Used for secondary navigation within sections ("Read her story", "See all FAQs", "Meet the team").

- `font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;`
- Charcoal color. Underline on hover. Always prefixed with an arrow (→).

---

## 6. Window Components

The signature visual element of the brand. Modeled after Classic Macintosh window chrome: a gray title bar with dots, a solid border, and an offset drop shadow. Every card, FAQ category, team member, and content block on the site is a "window."

### Standard Window

| Property | Value |
|----------|-------|
| Border | 2px solid charcoal |
| Shadow | 4px 4px 0 rgba(0,0,0,0.15) |
| Title bar bg | Platinum |
| Title bar border | 2px solid charcoal (bottom) |
| Title bar text | 11px, bold, uppercase, 0.05em spacing |
| Content padding | 24px (--space-6) |
| Dots prefix | ◾ ◾ ◾ (Unicode \25FE) |

### Hero Window

Larger, more prominent version used for the main hero and CTA sections.

| Property | Standard vs Hero |
|----------|------------------|
| Border | 2px → **3px** |
| Shadow | 4px 4px → **6px 6px** |
| Shadow opacity | 0.15 → **0.2** |

### Title Bar Variants

Window title bars can be plain text or include the three-dot prefix. Both are used on the site.

---

## 7. Section Patterns

Every page section follows a consistent structure: label → title → content.

### Standard Section

```
SECTION LABEL (9px, uppercase, slate)
SECTION TITLE IN ALL CAPS (36px, bold, charcoal)
Body content follows...
```

### Stats Section

- Platinum background, 2px charcoal border, 3px offset shadow
- Value is 36px bold, label is 11px uppercase

### Partners Bar

- Full-width platinum background strip with top/bottom line borders
- Logo containers are white boxes with 1px charcoal border, flex-wrapped and centered

### Final CTA Section

- The only section with a dark (charcoal) background
- White text
- Centered
- Used as the closing call-to-action on most pages

### Testimonial Card

Standard window with:
- Title bar: ◼ NAME
- Role line (e.g., "PM → Engineer at Ellis")
- Quote in italics
- "→ Read her story" link

### List Style

Lists use a small black square bullet (▪ Unicode \25AA) positioned absolutely. No default disc bullets.

---

## 8. Forms & Inputs

### Form Field

- **Labels:** 11px, bold, uppercase, 0.05em spacing
- **Inputs:** 2px charcoal border, 16px font, no border-radius
- **Focus state:** inset shadow, no outline
- **Optional text:** slate, normal weight, no uppercase

### Error State

- Error border: #8B0000
- Background: #FFF5F5
- Message: 9px, bold, uppercase, error red

### Progress Steps

Used on multi-step forms (e.g., the apply page). Numbered circles with labels below.

---

## 9. Modals

Modals use the hero window treatment (3px border, 6px shadow) with a close button. They appear over a 50% black overlay.

- Close button: 24x24px, charcoal background, white text, 1px offset shadow
- Max modal width: 500px
- Max height: 90vh with overflow scroll

---

## 10. Navigation & Footer

### Header

- Sticky, platinum background, 3px charcoal bottom border
- Logo on left, nav links on right
- Logo: 18px, bold, uppercase, 0.1em letter-spacing

### Footer

- Platinum background, 3px charcoal top border
- Three-column link sections with a centered bottom bar
- Footer text is 9px uppercase

---

## 11. Imagery & Assets

### Photo Treatment

| Context | Treatment |
|---------|-----------|
| Community/cohort photos | 3px solid black border, 4px 4px 0 black shadow, height: 250px, object-fit: cover |
| Value prop card images | No separate border (contained within window), height: 180px, object-fit: cover, 4px border-radius |
| Team headshots | 80x80px, 2px charcoal border, platinum background fallback |
| Hero images (scholarship page) | Full width (max 800px), 2px charcoal border, centered |
| Partner logos | Inside white container with 1px charcoal border, 30px height, object-fit: contain |

### Photography Guidelines

- Use real photos of real Fractal people, spaces, and events. No stock photography.
- Prefer candid, in-action shots (coding, collaborating, presenting) over posed portraits.
- Photos should feel energetic and communal — groups working together, not lone individuals.
- Always apply the border + shadow treatment. Raw photos without framing break the design system.

### Brand Assets

| Asset | File | Usage |
|-------|------|-------|
| Code slash icon | assets/Fractal_Asset_code_slash.svg | Hero section icon (80px width, 0.8 opacity) |
| Logo | Text-based: "FRACTAL" | 18px, bold, uppercase, 0.1em letter-spacing. The logo is typographic, not a graphic mark. |

---

## 12. Responsive Behavior

### Breakpoints

| Breakpoint | Max Width | Target |
|------------|-----------|--------|
| Tablet | 1024px | Footer wraps at 45% width |
| Mobile | 768px | Full responsive transformation |

### Mobile Changes (768px and below)

| Element | Desktop | Mobile |
|---------|---------|--------|
| Hero h1 | 48px | 24px |
| Section titles | 36px | 24px |
| Multi-column grids | 2–3 columns | 1 column (stacked) |
| 4-col stats (team page) | 4 columns | 2x2 grid |
| Nav links | Horizontal flex row | Vertical stack |
| Buttons | Inline, auto-width | Full-width (100%), stacked vertically |
| Button padding | 16px 32px, 18px font | 14px 24px, 16px font |
| Footer | 3-column flex row | Single column, centered |
| Team member header | Horizontal (photo + info) | Vertical, centered |
| Progress step labels | Visible | Hidden (numbers only) |

---

## 13. Voice & Tone

Fractal's voice is the voice of a founder talking directly to someone who's considering making a big career change. It's personal, honest, and specific. It never sounds like a brochure.

### Brand Voice Principles

| Principle | What It Means | Example |
|-----------|---------------|---------|
| **Direct & Conversational** | Write like you're talking to one person. Use "you" and "I/we." No corporate third-person. | "I'm Andrew. Before Fractal, I was a founding engineer at Culdesac." |
| **Honest & Transparent** | Acknowledge doubts, fears, and tradeoffs. Don't oversell. Address objections head-on. | "Fair. Let me give you the honest answer: obviously no one can guarantee that you'll get a job." |
| **Specific & Evidence-Based** | Use real numbers, real names, real companies. Never vague claims. Prove everything. | "100% of our first cohort who pursued engineering jobs got hired." Not "great job placement rates." |
| **Story-Driven** | Lead with real people's stories rather than feature lists. People remember stories. | Dorothy's story: PM who couldn't build → hacker-in-residence at Every.to |
| **Action-Oriented** | Every piece of content should move the reader closer to a decision. Always close with a clear next step. | "Book a call and ask me anything." Not "Learn more about our programs." |
| **Credible Authority** | Lean on founder credentials and instructor backgrounds. Show, don't just tell. | "Paris was a Senior Software Engineer at Netflix... under 2% acceptance rate." |

### Tone Spectrum

| Context | Tone |
|---------|------|
| Homepage / landing page | Confident, bold, direct claims. Short sentences. Urgency. |
| Email sequences | Personal, conversational, storytelling. Signed "— Andrew." |
| Case studies / testimonials | Narrative, empathetic, transformation-focused. Before → after arc. |
| FAQ / objection handling | Honest, anticipatory, reassuring without being dismissive. |
| Hiring partners page | Professional, outcome-focused. Less personal, more business value. |

### Terminology

| Use | Don't Use |
|-----|-----------|
| Engineers | Students, graduates, learners, coders |
| Fractal Accelerator | Fractal Bootcamp (legacy, being phased out) |
| Cohort | Class, batch, group |
| Ship / build / launch | Learn / study / train (when describing outcomes) |
| Partner startups | Client companies, employers |
| Staff-level engineers | Teachers, professors, mentors |

---

## 14. CTA Patterns

Every page and every email should end with a clear call to action.

### Primary CTAs (Buttons)

| CTA Text | When to Use |
|----------|-------------|
| **Apply Now →** | Main conversion action on any page. Links to apply.html. |
| **Book a Call** | Lower-commitment alternative. Links to Cal.com scheduling. |
| **Get Your Assessment** | Email CTAs. Frames the call as a free value exchange. |
| **Send Me The Action Plan →** | Lead magnet modal. Captures contact info for PDF delivery. |

### Secondary CTAs (Text Links)

| Pattern | Example |
|---------|---------|
| Arrow prefix + action | → Read her story |
| Arrow prefix + destination | → Meet the team |
| See all + category | See all testimonials → |

### Urgency & Scarcity Signals

Used in final CTAs and email sequences. Always based on real constraints.

- "15 spots available" — real cohort size
- "Spring 2026 cohort starts Feb 2" — real date
- "Last cohort filled in 8 days" — real track record
- "Early Bird discount expires in 48 hours" — real deadline

### Fallback CTA

Always include a lower-commitment option below the primary CTA for people who aren't ready to apply:

```
[Apply Now →]

Not ready to apply? Get our action plan
```

---

## 15. Writing Do's & Don'ts

### Headlines & Section Titles

**Do:** "Land a $100K+ AI Engineering Job in 12 Weeks"
- Specific outcome, specific timeline. The reader knows exactly what they get.

**Don't:** "Transform Your Career With Our Innovative Program"
- Vague, generic, could be any company. No specific proof or outcome.

### Body Copy

**Do:** "Dorothy joined our first cohort. Twelve weeks later, she wasn't just 'technical enough to talk to engineers' — she *was* one. Today she's hacker-in-residence at Every.to."
- Real person, real timeline, real outcome, real company.

**Don't:** "Our graduates go on to successful careers in the tech industry, leveraging the skills they learned during the program."
- No specifics, no person, no company. Reads like a brochure.

### Addressing Objections

**Do:** "I know what you're really thinking. 'If I do this... will I actually get a job at the end?' Fair. Let me give you the honest answer."
- Acknowledges the fear directly, validates it, then addresses it honestly.

**Don't:** "Our comprehensive career services ensure all participants are well-positioned for employment upon completion."
- Avoids the actual fear, uses corporate language, makes vague promises.

### CTAs & Emails

**Do:** "Still skeptical? Good. Book a call and ask me anything."
- Meets the reader where they are. Gives them control. Low pressure.

**Don't:** "Don't miss this incredible opportunity! Apply today before spots run out!"
- Pressure tactics, generic urgency, no specificity.

### Email Subject Lines

**Do:**
- "We couldn't hire good engineers. So we started a school."
- "From PM to engineer (Dorothy's story)"
- "He deferred med school. Now he bills $125/hr as an engineer."

**Don't:**
- "Fractal Bootcamp Newsletter #4"
- "Exciting Update From Our Team!"
- "Your Future Starts Here"

### General Rules

- Sign emails from **"— Andrew"**. The brand voice comes from the founder, not "the Fractal team."
- Use **bold** for key claims and numbers. Use *italics* only for inner dialogue or quotes.
- Keep paragraphs to **2–3 sentences max** in emails. One idea per paragraph.
- Every email and page section should end with a **clear, single next step**.
- Numbers are more convincing than adjectives: **"$100K+"** over "high-paying," **"12 weeks"** over "short program," **"40+"** over "many partners."
- Never use "innovative," "cutting-edge," "world-class," "state-of-the-art," or other meaningless superlatives.
- The word "just" is allowed only when minimizing something ("it's not just another bootcamp"). Never use it to minimize the reader's concerns.

---

*FRACTAL STYLE GUIDE — INTERNAL REFERENCE*
