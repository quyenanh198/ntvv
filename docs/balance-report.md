# Crop progression balance report

Generated from the live rules in `server/src/game.js` by `npm run balance:report`. This is a deterministic crop-only baseline, not observed player behavior or a complete economy forecast.

Assumptions: 12 starting plots; 500 starting gold; 4 items from an untouched plot; 4× sale-gold multiplier; one seed purchase, harvest, and sale per cycle. A cycle takes the longer of crop growth time or the visit interval. This excludes action time, saturation, skills, quests, orders, taxes, gifts, upgrades, and offline effects.

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

## Automated viability checks

- Nonprofitable regular crops: none.
- Starter seeds above starting gold: none.
- A full 12-plot wheat harvest yields 1,128 base profit. The old gameplay specification's level 1–5 daily-income target of 500–1,500 gold is below two such harvests. Reconcile the target with observed play before tuning prices.

## Next balance decisions

1. Record actual visit intervals, crop selections, sales, and time to each level before changing constants.
2. Choose target session lengths and daily gold ranges for early, middle, and late play; compare measured results with the cadence rows.
3. Model expansion, animals, machines, orders, and taxes alongside crops; rerun this report after any rule change.

