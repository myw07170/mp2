# MP2 Pokemon Browser

A React + TypeScript single-page app for browsing the first 151 Pokemon from the
[PokeAPI](https://pokeapi.co/). The app includes searchable list, gallery, and
detail views for exploring Kanto Pokemon by name, Pokedex number, type, artwork,
abilities, stats, height, and weight.

## Features

- List view for the first-generation Pokemon with live search by name, number,
  or type.
- Client-side type filtering plus sorting by Pokedex number, name, height, or
  weight.
- Ascending and descending sort controls for all list sort options.
- Gallery view using official Pokemon artwork from the API.
- Multi-select gallery filtering by Pokemon type.
- Detail routes at `/pokemon/:pokemonId` with artwork, type badges, height,
  weight, abilities, hidden ability, and base stat bars.
- Previous and next controls on the detail view that cycle through Pokemon
  `001` through `151`.
- Loading, error, empty-results, and invalid-detail-route states.

## Setup

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run lint checks:

```bash
npm run lint
```

## Deployment Notes

- `vite.config.ts` sets the Vite `base` path to `/mp2/` for GitHub Pages.
- `src/main.tsx` passes `import.meta.env.BASE_URL` to `BrowserRouter` as the
  router basename, so app links resolve correctly under the deployed base path.

## Sources

Code and data source:

- PokeAPI: https://pokeapi.co/

Reading and tooling references:

- React documentation: https://react.dev/
- React Router documentation: https://reactrouter.com/
- Axios package documentation: https://www.npmjs.com/package/axios
- TypeScript documentation: https://www.typescriptlang.org/docs/
- Vite documentation: https://vite.dev/


LLM references:

- LLM chat references used during implementation are declared in `llm_logs.csv`.
