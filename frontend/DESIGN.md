---
version: alpha
name: OralIQ
description: The first Arabic platform for online oral exams. Students answer out loud from anywhere; lecturers get every answer graded with its reasons. Confident and editorial on the marketing pages, quiet and white inside the app.
colors:
  black: "#000000"     # bands: header, hero, video, carousel, footer, sidebar
  sheet: "#FFFFFF"     # white sections, cards, inputs
  paper: "#F5F5F4"     # app page ground
  ink: "#111111"       # body text
  ink-2: "#474746"     # secondary text
  ink-3: "#5E5E5C"     # muted text, AA on paper and sheet
  rule: "#E4E4E2"      # hairlines that separate flat surfaces
  mark: "#C62A39"      # grader's red pen: grades and genuine errors
  pass: "#11784C"      # success / excellent
  warn: "#93580D"      # attention, never alarm
  sun: "#A44F0C"       # gentle student-facing notices
typography:
  display:
    fontFamily: Zain
    fontWeight: 800-900
  body:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 16px
    lineHeight: 1.7
rounded:
  everything: 0px      # sharp edges; only avatars, status dots and the phone mock are round
components:
  button-primary:
    backgroundColor: "{colors.black}"   # white on black bands
    textColor: "{colors.sheet}"
    rounded: 0
---

## Overview

OralIQ replaces the oral exam panel: a student answers a spoken question on a phone or laptop, and the lecturer receives the answer transcribed, graded by meaning against a model answer, and checked for identity. Arabic first, English second, right-to-left by default.

The look is an exam sheet: black ink on white paper, sharp edges, heavy headings. Colour is reserved for meaning. The owner's reference (an Arabic editorial site in black and white) set the rhythm of the marketing pages: black bands and white sheets alternating, full-bleed photography under a dark veil, square buttons, a slideshow band with square arrows and a progress line.

**Signature detail:** the hand-drawn pen loop (`ScoreMark`), red around a grade. The only other flourish is the stretched tatweel in the hero headline ("أونلايـــن"), which grows as the page scrolls. Do not add a third.

## Colors

Tokens live in `src/index.css` (`:root` plus two dark blocks) and are exposed to Tailwind through `@theme inline`. Components reference tokens, never hex values (the black bands use Tailwind's `bg-black`/`text-white` on purpose: they stay black in both themes).

- **Black / white:** the whole identity. `pen` (the action colour) is black in light mode and white in dark mode.
- **Mark red:** grades on lecturer views and marketing, and real errors. Not decoration.
- **Pass / warn / sun:** status only (published, needs review, low time, "needs practice").
- **Violet:** retired to a neutral grey; kept only so old tone names still resolve.

## Typography

- **Zain** (Google Fonts) for every heading and display number, 800-900 weight. **IBM Plex Sans Arabic** for body text. No third face.
- Marketing section titles: `clamp(2.25rem, 4.4vw, 3.5rem)`, black weight. Hero: `clamp(2.9rem, 5.4vw, 5.4rem)`, three lines that never wrap on desktop.
- App page titles 2.25-3rem, panel titles 1.375rem.

## Layout

- Home page, in the owner's order: 1 hero, 2 who we are + what we offer, 3 explainer video, 4 our clients, 5 we join your platform (carousel), 6 contact. Black header and footer.
- Container `max-w-7xl` with `px-4 sm:px-6`; photo bands and the carousel run full-bleed.
- App: black sidebar, white quiet content on `paper`, panels are flat sheets with a hairline border. Key figures sit in one ruled strip (`StatStrip`), not separate cards.

## Motion

- **Lenis** smooth scrolling site-wide (`components/SmoothScroll.tsx`), driven by GSAP's ticker. It ignores dialogs and anything marked `data-lenis-prevent`, and switches itself off for reduced motion.
- **GSAP + ScrollTrigger** for marketing scenes only (`lib/gsap.ts`, always wrapped in `withMotion`): hero entrance and stretching tatweel, photo settling, cards rising, video growing, carousel wipes.
- **Motion** (`motion/react`) for app interface feedback: page transitions, drawers, sliding indicators, the drawn check.
- Never split Arabic text into letters for animation; animate whole lines.
- Nothing decorative moves in the exam room while the camera is proctoring.

## Content rules

- Clients come only from `src/content/clients.ts` and must be real. With an empty list the section is a development-only preview and is hidden in production.
- Company and contact details come only from `src/content/company.ts`.
- The explainer video is `public/media/oraliq-demo.mp4` with `oraliq-demo-poster.webp`; replace both files to update it.
- The contact form opens the visitor's email app (there is no form backend yet).
- Student-facing grades: `studentGradeOf()` and `encouragementOf()`; the weakest band reads "يحتاج تقوية", never "ضعيف".

## Do's and Don'ts

- Do keep edges sharp and surfaces flat; separate with rules, lift only what floats.
- Do add a token before a page needs a new colour or size.
- Don't change: Zain + IBM Plex Sans Arabic, the black/white identity with the red pen, the home section order.
- Don't use: gradient headline text, purple/indigo gradients, glass cards, icons in tinted rounded squares, mouse-following spotlights or tilt cards, eyebrow labels above every heading, decorative 01/02/03, fake browser chrome, invented clients or statistics.
