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
