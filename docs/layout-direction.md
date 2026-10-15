# Farm layout direction

The farm is the primary task surface. Keep the next useful action and the plots visible before secondary navigation on phones. Place family search after the plots in document order so keyboard navigation follows the visual order.

## Responsive structure

| Width | Main layout | Family access |
| --- | --- | --- |
| 320–780px | Scene, next-action toolbar, plots, then family section in one scroll area | Search and member strip below the field |
| 781–1179px | Centered farm canvas | Family section below the field |
| 1180px and wider | Center a 720px farm canvas and a 226px family sidebar with a 24px gap; center the action dock under the farm canvas | Persistent sidebar |

The bottom dock remains the main route to management sheets. The scene is decorative context and a shortcut to buildings; the plot grid is the main gameplay control.

## Current checks

- Browser widths checked: 320, 390, 768, 844px landscape at 390px tall, 1180, 1280, and 1920px.
- At 320px the plots follow the next-action and collection prompts; family search can be scrolled above the bottom dock.
- At 1180 and 1280px the farm and family panel are separated by 24px, and the last plot receives pointer input.
- At 1280px the action dock is centered under the 720px farm canvas. A one-member family panel fits its content; a 51-member panel stays within the viewport and scrolls internally.
- Family markup follows the field in document order, matching mobile keyboard focus order.
- When an order can be delivered, the farm's next-action prompt names the ready order count and opens the order sheet before suggesting more planting; the first-sale guidance still takes priority for new players.
- A missing quick crop order now offers a direct planting action. It opens the first empty plot's seed chooser with the requested crop first and highlighted; the action names a full field or insufficient seed money when planting is unavailable.
- A compact collection goal now sits under the immediate-action toolbar. At 320px the goal opens its sheet by touch, and the page has no horizontal overflow.
- The seed chooser uses two columns at 320px, giving each crop a wider target and keeping its timing and price readable; three columns remain at wider phone widths. The browser check measures the card and text and captures a 320px seed screenshot.
- The 320px farm now uses 14px next-action titles, 12px guidance, 13px collection titles, at least 11px collection details and plot labels, and 11px dock labels. The CI browser check enforces these sizes. The new mobile and desktop captures show the larger text without clipped controls or horizontal overflow.
- Active building and animal shortcuts inside the mobile scene now have at least 44px tap targets. The cow is shifted slightly away from the sheep at phone width; the level-20 browser walkthrough checks target sizes, separation, and that tapping the cow opens its barn.
- At 320px, the resource pills and round header actions now have 44px tall targets, with 44px wide round buttons. The leaderboard shortcut remains in More, allowing the common header controls to fit without horizontal scrolling on a new farm; the browser check verifies both size and access.
- Market, luxury, and gold-request sheets load without occupying the gameplay mutation lock. A delayed market response is discarded after the player closes the menu and waters a plot; CI drives that sequence at 320px.
- The quail barn at level 6 now shows the matching egg product sprite in its production description. CI checks that the versioned image loads at 320px and saves a screenshot; the reviewed capture shows the description and purchase controls without horizontal clipping.
- The level-20 browser check also opens the goat and pig barns at 320px, verifies their new product sprites load, and saves screenshots for review.
- The level-20 browser check opens the factory at 320px and verifies product sprites load without horizontal overflow.
- Factory recipe cards now put the product and quantity beside its icon, then use the full card width for ingredients and timing/rewards. The 320px browser check measures that width and keeps the details at 12px or larger.
- Pond stocking now labels species and quantity, starts with one fish, and previews the count the player can actually afford and fit. The maximum action names that count. A 320px browser check sets a ten-fish request with only enough gold for two, verifies the preview and final batch, and scans the fishing sheet for accessibility issues.
- Ready pond batches now appear in the farm's next-action prompt. Opening that prompt scrolls to and focuses the pond harvest control. The 320px browser walkthrough checks bulk and single-batch collection, product quantities, released space, and preservation of a batch that is still growing.
- Pond batches now use the same product sprites as inventory wherever individual art exists. The ready-pond browser walkthrough checks the shrimp sprite; inventory and factory captures cover the new aquatic products and completed fish-oven art family.
- The festival uses full-width milestone cards with named progress bars, clear reward states, 44px activity buttons, and unlock explanations. Ready rewards appear first and also surface in the farm's next-action prompt. A 320px walkthrough checks claiming, all three activity routes, field focus, horizontal fit, and automated accessibility.
- The seed chooser has accent-tolerant name search across crops and trees, counted results, a recovery hint, and automatic reveal of matching future unlocks. Search stays behind an optional disclosure before level 4. Affordable unlocked choices precede unaffordable choices while preserving the selected sort and order recommendations; disabled choices name the gold shortfall. The mobile walkthrough checks search, locked matches, sort continuity, affordability order, layout, and accessibility.
- Locked seed thumbnails load when revealed. The starter chooser's measured sprite transfer fell from 4.57 MB to 183 KB; the browser check enforces a 300 KB budget and verifies that search still loads a deferred future sprite.
- Inventory quantity buttons and the numeric field have 44px targets. Sell controls wrap onto a second row on narrow phones; CI checks their dimensions and horizontal overflow at 320px.
- Inventory now offers a search field and counted crop, fruit, animal, processed, and other categories above the item list. Search ignores Vietnamese accents, combines with a category, and shows a recovery hint when no items match. The 320px browser walkthrough checks these states and horizontal overflow.
- The inventory's stock value and total assets now use two labeled summary cards at 320px, with the calculation explained below each value. This removes the wrapped sentence visible in the earlier mobile screenshot; CI checks the cards and captures the updated inventory sheet.
- The factory now offers a live recipe finder above its cards. It searches product names and ingredient lines without requiring Vietnamese accents, combines with All, Can make, and In progress, hides empty machine sections, and keeps the query when status changes. The 320px browser walkthrough checks matching, empty results, query persistence, and recovery.
- The factory explains that bulk production immediately uses ingredients across eligible recipes and queued batches cannot be canceled. The bulk action asks for confirmation; the 320px browser walkthrough dismisses it and verifies inventory and job counts remain unchanged.
- The More menu now opens a searchable family sheet on phones, with full-width visit targets. Search filters every member including the player's own farm and shows an empty state when no name matches. The 320px browser walkthrough checks the empty state and visits a friend through this route.
- Sheet and modal close buttons now have 44px targets. The browser check opens a plot's seed sheet at 844×390, checks its viewport bounds and horizontal overflow, and saves landscape screenshots.
- The CI browser smoke check renders the farm at 320px and 1280px and tests the order sheet at 320px, 390px, 768px, and 1180px. It checks horizontal overflow, usable plot rendering, ready-order priority, product labels, missing counts, Escape dismissal, and browser script errors. Screenshots are attached to each CI run for visual review; the first reviewed capture showed no clipped controls or text in the visible order cards.

## Remaining review

Walk through the farm and management sheets with new and returning players. Check touch targets, sheet density, long family lists, landscape phones, and screen-reader reading order before calling the layout redesign complete.

## Pond stocking and harvest layout

The pond section separates capacity, free space, and ready batches into three summary cards. Ready batches come first and have a green treatment. The species selector contains names and unlock levels; a separate illustrated card shows seed cost, grow time, and sale value per animal. The existing capped quantity/cost preview remains below the stocking controls. At 320px these controls stack with 44px minimum heights; wider sheets place the two stocking actions side by side. CI checks the selected species image and price, quantity cap, control sizes, accessibility, batch ordering, and mobile screenshots.

## Barn feeding and purchase clarity

Barns now separate animal count, hunger, and shared feed stock into summary cards. A product card shows feed per animal per cycle, growth time, sale value, and XP. Hungry animals show the actual number that current feed can support; a shortage panel states missing feed and opens the shop. Bulk animal purchases display the affordable quantity and total cost, capped by barn space. CI covers a two-hungry-quail barn with no feed and enough gold for one purchase, checks accessibility and mobile overflow, and follows the feed shortcut into shop controls.

## Shop purchase decisions

Feed packs, gem packs, and dog hire durations now show exact gold costs on their buttons, with action-specific accessible names. Their action groups wrap as a grid on phones and use 44px minimum targets. Unaffordable feed and animal purchases are disabled, full animal pens are identified, and the chicken capacity counts chickens separately from other animals. CI checks a 400-gold shop with two quails: the 100-feed pack shows 1,200 gold and is disabled, a single feed pack is available, and chickens show 0/3. Mobile overflow, accessibility, and a price screenshot are checked along with the existing desktop shop scan.

## Barn overview filters

The overview now has counted All, Owned, and Needs feed filters. Filtering keeps keyboard focus on the chosen control, updates a live result count, and offers an empty-state explanation. Cards with hungry animals show their count and feed needed for one cycle. Bulk purchase buttons show the affordable quantity and total cost. The pond note is now a direct shortcut. The mobile walkthrough isolates one hungry quail barn, verifies its count, hunger and purchase details, checks focus and accessibility, and captures a 320px screenshot.

## Daily quest actions and rewards

Daily quests now use readable cards with numeric progress, accessible progress bars, reward amounts, activity shortcuts, and unlock explanations. Incomplete tasks appear first and the chest action sits above the list. Opening the chest pays completed tasks and the chest reward. Tasks finished later that day now pay their own reward automatically when crossing the target, in the same transaction as progress. Additional actions and request retries do not pay the task again; persisted counters preserve this after restart, including legacy already-opened chests. Integration coverage checks partial progress, completion, retries, restart, and further actions. Mobile CI checks the quest layout, accessibility, sale shortcut, chest claim, and claimed state.
