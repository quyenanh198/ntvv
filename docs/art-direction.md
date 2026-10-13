# Farm art direction and asset inventory

The crop, tree, animal, and machine catalog and static client asset references are tracked in [art-inventory.md](art-inventory.md). Regenerate it with `npm run art:inventory` after changing game content or asset files.

The cow milk inventory sprite uses `asset/source_products/v3/cow-milk.png` as its 1254px source and `public/assets/products-v3/cow-milk.png` as its 256px game export. It was generated with the built-in imagegen tool using the prompt: "A single small-game inventory sprite of fresh cow milk in a clear squat glass bottle with a cream-colored cap and a tiny blank paper label. Hand-painted cozy farm game style matching soft watercolor/gouache produce icons; three-quarter view, warm light from upper left, subtle dark outline, clean silhouette, centered with generous padding. Transparent background, no scene, no text, no extra objects. Square composition, high resolution."

The honey inventory sprite uses `asset/source_products/v3/honey.png` as its 1254px source and `public/assets/products-v3/honey.png` as its 256px game export. It was generated with the built-in imagegen tool using the prompt: "Single inventory sprite: one clear glass jar filled with golden honey, topped by a cream cloth lid tied with twine. Cozy hand-painted watercolor/gouache art for a farm game, matching the existing product inventory icon style. Three-quarter view, warm upper-left light, subtle dark contour, strong silhouette at 80 pixels, centered with generous clear padding. True transparent background, no scene, no text, no extra objects. Square PNG."

The goat milk sprite uses `asset/source_products/v3/goat-milk.png` as its 1254px source and `public/assets/products-v3/goat-milk.png` as its 256px export. Built-in imagegen prompt: "Single inventory sprite for a cozy farm game: fresh goat milk in a small clear glass bottle with a pale ivory body, a wooden stopper, and a simple tiny goat silhouette on an otherwise blank kraft-paper tag (no letters). Distinct from a squat cow-milk bottle: taller narrow shape. Hand-painted watercolor/gouache, warm upper-left light, subtle dark contour, strong silhouette at 80 CSS pixels, centered with padding. Truly transparent background, no scene, no text, no other objects. Square PNG."

The pork sprite uses `asset/source_products/v3/pork.png` as its 1254px source and `public/assets/products-v3/pork.png` as its 256px export. Built-in imagegen prompt: "Single inventory sprite for a cozy farm game: a clean butcher's cut of fresh pork, a compact rosy pink boneless cut with a thin cream fat edge, resting on one small folded kraft-paper wrapper. Friendly food illustration, no blood. Hand-painted watercolor/gouache matching soft farm-game product sprites, warm upper-left light, subtle dark contour, strong silhouette at 80 CSS pixels, centered with generous padding. True transparent background, no scene, no text, no other objects. Square PNG."

The pineapple and ginger cakes use `asset/source_products/v3/pineapple-cake.png` and `ginger-cake.png` as generated sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Pineapple cake: "One square transparent inventory sprite for a cozy Vietnamese farm game: bánh dứa, a small golden pineapple cake with one cut wedge exposing yellow pineapple filling, on a simple cream ceramic dessert plate. Hand-painted watercolor/gouache bakery style, warm upper-left light, subtle dark contour, three-quarter view, readable at 80 CSS pixels, centered with transparent padding. No scene, text, logo, or extra objects."
- Ginger cake: "One square transparent inventory sprite for a cozy Vietnamese farm game: bánh gừng, a small round ginger cake with warm amber crumb, pale cream icing drizzle, and one thin ginger slice on top, on a simple cream ceramic dessert plate. Hand-painted watercolor/gouache bakery style, warm upper-left light, subtle dark contour, three-quarter view, readable at 80 CSS pixels, centered with transparent padding. No scene, text, logo, or extra objects."

The mill flour and cocoa powder sprites use `asset/source_products/v3/corn-flour.png`, `wheat-flour.png`, and `cocoa-powder.png` as generated sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Corn flour: "A small cream ceramic bowl heaped with pale yellow corn flour, with one short golden corn cob beside it. Cozy hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, subtle dark contour, readable at 80 CSS pixels, centered with transparent padding. No scene or text."
- Wheat flour: "A small cream ceramic bowl of fine white wheat flour, with two golden wheat stalks beside it, distinct from rice flour. Cozy hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, subtle dark contour, readable at 80 CSS pixels, centered with transparent padding. No scene or text."
- Cocoa powder: "A small cream ceramic bowl heaped with dark brown cocoa powder, with one split cacao pod and a couple of beans beside it. Cozy hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, subtle dark contour, readable at 80 CSS pixels, centered with transparent padding. No scene or text."

The orange marmalade, ginger preserve, durian jam, and dragon-fruit syrup sprites use matching source filenames in `asset/source_products/v3/` and 256px game exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Orange marmalade: "A small clear glass jar of amber orange marmalade with visible orange peel bits, cream cloth lid tied with twine, one orange slice beside it. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Ginger preserve: "A small clear glass jar of golden ginger preserve with visible thin ginger strips in syrup, cream cloth lid tied with twine, one ginger root beside it. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Durian jam: "A small clear glass jar of pale golden durian jam, cream cloth lid tied with twine, one distinct durian wedge beside it. Friendly hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Dragon-fruit syrup: "A small clear glass bottle of vivid magenta dragon-fruit syrup, cork stopper and blank kraft-paper tag, one sliced dragon-fruit wedge with white flesh and black seeds beside it. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."

The remaining dairy sprites use matching source filenames in `asset/source_products/v3/` and 256px game exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Strawberry yogurt: "A small cream ceramic cup of strawberry yogurt with a pink swirl, two fresh strawberry halves on top, and a short wooden spoon. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Goat cheese: "A small ivory wedge of crumbly goat cheese on a folded kraft-paper wrapper with a simple goat silhouette. Distinct from yellow cow cheese. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Buffalo cheese: "A small glossy ivory ball of buffalo milk cheese with a wedge cut from it, on a green banana leaf. Distinct from crumbly goat cheese. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Watermelon ice cream: "Two coral-pink scoops with dark seed flecks in a cream dessert cup, with a watermelon wedge on the rim. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Vanilla ice cream: "A pale cream vanilla soft-serve swirl with vanilla bean specks in a golden waffle cone, with a vanilla pod beside it. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Durian ice cream: "Two pale golden durian ice-cream scoops in a cream dessert cup, with a distinct durian wedge on the rim. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."

Olive oil and ambarella juice use `asset/source_products/v3/olive-oil.png` and `ambarella-juice.png` as generated sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Olive oil: "One clear corked glass bottle of golden-green olive oil with a blank kraft tag, two dark green olives and one olive leaf by its base. Hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent background, no text."
- Ambarella juice: "One short clear glass of pale yellow-green Vietnamese ambarella juice with ice and a green straw, and one sliced ambarella fruit beside it. Distinct from lemonade and pineapple juice. Hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent background, no text."

The weaving-workshop sprites use matching sources in `asset/source_products/v3/` and 256px game exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Cotton fabric: "One folded rectangle of natural ivory cotton fabric with visible woven texture and a small cotton blossom beside it. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Silk fabric: "One folded length of lustrous pale rose silk with a soft flowing fold and a silkworm cocoon beside it, distinct from matte cotton. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Wool scarf: "One hand-knit rustic red wool scarf folded in a loop, chunky stitches and two short tasseled ends. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Alpaca scarf: "One fine fluffy cream alpaca scarf folded in a loop, pale teal border trim and two short tassels, distinct from the red wool scarf. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Wool sweater: "One blue-gray hand-knit wool sweater laid flat with ribbed cuffs and a crew neck. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."
- Rabbit-wool hat: "One soft white hand-knit rabbit-wool beanie with rolled brim and gray-tipped pom-pom. Hand-painted watercolor/gouache product icon, warm upper-left light, soft dark contour, transparent background, no text."

The remaining coffee-roaster products use `asset/source_products/v3/iced-milk-coffee.png`, `milk-chocolate.png`, and `tea-bags.png` as generated sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Iced milk coffee: "One short clear glass of Vietnamese iced milk coffee, dark coffee swirling into pale condensed milk with three ice cubes and a wooden stirrer. Hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, soft dark contour, transparent background, no text."
- Milk chocolate: "One small rectangular milk chocolate bar with four raised squares and a broken corner, two cacao beans beside it, distinct from cocoa powder. Hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, soft dark contour, transparent background, no text."
- Tea bags: "A tidy stack of three plain kraft-paper tea bags with strings and blank tags, one open bag showing green tea leaves and a few loose leaves beside it. Hand-painted watercolor/gouache product icon, three-quarter view, warm upper-left light, soft dark contour, transparent background, no text."

The fish oven, dairy, and bakery product sprites use `asset/source_products/v3/grilled-fish.png`, `butter.png`, and `carrot-cake.png` as their 1254px sources, with matching 256px exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Grilled fish: "One inventory product sprite for a cozy farm game: a whole grilled freshwater fish, golden brown with gentle grill marks and one small lemon wedge, presented on a plain oval ceramic plate. Friendly appetizing hand-painted watercolor/gouache, warm upper-left light, subtle dark outline, clear silhouette at 80 CSS pixels, centered with padding. Truly transparent background, no scene, no text, no other objects. Square PNG."
- Butter: "One inventory product sprite for a cozy farm game: a small block of fresh golden butter with one neat curl cut from the top, sitting on a folded cream paper wrapper. Hand-painted watercolor/gouache matching soft farm-game food icons, warm upper-left light, subtle dark contour, clear silhouette at 80 CSS pixels, centered with padding. True transparent background, no scene, no text, no other objects. Square PNG."
- Carrot cake: "One inventory product sprite for a cozy farm game: a small round carrot cake with cream frosting, a tiny carrot-shaped icing decoration, and one visible slice showing orange crumb, on a simple ceramic dessert plate. Hand-painted watercolor/gouache matching soft farm-game food icons, warm upper-left light, subtle dark contour, clear silhouette at 80 CSS pixels, centered with padding. Truly transparent background, no scene, no words, no other objects. Square PNG."

## Scene standard

The [reference farm scene](../asset/reference-scenes/farm-v3.png) shows the shared three-quarter camera, warm upper-left light, soft dark contours, quiet hills, and the scale relationship between buildings, farmer, animals, and crop plots. It is a style reference for new assets; the playable farm remains assembled from individual sprites.

Built-in imagegen used the current 320px farm screenshot as a layout reference with this prompt: "One cohesive cozy Vietnamese farm scene showing a hand-painted red barn, warm tiled-roof farmhouse, small greenhouse, chicken coop, market stall, windmill, farmer, and a foreground patch of square crop plots with distinct empty soil, green growing crop, dry crop, and ready golden wheat. Use a compact three-quarter camera view, warm light from upper left, soft shadows below-right, natural saturated produce, quiet green hills and pale blue sky, gentle dark contours, watercolor/gouache texture. Preserve clear silhouettes and a readable farm scale at phone size. No HUD, menus, text, logos, buttons, badges, borders, or screenshot framing. Landscape illustration."

The painted scarecrow uses `asset/source_decor/v3/scarecrow.png` as its transparent source and `public/assets/decor-v3/scarecrow.png` as its 192px game export. Built-in imagegen used the reference scene as a style reference with this prompt: "One friendly small scarecrow standing upright on a wooden post, wearing a straw hat and simple red tunic with short straw arms, with a subtle soft shadow below-right. Cozy farm-game silhouette readable at about 42 CSS pixels; center it in a square canvas with generous transparent padding. Match the reference scene's hand-painted texture and soft dark contours. Truly transparent background, no landscape, no plots, no text, no logo, no other characters or objects."

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
| Farm buildings | New coop, windmill, market, farmhouse, red barn, greenhouse, and fishing pond sprites; remaining accents use mixed existing art | Replace visible outliers and align scale/shadow |
| Farmer | New character sprite | Review size and silhouette against buildings at mobile width |
| Fruit trees and items | All thirteen species have individual tree and fruit-item PNGs | Review scale and ready-state contrast together at phone width |
| Animals | All fifteen species have individual PNGs | Review scale and shadow together at phone width |
| Machines | All twelve machines have unique PNGs in factory cards | Standardize footprint and active/ready feedback |
| Products and UI icons | All fifteen animal products and six plated bakery goods have PNG or SVG icons; most other products use emoji | Extend the product set in recipe and unlock order, then standardize UI icons |

The fishing pond source is `asset/source_scene/v3/fishing_pond_v3.png`; its 256×256 transparent game export is `public/assets/scene-v3/fishing_pond_v3.png`. It was generated with the built-in image tool using the coop and farmhouse as style references: a three-quarter hand-painted oval freshwater pond, grassy stone rim, reeds, lily pads, a small wooden dock, warm upper-left light, and transparent background. The source is retained for future size or color adjustments.

## Review checklist for each new sprite

The original coop, windmill, market, and farmer scene images are in `asset/source_scene/v3/`. Their 256px transparent browser exports are in `public/assets/scene-v3/`; the scene displays them at about 115–135 CSS pixels on desktop. These four exports total about 331 KB, down from about 1,237 KB for the 500–512px originals.
The farmhouse, red barn, and greenhouse sources are also in `asset/source_scene/v3/`. Their 192px transparent browser exports are in `public/assets/scene-v3/`; this size keeps the three central buildings readable in the scene while respecting the first-load image budget.

Machine sources are in `asset/source_machines/v3/`; the 144×144 transparent game exports are in `public/assets/machines-v3/`. The set includes unique art for all twelve machines. The exports serve 44px card icons at up to roughly 3× display density; keep the full-resolution sources for larger future uses.

Product sources are in `asset/source_products/v3/`; the 128×128 transparent game exports are in `public/assets/products-v3/`. Potato fries (`khoaichien`), garden salad (`salad`), fried rice (`comchien`), and pumpkin soup (`supbi`) use the shared item-icon renderer in factory, inventory, market, and order views. Keep the full-resolution transparent sources for future larger uses.
Carrot juice (`nuoccarot`) and strawberry jam (`mutdau`) now use the same renderer. Their full-resolution transparent sources are `asset/source_products/v3/carrot-juice.png` and `asset/source_products/v3/strawberry-jam.png`.
Tomato sauce (`sotcachua`) and farm cheese (`phomai`) also use that renderer. Their full-resolution transparent sources are `asset/source_products/v3/tomato-sauce.png` and `asset/source_products/v3/farm-cheese.png`.
Rice flour (`botgao`) and cane sugar (`duongmia`) use the same renderer for mill and recipe-chain inputs. Their source files are `asset/source_products/v3/rice-flour.png` and `asset/source_products/v3/cane-sugar.png`, with 128×128 game exports in `public/assets/products-v3/`. They were created with the built-in image tool using the carrot juice and egg bread icons as style references: a white rice-flour bowl with grains, and an amber raw-sugar bowl with cut sugarcane, each isolated on transparency.
Orange juice (`nuoccam`), egg bread (`banhmi`), pumpkin pie (`banhbi`), and wool roll (`cuonlen`) have matching source files and 128px exports with the same names in those directories.

The four late fruit item sprites complete the fruit-tree item set: tamarind (`quame`), ambarella (`coc`), avocado (`quabo`), and durian (`saurieng`). Full-resolution transparent sources are `asset/source_trees/v3/<id>-fruit.png`; 128px exports are `public/assets/art/trees/<id>-qua.png`. The built-in image tool used the existing orange item icon and each species' tree sprite as references. The sprites appear through the shared item renderer in inventory, orders, and trade views.

Quail eggs (`trungcut`), duck eggs (`trungvit`), goose egg (`trungngong`), and rabbit fur (`longtho`) now have matching transparent product art. Full-resolution sources are `asset/source_products/v3/quail-eggs.png`, `duck-eggs.png`, `goose-egg.png`, and `rabbit-fur.png`; 128px browser exports use the same filenames in `public/assets/products-v3/`. The built-in image tool used the farm-cheese product icon and each animal sprite as style/species references. Quail eggs are small and speckled, duck eggs blue-green, the goose egg large and ivory, and rabbit fur is tied raw fiber. These appear through the shared item renderer in inventory, orders, trades, factory, animal shop, and barn views. Item sprite URLs carry the deploy version so updates do not reuse stale browser caches.

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

Watermelon juice and roasted coffee product sprites use `asset/source_products/v3/watermelon-juice.png` and `roasted-coffee.png` as full-resolution transparent sources. Their 256px exports are in `public/assets/products-v3/`. Built-in imagegen prompts:

- Watermelon juice: "One clear glass of fresh watermelon juice, rosy red with a small watermelon wedge on the rim and a simple reusable straw. Hand-painted watercolor/gouache matching soft farm-game food sprites, warm upper-left light, subtle dark contour, readable silhouette at 80 CSS pixels. Centered square composition with generous padding. Truly transparent background, no scene, no words, no other objects."
- Roasted coffee: "A small open kraft-paper pouch filled with freshly roasted deep brown coffee beans, with several beans resting in front. Hand-painted watercolor/gouache matching soft farm-game food sprites, warm upper-left light, subtle dark contour, readable silhouette at 80 CSS pixels. Centered square composition with generous padding. Truly transparent background, no scene, no logo, no letters, no other objects."

The juice-press product trio uses `asset/source_products/v3/mango-smoothie.png`, `lemonade.png`, and `pineapple-juice.png` as transparent full-resolution sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen prompts:

- Mango smoothie: "One tall clear glass of thick ripe mango smoothie, warm golden yellow, with a small fresh mango slice on its rim and a simple reusable straw. Hand-painted watercolor/gouache matching soft farm-game food sprites, warm upper-left light, subtle dark contour, readable silhouette at 80 CSS pixels. Centered square composition with generous padding. Truly transparent background, no scene, no words, no other objects."
- Lemonade: "One short clear glass of fresh homemade lemonade, pale bright yellow liquid with ice, a thin lemon wheel on the rim, and a simple reusable straw. Hand-painted watercolor/gouache matching soft farm-game food sprites, warm upper-left light, subtle dark contour, readable silhouette at 80 CSS pixels. Centered square composition with generous padding. Truly transparent background, no scene, no words, no other objects."
- Pineapple juice: "One clear glass of fresh pineapple juice, golden yellow with light foam, a small pineapple wedge and one green leaf on its rim, and a simple reusable straw. Hand-painted watercolor/gouache matching soft farm-game food sprites, warm upper-left light, subtle dark contour, readable silhouette at 80 CSS pixels. Centered square composition with generous padding. Truly transparent background, no scene, no words, no other objects."

The bakery product quartet uses `asset/source_products/v3/apple-pie.png`, `farm-pizza.png`, `strawberry-cake.png`, and `honey-cake.png` as transparent full-resolution sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen used the existing carrot cake icon as a style reference. Prompts:

- Apple pie: "One small golden apple pie with a woven lattice crust and one slice removed to show warm cinnamon apples, on a simple ceramic dessert plate. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no scene, letters, or other objects."
- Pizza: "One small round farm pizza with golden crust, melted cheese, tomato slices, and fresh basil leaves, with one triangular slice slightly pulled out, on a simple ceramic plate. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no scene, letters, or other objects."
- Strawberry cake: "One small round strawberry cream cake, white whipped frosting with several bright red strawberries on top, one slice removed showing sponge and strawberry filling, on a simple ceramic dessert plate. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no scene, letters, or other objects."
- Honey cake: "One small round honey cake with warm golden sponge layers, a thin glossy honey glaze gently dripping down the side, and a tiny honeycomb garnish on top; one slice removed to show layers, on a simple ceramic dessert plate. No bees. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no scene, letters, or other objects."

The remaining five animal-product sprites use `asset/source_products/v3/turkey-eggs.png`, `silkworm-silk.png`, `buffalo-milk.png`, `alpaca-fleece.png`, and `deer-velvet.png` as transparent full-resolution sources, with 256px exports in `public/assets/products-v3/`. Built-in imagegen used the existing quail eggs, cow milk, and rabbit fur sprites as style references. Prompts:

- Turkey eggs: "Three pale cream turkey eggs with subtle brown speckles, one cracked to show golden yolk. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no nest, animal, scene, or words."
- Silkworm silk: "Three small ivory silkworm cocoons with fine silk threads, one thread trailing into a neat loop. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no silkworms, basket, scene, or words."
- Buffalo milk: "A stout small glass bottle of rich buffalo milk with a dark blue cloth cap tied with twine and a tiny plain blue tag without text, distinct from cow milk. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no animal, scene, or letters."
- Alpaca fleece: "A tidy bundle of freshly shorn alpaca fleece, thick cream-colored curls and a small tan ribbon around the middle, distinct from smooth rabbit fur and sheep wool. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no alpaca, scene, or words."
- Deer velvet: "A small pair of soft brown deer velvet antlers with rounded fuzzy tips, tied with a cream ribbon. No deer, injury, or blood. Hand-painted watercolor/gouache, warm upper-left light, soft dark contour, readable at 80 CSS pixels, transparent square with generous padding; no scene or words."
