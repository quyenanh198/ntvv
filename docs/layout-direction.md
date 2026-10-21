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

## Trade catalog search and escrow preview

The buy-request form now filters its catalog using accent-insensitive search, reports a live matching count, and selects the first matching item when needed. No matches disable the selector and submission with recovery guidance. The escrow preview accepts only whole quantities from 1 to 999, shows missing gold, and explains the five-listing limit. CI exercises unaccented wheat search, invalid quantities, unaffordable escrow, no results, recovery to a valid listing, and the existing two-player transfer. A mobile filtered-catalog screenshot is saved for review.

## Seller trade discovery and totals

Village buy requests now put fillable listings first and offer counted All and Can sell filters plus accent-insensitive buyer/item search. Filters combine and report matching counts, with empty guidance. Seller buttons show quantity and total proceeds, update on typing or step controls, and disable invalid fractional or out-of-range quantities. The mobile two-player walkthrough exercises no-match recovery, available filtering, an invalid quantity, step-control recovery, accessibility, and the final transfer with both balances checked.

## Ready reward hub

The farm now shows a reward shortcut whenever a daily chest, next star milestone, collection, or festival milestone is claimable. It counts currently ready rewards and opens a hub with links to their existing claim screens. Claimed rewards leave the hub after state updates; the normal farm next action remains available separately. Mobile CI opens the hub with a ready daily chest and star milestone, checks accessibility and layout, follows both claim screens, and verifies that claimed entries disappear.

## Fishing energy decisions

Fishing now reads its regeneration interval from server state, including fast mode, instead of advertising three minutes when normal regeneration is one minute. The panel shows available casts and the wait until one cast is affordable. Energy purchases preview the actual amount allowed by the purchase cap, explain missing gems, and disable at the cap. The confirmation reports resulting energy instead of always claiming a 30-point gain. API tests cover normal and fast intervals; mobile CI checks empty energy with no gems and a capped purchase from 115 to 120, including the exact gem debit.

## Skill learning decisions

Skills now use readable cards with explicit rank, description, next-rank cost, missing points, and skill-specific action names. All and Can learn filters keep keyboard focus and hide empty branches; a zero-point view explains how to progress. Respec explains missing gems or remaining cooldown using state values. The mobile walkthrough spends one of two points, verifies rank 1/10 and the two-point next rank, checks the one-point shortage and missing respec gems, audits accessibility, and covers the zero-point empty state.

## Gold gift decisions

Gold gifting now uses a sheet instead of a browser prompt. It names the recipient, shows the available balance and exact remaining gold, rejects fractional/out-of-range amounts, and explains missing gold before submission. Cancelling transfers nothing. Recipient identity is captured when opening the sheet, and a successful gift closes only that same sheet. The mobile two-player walkthrough checks invalid amounts, shortage guidance, cancellation with unchanged balances, a completed transfer, horizontal fit, and accessibility; it saves `gold-gift-preview-320.png`.

## Personalization shop decisions

Personalization items now use full-width cards with descriptions, exact gold costs, remaining balances or shortfalls, and 44px actions. All, Owned, and Can buy filters show counts and keep focus on the selected filter. Empty views explain how to return to the full catalog. Frame previews use contrasting backgrounds. The mobile browser walkthrough checks an unaffordable title, empty ownership, filters, accessibility, purchase debit and automatic title activation, and removing/reapplying the title. The capture is `personalization-shop-320.png`.

## Gold request decisions

Gold requests share the labeled amount sheet, with an optional 80-character note. They name the requested player and explain that sending does not move gold; that player can pay or decline from Xin / Cho tiền. Valid requests may exceed the requester's balance. Cancelling creates no request. CI checks invalid amounts, the note limit, mobile layout and accessibility, cancellation, request creation without balance changes, and payment from the second browser account with both balances verified. The screenshot is `gold-request-320.png`.

The inbox and request history use full-width cards with separate names, notes, status, and 44px actions. Incoming cards show the exact payment and remaining balance or gold shortfall. Payment confirmation repeats the recipient, amount, and remaining balance. The two-player walkthrough also covers an unaffordable request, refusal without transferring value, cancelling payment confirmation, and the completed payment. It audits inbox accessibility and mobile overflow and saves `gold-request-inbox-390.png`.

## Owned decoration gallery

Owned decorations and pets now appear in a named, collapsible gallery above the field for the owner and visiting players. It starts closed to keep plots nearby, supports keyboard activation, and preserves its open state during farm refreshes. The shop and gallery share individual painted art for the flower garden, lantern, fountain, bridge, and the existing scarecrow. Other items retain named emoji previews while their art is pending. Mobile checks cover owner and visitor galleries, image loading, overflow, accessibility, and continuity after helping water a plot.

The decoration walkthrough now stocks all 22 catalog decorations, checks all images in the owner gallery and shop, and verifies the same gallery from a visiting account. It includes the handcart, golden-rooster statue, lotus pond, village gate, stone bench, farm sign, and reused painted windmill. The generated inventory now shows 12/22 decoration previews with PNG art.

The complete 22-decoration gallery is now bounded to 36vh or 288px and scrolls internally. Its named list can receive keyboard focus and scroll with arrow keys. CI verifies the height bound, internal overflow, keyboard scrolling, all catalog decorations in owner/shop/visitor views, and open-state continuity after watering. This keeps an expanded large collection from adding an unbounded block above the plots.

Owned pets now share painted previews with the personalization shop and farm gallery. The walkthrough stocks all 22 decorations and all seven pets, verifies both catalog sets, decodes every preview in owner/shop/visitor views, and checks the combined count of 29. The gallery remains height-bounded and keyboard-scrollable. The pet capture is `owned-pets-390.png`; reused rabbit art matches the existing farm animal style.

## Lottery purchase decisions

Ticket buttons now show quantity and total gold cost, with 44px targets. Each option explains the remaining balance, exact shortfall, or remaining daily allowance. Unaffordable purchases and quantities above that allowance are disabled. The mobile walkthrough checks a one-gold shortage, a one-ticket purchase with exact debit, a final purchase at the daily cap, accessibility, and horizontal fit. The capture is `lottery-costs-320.png`.

The backend reads current gold inside the journal transaction. Integration checks submit distinct purchase keys concurrently when only one ticket is affordable and when only one daily slot remains; only one succeeds. Gold, sunk gold, and ticket quantities change once, and replaying the winning key preserves the settled state.

## Star milestone rewards

The star screen now puts the next claim and missing-star summary above readable milestone cards. Every card shows numeric progress, a named progress bar, exact rewards, and claimed/ready/sequentially locked states. The screen explains that stars are cumulative and adds direct quest and unlocked-order shortcuts. The mobile walkthrough audits accessibility and overflow, captures the ready milestone, claims it, verifies the next milestone progress and missing count, and follows both earning routes. The capture is `star-milestones-ready-320.png`.

## Land expansion decisions

The expansion sheet now shows current and resulting plot counts, exact cost, independent level and gold requirements, remaining cash or shortfall, and projected daily tax after expansion. Starter tax immunity is named alongside the future tax level. The confirmation repeats the plot quantity and gold cost. Mobile coverage checks a locked level, a one-gold shortage, the affordable state, accessibility and horizontal fit, then purchases four plots and verifies the exact balance and newly usable empty land. Captures are `expansion-shortfall-320.png` and `expansion-affordable-320.png`.

## Pond upgrade decisions

The fishing sheet now separates fish per cast from stocking capacity when explaining an upgrade. An unchanged fishing yield is explicit, alongside the new capacity, preservation of existing batches, exact price, and remaining gold or shortfall. Mobile coverage checks a one-gold shortage and exact-budget purchase, confirms level two and increased capacity without changing the fish per cast, and verifies existing batches are unchanged. Review captures: `pond-upgrade-shortfall-320.png` and `pond-upgrade-affordable-320.png`.

## Factory timing and upgrade decisions

Recipe durations now include both the learned production-speed skill and the machine upgrade level, using minutes and seconds so fractional-minute bonuses remain visible. Upgrade summaries explain current and next machine reduction, exact cost, remaining gold or shortfall, and the unchanged completion time of a running batch. The mobile walkthrough verifies a one-gold shortfall, an exact-budget upgrade, preservation of the running queue, and a newly queued batch scheduled by the server for the displayed adjusted duration. Review captures: `factory-upgrade-shortfall-320.png` and `factory-upgrade-affordable-320.png`.

## Guard dog purchase decisions

The shop uses the existing painted companion-dog sprite in a full-width protection card. It separates current shift status, probabilistic protection and fine rules from the three duration choices. Each choice shows its exact cost and remaining balance or shortfall; an active shift explicitly explains that another purchase extends it. Mobile coverage verifies a one-gold shortage, an exact-budget first shift, decoded artwork, accessibility, and a second purchase that adds exactly one hour to the existing expiry. Review capture: `guard-dog-affordable-320.png`.

## Shop categories

The shop now offers All, Feed and seeds, Animals, Gems, and Guard controls above the catalog. Category selection hides unrelated groups, uses pressed-button semantics and 44px targets, and returns keyboard focus to the chosen control. The selected category survives a purchase refresh. Mobile coverage visits every category, checks visible sections and hidden purchase controls, buys one feed bag with the exact debit and inventory increase, and checks selection continuity, accessibility and overflow. Review capture: `shop-supplies-320.png`.

## Barn feed round trip

A hungry barn opens the supplies category directly and carries a return action naming the originating animal. Buying feed and switching shop categories retain that return action. Mobile coverage starts with two hungry quails and no feed, opens supplies, buys ten bags with the exact debit, returns to the quail barn and feeds both animals. It verifies eight bags remain and both production timers start. Review capture: `barn-fed-roundtrip-320.png`.

## Barn upgrade decisions

Overview upgrade controls now open the species barn for review. The detail card shows current and resulting capacity, added places, price and remaining gold or shortfall, and explains that animals must be bought separately. Mobile coverage checks a one-gold shortage and an exact-budget upgrade for quails, verifies the new level/capacity and exact debit, and confirms all existing animals and production timestamps remain unchanged. Review captures: `barn-upgrade-shortfall-320.png` and `barn-upgrade-affordable-320.png`.

## Gem exchange decisions

The gem category now uses full-width pack cards with total price, gold per gem and the resulting gold/gem balances or exact shortage. Native purchase confirmation remains, so reviewing a pack does not spend currency. Mobile coverage checks a one-gold shortage, exact-budget balances, cancellation without any currency changes, and an accepted exchange with exact gold debit, gem credit and sunk-gold accounting. The category remains selected after purchase. Review capture: `gem-exchange-320.png`.

## Animal and pond skill timing

Animal cycle labels in barn summaries, barn details and the shop now include the learned animal-speed bonus. Pond species details and the stocking preview use the same modifier. Duration labels preserve seconds for fractional-minute bonuses and include machine-readable time values. Mobile coverage checks a rank-two quail cycle at 13 minutes 30 seconds against its automatically started server deadline, checks the shop agrees, then stocks a pond batch and verifies the persisted 27-minute duration matches both preview locations. Review captures: `barn-skilled-time-320.png` and `pond-skilled-time-320.png`.

## Crop and tree skill timing

Seed cards now include the learned crop-growth bonus, including seconds for short crops. Tree cards and tooltips apply that bonus to establishment and fruit cycles while leaving lifespan unchanged; the fruit-cycle minimum matches the server. Mobile coverage plants rank-two wheat and orange trees, compares persisted establishment times with previews, verifies the unchanged ten-hour orange lifespan, then settles a fruit cycle and checks the persisted next deadline against the displayed cycle. Review captures: `crop-skilled-time-320.png` and `tree-skilled-time-320.png`.

## Plot progress follows its persisted schedule

Growing crop bars and stage calculations now use the interval between the plot planting and readiness timestamps, instead of the catalog base time. This prevents a newly planted skilled crop from appearing ten percent grown and keeps the halfway state near fifty percent. The same plot timestamps work for owners and visitors with different skill ranks. Mobile coverage checks new and halfway skilled corn on the owner farm and the halfway plot through another account. Review captures: `plot-skilled-progress-320.png` and `plot-skilled-progress-visitor-390.png`.
