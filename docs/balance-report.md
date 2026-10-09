# Farm progression balance report

Generated from the live rules in `server/src/game.js` by `npm run balance:report`. This is a deterministic crop, expansion, and recipe opportunity-cost model, not observed player behavior or a complete economy forecast.

Crop assumptions: 12 starting plots; 500 starting gold; 4 items from an untouched plot; 4× sale-gold multiplier; one seed purchase, harvest, and sale per cycle. A cycle takes the longer of crop growth time or the visit interval. Crop cadence figures exclude action time, saturation, skills, quests, orders, taxes, gifts, upgrades, and offline effects. The expansion section adds land tax explicitly.

## Visit-cadence comparison

| Level | XP to next | Best profit at 10-min visits | Best profit at 60-min visits | Best profit at 8-hour visits | Fastest XP at 60-min visits (all starting plots) |
| ---: | ---: | --- | --- | --- | --- |
| 1 | 120 | Cà rốt (carot) (1,032/h) | Cà rốt (carot) (172/h) | Cà rốt (carot) (22/h) | Cà rốt (carot) (2.0 h) |
| 4 | 200 | Ngô (ngo) (1,686/h) | Ngô (ngo) (281/h) | Ngô (ngo) (35/h) | Ngô (ngo) (1.9 h) |
| 8 | 410 | Khoai tây (khoaitay) (2,622/h) | Cà chua (cachua) (750/h) | Cà chua (cachua) (94/h) | Cà chua (cachua) (1.4 h) |
| 13 | 820 | Khoai tây (khoaitay) (2,622/h) | Mía (mia) (1,586/h) | Mía (mia) (264/h) | Mía (mia) (1.1 h) |
| 20 | 1,680 | Khoai tây (khoaitay) (2,622/h) | Bí ngô (bingo) (1,692/h) | Cà tím (catim) (421/h) | Cà tím (catim) (1.8 h) |
| 29 | 3,270 | Khoai tây (khoaitay) (2,622/h) | Ca cao (cacao) (2,293/h) | Ca cao (cacao) (1,146/h) | Ca cao (cacao) (2.8 h) |

The level time is a lower bound: it assumes every starting plot runs the best available crop continuously and the player collects on schedule. It does not include any other XP source or time spent interacting.

## All regular crop unlocks

| Unlock | Crop | Grow min | Seed | Base profit/plot | XP/plot | Profit/h at 60-min visits |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Cà rốt (carot) | 3 | 4 | 172 | 5 | 172 |
| 1 | Lúa mì (luami) | 1 | 2 | 94 | 3 | 94 |
| 4 | Ngô (ngo) | 6 | 7 | 281 | 9 | 281 |
| 4 | Rau thơm (rauthom) | 10 | 5 | 219 | 6 | 219 |
| 5 | Khoai tây (khoaitay) | 10 | 11 | 437 | 12 | 437 |
| 5 | Tỏi (toi) | 25 | 10 | 438 | 12 | 438 |
| 6 | Dưa leo (dualeo) | 12 | 12 | 468 | 13 | 468 |
| 6 | Sả (sa) | 20 | 9 | 407 | 11 | 407 |
| 7 | Bắp cải (bapcai) | 15 | 14 | 562 | 16 | 562 |
| 7 | Đậu phộng (dauphong) | 35 | 14 | 626 | 17 | 626 |
| 8 | Cà chua (cachua) | 25 | 18 | 750 | 24 | 750 |
| 8 | Khoai lang (khoailang) | 30 | 16 | 704 | 20 | 704 |
| 9 | Mè (me) | 40 | 16 | 752 | 23 | 752 |
| 9 | Ớt (ot) | 40 | 22 | 938 | 31 | 938 |
| 10 | Hành tây (hanhtay) | 60 | 30 | 1,314 | 47 | 1,314 |
| 11 | Đậu xanh (dauxanh) | 50 | 26 | 1,126 | 40 | 1,126 |
| 12 | Mía (mia) | 80 | 46 | 2,114 | 83 | 1,586 |
| 13 | Dâu tây (dautay) | 45 | 24 | 1,096 | 36 | 1,096 |
| 13 | Gừng (gung) | 70 | 34 | 1,486 | 54 | 1,274 |
| 14 | Cà tím (catim) | 120 | 72 | 3,368 | 152 | 1,684 |
| 15 | Hướng dương (huongduong) | 120 | 42 | 1,878 | 75 | 939 |
| 16 | Gạo (gao) | 65 | 38 | 1,722 | 64 | 1,590 |
| 17 | Bông cải (bongcai) | 100 | 36 | 1,564 | 59 | 938 |
| 18 | Bí ngô (bingo) | 100 | 60 | 2,820 | 116 | 1,692 |
| 19 | Trà (tra) | 130 | 50 | 2,350 | 90 | 1,085 |
| 20 | Dứa (thom) | 135 | 58 | 2,742 | 106 | 1,219 |
| 21 | Bông vải (bongvai) | 120 | 55 | 2,505 | 101 | 1,253 |
| 21 | Dưa hấu (duahau) | 150 | 90 | 4,310 | 193 | 1,724 |
| 22 | Nho (nho) | 180 | 110 | 5,330 | 239 | 1,777 |
| 23 | Cà phê (caphe) | 200 | 145 | 7,055 | 312 | 2,117 |
| 25 | Hoa hồng (hoahong) | 170 | 80 | 3,760 | 148 | 1,327 |
| 26 | Ô liu (oliu) | 180 | 90 | 4,070 | 159 | 1,357 |
| 27 | Nấm (nam) | 90 | 60 | 2,660 | 102 | 1,773 |
| 28 | Ca cao (cacao) | 240 | 190 | 9,170 | 395 | 2,293 |
| 29 | Vani (vani) | 300 | 170 | 8,150 | 334 | 1,630 |

## Expansion and land-tax stress test

The 97 live expansions add four plots each, from 12 to 400. Rows below sample early, middle, and late prices; all expansions are included in the checks. Each daily-net figure is for one new plot after seed cost and daily land tax, using the most profitable crop unlocked at the expansion level. One visit means a 24-hour interval; three visits means an 8-hour interval. Payback divides expansion price by the daily net of four new plots at three visits. This assumes every new plot is planted and harvested on schedule and excludes other income and costs.

| Expansion | Level | Plots after | Price | Tax/new plot/day | Best net/plot, 1 visit/day | Best net/plot, 3 visits/day | Payback, 3 visits (days) |
| ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| 1 | 2 | 16 | 500 | 0 | Cà rốt (carot): 172 | Cà rốt (carot): 516 | 0.2 |
| 5 | 10 | 32 | 9,000 | 0 | Hành tây (hanhtay): 1,314 | Hành tây (hanhtay): 3,942 | 0.6 |
| 10 | 20 | 52 | 72,000 | 2,000 | Cà tím (catim): 1,368 | Cà tím (catim): 8,104 | 2.2 |
| 20 | 40 | 92 | 650,000 | 2,000 | Ca cao (cacao): 7,170 | Ca cao (cacao): 25,510 | 6.4 |
| 25 | 50 | 112 | 1,300,000 | 2,000 | Ca cao (cacao): 7,170 | Ca cao (cacao): 25,510 | 12.7 |
| 50 | 50 | 212 | 5,050,000 | 2,000 | Ca cao (cacao): 7,170 | Ca cao (cacao): 25,510 | 49.5 |
| 75 | 50 | 312 | 9,700,000 | 2,000 | Ca cao (cacao): 7,170 | Ca cao (cacao): 25,510 | 95.1 |
| 97 | 50 | 400 | 14,100,000 | 2,000 | Ca cao (cacao): 7,170 | Ca cao (cacao): 25,510 | 138.2 |

- Expansions with nonpositive new-plot income at either cadence: none.
- Longest modeled three-visit payback: expansion 97, 138.2 days. This is a crop-only warning, not a forecast of total late-game income.

## Processing opportunity cost

For each sellable recipe, output sale value minus the sale value forgone by using its inputs gives a per-batch margin. Both sale values use the live gold multiplier; inputs bought from the shop use their purchase price. The table shows the highest margin per machine-hour from the full recipe catalog. It assumes unlimited inputs, no queue gaps, no sale-price saturation, and no prerequisite timing; some recipes need ingredients unlocked later than the machine. It is an upper-bound comparison, not achievable daily income.

| Machine | Machine unlock | Recipes | Best catalog recipe | Margin/batch | Margin/machine-hour |
| --- | ---: | ---: | --- | ---: | ---: |
| Lò nướng cá | 8 | 14 | Cá tra kho tộ | 24,448 | 32,597 |
| Quán ốc | 8 | 42 | Ốc len xào bơ | 46,500 | 107,308 |
| Bếp gia đình | 9 | 11 | Bánh xèo | 36,968 | 44,362 |
| Cối xay bột | 10 | 5 | Bột gạo | 4,400 | 10,560 |
| Quán ăn vặt | 11 | 14 | Bắp xào bơ | 43,000 | 129,000 |
| Máy ép nước | 12 | 8 | Nước chanh | 6,300 | 12,600 |
| Nồi mứt | 13 | 6 | Mứt sầu riêng | 18,860 | 18,860 |
| Nhà máy sữa | 15 | 8 | Kem dưa hấu | 71,600 | 53,700 |
| Lò bánh | 17 | 9 | Bánh dứa | 85,600 | 64,200 |
| Máy rang cà phê | 23 | 5 | Cà phê sữa | 110,800 | 110,800 |
| Xưởng dệt | 25 | 7 | Khăn alpaca | 78,000 | 39,000 |
| Xưởng cao cấp | 26 | 8 | Tiệc gia đình | 760,400 | 380,200 |

- Sellable recipes with nonpositive opportunity margin: none.
- Utility recipes without a sale price excluded from the ranking: coixay/thucan.

## Field-crop supply for direct recipes

This narrower model includes only sellable recipes whose ingredients are all field crops already unlocked when the machine opens. It assigns the 12 starting plots across those crops, assumes three evenly spaced visits per day, 4 items per harvest, and continuous machine operation. Fractional plot allocation gives an upper bound. It ignores inventory carried in, expansion plots, growth bonuses, sale saturation, queue gaps, and time or gold to acquire ingredients from animals, trees, fish, or earlier machines. The last column identifies the tighter of crop supply and machine time for the best daily-margin recipe in this narrow set.

| Machine | Unlock | Eligible direct recipes | Best crop-only recipe | Plot-days/batch | Upper-bound batches/day | Margin/day | Tightest limit |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| Lò nướng cá | 8 | 0 | none | — | — | — | — |
| Quán ốc | 8 | 0 | none | — | — | — | — |
| Bếp gia đình | 9 | 3 | Khoai lang nướng | 0.17 | 72.0 | 103,680 | machine |
| Cối xay bột | 10 | 2 | Bột bắp | 0.25 | 48.0 | 41,472 | crops |
| Quán ăn vặt | 11 | 0 | none | — | — | — | — |
| Máy ép nước | 12 | 1 | Nước ép cà rốt | 0.17 | 72.0 | 25,344 | machine |
| Nồi mứt | 13 | 3 | Mứt gừng | 0.17 | 32.0 | 117,760 | machine |
| Nhà máy sữa | 15 | 0 | none | — | — | — | — |
| Lò bánh | 17 | 0 | none | — | — | — | — |
| Máy rang cà phê | 23 | 2 | Cà phê rang | 0.17 | 12.0 | 216,000 | machine |
| Xưởng dệt | 25 | 1 | Vải bông | 0.25 | 24.0 | 230,400 | machine |
| Xưởng cao cấp | 26 | 1 | Rượu nho ủ | 0.50 | 8.0 | 260,800 | machine |

## Animal feed and sale model

Each animal is fed with shop-bought thucan at 12 gold per unit, then produces one item after its live timer. Sale values use the 4× gold multiplier. A visit collects one ready product and feeds the animal for its next cycle. The one-visit and three-visit cases therefore allow at most one or three sales per day per animal, even when the timer is shorter. The model excludes barn construction, capacity upgrades, order premiums, and time spent acquiring an animal; payback covers only its purchase price.

| Animal | Unlock | Purchase | Produce min | Feed/cycle | Sale/cycle | Net, 1 visit/day | Net, 3 visits/day | Purchase payback, 3 visits (days) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Gà | 3 | 250 | 15 | 12 | 192 | 180 | 540 | 0.5 |
| Chim cút | 4 | 350 | 15 | 12 | 120 | 108 | 324 | 1.1 |
| Vịt | 6 | 500 | 25 | 12 | 280 | 268 | 804 | 0.6 |
| Bò | 8 | 850 | 30 | 24 | 560 | 536 | 1,608 | 0.5 |
| Ngỗng | 9 | 700 | 35 | 24 | 480 | 456 | 1,368 | 0.5 |
| Thỏ | 10 | 800 | 30 | 12 | 520 | 508 | 1,524 | 0.5 |
| Ong | 12 | 1,100 | 40 | 12 | 720 | 708 | 2,124 | 0.5 |
| Cừu | 14 | 1,400 | 40 | 36 | 1,000 | 964 | 2,892 | 0.5 |
| Gà tây | 15 | 1,500 | 55 | 24 | 880 | 856 | 2,568 | 0.6 |
| Dê | 17 | 1,800 | 50 | 24 | 1,200 | 1,176 | 3,528 | 0.5 |
| Tằm | 18 | 2,000 | 60 | 12 | 1,400 | 1,388 | 4,164 | 0.5 |
| Lợn | 20 | 2,500 | 70 | 36 | 1,920 | 1,884 | 5,652 | 0.4 |
| Trâu | 22 | 3,000 | 80 | 36 | 2,240 | 2,204 | 6,612 | 0.5 |
| Alpaca | 25 | 3,800 | 90 | 36 | 2,800 | 2,764 | 8,292 | 0.5 |
| Hươu | 28 | 5,000 | 120 | 36 | 3,600 | 3,564 | 10,692 | 0.5 |

- Animals with nonpositive feed-adjusted sale margin: none.

## Order sale premium

The live order generator was sampled 1,000 times at each listed level with a fixed random seed. The premium compares the order reward with selling the identical requested items directly, using the live sale multiplier. These figures describe generated offers, not completed orders or daily income: ingredient availability, production time, board refreshes, and player choice are excluded.

| Level | Mean direct sale | Mean order gold | Mean extra gold/order | Extra % | Mean item kinds | Zero-value offers |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 344 | 406 | 62 | 18.1% | 1.51 | 0 |
| 10 | 1,079 | 1,268 | 189 | 17.5% | 2.00 | 0 |
| 20 | 2,144 | 2,526 | 382 | 17.8% | 2.03 | 0 |
| 29 | 3,600 | 4,238 | 638 | 17.7% | 2.00 | 0 |
| 40 | 3,683 | 4,317 | 634 | 17.2% | 2.00 | 0 |

## Fresh-field order availability

The order board refreshes every 120 minutes. These same deterministic samples count orders composed only of field crops and the subset whose crops can grow from seed before that refresh on the 12-plot starter farm. Each requested quantity is at most one plot's 4-item harvest. This is a strict no-stock, crop-only scenario, not an actual completion rate: existing inventory, animals, trees, fish, flour, expansions, watering, and player choice can improve it. It does show how often a newly generated order can be completed using only fresh field crops within its board window.

| Level | Crop-only offers / 1,000 | Fresh crop offers within board window / 1,000 |
| ---: | ---: | ---: |
| 5 | 643 (64.3%) | 643 (64.3%) |
| 10 | 386 (38.6%) | 386 (38.6%) |
| 20 | 315 (31.5%) | 286 (28.6%) |
| 29 | 320 (32.0%) | 210 (21.0%) |
| 40 | 307 (30.7%) | 183 (18.3%) |

## Automated viability checks

- Nonprofitable regular crops: none.
- Starter seeds above starting gold: none.
- A full 12-plot wheat harvest yields 1,128 base profit. The old gameplay specification's level 1–5 daily-income target of 500–1,500 gold is below two such harvests. Reconcile the target with observed play before tuning prices.

## Next balance decisions

1. Record actual visit intervals, crop selections, sales, and time to each level before changing constants.
2. Choose target session lengths and daily gold ranges for early, middle, and late play; compare measured results with the cadence rows.
3. Extend the supply model to owned animals, trees, fish, and chained recipes; measure actual order completion before tuning land prices or order generation.

