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

## Automated viability checks

- Nonprofitable regular crops: none.
- Starter seeds above starting gold: none.
- A full 12-plot wheat harvest yields 1,128 base profit. The old gameplay specification's level 1–5 daily-income target of 500–1,500 gold is below two such harvests. Reconcile the target with observed play before tuning prices.

## Next balance decisions

1. Record actual visit intervals, crop selections, sales, and time to each level before changing constants.
2. Choose target session lengths and daily gold ranges for early, middle, and late play; compare measured results with the cadence rows.
3. Add ingredient supply, animals, and orders to the machine model; compare achievable income with the late-expansion payback warning before tuning land prices.

