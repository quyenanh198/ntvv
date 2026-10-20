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

After the trade catalog search addition, CI measured 1,201,091 B of startup local transfer, exceeding the unchanged 1.2 MB cap. The windmill scene image now uses a 224x210 export in all scene locations; its original 256x240 export and generated source remain available. The same browser probe verifies the resulting total, and farm screenshots at mobile and desktop sizes are retained for visual review.

The decoration-gallery increment serves a 208px market export (79,757 B) in both scene locations, saving 11,807 B versus the 224px export. The generated source and earlier exports remain available. Gallery sprites load lazily; the normal first-session image and total-transfer budgets remain unchanged and are checked by the same CI probe.

## Pond scene export

At `90c9fa1`, CI measured 1,199,213 B of startup local transfer, leaving only 787 B under the unchanged cap. The pond was the largest first-screen image. Its new 224px transparent export is 63,726 B, saving 19,949 B compared with the 83,675 B 256px export. Both the previous export and 1254px generated source remain in the repo. The source was deterministically resized with high-quality bicubic sampling. Browser coverage decodes the served 224px export and retains the existing 320px and desktop farm captures and transfer budgets. CI measures the resulting startup sample; this file-size reduction is not a mobile timing claim.
