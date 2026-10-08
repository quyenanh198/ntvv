# Farm art direction and asset inventory

The crop, tree, animal, and machine catalog and static client asset references are tracked in [art-inventory.md](art-inventory.md). Regenerate it with `npm run art:inventory` after changing game content or asset files.

## Scene standard

- **View:** compact three-quarter view, with the soil or floor visible below the object. Keep the object upright so its silhouette reads in a square plot.
- **Light:** warm light from upper left; soft shadow below and slightly right. Avoid a second hard light source.
- **Color:** natural, saturated produce against deep green leaves and warm brown soil. Keep the farm background quieter than interactive objects.
- **Surface:** hand-painted texture and soft dark contours. Avoid photo cutouts, flat emoji, glossy plastic, and inconsistent pixel art.
- **Composition:** one crop cluster per transparent square image, with all leaves and fruit inside the canvas. Leave enough clear margin for plot badges and harvest labels.
- **Readability:** inspect each sprite at 80 CSS pixels on a 320px-wide phone. Shape and harvest state must remain clear without relying on color alone.
- **Export:** 256×256 RGBA PNG for crops and animal cards; 512×512 RGBA PNG for large buildings and characters. Optimize files before shipping. Keep generation/source files outside the public payload and record the final asset path below.

## Crop state system

Each crop has three visible states: seedling, growing, and ripe. The current code uses a shared hand-painted seedling PNG, then per-crop growing and ripe art. Ten crops have matched PNG pairs; the others retain legacy SVGs. The next art batches should extend matching pairs by unlock level. Watered and ready badges must remain legible above the artwork.

| Crop | Unlock | Ripe art | Growing art | Next art action |
| --- | ---: | --- | --- | --- |
| Wheat (`luami`) | 1 | `public/assets/crops-v3/wheat-ripe.png` | `public/assets/crops-v3/wheat-growing.png` | Shared seedling PNG |
| Carrot (`carot`) | 1 | `public/assets/crops-v3/carrot-ripe.png` | `public/assets/crops-v3/carrot-growing.png` | Shared seedling PNG |
| Corn (`ngo`) | 4 | `public/assets/crops-v3/corn-ripe.png` | `public/assets/crops-v3/corn-growing.png` | Shared seedling PNG |
| Potato (`khoaitay`) | 5 | `public/assets/crops-v3/potato-ripe.png` | `public/assets/crops-v3/potato-growing.png` | Shared seedling PNG |
| Garlic (`toi`) | 5 | `public/assets/crops-v3/garlic-ripe.png` | `public/assets/crops-v3/garlic-growing.png` | Shared seedling PNG |
| Herbs (`rauthom`) | 4 | `public/assets/crops-v3/herbs-ripe.png` | `public/assets/crops-v3/herbs-growing.png` | Shared seedling PNG |
| Cucumber (`dualeo`) | 6 | `public/assets/crops-v3/cucumber-ripe.png` | `public/assets/crops-v3/cucumber-growing.png` | Shared seedling PNG |
| Lemongrass (`sa`) | 6 | `public/assets/crops-v3/lemongrass-ripe.png` | `public/assets/crops-v3/lemongrass-growing.png` | Shared seedling PNG |
| Cabbage (`bapcai`) | 7 | `public/assets/crops-v3/cabbage-ripe.png` | `public/assets/crops-v3/cabbage-growing.png` | Shared seedling PNG |
| Peanut (`dauphong`) | 7 | `public/assets/crops-v3/peanut-ripe.png` | `public/assets/crops-v3/peanut-growing.png` | Shared seedling PNG |
| Other crops | 4–29 | legacy SVG | legacy SVG | Prioritize by unlock level and visual frequency |

Garlic source images: `asset/source_crops/v3/garlic-growing.png` and `asset/source_crops/v3/garlic-ripe.png` (1024×1024 transparent originals). The game exports are 256×256 PNGs.
Cucumber source images: `asset/source_crops/v3/cucumber-growing.png` and `asset/source_crops/v3/cucumber-ripe.png` (1024×1024 transparent originals). The game exports are 256×256 PNGs.
Lemongrass source images: `asset/source_crops/v3/lemongrass-growing.png` and `asset/source_crops/v3/lemongrass-ripe.png` (1024×1024 transparent originals). The game exports are 256×256 PNGs.
The shared seedling source is `asset/source_crops/v3/seedling.png`; its 256×256 game export is `public/assets/crops-v3/seedling.png`.
Cabbage source images are `asset/source_crops/v3/cabbage-growing.png` and `asset/source_crops/v3/cabbage-ripe.png`; their game exports are 256×256 PNGs.
Peanut source images are `asset/source_crops/v3/peanut-growing.png` and `asset/source_crops/v3/peanut-ripe.png`; their game exports are 256×256 PNGs.

## Other families

| Family | Current state | Next deliverable |
| --- | --- | --- |
| Farm buildings | New coop, windmill, and market sprites; other buildings use mixed existing art | Replace visible outliers and align scale/shadow |
| Farmer | New character sprite | Review size and silhouette against buildings at mobile width |
| Fruit trees | All thirteen species have individual PNGs | Review scale and ready-state contrast together at phone width |
| Animals | All fifteen species have individual PNGs | Review scale and shadow together at phone width |
| Machines | Mixed SVG/PNG/emoji | Standardize machine footprint and active/ready feedback |
| Products and UI icons | Mostly emoji | Use a consistent icon set after gameplay hierarchy is settled |

## Review checklist for each new sprite

1. Open original image and confirm real alpha transparency and complete silhouette.
2. Resize to the export dimension and inspect that exact file.
3. Wire it to the correct game ID and state; check fallback for other IDs.
4. Check the plot at narrow phone width and on desktop, including ready badges and labels.
5. Confirm the asset payload is reasonable and record it in this inventory.

## New animal source

- Duck (`vit`): `asset/source_animals/duck_v3.png` is the 1024×1024 transparent source; `public/assets/art/duck_v3.png` is the 256×256 game export. The barn, shop, and animal cards use the shared `BARN_ART` mapping.
- Goose (`ngong`), rabbit (`tho`), and bee (`ong`): `asset/source_animals/{goose,rabbit,bee}_v3.png` are the 1024×1024 transparent sources; `public/assets/art/{goose,rabbit,bee}_v3.png` are the 256×256 game exports.

## Added tree sources

Banana, lemon, coconut, peach, and cherry tree and fruit icons use the transparent originals in `asset/png/fruit_trees/`, copied into `public/assets/art/trees/` under their game IDs (`chuoi`, `chanh`, `dua`, `dao`, `anhdao`).

Tamarind (`quame`), ambarella (`coc`), avocado (`quabo`), and durian (`saurieng`) have 1024×1024 transparent originals in `asset/source_trees/v3/` and 256×256 game exports in `public/assets/art/trees/` under their game IDs.
