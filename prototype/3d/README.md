# 3D farm prototype

Standalone three.js prototype of the NTVV farm. It does not talk to the server and is not served by the game.

Open it from a static server at the repository root so the crop sprites in `public/assets/crops-v3/` load:

```bash
npx http-server . -p 8099
# then open http://localhost:8099/prototype/3d/
```

## Chibi or not

Characters are chibi; buildings are not.

- The camera sits about 48° above the ground, and on a phone the farmer is only 30–40 px tall. With realistic proportions she read as a straw hat with legs. A head 1.3× larger with the hat tipped back shows her face and blinking, so actions read as hers. Animals use the same rule (heads 1.2–1.35×).
- Buildings keep the scale relationships set by the scene standard in `docs/art-direction.md`. Chibi buildings would make the plots and paths look like a toy set and break the shared scale with the painted sprites.

Grow times are shortened for testing. Add `#debug` to the URL to expose `window.__farm` for scripted screenshots.
