# NTVV farm upgrade: product brief

**Audience.** Vietnamese-speaking members of the Lazybutts Chat community who open a casual farm game in a browser, often on a phone. The game should also remain usable with a keyboard and screen reader. This audience is inferred from the current integration and interface; validate it in player sessions.

**Core feeling.** A welcoming, lively little farm where a player can understand what is ready, make one useful choice quickly, and see a clear reward. Friends can help and trade without making solo progress depend on them. The art should feel like one hand-painted world; rules and costs should feel fair and predictable.

**Session shape.** Target an 8–10 minute first visit through planting, watering, harvesting, and a first sale. Returning visits should support a useful 2–5 minute check-in, with optional longer time for orders, processing, collections, and friends. The balance model compares one and three visits per day; these are scenarios, not measured habits.

**Core loop.** See the next action on the farm → tend and harvest → sell or fill an order → choose the next crop or production goal. A visible collection or unlock gives a reason to return. The first sale must work with the starter gold and without premium currency.

## Provisional success goals

| Goal | Target for a staged cohort | Evidence |
| --- | --- | --- |
| First value moment | At least 75% of eligible new players make a first sale or order delivery within ten minutes; review first plant and harvest counts alongside it | Protected `/internal/farm/funnel` counts after its ten-minute denominator matures; five observed first sessions confirm whether players followed the intended path |
| Next-day return | At least 35% of eligible new players return 24–48 hours after enrollment | Protected funnel day-two denominator after 48 hours; compare only full cohorts |
| Clear return path | At least four of five observed returning players identify and start a productive action within ten seconds, without a hint | Timed returning-player sessions at phone width; record the action and any confusion |

These thresholds are hypotheses for the first staged release, not claims about current players. Review them with the team after the five observed sessions and a mature staged cohort. The funnel excludes farmers enrolled before deployment and cannot measure comprehension. Daily economy totals show what sells by item family; they do not prove why a player chose it.

**Decision rule.** Fix any first-session dead end or misleading next-action prompt before tuning prices. Use the corrected animal and mixed-ingredient balance scenarios to choose cases to watch, then compare them with staged sales and visit behavior before changing progression constants. Record each changed number and its reason in the balance report.
