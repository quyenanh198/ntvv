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

Each crop has three visible states: seedling, growing, and ripe. The current code uses a shared hand-painted seedling PNG, then per-crop growing and ripe art. All thirty-six crops now have matched PNG pairs. Watered and ready badges must remain legible above the artwork.

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
| Tomato (`cachua`) | 8 | `public/assets/crops-v3/tomato-ripe.png` | `public/assets/crops-v3/tomato-growing.png` | Shared seedling PNG |
| Sweet potato (`khoailang`) | 8 | `public/assets/crops-v3/sweet-potato-ripe.png` | `public/assets/crops-v3/sweet-potato-growing.png` | Shared seedling PNG |
| Chili (`ot`) | 9 | `public/assets/crops-v3/chili-ripe.png` | `public/assets/crops-v3/chili-growing.png` | Shared seedling PNG |
| Sesame (`me`) | 9 | `public/assets/crops-v3/sesame-ripe.png` | `public/assets/crops-v3/sesame-growing.png` | Shared seedling PNG |
| Onion (`hanhtay`) | 10 | `public/assets/crops-v3/onion-ripe.png` | `public/assets/crops-v3/onion-growing.png` | Shared seedling PNG |
| Mung bean (`dauxanh`) | 11 | `public/assets/crops-v3/mung-bean-ripe.png` | `public/assets/crops-v3/mung-bean-growing.png` | Shared seedling PNG |
| Sugarcane (`mia`) | 12 | `public/assets/crops-v3/sugarcane-ripe.png` | `public/assets/crops-v3/sugarcane-growing.png` | Shared seedling PNG |
| Strawberry (`dautay`) | 13 | `public/assets/crops-v3/strawberry-ripe.png` | `public/assets/crops-v3/strawberry-growing.png` | Shared seedling PNG |
| Ginger (`gung`) | 13 | `public/assets/crops-v3/ginger-ripe.png` | `public/assets/crops-v3/ginger-growing.png` | Shared seedling PNG |
| Eggplant (`catim`) | 14 | `public/assets/crops-v3/eggplant-ripe.png` | `public/assets/crops-v3/eggplant-growing.png` | Shared seedling PNG |
| Sunflower (`huongduong`) | 15 | `public/assets/crops-v3/sunflower-ripe.png` | `public/assets/crops-v3/sunflower-growing.png` | Shared seedling PNG |
| Rice (`gao`) | 16 | `public/assets/crops-v3/rice-ripe.png` | `public/assets/crops-v3/rice-growing.png` | Shared seedling PNG |
| Cauliflower (`bongcai`) | 17 | `public/assets/crops-v3/cauliflower-ripe.png` | `public/assets/crops-v3/cauliflower-growing.png` | Shared seedling PNG |
| Pumpkin (`bingo`) | 18 | `public/assets/crops-v3/pumpkin-ripe.png` | `public/assets/crops-v3/pumpkin-growing.png` | Shared seedling PNG |
| Tea (`tra`) | 19 | `public/assets/crops-v3/tea-ripe.png` | `public/assets/crops-v3/tea-growing.png` | Shared seedling PNG |
| Pineapple (`thom`) | 20 | `public/assets/crops-v3/pineapple-ripe.png` | `public/assets/crops-v3/pineapple-growing.png` | Shared seedling PNG |
| Cotton (`bongvai`) | 21 | `public/assets/crops-v3/cotton-ripe.png` | `public/assets/crops-v3/cotton-growing.png` | Shared seedling PNG |
| Watermelon (`duahau`) | 21 | `public/assets/crops-v3/watermelon-ripe.png` | `public/assets/crops-v3/watermelon-growing.png` | Shared seedling PNG |
| Grape (`nho`) | 22 | `public/assets/crops-v3/grape-ripe.png` | `public/assets/crops-v3/grape-growing.png` | Shared seedling PNG |
| Coffee (`caphe`) | 23 | `public/assets/crops-v3/coffee-ripe.png` | `public/assets/crops-v3/coffee-growing.png` | Shared seedling PNG |
| Cannabis (`cansa`) | 25 | `public/assets/crops-v3/cannabis-ripe.png` | `public/assets/crops-v3/cannabis-growing.png` | Shared seedling PNG |
| Rose (`hoahong`) | 25 | `public/assets/crops-v3/rose-ripe.png` | `public/assets/crops-v3/rose-growing.png` | Shared seedling PNG |
| Olive (`oliu`) | 26 | `public/assets/crops-v3/olive-ripe.png` | `public/assets/crops-v3/olive-growing.png` | Shared seedling PNG |
| Mushroom (`nam`) | 27 | `public/assets/crops-v3/mushroom-ripe.png` | `public/assets/crops-v3/mushroom-growing.png` | Shared seedling PNG |
| Cacao (`cacao`) | 28 | `public/assets/crops-v3/cacao-ripe.png` | `public/assets/crops-v3/cacao-growing.png` | Shared seedling PNG |
| Vanilla (`vani`) | 29 | `public/assets/crops-v3/vanilla-ripe.png` | `public/assets/crops-v3/vanilla-growing.png` | Shared seedling PNG |

Garlic source images: `asset/source_crops/v3/garlic-growing.png` and `asset/source_crops/v3/garlic-ripe.png` (1024×1024 transparent originals). The game exports are 256×256 PNGs.
Cucumber source images: `asset/source_crops/v3/cucumber-growing.png` and `asset/source_crops/v3/cucumber-ripe.png` (1024×1024 transparent originals). The game exports are 256×256 PNGs.
Lemongrass source images: `asset/source_crops/v3/lemongrass-growing.png` and `asset/source_crops/v3/lemongrass-ripe.png` (1024×1024 transparent originals). The game exports are 256×256 PNGs.
The shared seedling source is `asset/source_crops/v3/seedling.png`; its 256×256 game export is `public/assets/crops-v3/seedling.png`.
Cabbage source images are `asset/source_crops/v3/cabbage-growing.png` and `asset/source_crops/v3/cabbage-ripe.png`; their game exports are 256×256 PNGs.
Peanut source images are `asset/source_crops/v3/peanut-growing.png` and `asset/source_crops/v3/peanut-ripe.png`; their game exports are 256×256 PNGs.
Tomato source images are `asset/source_crops/v3/tomato-growing.png` and `asset/source_crops/v3/tomato-ripe.png`; their game exports are 256×256 PNGs.
Sweet potato source images are `asset/source_crops/v3/sweet-potato-growing.png` and `asset/source_crops/v3/sweet-potato-ripe.png`; their game exports are 256×256 PNGs.
Chili source images are `asset/source_crops/v3/chili-growing.png` and `asset/source_crops/v3/chili-ripe.png`; their game exports are 256×256 PNGs.
Sesame source images are `asset/source_crops/v3/sesame-growing.png` and `asset/source_crops/v3/sesame-ripe.png`; their game exports are 256×256 PNGs.
Onion source images are `asset/source_crops/v3/onion-growing.png` and `asset/source_crops/v3/onion-ripe.png`; their game exports are 256×256 PNGs.
Mung bean source images are `asset/source_crops/v3/mung-bean-growing.png` and `asset/source_crops/v3/mung-bean-ripe.png`; their game exports are 256×256 PNGs.
Sugarcane source images are `asset/source_crops/v3/sugarcane-growing.png` and `asset/source_crops/v3/sugarcane-ripe.png`; their game exports are 256×256 PNGs.
Strawberry source images are `asset/source_crops/v3/strawberry-growing.png` and `asset/source_crops/v3/strawberry-ripe.png`; their game exports are 256×256 PNGs.
Ginger source images are `asset/source_crops/v3/ginger-growing.png` and `asset/source_crops/v3/ginger-ripe.png`; their game exports are 256×256 PNGs.
Eggplant source images are `asset/source_crops/v3/eggplant-growing.png` and `asset/source_crops/v3/eggplant-ripe.png`; their game exports are 256×256 PNGs.

Sunflower source images are `asset/source_crops/v3/sunflower-growing.png` and `asset/source_crops/v3/sunflower-ripe.png`; their game exports are 256×256 PNGs.

Rice source images are `asset/source_crops/v3/rice-growing.png` and `asset/source_crops/v3/rice-ripe.png`; their game exports are 256×256 PNGs.

Cauliflower source images are `asset/source_crops/v3/cauliflower-growing.png` and `asset/source_crops/v3/cauliflower-ripe.png`; their game exports are 256×256 PNGs.

Pumpkin source images are `asset/source_crops/v3/pumpkin-growing.png` and `asset/source_crops/v3/pumpkin-ripe.png`; their game exports are 256×256 PNGs.

Tea source images are `asset/source_crops/v3/tea-growing.png` and `asset/source_crops/v3/tea-ripe.png`; their game exports are 256×256 PNGs.

Pineapple source images are `asset/source_crops/v3/pineapple-growing.png` and `asset/source_crops/v3/pineapple-ripe.png`; their game exports are 256×256 PNGs.

Cotton source images are `asset/source_crops/v3/cotton-growing.png` and `asset/source_crops/v3/cotton-ripe.png`; their game exports are 256×256 PNGs.

Watermelon source images are `asset/source_crops/v3/watermelon-growing.png` and `asset/source_crops/v3/watermelon-ripe.png`; their game exports are 256×256 PNGs.

Grape source images are `asset/source_crops/v3/grape-growing.png` and `asset/source_crops/v3/grape-ripe.png`; their game exports are 256×256 PNGs.

Coffee source images are `asset/source_crops/v3/coffee-growing.png` and `asset/source_crops/v3/coffee-ripe.png`; their game exports are 256×256 PNGs.

Cannabis source images are `asset/source_crops/v3/cannabis-growing.png` and `asset/source_crops/v3/cannabis-ripe.png`; their game exports are 256×256 PNGs.

Rose source images are `asset/source_crops/v3/rose-growing.png` and `asset/source_crops/v3/rose-ripe.png`; their game exports are 256×256 PNGs.

Olive source images are `asset/source_crops/v3/olive-growing.png` and `asset/source_crops/v3/olive-ripe.png`; their game exports are 256×256 PNGs.

Mushroom source images are `asset/source_crops/v3/mushroom-growing.png` and `asset/source_crops/v3/mushroom-ripe.png`; their game exports are 256×256 PNGs.

Cacao source images are `asset/source_crops/v3/cacao-growing.png` and `asset/source_crops/v3/cacao-ripe.png`; their game exports are 256×256 PNGs.

Vanilla source images are `asset/source_crops/v3/vanilla-growing.png` and `asset/source_crops/v3/vanilla-ripe.png`; their game exports are 256×256 PNGs.

## Other families

| Family | Current state | Next deliverable |
| --- | --- | --- |
| Farm buildings | New coop, windmill, and market sprites; other buildings use mixed existing art | Replace visible outliers and align scale/shadow |
| Farmer | New character sprite | Review size and silhouette against buildings at mobile width |
| Fruit trees | All thirteen species have individual PNGs | Review scale and ready-state contrast together at phone width |
| Animals | All fifteen species have individual PNGs | Review scale and shadow together at phone width |
| Machines | All twelve machines have unique PNGs in factory cards | Standardize footprint and active/ready feedback |
| Products and UI icons | Fries, garden salad, fried rice, pumpkin soup, carrot juice, strawberry jam, tomato sauce, and farm cheese have hand-painted PNGs; most other products use emoji | Extend the product set in recipe and unlock order, then standardize UI icons |

## Review checklist for each new sprite

The original coop, windmill, market, and farmer scene images are in `asset/source_scene/v3/`. Their 256px transparent browser exports are in `public/assets/scene-v3/`; the scene displays them at about 115–135 CSS pixels on desktop. These four exports total about 331 KB, down from about 1,237 KB for the 500–512px originals.

Machine sources are in `asset/source_machines/v3/`; the 144×144 transparent game exports are in `public/assets/machines-v3/`. The set includes unique art for all twelve machines. The exports serve 44px card icons at up to roughly 3× display density; keep the full-resolution sources for larger future uses.

Product sources are in `asset/source_products/v3/`; the 128×128 transparent game exports are in `public/assets/products-v3/`. Potato fries (`khoaichien`), garden salad (`salad`), fried rice (`comchien`), and pumpkin soup (`supbi`) use the shared item-icon renderer in factory, inventory, market, and order views. Keep the full-resolution transparent sources for future larger uses.
Carrot juice (`nuoccarot`) and strawberry jam (`mutdau`) now use the same renderer. Their full-resolution transparent sources are `asset/source_products/v3/carrot-juice.png` and `asset/source_products/v3/strawberry-jam.png`.
Tomato sauce (`sotcachua`) and farm cheese (`phomai`) also use that renderer. Their full-resolution transparent sources are `asset/source_products/v3/tomato-sauce.png` and `asset/source_products/v3/farm-cheese.png`.

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
