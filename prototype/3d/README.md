# 3D farm prototype

Standalone three.js prototype of the NTVV farm. It does not talk to the server and is not served by the game.

Open it from a static server at the repository root so the crop sprites in `public/assets/crops-v3/` load:

```bash
npx http-server . -p 8099
# then open http://localhost:8099/prototype/3d/
```

Grow times are shortened for testing. Add `#debug` to the URL to expose `window.__farm` for scripted screenshots.
