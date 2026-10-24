# Calculus I Mastery Lab

Interactive visual lab for Calculus I: derivatives, curve sketching, critical points, optimization (2D field, 3D box),
oscillating motion, a function explorer, and Guided / Prediction / Mastery learning modes. See `ARCHITECTURE.md`.

## Run locally
```bash
npm install
npm run dev          # http://localhost:5173
```

## Test & build
```bash
npm test             # Vitest: derivatives, classification edge cases, optimization constraints, generators, sketch grading
npm run typecheck
npm run build        # type-checks then builds to dist/ (with PWA service worker + manifest)
npx vite preview --host 0.0.0.0 --port 4173
```

## Deploy to GitHub Pages
1. Create a GitHub repo and push this folder to the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow `.github/workflows/deploy.yml` runs tests, builds, and publishes `dist/` on every push to `main`
   (or run it manually from the Actions tab). The site appears at `https://<user>.github.io/<repo>/`.
   `vite.config.ts` uses `base: './'`, so it works under any sub-path without edits.

## Install as an app (PWA)
Open the deployed site → Android Chrome: menu ⋮ → *Install app* · iPad Safari: Share → *Add to Home Screen*.
Works offline after the first load. Progress is saved in `localStorage` on that device (Mastery tab → *Reset progress*).

## Supported expression syntax
`x`, `+ - * / ^`, parentheses, `sin cos tan sec csc cot asin acos atan sinh cosh tanh exp log (=ln) log10 sqrt cbrt abs sign`, `pi`, `e`.
Fractional powers of negatives follow the real convention (`x^(2/3)` is defined for x < 0).

## Accuracy notes
- f′ and f″ are **symbolic** (mathjs) whenever possible; a "numeric" badge appears if a central-difference fallback is used.
- Critical numbers, inflection points, discontinuities are located **numerically** (1200-cell grid + bisection /
  golden-section refinement, about 6 decimals). Features narrower than the grid spacing or removable holes that are
  not hit exactly may be missed; endpoints of the chosen window are treated as a closed interval.
