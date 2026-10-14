# Harvest festival

The recurring seven-day festival gives players a weekly goal through ordinary farm actions. It uses the existing harvest, delivery, and processing counters and keeps the current rewards and reset rules.

## Player flow

1. Open Festival from More. If a reward is ready, the farm's next-action prompt also opens it after ready crops, a first sale, and a completed collection.
2. Read each milestone's named progress bar, reward, and explanation of what advances it. Harvests count when collecting crops from your field; deliveries count when an order is delivered; processing counts when finished machine batches are collected.
3. Use the activity button to return to the field, open orders, or open processing. Locked systems show their unlock level. Returning to the field scrolls to and focuses a plot.
4. Claim a finished milestone. Ready rewards appear first, unfinished goals next, and claimed goals last. The summary reports claimed and available rewards.
5. Continue during the remaining days. A new festival cycle resets progress and claims; rewards are not automatically collected.

Cards use full-width text and progress bars with 44px action targets. Browser coverage checks starter unlock explanations, the ready-reward prompt, a successful claim and gold change, removal of its claim button, all three activity routes, horizontal fit at 320px, and an automated accessibility scan. Existing reward integration tests verify retry protection. Observed-player validation of the weekly goals and reward balance remains pending.
