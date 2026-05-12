# Stash Star Rater

For those who want to rate scenes 1-10 stars without fussing with decimal numbers.

Replaces Stash's decimal rating input with 10 clickable SVG stars. Hover for a preview, click the left half of a star for a half-star, the right half for a full star.

## Installation

1. Copy `stashStarRater.yml` and `stashStarRater.js` into your Stash `plugins/stashStarRater/` folder.
2. In Stash: **Settings → Plugins → Reload plugins**.

## Requirements

- Stash with the rating system set to a 1-10 decimal scale.

## Development

```sh
npm install
npm run build   # compiles + deploys to the configured plugins folder
npm run watch   # rebuilds on file change (no auto-deploy)
```
