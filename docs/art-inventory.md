# Farm art inventory

Generated from `server/src/game.js` and the current asset directory by `npm run art:inventory`. The shared seedling is `public/assets/crops-v3/seedling.png`.

**Coverage:** 36/36 crops have matching growing and ripe v3 art; 13/13 trees and 13/13 fruit items have individual PNG art; 15/15 animals have individual PNG art. 12/12 machines have individual PNG art. 186/186 catalog products have PNG or SVG icons. 323 static asset paths appear in the client.

## Crops

| Crop | ID | Unlock | Growing | Ripe |
| --- | --- | ---: | --- | --- |
| Cà rốt | carot | 1 | v3 PNG | v3 PNG |
| Lúa mì | luami | 1 | v3 PNG | v3 PNG |
| Ngô | ngo | 4 | v3 PNG | v3 PNG |
| Rau thơm | rauthom | 4 | v3 PNG | v3 PNG |
| Khoai tây | khoaitay | 5 | v3 PNG | v3 PNG |
| Tỏi | toi | 5 | v3 PNG | v3 PNG |
| Dưa leo | dualeo | 6 | v3 PNG | v3 PNG |
| Sả | sa | 6 | v3 PNG | v3 PNG |
| Bắp cải | bapcai | 7 | v3 PNG | v3 PNG |
| Đậu phộng | dauphong | 7 | v3 PNG | v3 PNG |
| Cà chua | cachua | 8 | v3 PNG | v3 PNG |
| Khoai lang | khoailang | 8 | v3 PNG | v3 PNG |
| Mè | me | 9 | v3 PNG | v3 PNG |
| Ớt | ot | 9 | v3 PNG | v3 PNG |
| Hành tây | hanhtay | 10 | v3 PNG | v3 PNG |
| Đậu xanh | dauxanh | 11 | v3 PNG | v3 PNG |
| Mía | mia | 12 | v3 PNG | v3 PNG |
| Dâu tây | dautay | 13 | v3 PNG | v3 PNG |
| Gừng | gung | 13 | v3 PNG | v3 PNG |
| Cà tím | catim | 14 | v3 PNG | v3 PNG |
| Hướng dương | huongduong | 15 | v3 PNG | v3 PNG |
| Gạo | gao | 16 | v3 PNG | v3 PNG |
| Bông cải | bongcai | 17 | v3 PNG | v3 PNG |
| Bí ngô | bingo | 18 | v3 PNG | v3 PNG |
| Trà | tra | 19 | v3 PNG | v3 PNG |
| Dứa | thom | 20 | v3 PNG | v3 PNG |
| Bông vải | bongvai | 21 | v3 PNG | v3 PNG |
| Dưa hấu | duahau | 21 | v3 PNG | v3 PNG |
| Nho | nho | 22 | v3 PNG | v3 PNG |
| Cà phê | caphe | 23 | v3 PNG | v3 PNG |
| Cần sa | cansa | 25 | v3 PNG | v3 PNG |
| Hoa hồng | hoahong | 25 | v3 PNG | v3 PNG |
| Ô liu | oliu | 26 | v3 PNG | v3 PNG |
| Nấm | nam | 27 | v3 PNG | v3 PNG |
| Ca cao | cacao | 28 | v3 PNG | v3 PNG |
| Vani | vani | 29 | v3 PNG | v3 PNG |

## Fruit trees

| Tree | ID | Unlock | Tree art | Fruit item art |
| --- | --- | ---: | --- | --- |
| Chuối | chuoi | 8 | unique PNG | unique PNG |
| Cam | cam | 12 | unique PNG | unique PNG |
| Táo | tao | 14 | unique PNG | unique PNG |
| Me | quame | 15 | unique PNG | unique PNG |
| Xoài | xoai | 16 | unique PNG | unique PNG |
| Thanh long | thanhlong | 18 | unique PNG | unique PNG |
| Chanh | chanh | 20 | unique PNG | unique PNG |
| Cóc | coc | 21 | unique PNG | unique PNG |
| Bơ trái | quabo | 22 | unique PNG | unique PNG |
| Dừa | dua | 24 | unique PNG | unique PNG |
| Đào | dao | 26 | unique PNG | unique PNG |
| Sầu riêng | saurieng | 30 | unique PNG | unique PNG |
| Anh đào | anhdao | 32 | unique PNG | unique PNG |

## Animals

| Animal | ID | Unlock | Current art |
| --- | --- | ---: | --- |
| Gà | ga | 3 | unique PNG |
| Chim cút | cut | 4 | unique PNG |
| Vịt | vit | 6 | unique PNG |
| Bò | bo | 8 | unique PNG |
| Ngỗng | ngong | 9 | unique PNG |
| Thỏ | tho | 10 | unique PNG |
| Ong | ong | 12 | unique PNG |
| Cừu | cuu | 14 | unique PNG |
| Gà tây | gatay | 15 | unique PNG |
| Dê | de | 17 | unique PNG |
| Tằm | tam | 18 | unique PNG |
| Lợn | heo | 20 | unique PNG |
| Trâu | trau | 22 | unique PNG |
| Alpaca | alpaca | 25 | unique PNG |
| Hươu | huou | 28 | unique PNG |

## Machines

| Machine | ID | Unlock | Current art |
| --- | --- | ---: | --- |
| Lò nướng cá | lonuong | 8 | unique PNG |
| Quán ốc | quanoc | 8 | unique PNG |
| Bếp gia đình | bepan | 9 | unique PNG |
| Cối xay bột | coixay | 10 | unique PNG |
| Quán ăn vặt | quanvat | 11 | unique PNG |
| Máy ép nước | mayep | 12 | unique PNG |
| Nồi mứt | noimut | 13 | unique PNG |
| Nhà máy sữa | nhamaysua | 15 | unique PNG |
| Lò bánh | lobanh | 17 | unique PNG |
| Máy rang cà phê | mayrang | 23 | unique PNG |
| Xưởng dệt | xuongdet | 25 | unique PNG |
| Xưởng cao cấp | xuongcaocap | 26 | unique PNG |

## Processed product families

| Family | Source ID | Products with icons |
| --- | --- | ---: |
| Bếp gia đình | bepan | 11/11 |
| Lò nướng cá | lonuong | 14/14 |
| Xưởng cao cấp | xuongcaocap | 8/8 |
| Quán ăn vặt | quanvat | 14/14 |
| Quán ốc | quanoc | 42/42 |
| Cối xay bột | coixay | 4/4 |
| Máy ép nước | mayep | 8/8 |
| Nồi mứt | noimut | 6/6 |
| Nhà máy sữa | nhamaysua | 8/8 |
| Lò bánh | lobanh | 9/9 |
| Máy rang cà phê | mayrang | 5/5 |
| Xưởng dệt | xuongdet | 7/7 |

## Products

| Product | ID | Source | Current art |
| --- | --- | --- | --- |
| Áo dài lụa | aodai | xuongcaocap | PNG art |
| Áo len | aolen | xuongdet | PNG art |
| Bánh bí ngô | banhbi | lobanh | PNG art |
| Bánh cà rốt | banhcarot | lobanh | PNG art |
| Bánh dứa | banhdua | lobanh | PNG art |
| Bánh gừng | banhgung | lobanh | PNG art |
| Bánh kem dâu | banhkem | lobanh | PNG art |
| Bánh mật ong | banhmatong | lobanh | PNG art |
| Bánh mì trứng | banhmi | lobanh | PNG art |
| Bánh táo | banhtao | lobanh | PNG art |
| Bánh tôm | banhtom | quanvat | PNG art |
| Bánh tráng trộn | banhtrangtron | quanvat | PNG art |
| Bánh xèo | banhxeo | bepan | PNG art |
| Bắp xào bơ | bapxao | quanvat | PNG art |
| Bột bắp | botbap | coixay | PNG art |
| Bột ca cao | botcacao | mayrang | PNG art |
| Bột chiên | botchien | quanvat | PNG art |
| Bột gạo | botgao | coixay | PNG art |
| Bột mì | botmi | coixay | PNG art |
| Bơ | bo | nhamaysua | PNG art |
| Cá chép | cachep | ho | SVG icon |
| Cá chim trắng | cachim | cachim | SVG icon |
| Cá điêu hồng | dieuhong | dieuhong | SVG icon |
| Cá điêu hồng chiên | cadieuhongchien | lonuong | PNG art |
| Cá kho tiêu | cakho | lonuong | PNG art |
| Cá koi | cakoi | ho | SVG icon |
| Cá lóc | caloc | caloc | SVG icon |
| Cá lóc nướng trui | calocnuong | lonuong | PNG art |
| Cá nhỏ | canho | ho | SVG icon |
| Cá nướng | canuong | lonuong | PNG art |
| Cà phê hảo hạng | caphehaohang | xuongcaocap | PNG art |
| Cà phê rang | capherang | mayrang | PNG art |
| Cà phê sữa | caphesua | mayrang | PNG art |
| Cá rô | caro | ho | SVG icon |
| Cá tra | catra | catra | SVG icon |
| Cá tra kho tộ | catrakho | lonuong | PNG art |
| Cá viên chiên | cavienchien | quanvat | PNG art |
| Cao nhung hươu | caonhung | xuongcaocap | PNG art |
| Chả cá | chaca | lonuong | PNG art |
| Chè đậu xanh | chedauxanh | quanvat | PNG art |
| Chuối chiên | chuoichien | quanvat | PNG art |
| Cóc dầm muối ớt | cocdam | bepan | PNG art |
| Cơm chiên trứng | comchien | bepan | PNG art |
| Cua | cua | cua | PNG art |
| Cua hấp sả | cuahap | lonuong | PNG art |
| Cuộn len | cuonlen | xuongdet | PNG art |
| Dầu ô liu | dauoliu | mayep | PNG art |
| Đường mía | duongmia | coixay | PNG art |
| Ếch | ech | ech | PNG art |
| Gỏi cuốn cá | goicuon | lonuong | PNG art |
| Hộp phô mai thượng hạng | hopphomai | xuongcaocap | PNG art |
| Hộp quà nông trại | hopqua | xuongcaocap | PNG art |
| Kem dưa hấu | kem | nhamaysua | PNG art |
| Kem sầu riêng | kemsaurieng | nhamaysua | PNG art |
| Kem vani | kemvani | nhamaysua | PNG art |
| Kẹo đậu phộng | keodauphong | quanvat | PNG art |
| Khăn alpaca | khanalpaca | xuongdet | PNG art |
| Khăn len | khanlen | xuongdet | PNG art |
| Khoai lang kén | khoailangken | quanvat | PNG art |
| Khoai lang nướng | khoailangnuong | bepan | PNG art |
| Khoai tây chiên | khoaichien | bepan | PNG art |
| Lẩu cá koi | lauca | lonuong | PNG art |
| Lẩu ếch | lauech | lonuong | PNG art |
| Len | len | cuu | SVG icon |
| Lông alpaca | longalpaca | alpaca | PNG art |
| Lông thỏ | longtho | tho | PNG art |
| Lụa | lua | xuongdet | PNG art |
| Lươn | luon | luon | PNG art |
| Lươn xào sả ớt | luonxao | lonuong | PNG art |
| Mật ong | matong | ong | PNG art |
| Me rim ớt | merim | quanvat | PNG art |
| Mũ len thỏ | mulen | xuongdet | PNG art |
| Mực | muc | muc | PNG art |
| Mực nướng sa tế | mucnuong | lonuong | PNG art |
| Mứt cam | mutcam | noimut | PNG art |
| Mứt dâu | mutdau | noimut | PNG art |
| Mứt gừng | mutgung | noimut | PNG art |
| Mứt sầu riêng | mutsaurieng | noimut | PNG art |
| Nem chua | nemchua | quanvat | PNG art |
| Nhung hươu | nhunghuou | huou | PNG art |
| Nước cam | nuoccam | mayep | PNG art |
| Nước chanh | nuocchanh | mayep | PNG art |
| Nước dứa | nuocthom | mayep | PNG art |
| Nước ép cà rốt | nuoccarot | mayep | PNG art |
| Nước ép cóc | nuoccoc | mayep | PNG art |
| Nước ép dưa hấu | nuocduahau | mayep | PNG art |
| Nước hoa hoa hồng | nuochoa | xuongcaocap | PNG art |
| Ốc bàn tay | ocbantay | ocbantay | PNG art |
| Ốc bàn tay nướng phô mai | ocbantaynuongphomai | quanoc | PNG art |
| Ốc bàn tay xào sa tế | ocbantayxaosate | quanoc | PNG art |
| Ốc bông | ocbong | ocbong | PNG art |
| Ốc bông luộc sả | ocbongluocsa | quanoc | PNG art |
| Ốc bông rang muối ớt | ocbongrangmuoiot | quanoc | PNG art |
| Ốc bươu | oc | oc | PNG art |
| Ốc bươu luộc sả | ocluocsa | quanoc | PNG art |
| Ốc bươu rang muối ớt | ocrangmuoiot | quanoc | PNG art |
| Ốc cà na | occana | occana | PNG art |
| Ốc cà na hấp sả | occanahapsa | quanoc | PNG art |
| Ốc cà na xào dừa | occanaxaodua | quanoc | PNG art |
| Ốc dừa | ocdua | ocdua | PNG art |
| Ốc dừa hấp sả | ocduahapsa | quanoc | PNG art |
| Ốc dừa xào dừa | ocduaxaodua | quanoc | PNG art |
| Ốc đá | ocda | ocda | PNG art |
| Ốc đá xào sa tế | ocdaxaosate | quanoc | PNG art |
| Ốc đá xào tỏi | ocdaxaotoi | quanoc | PNG art |
| Ốc đắng | ocdang | ocdang | PNG art |
| Ốc đắng hấp sả | ocdanghapsa | quanoc | PNG art |
| Ốc đắng nướng mỡ hành | ocdangnuongmohanh | quanoc | PNG art |
| Ốc gai | ocgai | ocgai | PNG art |
| Ốc gai xào me | ocgaixaome | quanoc | PNG art |
| Ốc gai xào tỏi | ocgaixaotoi | quanoc | PNG art |
| Ốc gạo | ocgao | ocgao | PNG art |
| Ốc gạo xào bơ | ocgaoxaobo | quanoc | PNG art |
| Ốc gạo xào dừa | ocgaoxaodua | quanoc | PNG art |
| Ốc giác | ocgiac | ocgiac | PNG art |
| Ốc giác hấp sả | ocgiachapsa | quanoc | PNG art |
| Ốc giác nướng mỡ hành | ocgiacnuongmohanh | quanoc | PNG art |
| Ốc hương | ochuong | ochuong | PNG art |
| Ốc hương xào sa tế | ochuongxaosate | quanoc | PNG art |
| Ốc hương xào tỏi | ochuongxaotoi | quanoc | PNG art |
| Ốc lác | oclac | oclac | PNG art |
| Ốc lác nướng phô mai | oclacnuongphomai | quanoc | PNG art |
| Ốc lác xào me | oclacxaome | quanoc | PNG art |
| Ốc len | oclen | oclen | PNG art |
| Ốc len nướng mỡ hành | oclennuongmohanh | quanoc | PNG art |
| Ốc len xào bơ | oclenxaobo | quanoc | PNG art |
| Ốc luộc sả | ocluoc | quanvat | PNG art |
| Ốc mít | ocmit | ocmit | PNG art |
| Ốc mít nướng phô mai | ocmitnuongphomai | quanoc | PNG art |
| Ốc mít xào sa tế | ocmitxaosate | quanoc | PNG art |
| Ốc móng tay | ocmongtay | ocmongtay | PNG art |
| Ốc móng tay nướng mỡ hành | ocmongtaynuongmohanh | quanoc | PNG art |
| Ốc móng tay xào bơ | ocmongtayxaobo | quanoc | PNG art |
| Ốc mỡ | ocmo | ocmo | PNG art |
| Ốc mỡ luộc sả | ocmoluocsa | quanoc | PNG art |
| Ốc mỡ rang muối ớt | ocmorangmuoiot | quanoc | PNG art |
| Ốc nhảy | ocnhay | ocnhay | PNG art |
| Ốc nhảy xào bơ | ocnhayxaobo | quanoc | PNG art |
| Ốc nhảy xào dừa | ocnhayxaodua | quanoc | PNG art |
| Ốc nhồi | ocnhoi | ocnhoi | PNG art |
| Ốc nhồi xào me | ocnhoixaome | quanoc | PNG art |
| Ốc nhồi xào tỏi | ocnhoixaotoi | quanoc | PNG art |
| Ốc tỏi | octoi | octoi | PNG art |
| Ốc tỏi luộc sả | octoiluocsa | quanoc | PNG art |
| Ốc tỏi rang muối ớt | octoirangmuoiot | quanoc | PNG art |
| Ốc tù và | octuva | octuva | PNG art |
| Ốc tù và luộc sả | octuvaluocsa | quanoc | PNG art |
| Ốc tù và rang muối ớt | octuvarangmuoiot | quanoc | PNG art |
| Ốc vú nàng | ocvunang | ocvunang | PNG art |
| Ốc vú nàng nướng phô mai | ocvunangnuongphomai | quanoc | PNG art |
| Ốc vú nàng xào me | ocvunangxaome | quanoc | PNG art |
| Phô mai | phomai | nhamaysua | PNG art |
| Phô mai dê | phomaide | nhamaysua | PNG art |
| Phô mai trâu | phomaitrau | nhamaysua | PNG art |
| Pizza | pizza | lobanh | PNG art |
| Rượu nho ủ | ruouvang | xuongcaocap | PNG art |
| Salad rau | salad | bepan | PNG art |
| Sầu riêng chiên | saurienchien | bepan | PNG art |
| Sinh tố xoài | sinhtoxoai | mayep | PNG art |
| Siro thanh long | siro | noimut | PNG art |
| Sô-cô-la | socola | mayrang | PNG art |
| Sốt cà chua | sotcachua | noimut | PNG art |
| Súp bí đỏ | supbi | bepan | PNG art |
| Sushi | sushi | lonuong | PNG art |
| Sữa | sua | bo | PNG art |
| Sữa chua dâu | suachua | nhamaysua | PNG art |
| Sữa dê | suade | de | PNG art |
| Sữa trâu | suatrau | trau | PNG art |
| Thịt heo | thit | heo | PNG art |
| Thức ăn gia súc | thucan | shop | PNG art |
| Tiệc gia đình | buatiec | xuongcaocap | PNG art |
| Tôm | tom | tom | PNG art |
| Tôm nướng | tomnuong | lonuong | PNG art |
| Tơ tằm | totam | tam | PNG art |
| Trà sả mật ong | trasa | quanvat | PNG art |
| Trà sữa | trasua | bepan | PNG art |
| Trà túi lọc | tratui | mayrang | PNG art |
| Trứng | trung | ga | SVG icon |
| Trứng cút | trungcut | cut | PNG art |
| Trứng gà tây | trunggatay | gatay | PNG art |
| Trứng muối | trungmuoi | bepan | PNG art |
| Trứng ngỗng | trungngong | ngong | PNG art |
| Trứng vịt | trungvit | vit | PNG art |
| Vải bông | vai | xuongdet | PNG art |
| Xôi đậu phộng | xoidauphong | quanvat | PNG art |
| Xúc xích | xucxich | bepan | PNG art |

## Static client asset references

This list includes scene buildings, backgrounds, UI icons, and product art named directly in `public/app.js`. Crop, tree, and animal IDs generated at runtime are covered by the catalog tables above.

| Path | Size |
| --- | ---: |
| `assets/art/alpaca_v3.png` | 74 KB |
| `assets/art/basket.png` | 7 KB |
| `assets/art/bee_v3.png` | 53 KB |
| `assets/art/buffalo_v3.png` | 91 KB |
| `assets/art/chicken.png` | 7 KB |
| `assets/art/chicken_v3.png` | 75 KB |
| `assets/art/cow.png` | 15 KB |
| `assets/art/deer_v3.png` | 60 KB |
| `assets/art/duck_v3.png` | 57 KB |
| `assets/art/feed.png` | 5 KB |
| `assets/art/goat_v3.png` | 78 KB |
| `assets/art/goose_v3.png` | 46 KB |
| `assets/art/pig.png` | 10 KB |
| `assets/art/quail_v3.png` | 61 KB |
| `assets/art/rabbit_v3.png` | 70 KB |
| `assets/art/sheep.png` | 14 KB |
| `assets/art/silkworm_v3.png` | 81 KB |
| `assets/art/tree.png` | 12 KB |
| `assets/art/trees/anhdao-qua.png` | 6 KB |
| `assets/art/trees/cam-qua.png` | 3 KB |
| `assets/art/trees/chanh-qua.png` | 3 KB |
| `assets/art/trees/chuoi-qua.png` | 6 KB |
| `assets/art/trees/coc-qua.png` | 14 KB |
| `assets/art/trees/dao-qua.png` | 5 KB |
| `assets/art/trees/dua-qua.png` | 7 KB |
| `assets/art/trees/quabo-qua.png` | 19 KB |
| `assets/art/trees/quame-qua.png` | 18 KB |
| `assets/art/trees/saurieng-qua.png` | 27 KB |
| `assets/art/trees/tao-qua.png` | 3 KB |
| `assets/art/trees/thanhlong-qua.png` | 4 KB |
| `assets/art/trees/xoai-qua.png` | 4 KB |
| `assets/art/turkey_v3.png` | 105 KB |
| `assets/crops-v3/cabbage-growing.png` | 66 KB |
| `assets/crops-v3/cabbage-ripe.png` | 108 KB |
| `assets/crops-v3/cacao-growing.png` | 81 KB |
| `assets/crops-v3/cacao-ripe.png` | 98 KB |
| `assets/crops-v3/cannabis-growing.png` | 64 KB |
| `assets/crops-v3/cannabis-ripe.png` | 111 KB |
| `assets/crops-v3/carrot-growing.png` | 88 KB |
| `assets/crops-v3/carrot-ripe.png` | 93 KB |
| `assets/crops-v3/cauliflower-growing.png` | 107 KB |
| `assets/crops-v3/cauliflower-ripe.png` | 135 KB |
| `assets/crops-v3/chili-growing.png` | 44 KB |
| `assets/crops-v3/chili-ripe.png` | 93 KB |
| `assets/crops-v3/coffee-growing.png` | 82 KB |
| `assets/crops-v3/coffee-ripe.png` | 118 KB |
| `assets/crops-v3/corn-growing.png` | 96 KB |
| `assets/crops-v3/corn-ripe.png` | 106 KB |
| `assets/crops-v3/cotton-growing.png` | 85 KB |
| `assets/crops-v3/cotton-ripe.png` | 109 KB |
| `assets/crops-v3/cucumber-growing.png` | 73 KB |
| `assets/crops-v3/cucumber-ripe.png` | 105 KB |
| `assets/crops-v3/eggplant-growing.png` | 74 KB |
| `assets/crops-v3/eggplant-ripe.png` | 103 KB |
| `assets/crops-v3/garlic-growing.png` | 61 KB |
| `assets/crops-v3/garlic-ripe.png` | 94 KB |
| `assets/crops-v3/ginger-growing.png` | 70 KB |
| `assets/crops-v3/ginger-ripe.png` | 116 KB |
| `assets/crops-v3/grape-growing.png` | 52 KB |
| `assets/crops-v3/grape-ripe.png` | 108 KB |
| `assets/crops-v3/herbs-growing.png` | 42 KB |
| `assets/crops-v3/herbs-ripe.png` | 106 KB |
| `assets/crops-v3/lemongrass-growing.png` | 42 KB |
| `assets/crops-v3/lemongrass-ripe.png` | 96 KB |
| `assets/crops-v3/mung-bean-growing.png` | 54 KB |
| `assets/crops-v3/mung-bean-ripe.png` | 102 KB |
| `assets/crops-v3/mushroom-growing.png` | 54 KB |
| `assets/crops-v3/mushroom-ripe.png` | 104 KB |
| `assets/crops-v3/olive-growing.png` | 72 KB |
| `assets/crops-v3/olive-ripe.png` | 94 KB |
| `assets/crops-v3/onion-growing.png` | 55 KB |
| `assets/crops-v3/onion-ripe.png` | 104 KB |
| `assets/crops-v3/peanut-growing.png` | 54 KB |
| `assets/crops-v3/peanut-ripe.png` | 105 KB |
| `assets/crops-v3/pineapple-growing.png` | 78 KB |
| `assets/crops-v3/pineapple-ripe.png` | 107 KB |
| `assets/crops-v3/potato-growing.png` | 101 KB |
| `assets/crops-v3/potato-ripe.png` | 110 KB |
| `assets/crops-v3/pumpkin-growing.png` | 87 KB |
| `assets/crops-v3/pumpkin-ripe.png` | 113 KB |
| `assets/crops-v3/rice-growing.png` | 50 KB |
| `assets/crops-v3/rice-ripe.png` | 129 KB |
| `assets/crops-v3/rose-growing.png` | 68 KB |
| `assets/crops-v3/rose-ripe.png` | 121 KB |
| `assets/crops-v3/seedling.png` | 43 KB |
| `assets/crops-v3/sesame-growing.png` | 49 KB |
| `assets/crops-v3/sesame-ripe.png` | 96 KB |
| `assets/crops-v3/strawberry-growing.png` | 54 KB |
| `assets/crops-v3/strawberry-ripe.png` | 98 KB |
| `assets/crops-v3/sugarcane-growing.png` | 71 KB |
| `assets/crops-v3/sugarcane-ripe.png` | 101 KB |
| `assets/crops-v3/sunflower-growing.png` | 64 KB |
| `assets/crops-v3/sunflower-ripe.png` | 103 KB |
| `assets/crops-v3/sweet-potato-growing.png` | 52 KB |
| `assets/crops-v3/sweet-potato-ripe.png` | 116 KB |
| `assets/crops-v3/tea-growing.png` | 47 KB |
| `assets/crops-v3/tea-ripe.png` | 101 KB |
| `assets/crops-v3/tomato-growing.png` | 71 KB |
| `assets/crops-v3/tomato-ripe.png` | 104 KB |
| `assets/crops-v3/vanilla-growing.png` | 65 KB |
| `assets/crops-v3/vanilla-ripe.png` | 87 KB |
| `assets/crops-v3/watermelon-growing.png` | 77 KB |
| `assets/crops-v3/watermelon-ripe.png` | 119 KB |
| `assets/crops-v3/wheat-growing.png` | 54 KB |
| `assets/crops-v3/wheat-ripe.png` | 85 KB |
| `assets/crops/seed-1.svg` | <1 KB |
| `assets/decor-v3/scarecrow.png` | 36 KB |
| `assets/machines-v3/bakery-oven.png` | 38 KB |
| `assets/machines-v3/coffee-roaster.png` | 29 KB |
| `assets/machines-v3/dairy-workshop.png` | 39 KB |
| `assets/machines-v3/family-kitchen.png` | 41 KB |
| `assets/machines-v3/fish-oven.png` | 29 KB |
| `assets/machines-v3/flour-mill.png` | 31 KB |
| `assets/machines-v3/jam-kettle.png` | 33 KB |
| `assets/machines-v3/juice-press.png` | 26 KB |
| `assets/machines-v3/premium-workshop.png` | 35 KB |
| `assets/machines-v3/snack-stall.png` | 38 KB |
| `assets/machines-v3/snail-stall.png` | 39 KB |
| `assets/machines-v3/weaving-workshop.png` | 37 KB |
| `assets/pack/farm_logo.png` | 54 KB |
| `assets/pack/pet_dogs.png` | 21 KB |
| `assets/pack/pig_adult.png` | 12 KB |
| `assets/pack/sheep_adult.png` | 18 KB |
| `assets/pack/tree_01.png` | 10 KB |
| `assets/pack/tree_02.png` | 14 KB |
| `assets/pack/well.png` | 17 KB |
| `assets/products-v3/aged-grape-wine.png` | 79 KB |
| `assets/products-v3/alpaca-fleece.png` | 89 KB |
| `assets/products-v3/alpaca-scarf.png` | 88 KB |
| `assets/products-v3/ambarella-juice.png` | 98 KB |
| `assets/products-v3/apple-pie.png` | 111 KB |
| `assets/products-v3/apple-snail.png` | 25 KB |
| `assets/products-v3/banana-fritters.png` | 29 KB |
| `assets/products-v3/bitter-snail.png` | 26 KB |
| `assets/products-v3/boiled-apple-snails.png` | 24 KB |
| `assets/products-v3/braised-pangasius.png` | 122 KB |
| `assets/products-v3/buffalo-cheese.png` | 79 KB |
| `assets/products-v3/buffalo-milk.png` | 66 KB |
| `assets/products-v3/butter-jumping-snails.png` | 31 KB |
| `assets/products-v3/butter-mud-creeper-snails.png` | 28 KB |
| `assets/products-v3/butter-razor-clams.png` | 30 KB |
| `assets/products-v3/butter-rice-snails.png` | 30 KB |
| `assets/products-v3/butter.png` | 78 KB |
| `assets/products-v3/buttered-corn.png` | 20 KB |
| `assets/products-v3/cane-sugar.png` | 18 KB |
| `assets/products-v3/carrot-cake.png` | 106 KB |
| `assets/products-v3/carrot-juice.png` | 13 KB |
| `assets/products-v3/cheese-jackfruit-snails.png` | 28 KB |
| `assets/products-v3/cheese-limpets.png` | 28 KB |
| `assets/products-v3/cheese-spider-conch.png` | 33 KB |
| `assets/products-v3/cheese-striped-snails.png` | 30 KB |
| `assets/products-v3/chili-ambarella.png` | 24 KB |
| `assets/products-v3/chili-salt-apple-snails.png` | 22 KB |
| `assets/products-v3/chili-salt-flower-snails.png` | 29 KB |
| `assets/products-v3/chili-salt-garlic-snails.png` | 28 KB |
| `assets/products-v3/chili-salt-moon-snails.png` | 29 KB |
| `assets/products-v3/chili-salt-trumpet-snails.png` | 35 KB |
| `assets/products-v3/chili-tamarind.png` | 21 KB |
| `assets/products-v3/cocoa-powder.png` | 90 KB |
| `assets/products-v3/coconut-jumping-snails.png` | 32 KB |
| `assets/products-v3/coconut-olive-snails.png` | 29 KB |
| `assets/products-v3/coconut-rice-snails.png` | 31 KB |
| `assets/products-v3/coconut-sauce-snails.png` | 32 KB |
| `assets/products-v3/coconut-snail-shell.png` | 16 KB |
| `assets/products-v3/conch-shell.png` | 33 KB |
| `assets/products-v3/corn-flour.png` | 92 KB |
| `assets/products-v3/cotton-fabric.png` | 88 KB |
| `assets/products-v3/cow-milk.png` | 59 KB |
| `assets/products-v3/crispy-pancake.png` | 24 KB |
| `assets/products-v3/cured-pork-rolls.png` | 23 KB |
| `assets/products-v3/deer-antler-paste.png` | 90 KB |
| `assets/products-v3/deer-velvet.png` | 66 KB |
| `assets/products-v3/dragon-fruit-syrup.png` | 89 KB |
| `assets/products-v3/duck-eggs.png` | 18 KB |
| `assets/products-v3/durian-fritters.png` | 23 KB |
| `assets/products-v3/durian-ice-cream.png` | 111 KB |
| `assets/products-v3/durian-jam.png` | 108 KB |
| `assets/products-v3/egg-bread.png` | 24 KB |
| `assets/products-v3/family-feast.png` | 135 KB |
| `assets/products-v3/farm-cheese.png` | 16 KB |
| `assets/products-v3/farm-eel.png` | 16 KB |
| `assets/products-v3/farm-frog.png` | 18 KB |
| `assets/products-v3/farm-gift-box.png` | 116 KB |
| `assets/products-v3/farm-pizza.png` | 110 KB |
| `assets/products-v3/fish-cakes.png` | 110 KB |
| `assets/products-v3/fish-hotpot.png` | 120 KB |
| `assets/products-v3/fish-spring-rolls.png` | 122 KB |
| `assets/products-v3/fish-sushi.png` | 114 KB |
| `assets/products-v3/flower-snail-shell.png` | 25 KB |
| `assets/products-v3/fresh-shrimp.png` | 19 KB |
| `assets/products-v3/fresh-squid.png` | 15 KB |
| `assets/products-v3/freshwater-crab.png` | 17 KB |
| `assets/products-v3/fried-fish-balls.png` | 19 KB |
| `assets/products-v3/fried-red-tilapia.png` | 114 KB |
| `assets/products-v3/fried-rice-cakes.png` | 20 KB |
| `assets/products-v3/fried-rice.png` | 23 KB |
| `assets/products-v3/frog-hotpot.png` | 26 KB |
| `assets/products-v3/garden-salad.png` | 22 KB |
| `assets/products-v3/garlic-babylon-snails.png` | 24 KB |
| `assets/products-v3/garlic-pond-snails.png` | 23 KB |
| `assets/products-v3/garlic-snail-shell.png` | 27 KB |
| `assets/products-v3/garlic-spiny-snails.png` | 32 KB |
| `assets/products-v3/garlic-stone-snails.png` | 31 KB |
| `assets/products-v3/ginger-cake.png` | 89 KB |
| `assets/products-v3/ginger-preserve.png` | 95 KB |
| `assets/products-v3/goat-cheese.png` | 78 KB |
| `assets/products-v3/goat-milk.png` | 55 KB |
| `assets/products-v3/goose-egg.png` | 19 KB |
| `assets/products-v3/grilled-fish.png` | 96 KB |
| `assets/products-v3/grilled-shrimp.png` | 110 KB |
| `assets/products-v3/grilled-snakehead-fish.png` | 112 KB |
| `assets/products-v3/honey-cake.png` | 105 KB |
| `assets/products-v3/honey-lemongrass-tea.png` | 18 KB |
| `assets/products-v3/honey.png` | 86 KB |
| `assets/products-v3/iced-milk-coffee.png` | 78 KB |
| `assets/products-v3/jackfruit-snail-shell.png` | 32 KB |
| `assets/products-v3/jumping-snail-shell.png` | 21 KB |
| `assets/products-v3/lemonade.png` | 73 KB |
| `assets/products-v3/lemongrass-chili-eel.png` | 101 KB |
| `assets/products-v3/lemongrass-coconut-snails.png` | 31 KB |
| `assets/products-v3/lemongrass-flower-snails.png` | 30 KB |
| `assets/products-v3/lemongrass-garlic-snails.png` | 30 KB |
| `assets/products-v3/lemongrass-moon-snails.png` | 30 KB |
| `assets/products-v3/lemongrass-olive-snails.png` | 30 KB |
| `assets/products-v3/lemongrass-snails.png` | 24 KB |
| `assets/products-v3/lemongrass-steamed-bitter-snails.png` | 26 KB |
| `assets/products-v3/lemongrass-steamed-conch.png` | 30 KB |
| `assets/products-v3/lemongrass-trumpet-snails.png` | 33 KB |
| `assets/products-v3/limpet-shell.png` | 25 KB |
| `assets/products-v3/mango-smoothie.png` | 61 KB |
| `assets/products-v3/milk-chocolate.png` | 78 KB |
| `assets/products-v3/milk-tea.png` | 20 KB |
| `assets/products-v3/moon-snail.png` | 30 KB |
| `assets/products-v3/mud-creeper-snail.png` | 11 KB |
| `assets/products-v3/mung-bean-dessert.png` | 23 KB |
| `assets/products-v3/olive-oil.png` | 74 KB |
| `assets/products-v3/olive-snail-shell.png` | 18 KB |
| `assets/products-v3/orange-juice.png` | 21 KB |
| `assets/products-v3/orange-marmalade.png` | 91 KB |
| `assets/products-v3/peanut-brittle.png` | 22 KB |
| `assets/products-v3/peanut-sticky-rice.png` | 24 KB |
| `assets/products-v3/pepper-braised-fish.png` | 128 KB |
| `assets/products-v3/pineapple-cake.png` | 91 KB |
| `assets/products-v3/pineapple-juice.png` | 68 KB |
| `assets/products-v3/pond-snail.png` | 23 KB |
| `assets/products-v3/pork-sausages.png` | 20 KB |
| `assets/products-v3/pork.png` | 78 KB |
| `assets/products-v3/potato-fries.png` | 23 KB |
| `assets/products-v3/premium-cheese-box.png` | 101 KB |
| `assets/products-v3/premium-coffee.png` | 101 KB |
| `assets/products-v3/pumpkin-pie.png` | 29 KB |
| `assets/products-v3/pumpkin-soup.png` | 25 KB |
| `assets/products-v3/quail-eggs.png` | 15 KB |
| `assets/products-v3/rabbit-fur.png` | 20 KB |
| `assets/products-v3/rabbit-wool-hat.png` | 100 KB |
| `assets/products-v3/razor-clam-shell.png` | 23 KB |
| `assets/products-v3/rice-flour.png` | 18 KB |
| `assets/products-v3/rice-paper-salad.png` | 22 KB |
| `assets/products-v3/rice-snail-shell.png` | 17 KB |
| `assets/products-v3/roasted-coffee.png` | 86 KB |
| `assets/products-v3/roasted-sweet-potatoes.png` | 22 KB |
| `assets/products-v3/rose-perfume.png` | 81 KB |
| `assets/products-v3/salted-eggs.png` | 23 KB |
| `assets/products-v3/satay-babylon-snails.png` | 22 KB |
| `assets/products-v3/satay-grilled-squid.png` | 112 KB |
| `assets/products-v3/satay-jackfruit-snails.png` | 30 KB |
| `assets/products-v3/satay-spider-conch.png` | 31 KB |
| `assets/products-v3/satay-stone-snails.png` | 27 KB |
| `assets/products-v3/scallion-grilled-bitter-snails.png` | 30 KB |
| `assets/products-v3/scallion-grilled-conch.png` | 31 KB |
| `assets/products-v3/scallion-grilled-mud-creeper-snails.png` | 25 KB |
| `assets/products-v3/scallion-grilled-razor-clams.png` | 32 KB |
| `assets/products-v3/shrimp-fritters.png` | 27 KB |
| `assets/products-v3/silk-ao-dai.png` | 77 KB |
| `assets/products-v3/silk-fabric.png` | 102 KB |
| `assets/products-v3/silkworm-silk.png` | 71 KB |
| `assets/products-v3/spider-conch-shell.png` | 24 KB |
| `assets/products-v3/spiny-snail-shell.png` | 19 KB |
| `assets/products-v3/spotted-babylon-snail.png` | 19 KB |
| `assets/products-v3/steamed-lemongrass-crab.png` | 132 KB |
| `assets/products-v3/stone-snail-shell.png` | 21 KB |
| `assets/products-v3/strawberry-cake.png` | 104 KB |
| `assets/products-v3/strawberry-jam.png` | 18 KB |
| `assets/products-v3/strawberry-yogurt.png` | 98 KB |
| `assets/products-v3/striped-snail-shell.png` | 26 KB |
| `assets/products-v3/sweet-potato-fritters.png` | 20 KB |
| `assets/products-v3/tamarind-limpets.png` | 34 KB |
| `assets/products-v3/tamarind-pond-snails.png` | 25 KB |
| `assets/products-v3/tamarind-spiny-snails.png` | 29 KB |
| `assets/products-v3/tamarind-striped-snails.png` | 29 KB |
| `assets/products-v3/tea-bags.png` | 99 KB |
| `assets/products-v3/tomato-sauce.png` | 20 KB |
| `assets/products-v3/trumpet-snail-shell.png` | 24 KB |
| `assets/products-v3/turkey-eggs.png` | 77 KB |
| `assets/products-v3/vanilla-ice-cream.png` | 64 KB |
| `assets/products-v3/watermelon-ice-cream.png` | 93 KB |
| `assets/products-v3/watermelon-juice.png` | 81 KB |
| `assets/products-v3/wheat-flour.png` | 89 KB |
| `assets/products-v3/wool-roll.png` | 19 KB |
| `assets/products-v3/wool-scarf.png` | 105 KB |
| `assets/products-v3/wool-sweater.png` | 104 KB |
| `assets/scene-v3/chicken_coop_v3.png` | 66 KB |
| `assets/scene-v3/farmer_v3.png` | 63 KB |
| `assets/scene-v3/farmhouse_v3.png` | 63 KB |
| `assets/scene-v3/fishing_pond_v3.png` | 82 KB |
| `assets/scene-v3/greenhouse_v3.png` | 67 KB |
| `assets/scene-v3/market_shop_v3-224.png` | 89 KB |
| `assets/scene-v3/red_barn_v3.png` | 63 KB |
| `assets/scene-v3/windmill_v3-224.png` | 69 KB |
| `assets/ui/coin.svg` | <1 KB |
| `assets/ui/egg.svg` | <1 KB |
| `assets/ui/feed.svg` | <1 KB |
| `assets/ui/fish-cachep.svg` | <1 KB |
| `assets/ui/fish-cachim.svg` | <1 KB |
| `assets/ui/fish-cakoi.svg` | <1 KB |
| `assets/ui/fish-caloc.svg` | <1 KB |
| `assets/ui/fish-canho.svg` | <1 KB |
| `assets/ui/fish-caro.svg` | <1 KB |
| `assets/ui/fish-catra.svg` | <1 KB |
| `assets/ui/fish-dieuhong.svg` | <1 KB |
| `assets/ui/gem.svg` | <1 KB |
| `assets/ui/star.svg` | <1 KB |
| `assets/ui/wool.svg` | <1 KB |

