---
version: alpha
name: OralIQ
description: The first Arabic platform for online oral exams. Students answer out loud from anywhere; lecturers get every answer graded with its reasons. It should feel calm for the student and trustworthy for the lecturer.
colors:
  paper: "#F3F3F2"     # page ground (light); #0D0D0D in dark
  sheet: "#FFFFFF"     # cards, sheets, inputs; #171717 in dark
  ink: "#0D0D0D"       # body text; #F3F3F1 in dark
  ink-2: "#47474A"     # secondary text
  ink-3: "#5E5E62"     # muted text, still AA on paper
  pen: "#0D0D0D"       # the one action colour: black in light, white in dark
  mark: "#C62A39"      # grader's red pen: grades and real errors only
  sun: "#A44F0C"       # warm encouragement (student-facing), amber notices
  navy: "#0D0D0D"      # deep surfaces (now black)
  home-hero: "#E4E4E4" # the home page's light first screen (black in dark)
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

The look is black and white (the owner's choice on 2026-10-22, from a reference they sent): white and near-black surfaces, large light headings, black actions in light mode and white ones in dark. Colour stays only where it carries meaning: the grader's red pen on a grade, pass green, warning amber. For students the product must still lower stress: plain surfaces, encouraging copy, amber instead of red for anything that needs their attention.

**Signature detail:** on the home page, the face mesh over the hero portrait (`FaceScan`): the 478 points the exam room actually tracks, computed with MediaPipe on that photo. In the app, the hand-drawn red loop round a grade (`ScoreMark`). Do not invent a third.

## Colors

Tokens live in `src/index.css` (`:root`, plus two dark blocks) and are exposed to Tailwind through `@theme inline`. Never hard-code a hex in a component when a token exists.

- **Paper (#F3F3F2):** a neutral off-white; dark mode is near-black (#0D0D0D), never pure black.
- **Ink / ink-2 / ink-3:** 13+ / 7.3 / 5.6 to 1 on paper. Muted text never drops below AA.
- **Pen (#0D0D0D, white in dark):** the single action colour (buttons, links, focus, active nav).
- **Mark (#C62A39):** the grade circle on lecturer views and marketing, and genuine errors (a failed form, a failed request). Notices that ask a student to do something use sun/warn instead.
- **Sun (#A44F0C):** encouragement and gentle notices on student screens (low time, "needs practice", proctoring nudges). 5.0:1 on its wash.
- **Navy:** now black; the deep surfaces read as part of the black-and-white set.
- **Violet / teal:** neutral greys now; stat cards tell figures apart by their labels, not by colour.
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
- Home page order (the owner's, fixed): 1 hero, 2 who we are + what we offer, then how a grade is made and the four steps, 3 explainer video, 4 our clients, 5 we join your platform, 6 contact, then the footer.
- The home page follows the owner's reference (2026-10-22): light theme is a light first screen (`home-hero`) stepping down into a black page; dark theme is black throughout. Sections are large light titles (`H2` in `components/home/ui.tsx`), dark cards, hairline rules. The reference's quotes are the four steps (no invented testimonials), its figure is the real 478 face points, and its logo rows are "عملاؤنا" (hidden until real clients exist).
- Every person in a photo is a young man (the owner's request), and all of them are one photo series of the same person with one shared black-and-white tone, so the site reads as one piece. Crops avoid printed text on clothing. Credits and the edits made are in `public/photos/CREDITS.md`.
- The hero: the headline, "ابدأ الآن" and "شوف الفيديو", the 478 points with the one-paragraph pitch, and a cut-out portrait with the face mesh (one portrait per theme, cut out onto that theme's hero colour). The mesh draws once and a scan line passes now and then; reduced motion shows it still.
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

- **Nav:** the landing header (sticky, blurred over content; below 1024px a menu button opens the section links, account links, language and theme in a side sheet) and the app sidebar (light rail in day mode, navy in dark).
- **Footer:** brand line plus two short link groups, then the copyright and the contact email. No newsletter box, no social row unless real, no technology list.
- **Company and contact details** (name, email, phone, location) come only from `src/content/company.ts`. The home page has no team section.
- **ScoreMark:** `ink="mark"` for lecturers and marketing, `ink="kind"` on a student's own grades.
- **Grades for students:** `studentGradeOf()` and `encouragementOf()`; the weakest band reads "يحتاج تقوية", never "ضعيف".
- **One primary button per view.** The page's main action is `primary`; repeated row actions in a list (start exam, send to student) are `secondary`.
- **Data states, on every list page:** while loading, `StatStrip loading` shows placeholders (never a "0" before the data arrives) and the list shows `ListSkeleton`; if loading failed, `LoadFailed` (with "حاول تاني") replaces the list and the figures; only a real empty list gets `EmptyState`. Filters, search and export appear only when there is something to act on. A live page (attendance) keeps its last data when a refresh fails and says so in an `Alert`.
- **Forms:** rules live in the markup (`required`, `type="email"`, `minLength`, `min`/`max`) and `useFieldErrors()` (`src/lib/useFieldErrors.ts`) checks them on submit with `noValidate` on the form, showing the message under the field in the page's language and focusing (centred) the first problem. `Field` links its hint or error to the control (`aria-describedby`, `aria-invalid`) by itself. Server errors go through `getApiErrorMessage`; never show a raw backend string or a status code.
- **Every string the user can see goes through `l()`/`t()`**, including error messages in the exam and identity flows. A camera or face problem is described as one (light, framing), never as a server problem.
- Tooltips are for mouse and keyboard; they are hidden on touch screens.

## Motion

- **Lenis** smooth scrolling site-wide (`components/SmoothScroll.tsx`, loaded after first paint, off for reduced motion, never inside dialogs).
- **GSAP** for the home hero's entrance only (`lib/gsap.ts`, always inside `withMotion`). The face scan is CSS (`home-mesh-in`, `home-scan`). Every scene is tied to content; no generic fade-and-rise on section headings or cards (catalog M1).
- **Motion** (`motion/react`) for app interface feedback, with one easing (`EASE`) and 150-300ms durations.
- Never split Arabic text into letters for animation; animate whole lines.
- Motion that answers an action is welcome: drawer slide, toast, the drawn check after submitting.
- Everything respects reduced motion (`MotionConfig reducedMotion="user"` plus the CSS media query).
- Nothing decorative moves in the exam room while the camera is proctoring; only the timer, the recording dot and the microphone level.

## Accessibility & Performance

- WCAG 2.2 AA: axe-core reports zero violations on every page in both themes; keep it that way. Description lists hold `dt`/`dd` directly inside each item `div`; a button's accessible name contains its visible words (2.5.3).
- Keyboard: both layouts start with a skip link to `#main`. The phone drawer is `invisible` when closed, takes focus when it opens, makes the page behind `inert`, and returns focus to the menu button. `Segmented` is one tab stop; arrows move the choice (left is "next" in Arabic).
- Google Fonts load without blocking the first paint (preload + `media="print"` swap in `index.html`). The home hero's portrait is preloaded from `index.html` on `/` only, with `fetchpriority="high"`.
- Screenshots and large photos ship with `srcSet`/`sizes`; add a smaller file next to any new large image.
- Search engines: `public/robots.txt` blocks `/dashboard`; `vercel.json` answers `/dashboard/*` and `/exam/*` with `X-Robots-Tag: noindex, nofollow`. Exam links are deliberately not blocked in robots.txt, so crawlers can see the noindex (a blocked URL can still be indexed from a public link). `vercel.json` also pins `buildCommand: npm run build` so the pre-render step cannot be skipped by a dashboard setting.
- **The home page is pre-rendered at build time** (`npm run build` → `scripts/prerender.mjs`): `dist/index.html` carries `/` as ready HTML (Arabic, light, signed out); every other route is served the plain shell `dist/app.html` (`vercel.json` rewrite). Only `/` is ever rendered at build time; nothing private is. The head script in `index.html` adopts the HTML (`data-prerender="hydrate"`) only when the visit would render identically, otherwise hides it before the first paint and the app draws from scratch.
  - Anything the home page renders must be the same in Node and in that browser: no `window`, `localStorage` or `matchMedia` reads during render (read them in effects, or guard them and render the Arabic/light/signed-out result).
  - Hero entrance tweens use `fromTo` with the resting values written out, and `HomeHero` removes `data-prerender` once they exist; the pre-rendered CSS holds `[data-hero-line]`, `[data-hero-fade]` and `[data-piece-enter]` hidden until then (shown after 6s if scripts never arrive).
  - Decorative layers in the hero are positioned in fixed units, so the web fonts arriving after the first paint do not move them.

## Do's and Don'ts

- Do reuse the tokens, nav, footer and primitives above on every page, unchanged.
- Do add a token to `index.css` and to this file before a page needs a new colour or size.
- Do keep student-facing language encouraging and specific ("رجّع عينك للشاشة", not "نظرت لليسار").
- Don't change: Alexandria (light weights for large headings) + IBM Plex Sans Arabic, the black-and-white palette with colour only for meaning, the home section order.
- The explainer video is `public/media/oraliq-demo.mp4` with `oraliq-demo-poster.webp`; it is a screen recording of the app with demo data. Replace both files to update it.
- Don't use: decorative blurred blobs behind sections; trust strips of three checkmarks under the hero; icons in tinted circles beside contact details; purple-to-blue gradients or gradient headline text; one accented word in a headline (SD5); eyebrow labels with hairlines above every heading (SD4); middle-dot meta strings (SD4d); decorative 01 / 02 / 03 numbering outside real sequences (SD6); fake browser chrome around screenshots (SD7); icons in tinted rounded squares as the default feature treatment (K6); mouse-following spotlights and 3D tilt cards (K10); count-up animations outside live dashboard figures (M5); cream with terracotta or near-black with acid green as an "escape" palette (SD1, SD2).
