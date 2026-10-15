# Mobile startup transfer baseline

The CI Chromium smoke check opens a fresh level-1 farm at 320px, waits for the first plot and the page load event, then records same-origin Performance Resource Timing entries. Its JSON and screenshots are saved as a CI artifact. The sample includes HTTP transfer overhead and only resources loaded before that observation point; external fonts and later gameplay assets are excluded.

| Branch revision | Local transfer | Image transfer | Local requests | Images |
| --- | ---: | ---: | ---: | ---: |
| Before scene export resize (`6433e39`) | 1,998,312 B | 1,688,611 B | 28 | 24 |
| After scene export resize (`e0a449c`) | 1,070,912 B | 761,173 B | 28 | 24 |
| Three new buildings at 224px (`e8e1215`) | 1,164,231 B | 852,993 B | 28 | 24 |
| Three new buildings at 192px (`b6feecc`) | 1,095,957 B | 784,719 B | 28 | 24 |

Four scene exports changed from about 1,237 KB of 500–512px PNGs to about 331 KB of 256px PNGs while the visible scene stayed legible at 320px and 1280px. This reduced the measured first-load image transfer by 927,438 B (55%). The browser smoke check now limits the sampled image transfer to 900,000 B and total same-origin transfer to 1,200,000 B; these leave room for small additions while guarding the first screen. The observed plot time was 310 ms before and 254 ms after, but one hosted-runner sample is insufficient to attribute the timing change to the artwork.

The next performance review should sample several runs on a slower mobile network and measure later sheets, polling, memory, and interaction work before setting time-to-interactive budgets.

## Starter seed chooser

The browser probe clears resource timings immediately before opening a level-1 seed chooser, waits for eager thumbnails to decode, and records crop/tree sprite transfers before future unlocks are opened. It saves `seed-transfer-320.json` with the browser artifacts. Existing scene assets and external fonts are excluded.

| Revision | Sprite requests | Sprite transfer |
| --- | ---: | ---: |
| Eager future thumbnails (`2b20965`) | 49 | 4,568,893 B |
| Deferred future thumbnails (`ba0ddda`) | 2 | 182,793 B |

Only wheat and carrot are unlocked in this scenario. Deferring the 47 locked thumbnails reduces the measured opening transfer by 96%. The chooser keeps unlocked images eager and loads locked art when the player opens future unlocks or finds them through search. Browser checks enforce a 300,000 B starter sprite budget, verify that the closed section makes no extra sprite requests, and reveal/decode a future corn sprite. These are deterministic local-server transfer measurements, not a mobile-network timing claim.

After later UI additions, the first-load transfer approached the 1.2 MB guardrail. The market building is now served from a 224×207 export (91,564 B instead of 116,942 B) at both scene locations; the original remains in the asset folder. The same CI browser probe measures the resulting startup transfer.

The matched farmhouse, barn, and greenhouse replaced three older scene assets. Their 192px exports total about 198 KB and retain readable silhouettes in the reviewed 320px and 1280px screenshots. The first-load image sample is now 784,719 B, leaving 115,281 B under the image budget; total local transfer is 1,095,957 B, leaving 104,043 B under its budget. These are single hosted-runner samples, so timing differences are not treated as performance gains.
