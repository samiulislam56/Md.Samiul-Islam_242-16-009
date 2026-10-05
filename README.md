# Smart Escape

Smart Escape is a frontend-only evacuation route simulator built to satisfy the Smart Escape SRS. It accepts a `building.json` file, validates the graph schema, renders the map, and recomputes the lowest-cost route to an open exit whenever hazards change.

## Live URL

Use the GitHub Pages URL format below after pushing the repo:

```text
https://<your-github-username>.github.io/devfest-<registration-number>/
```

If you deploy to Vercel or Netlify, the production site can instead use the platform-generated HTTPS domain.

## Features

- Local `building.json` import in the browser
- Full schema validation with clear error states
- Interactive room, junction, corridor and exit hazard toggles
- Deterministic routing with exit and path tie-breaking
- Responsive SVG map for mobile through desktop
- English and Bangla interface translations
- Reset support back to the imported `initial_state`

## Local Development

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open the local Vite URL shown in the terminal.

## Production Build

```bash
npm run build
```

## GitHub Pages deployment

1. Push this project to a public GitHub repository named `devfest-<registration-number>`.
2. In GitHub, open the repository and enable GitHub Pages.
3. Select the GitHub Actions deployment method.
4. Commit the included workflow in `.github/workflows/deploy.yml`.
5. The site will be published at:

```text
https://<your-github-username>.github.io/devfest-<registration-number>/
```

## Project Structure

- `src/App.tsx` — simulator UI, route engine and validation logic
- `src/App.css` — visual design and layout
- `public/building.json` — starter dataset for quick testing
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow

## License

This project is distributed under the MIT License.
