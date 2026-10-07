# Early crop balance report

Generated from the live rules in `server/src/game.js` by `npm run balance:report`. This is a baseline model, not observed player behavior.

Assumptions: 12 starting plots; 500 starting gold; 4 items from an untouched plot; 4× sale-gold multiplier; one seed purchase, one harvest, and one sale per cycle. The model excludes market saturation, skill bonuses, quests, orders, taxes, gifts, offline time, and human interaction time.

| Level | XP to next | Fastest base gold | Fastest base XP | Best single visit | Cycles to next if all plots use fastest XP crop |
| ---: | ---: | --- | --- | --- | ---: |
| 1 | 120 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Cà rốt (carot) (172 gold/harvest/plot) | 4 |
| 2 | 140 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Cà rốt (carot) (172 gold/harvest/plot) | 4 |
| 3 | 170 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Cà rốt (carot) (172 gold/harvest/plot) | 5 |
| 4 | 200 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Ngô (ngo) (281 gold/harvest/plot) | 6 |
| 5 | 240 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Tỏi (toi) (438 gold/harvest/plot) | 7 |
| 6 | 290 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Dưa leo (dualeo) (468 gold/harvest/plot) | 9 |
| 7 | 350 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Đậu phộng (dauphong) (626 gold/harvest/plot) | 10 |
| 8 | 410 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Cà chua (cachua) (750 gold/harvest/plot) | 12 |
| 9 | 480 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Ớt (ot) (938 gold/harvest/plot) | 14 |
| 10 | 560 | Lúa mì (luami) (94 gold/min/plot) | Lúa mì (luami) (3.0 XP/min/plot) | Hành tây (hanhtay) (1,314 gold/harvest/plot) | 16 |

## First-session comparison

| Crop | Grow time | Seed | Gross sale per plot | Base profit per plot | XP per plot |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lúa mì (luami) | 1 min | 2 | 96 | 94 | 3 |
| Cà rốt (carot) | 3 min | 4 | 176 | 172 | 5 |

A full 12-plot wheat harvest has 1,128 base profit after 1 minute. The existing gameplay spec's level 1–5 daily income target of 500–1,500 gold is lower than two such harvests. That target should be revised or the economy retuned after player testing.

Across levels 1–10, wheat leads this model in both gold and XP per timer minute. Longer crops still lead in profit per harvest visit. This is a modeling result, not evidence that players prefer either loop; planting, watering, and selling each take time that the model excludes.

## Next balance decisions

1. Measure actual crop choice, sale frequency, and time between visits before changing prices or timers.
2. Decide whether “fastest gold while continuously active” or “best profit per visit” should drive each level band; both are shown above.
3. Recalculate this report after any changes to yield, sale multiplier, seed cost, crop time, or XP.

