# Farm art inventory

Generated from `server/src/game.js` and the current asset directory by `npm run art:inventory`. The shared seedling is `public/assets/crops-v3/seedling.png`.

**Coverage:** 15/36 crops have matching growing and ripe v3 art; 13/13 trees and 15/15 animals have individual PNG art. 12 machine types use emoji/UI art. 88 static asset paths appear in the client.

## Crops

| Crop | ID | Unlock | Growing | Ripe |
| --- | --- | ---: | --- | --- |
| Cà rốt | carot | 1 | v3 PNG | v3 PNG |
| Lúa mì | luami | 1 | v3 PNG | v3 PNG |
| Ngô | ngo | 4 | v3 PNG | v3 PNG |
| Rau thơm | rauthom | 4 | v3 PNG | v3 PNG |
| Khoai tây | khoaitay | 5 | v3 PNG | v3 PNG |
| Tỏi | toi | 5 | v3 PNG | v3 PNG |
| Dưa leo | dualeo | 6 | v3 PNG | v3 PNG |
| Sả | sa | 6 | v3 PNG | v3 PNG |
| Bắp cải | bapcai | 7 | v3 PNG | v3 PNG |
| Đậu phộng | dauphong | 7 | v3 PNG | v3 PNG |
| Cà chua | cachua | 8 | v3 PNG | v3 PNG |
| Khoai lang | khoailang | 8 | v3 PNG | v3 PNG |
| Mè | me | 9 | v3 PNG | v3 PNG |
| Ớt | ot | 9 | v3 PNG | v3 PNG |
| Hành tây | hanhtay | 10 | v3 PNG | v3 PNG |
| Đậu xanh | dauxanh | 11 | legacy SVG | legacy SVG |
| Mía | mia | 12 | legacy SVG | legacy SVG |
| Dâu tây | dautay | 13 | legacy SVG | legacy SVG |
| Gừng | gung | 13 | legacy SVG | legacy SVG |
| Cà tím | catim | 14 | legacy SVG | legacy SVG |
| Hướng dương | huongduong | 15 | legacy SVG | legacy SVG |
| Gạo | gao | 16 | legacy SVG | legacy SVG |
| Bông cải | bongcai | 17 | legacy SVG | legacy SVG |
| Bí ngô | bingo | 18 | legacy SVG | legacy SVG |
| Trà | tra | 19 | legacy SVG | legacy SVG |
| Dứa | thom | 20 | legacy SVG | legacy SVG |
| Bông vải | bongvai | 21 | legacy SVG | legacy SVG |
| Dưa hấu | duahau | 21 | legacy SVG | legacy SVG |
| Nho | nho | 22 | legacy SVG | legacy SVG |
| Cà phê | caphe | 23 | legacy SVG | legacy SVG |
| Cần sa | cansa | 25 | legacy SVG | legacy SVG |
| Hoa hồng | hoahong | 25 | legacy SVG | legacy SVG |
| Ô liu | oliu | 26 | legacy SVG | legacy SVG |
| Nấm | nam | 27 | legacy SVG | legacy SVG |
| Ca cao | cacao | 28 | legacy SVG | legacy SVG |
| Vani | vani | 29 | legacy SVG | legacy SVG |

## Fruit trees

| Tree | ID | Unlock | Current art |
| --- | --- | ---: | --- |
| Chuối | chuoi | 8 | unique PNG |
| Cam | cam | 12 | unique PNG |
| Táo | tao | 14 | unique PNG |
| Me | quame | 15 | unique PNG |
| Xoài | xoai | 16 | unique PNG |
| Thanh long | thanhlong | 18 | unique PNG |
| Chanh | chanh | 20 | unique PNG |
| Cóc | coc | 21 | unique PNG |
| Bơ trái | quabo | 22 | unique PNG |
| Dừa | dua | 24 | unique PNG |
| Đào | dao | 26 | unique PNG |
| Sầu riêng | saurieng | 30 | unique PNG |
| Anh đào | anhdao | 32 | unique PNG |

## Animals

| Animal | ID | Unlock | Current art |
| --- | --- | ---: | --- |
| Gà | ga | 3 | unique PNG |
| Chim cút | cut | 4 | unique PNG |
| Vịt | vit | 6 | unique PNG |
| Bò | bo | 8 | unique PNG |
| Ngỗng | ngong | 9 | unique PNG |
| Thỏ | tho | 10 | unique PNG |
| Ong | ong | 12 | unique PNG |
| Cừu | cuu | 14 | unique PNG |
| Gà tây | gatay | 15 | unique PNG |
| Dê | de | 17 | unique PNG |
| Tằm | tam | 18 | unique PNG |
| Lợn | heo | 20 | unique PNG |
| Trâu | trau | 22 | unique PNG |
| Alpaca | alpaca | 25 | unique PNG |
| Hươu | huou | 28 | unique PNG |

## Machines

| Machine | ID | Unlock | Current art |
| --- | --- | ---: | --- |
| Lò nướng cá | lonuong | 8 | emoji/UI |
| Quán ốc | quanoc | 8 | emoji/UI |
| Bếp gia đình | bepan | 9 | emoji/UI |
| Cối xay bột | coixay | 10 | emoji/UI |
| Quán ăn vặt | quanvat | 11 | emoji/UI |
| Máy ép nước | mayep | 12 | emoji/UI |
| Nồi mứt | noimut | 13 | emoji/UI |
| Nhà máy sữa | nhamaysua | 15 | emoji/UI |
| Lò bánh | lobanh | 17 | emoji/UI |
| Máy rang cà phê | mayrang | 23 | emoji/UI |
| Xưởng dệt | xuongdet | 25 | emoji/UI |
| Xưởng cao cấp | xuongcaocap | 26 | emoji/UI |

## Static client asset references

This list includes scene buildings, backgrounds, UI icons, and product art named directly in `public/app.js`. Crop, tree, and animal IDs generated at runtime are covered by the catalog tables above.

| Path | Size |
| --- | ---: |
| `assets/art/alpaca_v3.png` | 74 KB |
| `assets/art/basket.png` | 7 KB |
| `assets/art/bee_v3.png` | 53 KB |
| `assets/art/buffalo_v3.png` | 91 KB |
| `assets/art/chicken.png` | 7 KB |
| `assets/art/chicken_v3.png` | 75 KB |
| `assets/art/cow.png` | 15 KB |
| `assets/art/deer_v3.png` | 60 KB |
| `assets/art/duck_v3.png` | 57 KB |
| `assets/art/feed.png` | 5 KB |
| `assets/art/goat_v3.png` | 78 KB |
| `assets/art/goose_v3.png` | 46 KB |
| `assets/art/pig.png` | 10 KB |
| `assets/art/quail_v3.png` | 61 KB |
| `assets/art/rabbit_v3.png` | 70 KB |
| `assets/art/sheep.png` | 14 KB |
| `assets/art/silkworm_v3.png` | 81 KB |
| `assets/art/tree.png` | 12 KB |
| `assets/art/trees/anhdao-qua.png` | 6 KB |
| `assets/art/trees/cam-qua.png` | 3 KB |
| `assets/art/trees/chanh-qua.png` | 3 KB |
| `assets/art/trees/chuoi-qua.png` | 6 KB |
| `assets/art/trees/dao-qua.png` | 5 KB |
| `assets/art/trees/dua-qua.png` | 7 KB |
| `assets/art/trees/tao-qua.png` | 3 KB |
| `assets/art/trees/thanhlong-qua.png` | 4 KB |
| `assets/art/trees/xoai-qua.png` | 4 KB |
| `assets/art/turkey_v3.png` | 105 KB |
| `assets/crops-v3/cabbage-growing.png` | 66 KB |
| `assets/crops-v3/cabbage-ripe.png` | 108 KB |
| `assets/crops-v3/carrot-growing.png` | 88 KB |
| `assets/crops-v3/carrot-ripe.png` | 93 KB |
| `assets/crops-v3/chili-growing.png` | 44 KB |
| `assets/crops-v3/chili-ripe.png` | 93 KB |
| `assets/crops-v3/corn-growing.png` | 96 KB |
| `assets/crops-v3/corn-ripe.png` | 106 KB |
| `assets/crops-v3/cucumber-growing.png` | 73 KB |
| `assets/crops-v3/cucumber-ripe.png` | 105 KB |
| `assets/crops-v3/garlic-growing.png` | 61 KB |
| `assets/crops-v3/garlic-ripe.png` | 94 KB |
| `assets/crops-v3/herbs-growing.png` | 42 KB |
| `assets/crops-v3/herbs-ripe.png` | 106 KB |
| `assets/crops-v3/lemongrass-growing.png` | 42 KB |
| `assets/crops-v3/lemongrass-ripe.png` | 96 KB |
| `assets/crops-v3/onion-growing.png` | 55 KB |
| `assets/crops-v3/onion-ripe.png` | 104 KB |
| `assets/crops-v3/peanut-growing.png` | 54 KB |
| `assets/crops-v3/peanut-ripe.png` | 105 KB |
| `assets/crops-v3/potato-growing.png` | 101 KB |
| `assets/crops-v3/potato-ripe.png` | 110 KB |
| `assets/crops-v3/seedling.png` | 43 KB |
| `assets/crops-v3/sesame-growing.png` | 49 KB |
| `assets/crops-v3/sesame-ripe.png` | 96 KB |
| `assets/crops-v3/sweet-potato-growing.png` | 52 KB |
| `assets/crops-v3/sweet-potato-ripe.png` | 116 KB |
| `assets/crops-v3/tomato-growing.png` | 71 KB |
| `assets/crops-v3/tomato-ripe.png` | 104 KB |
| `assets/crops-v3/wheat-growing.png` | 54 KB |
| `assets/crops-v3/wheat-ripe.png` | 85 KB |
| `assets/crops/seed-1.svg` | <1 KB |
| `assets/pack/chicken_coop_v3.png` | 246 KB |
| `assets/pack/farm_house.png` | 80 KB |
| `assets/pack/farm_logo.png` | 54 KB |
| `assets/pack/farmer_v3.png` | 233 KB |
| `assets/pack/fish_pond.png` | 40 KB |
| `assets/pack/greenhouse.png` | 50 KB |
| `assets/pack/market_shop_v3.png` | 431 KB |
| `assets/pack/pet_dogs.png` | 21 KB |
| `assets/pack/pig_adult.png` | 12 KB |
| `assets/pack/red_barn.png` | 41 KB |
| `assets/pack/sheep_adult.png` | 18 KB |
| `assets/pack/tree_01.png` | 10 KB |
| `assets/pack/tree_02.png` | 14 KB |
| `assets/pack/well.png` | 17 KB |
| `assets/pack/windmill_v3.png` | 327 KB |
| `assets/ui/coin.svg` | <1 KB |
| `assets/ui/egg.svg` | <1 KB |
| `assets/ui/feed.svg` | <1 KB |
| `assets/ui/fish-cachep.svg` | <1 KB |
| `assets/ui/fish-cakoi.svg` | <1 KB |
| `assets/ui/fish-canho.svg` | <1 KB |
| `assets/ui/fish-caro.svg` | <1 KB |
| `assets/ui/flour.svg` | <1 KB |
| `assets/ui/gem.svg` | <1 KB |
| `assets/ui/milk.svg` | <1 KB |
| `assets/ui/scarecrow.svg` | <1 KB |
| `assets/ui/star.svg` | <1 KB |
| `assets/ui/wool.svg` | <1 KB |

