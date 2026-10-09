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

The matched farmhouse, barn, and greenhouse replaced three older scene assets. Their 192px exports total about 198 KB and retain readable silhouettes in the reviewed 320px and 1280px screenshots. The first-load image sample is now 784,719 B, leaving 115,281 B under the image budget; total local transfer is 1,095,957 B, leaving 104,043 B under its budget. These are single hosted-runner samples, so timing differences are not treated as performance gains.
