# Photo credits

All photos are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license) (free for commercial use, no attribution required).
Credited here anyway, as good practice. Every photo is shown in black and white (the site's look since 2026-10-22).

| File | Where | Photographer | Source |
|------|-------|--------------|--------|
| face-light-*.webp | Home hero, light theme (cut out) | Amirhadi Manavi Moghadam | https://unsplash.com/photos/QY93A05t3zI |
| face-dark-*.webp | Home hero, dark theme (cut out) | Payton Tuttle | https://unsplash.com/photos/RFFR1JjkJx8 |
| about-student-*.webp | Home, who we are | Unsplash user "x" | https://unsplash.com/photos/7d4LREDSPyQ |
| video-cover-*.webp | Home, video banner | Amit Ranjan | https://unsplash.com/photos/3S0Ucv4BDCk |
| auth-signin-*.webp | Sign-in page | Amit Ranjan | https://unsplash.com/photos/3S0Ucv4BDCk |
| auth-signup-*.webp | Sign-up page | Derick McKinney | https://unsplash.com/photos/kfN-BBbWTWo |
| grades-student-*.webp, overview-student-*.webp | Student grades and overview | Amirhadi Manavi Moghadam | https://unsplash.com/photos/QY93A05t3zI |
| exam-student-*.webp | Exam room | Unsplash user "x" | https://unsplash.com/photos/7d4LREDSPyQ |

The face mesh drawn over the hero portraits is MediaPipe FaceMesh (refineLandmarks, 478 points) run on those photos,
the same model the exam room uses (`src/components/home/faceMesh.ts`). The two hero portraits are cut out with
MediaPipe Selfie Segmentation and placed on the hero's own colour.

The explainer video (`/media/oraliq-demo.mp4`) is a screen recording of the app with demo data; the student's camera
in it shows the face-light portrait.
