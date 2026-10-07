# Harvest collections

`Sổ mùa vụ` is a permanent goal beside daily quests and the recurring festival. It uses crops already in the farm and adds no currency.

| Collection | Crops to harvest once | Reward |
| --- | --- | --- |
| Vụ mùa đầu tiên | Wheat, carrot, corn | 1,600 gold at the current multiplier |
| Hương vị làng quê | Herbs, garlic, lemongrass, tomato, chili | 8,000 gold and 2 gems at the current multiplier |

The first successful harvest of each crop records a discovery for the farmer. Helping another farmer harvest records the discovery for the farm owner. Risky crops are excluded. The record is permanent across seasons and does not consume inventory. Existing harvests before this feature cannot be reconstructed reliably from current inventory, so the UI says tracking begins when the collection launches.

Claiming requires every discovery in that set. The unique claim row and mutation journal are written in the same SQLite transaction as the reward. A retry with the same request key returns the prior result, while a new claim after collection returns `already_claimed`.

The first set gives an early return goal at corn's level 4 unlock. The second stretches through chili's level 9 unlock. Player sessions should check whether these feel achievable and whether the reward fits the measured gold economy before tuning values.
