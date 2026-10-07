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

- Browser widths checked: 320, 390, 768, 1180, 1280, and 1920px.
- At 320px the first plot begins at y=314; family search can be scrolled above the bottom dock.
- At 1180 and 1280px the farm and family panel are separated by 24px, and the last plot receives pointer input.
- At 1280px the action dock is centered under the 720px farm canvas. A one-member family panel fits its content; a 51-member panel stays within the viewport and scrolls internally.
- Family markup follows the field in document order, matching mobile keyboard focus order.
- A compact collection goal now sits under the immediate-action toolbar. At 320px the first plot starts at y=364, the goal opens its sheet by touch, and the page has no horizontal overflow.

## Remaining review

Walk through the farm and management sheets with new and returning players. Check touch targets, sheet density, long family lists, landscape phones, and screen-reader reading order before calling the layout redesign complete.
