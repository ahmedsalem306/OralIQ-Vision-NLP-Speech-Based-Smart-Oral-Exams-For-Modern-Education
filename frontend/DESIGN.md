---
version: alpha
name: OralIQ
description: The first Arabic platform for online oral exams. Students answer out loud from anywhere; lecturers get every answer graded with its reasons. It should feel calm for the student and trustworthy for the lecturer.
colors:
  paper: "#F6F5F1"     # page ground (light)
  sheet: "#FFFFFF"     # cards, sheets, inputs
  ink: "#1A2134"       # body text
  ink-2: "#4A5064"     # secondary text
  ink-3: "#5D6272"     # muted text, still AA on paper
  pen: "#3252D0"       # ballpoint blue: the one action colour
  mark: "#C62A39"      # grader's red pen: grades only
  sun: "#A44F0C"       # warm encouragement (student-facing), amber notices
  navy: "#0E1834"      # deep surfaces: grading section, hero tabs, lecturer banner
  pass: "#11784C"      # success / excellent
  warn: "#93580D"      # attention, never alarm
typography:
  display:
    fontFamily: Alexandria
    fontWeight: 700
    letterSpacing: -0.01em
  body:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 16px
    lineHeight: 1.7
rounded:
  control: 12px
  panel: 20px
  feature: 26px
  stage: 36px
components:
  button-primary:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
---

## Overview

OralIQ replaces the oral exam panel: a student answers a spoken question on a phone or laptop, and the lecturer receives the answer transcribed, graded by meaning against a model answer, and checked for identity. The audience is Arabic-speaking universities and schools, Arabic first, English second, right-to-left by default.

The look comes from the exam itself: the **answer sheet** (warm paper, ruled lines, ballpoint-blue ink) and the **grader's red pen** that circles the final mark. Everything else stays quiet so those two things carry the identity. For students the product must lower stress, not add it: warm ground, soft blue, encouraging copy, amber instead of red for anything that needs their attention.

**Signature detail:** the hand-drawn pen loop (`ScoreMark`). Red around a grade, blue around a step number on the home page, grade-coloured ("kind ink") on the student's own grades. Do not invent a second signature.

## Colors

Tokens live in `src/index.css` (`:root`, plus two dark blocks) and are exposed to Tailwind through `@theme inline`. Never hard-code a hex in a component when a token exists.

- **Paper (#F6F5F1):** warm off-white, like exam paper; easier on the eyes than a cold blue-grey.
- **Ink / ink-2 / ink-3:** 13+ / 7.3 / 5.6 to 1 on paper. Muted text never drops below AA.
- **Pen (#3252D0):** the single action colour (buttons, links, focus, active nav). 6.4:1 with white.
- **Mark (#C62A39):** the grade circle on lecturer views and marketing, and genuine errors (a failed form, a failed request). Notices that ask a student to do something use sun/warn instead.
- **Sun (#A44F0C):** encouragement and gentle notices on student screens (low time, "needs practice", proctoring nudges). 5.0:1 on its wash.
- **Navy:** depth for a few large surfaces. Not a page background.
- **Violet / teal:** stat-card and chart accents only. Never a gradient pair for headlines.
- **Grade-part bars** (content, fluency, integrity) are pen-blue everywhere, marketing included, and turn mark-red under 50: the colour carries status, not identity.

Dark mode redefines every token; components only reference tokens.

## Typography

- **Alexandria** for headings and numbers (display), **IBM Plex Sans Arabic** for body. Both handle Arabic and Latin.
- Headings: 30px mobile, about 42px desktop for section titles. The home hero's giant words are the one loud moment.
- Numbers that line up (scores, tables) use `.tabular`.
- Latin strings inside Arabic (emails, IDs) use `.ltr`.

## Layout

- Arabic first: use logical properties (`ms-`, `pe-`, `start-`, `end-`) everywhere; mirror photos for LTR only when a composition depends on direction.
- App lists that become tables (results, attendance) switch on the panel's own width with a container query (`@container` + `@3xl:`), never on the screen width: beside the sidebar a tablet screen leaves only ~470px. Stat cards drop their icon when the card itself is narrow.
- Every page is checked at 320 / 360 / 414 / 768 / 1024 / 1280 / 1920 in both languages and both themes; nothing may be clipped by `overflow-x-clip` (the landing header drops the wordmark below 360px).
- Widths follow the section's role: the hero is a full-width stage (max 1400px); reading sections (steps, comparison) sit at `max-w-6xl`; the FAQ is narrow (`max-w-3xl`); product shots and feature grids use `max-w-7xl`.
- Home page order (the owner's, fixed): 1 hero, 2 who we are + what we offer (with the four steps), 3 explainer video, 4 our clients, 5 we join your platform, 6 contact, then the footer.
- The hero is a light stage: the headline alone in the middle, with student photos and small product pieces (grade, identity check, recording, published grade) floating around it on desktop; a small still collage under the words on phones.
- References from the owner (e.g. their Pinterest board of websites) are read as a whole for taste: light, airy, rounded, real product and real people. Never clone one design.
- The clients section is titled "عملاؤنا" only (no claims about what kind of institutions) and its logos move in one band. Clients come only from `src/content/clients.ts` and must be real. With an empty list the section is a development-only preview and is hidden in production; never ship invented names or logos. Add sections only when they answer a question a buyer actually has.

## Elevation & Depth

- `shadow-card` for resting surfaces that need separation, `shadow-float` for things that genuinely float (overlays on photos, the hero cut-out, the product shot), `shadow-pop` for menus and toasts.
- Many surfaces are flat with a 1px `rule` border. Not every card needs a shadow.
- Blur (`backdrop-blur`) only where something sits over moving or photographic content: sticky bars, modal backdrops, notes over a photo.

## Shapes

- Controls (buttons, inputs): `--radius-control` 12px.
- Panels and dashboard cards: `--radius-panel` 20px.
- Marketing feature cards: 26px. The hero stage: 36px.
- Pills are for status badges and the hero CTA only.

## Components

Shared primitives live in `src/components/ui/` (button, input, panel, feedback, badge, avatar, score-mark, toast, tooltip). Reuse them; do not restyle per page.

- **Nav:** the landing header (sticky, blurred over content) and the app sidebar (light rail in day mode, navy in dark).
- **Footer:** brand line plus two short link groups, then the copyright and the contact email. No newsletter box, no social row unless real, no technology list.
- **Company and contact details** (name, email, phone, location) come only from `src/content/company.ts`. The home page has no team section.
- **ScoreMark:** `ink="mark"` for lecturers and marketing, `ink="kind"` on a student's own grades.
- **Grades for students:** `studentGradeOf()` and `encouragementOf()`; the weakest band reads "يحتاج تقوية", never "ضعيف".

## Motion

- **Lenis** smooth scrolling site-wide (`components/SmoothScroll.tsx`, loaded after first paint, off for reduced motion, never inside dialogs).
- **GSAP + ScrollTrigger** for the home page scenes only (`lib/gsap.ts`, always inside `withMotion`): hero pieces coming out and drifting at their own speeds, screenshots drifting, score bars filling, the steps line, the video growing, the photo wipe in section 5. Every scene is tied to content; no generic fade-and-rise on section headings or cards (catalog M1).
- **Motion** (`motion/react`) for app interface feedback, with one easing (`EASE`) and 150-300ms durations.
- Never split Arabic text into letters for animation; animate whole lines.
- Motion that answers an action is welcome: drawer slide, toast, the drawn check after submitting.
- Everything respects reduced motion (`MotionConfig reducedMotion="user"` plus the CSS media query).
- Nothing decorative moves in the exam room while the camera is proctoring; only the timer, the recording dot and the microphone level.

## Accessibility & Performance

- WCAG 2.2 AA: axe-core reports zero violations on every page in both themes; keep it that way. Description lists hold `dt`/`dd` directly inside each item `div`; a button's accessible name contains its visible words (2.5.3).
- Keyboard: both layouts start with a skip link to `#main`. The phone drawer is `invisible` when closed, takes focus when it opens, makes the page behind `inert`, and returns focus to the menu button. `Segmented` is one tab stop; arrows move the choice (left is "next" in Arabic).
- Google Fonts load without blocking the first paint (preload + `media="print"` swap in `index.html`). The home hero's two photos are preloaded from `index.html` on `/` only, with `fetchpriority="high"`.
- Screenshots and large photos ship with `srcSet`/`sizes`; add a smaller file next to any new large image.
- `public/robots.txt` keeps `/dashboard` and `/exam/` (private exam links) out of search.

## Do's and Don'ts

- Do reuse the tokens, nav, footer and primitives above on every page, unchanged.
- Do add a token to `index.css` and to this file before a page needs a new colour or size.
- Do keep student-facing language encouraging and specific ("رجّع عينك للشاشة", not "نظرت لليسار").
- Don't change: Alexandria + IBM Plex Sans Arabic, the warm light palette with pen blue and the red pen, the home section order.
- The explainer video is `public/media/oraliq-demo.mp4` with `oraliq-demo-poster.webp`; it is a screen recording of the app with demo data. Replace both files to update it.
- Don't use: decorative blurred blobs behind sections; trust strips of three checkmarks under the hero; icons in tinted circles beside contact details; purple-to-blue gradients or gradient headline text; one accented word in a headline (SD5); eyebrow labels with hairlines above every heading (SD4); middle-dot meta strings (SD4d); decorative 01 / 02 / 03 numbering outside real sequences (SD6); fake browser chrome around screenshots (SD7); icons in tinted rounded squares as the default feature treatment (K6); mouse-following spotlights and 3D tilt cards (K10); count-up animations outside live dashboard figures (M5); cream with terracotta or near-black with acid green as an "escape" palette (SD1, SD2).
