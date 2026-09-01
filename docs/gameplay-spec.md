# NÔNG TRẠI VUI VẺ

## Đặc tả gameplay, nâng cấp, thời gian trồng, EXP và vàng

**Phiên bản:** 1.0 – bản cân bằng nền cho prototype/MVP  
**Thể loại:** mô phỏng nông trại casual, chơi một tay trên mobile  
**Phong cách:** chibi vui vẻ, màu sắc tươi sáng, ít áp lực, không chiến đấu, không PvP bắt buộc  
**Tên hiển thị:** `Nông Trại Vui Vẻ`

---

## 1. Định hướng thiết kế

### 1.1. Cảm giác cần đạt được

Người chơi luôn có một việc nhỏ để làm trong 3–5 phút, nhưng cũng có mục tiêu dài hạn để quay lại mỗi ngày:

- gieo hạt và thu hoạch;
- chăm gà, bò, cừu;
- câu cá và lấy nguyên liệu;
- chế biến nông sản thành sản phẩm có giá trị cao hơn;
- giao đơn hàng cho chợ nông sản;
- hoàn thành nhiệm vụ;
- mở rộng và trang trí nông trại.

Không dùng cơ chế cây trồng chết nếu người chơi không đăng nhập. Cây chỉ tạm dừng ở trạng thái sẵn sàng thu hoạch. Điều này giữ trò chơi thân thiện và phù hợp với người chơi bận rộn.

### 1.2. Nhịp chơi mục tiêu

| Kiểu phiên chơi | Thời lượng | Hoạt động chính |
|---|---:|---|
| Ghé nhanh | 2–5 phút | Thu hoạch, gieo lại, nhận sản phẩm, giao một đơn |
| Phiên thông thường | 10–20 phút | Chăm vật nuôi, chế biến, mở đất, làm nhiệm vụ |
| Phiên dài | 30–60 phút | Sắp xếp lại trang trại, câu cá, hoàn thành chuỗi đơn hàng |
| Quay lại sau khi offline | 1–3 phút | Nhận sản phẩm đã hoàn thành, thu hoạch cây, nhận quà |

### 1.3. Nguyên tắc cân bằng

1. Mọi hoạt động cơ bản đều có thể hoàn thành bằng vàng và thời gian.
2. Kim cương chủ yếu dùng để rút ngắn thời gian, mua vật phẩm trang trí hoặc mở rộng lựa chọn; không bắt buộc để tiến bộ.
3. Cây trồng ngắn hạn tạo dòng tiền nhanh; cây trồng dài hạn có lợi nhuận và EXP tốt hơn trên mỗi ô.
4. Chế biến luôn có lợi hơn bán nguyên liệu thô, nhưng phải đánh đổi bằng thời gian máy.
5. Người chơi mới có thể mở khóa vòng lặp chăn nuôi trước khi cảm thấy thiếu đất.
6. Nâng cấp kho và năng lượng phải hữu ích ở mọi giai đoạn, không bị thay thế quá sớm.

---

## 2. Vòng lặp gameplay chính

```text
Nhận nhiệm vụ/đơn hàng
        ↓
Chuẩn bị hạt giống, thức ăn, nguyên liệu
        ↓
Trồng cây – chăm vật nuôi – câu cá
        ↓
Thu hoạch và nhận EXP
        ↓
Bán trực tiếp hoặc đưa vào máy chế biến
        ↓
Giao hàng nhận vàng, EXP, Sao Nông Trại
        ↓
Mở đất, nâng cấp công trình, trang trí
        ↓
Mở khóa giống cây và công thức mới
```

### 2.1. Ba lớp mục tiêu

#### Mục tiêu tức thời – dưới 5 phút

- thu hoạch các ô đã chín;
- gieo lại hạt;
- lấy trứng, sữa, len;
- nhận hàng từ máy chế biến;
- hoàn thành một yêu cầu đơn giản.

#### Mục tiêu trong ngày

- hoàn thành 3 nhiệm vụ ngày;
- đạt mốc Sao Nông Trại;
- lấp đầy các máy chế biến trước khi thoát game;
- tích đủ vàng cho lần mở đất hoặc nâng cấp kế tiếp.

#### Mục tiêu dài hạn

- mở toàn bộ khu đất chính;
- nâng cấp Nhà Chính, Kho và Chợ;
- hoàn thành bộ sưu tập cây, vật nuôi, cá và sản phẩm;
- xây dựng trang trại theo phong cách riêng.

---

## 3. Tài nguyên và tiền tệ

### 3.1. Bảng tài nguyên

| Tài nguyên | Vai trò | Cách nhận |
|---|---|---|
| **Vàng** | Tiền tệ chính để mua hạt giống, vật nuôi, công trình và nâng cấp | Bán hàng, đơn hàng, nhiệm vụ, sự kiện |
| **Kim cương** | Tiền tệ cao cấp để tăng tốc, mua trang trí đặc biệt, đổi lượt làm mới | Nhiệm vụ, thành tựu, sự kiện, mua trong cửa hàng |
| **Năng lượng** | Dùng cho hành động vật lý như dọn đá, chặt cây, đào đất, câu cá | Tự hồi theo thời gian, quà, nhiệm vụ |
| **EXP** | Tăng cấp nông dân và mở khóa nội dung | Gieo trồng, thu hoạch, chăm vật nuôi, chế biến, nhiệm vụ |
| **Sao Nông Trại** | Điểm tiến độ xã hội và phần thưởng mốc | Đơn hàng, nhiệm vụ ngày, bộ sưu tập, sự kiện |
| **Vé Sự Kiện** | Dùng trong sự kiện giới hạn thời gian | Nhiệm vụ sự kiện, quà đăng nhập |
| **Gỗ/Đá/Vải** | Vật liệu phụ cho một số nâng cấp và trang trí | Dọn khu đất, câu cá, đơn hàng, rương |

### 3.2. Năng lượng

- Năng lượng cơ bản: **100**.
- Hồi: **1 năng lượng mỗi 3 phút**.
- Năng lượng tối đa không tự vượt quá giới hạn, nhưng phần thưởng có thể cộng vượt giới hạn tối đa 20%.
- Có thể xem quảng cáo tùy chọn để nhận **20 năng lượng**, tối đa 3 lần/ngày.
- Không dùng năng lượng cho gieo hạt, tưới nước, thu hoạch, cho ăn hoặc lấy sản phẩm.

| Hành động | Năng lượng |
|---|---:|
| Dọn cỏ nhỏ | 1 |
| Đào đất mới | 3 |
| Chặt cây nhỏ | 4 |
| Phá đá nhỏ | 5 |
| Phá đá lớn | 8 |
| Câu cá một lượt | 4 |
| Thu gom vật liệu quanh hồ | 2 |

### 3.3. Kim cương

Kim cương không được dùng để mua trực tiếp EXP. Các cách sử dụng đề xuất:

| Tác vụ | Chi phí |
|---|---:|
| Tăng tốc cây còn dưới 5 phút | 1–3 kim cương |
| Tăng tốc máy chế biến | 1 kim cương / 5 phút còn lại |
| Làm mới một đơn hàng | 3 kim cương, lượt đầu mỗi ngày miễn phí |
| Mở rộng hàng đợi máy thêm 1 ô trong 24 giờ | 15 kim cương |
| Mua vật trang trí hiếm | 50–500 kim cương |
| Gói năng lượng nhỏ | 10 kim cương = 30 năng lượng |

---

## 4. Hệ thống cấp độ và EXP

### 4.1. Cách tính EXP cần cho cấp kế tiếp

Để giữ đường cong tăng trưởng dễ hiểu, dùng công thức nền:

```text
EXP cần cho cấp L → L+1 = làm tròn đến 10 của:
100 + 12L + 3,36L²
```

Ở cấp 25:

```text
100 + 12×25 + 3,36×25² = 2.500 EXP
```

Vì vậy, giao diện tham chiếu có thể hiển thị chính xác dạng:

```text
Cấp 25     1.280 / 2.500 EXP
```

### 4.2. Mốc EXP tham khảo

Các giá trị dưới đây được tính từ cùng một công thức, đã làm tròn đến 10 EXP gần nhất.

| Cấp hiện tại | EXP cần để lên cấp | Nội dung chính |
|---:|---:|---|
| 1 | 120 | Hướng dẫn, lúa mì, cà rốt |
| 2 | 140 | Mở rộng đất lần 1 |
| 3 | 170 | Chuồng gà |
| 5 | 240 | Cửa hàng và đơn hàng |
| 10 | 560 | Cối xay bột, hệ kỹ năng |
| 15 | 1.040 | Nhà máy sữa |
| 20 | 1.680 | Nhà ong, khu đất mới |
| 24 | 2.320 | Chuẩn bị mốc cấp 25 |
| 25 | 2.500 | Hiển thị tham chiếu `1.280/2.500 EXP` |
| 26 | 2.680 | Công thức hiếm và mở đất |
| 30 | 3.480 | Mùa vụ và bộ sưu tập nâng cao |
| 40 | 5.960 | Nhà kính nâng cao, nội dung dài hạn |

### 4.3. EXP theo hành động

| Hành động | EXP cơ bản |
|---|---:|
| Gieo 1 ô cây trồng | 1–4 |
| Thu hoạch cây ngắn hạn | 2–60 |
| Thu hoạch cây dài hạn | 80–400 |
| Tưới đủ một ô | 1 |
| Cho 1 vật nuôi ăn | 2–5 |
| Thu 1 trứng | 8 |
| Thu 1 chai sữa | 16 |
| Thu 1 bó len | 22 |
| Bắt 1 con cá | 12–70 |
| Hoàn thành món chế biến | 10–120 |
| Giao đơn hàng | 30–250 |
| Nhiệm vụ ngày | 50–300 |
| Nhiệm vụ cốt truyện | 100–1.000 |

### 4.4. Chống khai thác EXP

- Bán nguyên liệu thô không cho EXP trực tiếp.
- Gieo rồi hủy cây chỉ nhận lại 0 EXP.
- Cùng một hành động lặp vô hạn trong thời gian ngắn có thể nhận hệ số EXP giảm còn 50% sau 100 lần/ngày.
- EXP từ quảng cáo chỉ được nhận tối đa 3 lần/ngày.

---

## 5. Hệ thống vàng và nền kinh tế

### 5.1. Công thức giá bán

```text
Giá bán cuối = Giá cơ bản × chất lượng × tiền thưởng đơn hàng
```

Hệ số chất lượng:

| Chất lượng | Điều kiện | Hệ số giá |
|---|---|---:|
| Bình thường | Thu hoạch đúng hạn | 1,00x |
| Tươi tốt | Tưới đủ hoặc chăm sóc đúng | 1,05x |
| Hoàn hảo | Dùng hạt giống chất lượng hoặc buff sự kiện | 1,10x |

Tiền thưởng đơn hàng:

| Loại đơn | Thưởng vàng |
|---|---:|
| Bán trực tiếp | 0% |
| Đơn thường | +10% |
| Đơn gấp | +18% và EXP +10% |
| Đơn đặc biệt | +25% và thêm Sao Nông Trại |

### 5.2. Mục tiêu thu nhập

| Giai đoạn | Thu nhập vàng mục tiêu mỗi ngày | Chi phí nâng cấp thường gặp |
|---|---:|---:|
| Cấp 1–5 | 500–1.500 | 200–2.000 |
| Cấp 6–10 | 2.000–5.000 | 2.000–10.000 |
| Cấp 11–15 | 5.000–12.000 | 8.000–25.000 |
| Cấp 16–20 | 12.000–25.000 | 20.000–60.000 |
| Cấp 21–25 | 25.000–50.000 | 45.000–120.000 |
| Cấp 26+ | 40.000–90.000 | 80.000+ |

Giai đoạn cấp 25 có thể hiển thị số dư lớn như giao diện mẫu `125.360 vàng`, nhưng cần bảo đảm người chơi vẫn có một mục tiêu chi tiêu đáng kể tiếp theo, chẳng hạn mở đất hoặc nâng cấp nhà máy.

### 5.3. Nguồn tiêu vàng

- hạt giống và cây giống;
- thức ăn vật nuôi;
- mua vật nuôi;
- mở rộng đất;
- nâng cấp kho, chuồng, máy;
- sửa chữa và trang trí;
- mua nguyên liệu thiếu cho đơn hàng;
- làm mới cửa hàng với giới hạn hợp lý.

Không trừ vàng khi người chơi chỉ thu hoạch, tưới nước, cho ăn hoặc sắp xếp vật phẩm.

---

## 6. Cây trồng: thời gian, giá, EXP và lợi nhuận

Các số liệu dưới đây là giá trị cơ bản khi bán trực tiếp một đơn vị. Mỗi ô cho một đơn vị sản phẩm, trừ khi mô tả khác.

| Cây trồng | Mở khóa | Thời gian | Giá hạt | Giá bán | Lãi gộp/ô | EXP gieo | EXP thu hoạch |
|---|---:|---:|---:|---:|---:|---:|---:|
| Lúa mì | 1 | 1 phút | 2 | 6 | 4 | 1 | 2 |
| Cà rốt | 1 | 3 phút | 4 | 11 | 7 | 1 | 4 |
| Ngô | 4 | 6 phút | 7 | 18 | 11 | 2 | 7 |
| Khoai tây | 5 | 10 phút | 11 | 28 | 17 | 2 | 10 |
| Bắp cải | 7 | 15 phút | 14 | 36 | 22 | 2 | 14 |
| Cà chua | 8 | 25 phút | 18 | 48 | 30 | 3 | 21 |
| Dâu tây | 13 | 45 phút | 24 | 70 | 46 | 3 | 33 |
| Hành tây | 10 | 1 giờ | 30 | 84 | 54 | 4 | 43 |
| Gạo | 16 | 1 giờ 30 phút | 38 | 110 | 72 | 4 | 60 |
| Mía | 12 | 2 giờ | 46 | 135 | 89 | 5 | 78 |
| Bí ngô | 18 | 3 giờ | 60 | 180 | 120 | 6 | 110 |
| Cà tím | 14 | 4 giờ | 72 | 215 | 143 | 7 | 145 |
| Dưa hấu | 21 | 5 giờ | 90 | 275 | 185 | 8 | 185 |
| Nho | 22 | 6 giờ | 110 | 340 | 230 | 9 | 230 |
| Cà phê | 23 | 8 giờ | 145 | 450 | 305 | 12 | 300 |
| Ca cao | 28 | 10 giờ | 190 | 585 | 395 | 15 | 380 |

### 6.1. Quy tắc thời gian trồng

- Thời gian bắt đầu ngay sau khi gieo.
- Đóng game không dừng đồng hồ.
- Cây đã chín giữ nguyên trạng thái tối đa 72 giờ; sau đó vẫn không chết nhưng không thể đạt chất lượng “Hoàn hảo”.
- Tưới nước không làm giảm thời gian mặc định, nhưng giúp đạt chất lượng `Tươi tốt`.
- Nhà kính và kỹ năng có thể giảm thời gian, nhưng thời gian tối thiểu của một cây là 30 giây.
- Tăng tốc bằng kim cương làm tròn lên 1 phút gần nhất.

### 6.2. Chuỗi chăm sóc cây

1. Chọn ô đất trống.
2. Chọn hạt giống.
3. Gieo hạt, nhận EXP gieo.
4. Tưới nước nếu muốn tăng chất lượng.
5. Chờ đủ thời gian.
6. Thu hoạch, nhận sản phẩm và EXP.
7. Bán, giao đơn hoặc đưa vào máy chế biến.

### 6.3. Cây nhiều lần thu hoạch

Mở khóa từ cấp 19 trong Nhà Kính:

| Cây | Thời gian lớn lần đầu | Thời gian tái sinh | Sản lượng mỗi lần | Tuổi thọ |
|---|---:|---:|---:|---:|
| Dâu tây cao cấp | 2 giờ | 45 phút | 2 | 6 lần |
| Cà chua bi | 3 giờ | 1 giờ | 2 | 6 lần |
| Nho giàn | 5 giờ | 2 giờ | 3 | 8 lần |
| Cà phê bụi | 8 giờ | 4 giờ | 2 | 10 lần |

Các cây nhiều lần thu hoạch có lợi nhuận ổn định nhưng chiếm ô lâu hơn; người chơi phải lựa chọn giữa dòng tiền nhanh và lợi nhuận dài hạn.

### 6.4. Cây ăn quả

| Cây | Giá cây giống | Thời gian ra quả | Sản lượng | Giá mỗi quả | EXP mỗi lần thu |
|---|---:|---:|---:|---:|---:|
| Cam | 250 | 4 giờ | 3 | 55 | 48 |
| Táo | 360 | 6 giờ | 3 | 80 | 75 |
| Xoài | 500 | 8 giờ | 4 | 95 | 110 |
| Thanh long | 700 | 12 giờ | 4 | 150 | 180 |

Cây ăn quả không cần trồng lại. Mỗi lần thu hoạch xong sẽ bắt đầu chu kỳ mới.

---

## 7. Chăn nuôi

### 7.1. Quy trình vật nuôi

1. Mua vật nuôi và đặt vào chuồng.
2. Cho ăn bằng thức ăn tương ứng.
3. Chờ vật nuôi tạo sản phẩm.
4. Thu sản phẩm để nhận EXP.
5. Bán trực tiếp hoặc chế biến.

Vật nuôi không chết vì bị bỏ đói. Nếu quá thời gian cho ăn, sản phẩm chỉ không được tạo thêm.

| Vật nuôi | Mở khóa | Giá mua | Thời gian tạo SP | Thức ăn/lần | Sản phẩm | Giá bán | EXP thu |
|---|---:|---:|---:|---:|---|---:|---:|
| Gà | 3 | 250 | 15 phút | 1 thức ăn | Trứng | 28 | 8 |
| Bò | 8 | 850 | 45 phút | 2 thức ăn | Sữa | 82 | 16 |
| Cừu | 14 | 1.400 | 1 giờ | 3 thức ăn | Len | 145 | 22 |
| Ong | 20 | 2.200 | 2 giờ | 2 hoa | Mật ong | 260 | 35 |
| Cá ao | 16 | 600 | 30 phút | 1 mồi | Cá rô | 95 | 18 |

### 7.2. Sức chứa chuồng ban đầu

| Chuồng | Sức chứa ban đầu | Tối đa ở cấp 5 |
|---|---:|---:|
| Chuồng gà | 3 | 10 |
| Chuồng bò | 2 | 8 |
| Chuồng cừu | 2 | 8 |
| Nhà ong | 2 | 8 |
| Ao cá | 4 lượt câu | 12 lượt câu |

### 7.3. Mức thân thiết vật nuôi

Mỗi vật nuôi có 5 tim thân thiết. Cho ăn và vuốt ve giúp tăng tim; tim không làm thay đổi tốc độ quá mạnh.

| Mức tim | Hiệu ứng |
|---:|---|
| 1 | Sản phẩm bình thường |
| 2 | +2% xác suất sản phẩm Tươi tốt |
| 3 | +5% EXP khi thu sản phẩm |
| 4 | +5% cơ hội nhận thêm 1 sản phẩm |
| 5 | Mở hoạt ảnh đặc biệt và +5% giá bán sản phẩm của vật nuôi đó |

---

## 8. Máy chế biến và công thức

Chế biến là vòng lặp giúp người chơi có lý do quay lại nhiều lần trong ngày. Mỗi máy có hàng đợi riêng.

### 8.1. Công trình chế biến

| Công trình | Mở khóa | Công thức ban đầu | Thời gian cơ bản |
|---|---:|---:|---:|
| Cối xay bột | 10 | 2 lúa mì → 1 bột mì | 10 phút |
| Máy ép nước | 12 | 2 cà rốt → 1 nước ép cà rốt | 20 phút |
| Nồi mứt | 13 | 2 dâu tây → 1 mứt dâu | 35 phút |
| Nhà máy sữa | 15 | 2 sữa → 1 phô mai | 50 phút |
| Lò bánh | 17 | 1 bột + 1 trứng → 1 bánh mì trứng | 45 phút |
| Máy rang cà phê | 23 | 2 cà phê → 1 cà phê rang | 2 giờ |
| Xưởng dệt | 25 | 2 len → 1 cuộn len | 2 giờ 30 phút |

### 8.2. Công thức và phần thưởng

| Sản phẩm | Nguyên liệu | Thời gian | Giá bán | EXP chế biến |
|---|---|---:|---:|---:|
| Bột mì | 2 lúa mì | 10 phút | 32 | 10 |
| Thức ăn gà | 2 ngô | 8 phút | Không bán | 8 |
| Nước ép cà rốt | 2 cà rốt | 20 phút | 34 | 18 |
| Nước ép dưa hấu | 2 dưa hấu | 1 giờ 10 phút | 620 | 105 |
| Mứt dâu | 2 dâu tây | 35 phút | 180 | 32 |
| Sốt cà chua | 2 cà chua | 30 phút | 140 | 28 |
| Phô mai | 2 sữa | 50 phút | 220 | 52 |
| Bánh mì trứng | 1 bột + 1 trứng | 45 phút | 100 | 45 |
| Bánh bí ngô | 1 bí ngô + 1 bột | 1 giờ 30 phút | 250 | 88 |
| Cà phê rang | 2 cà phê | 2 giờ | 1.020 | 180 |
| Cuộn len | 2 len | 2 giờ 30 phút | 360 | 150 |

### 8.3. Quy tắc chế biến

- Sản phẩm đang chế biến không bị mất khi mất kết nối.
- Mỗi máy bắt đầu với 1 ô hàng đợi.
- Nâng cấp máy mở thêm ô hàng đợi và giảm thời gian.
- Không cho phép đưa sản phẩm đã chế biến ngược vào công thức khác nếu chưa thiết kế công thức rõ ràng.
- Sản phẩm chế biến có thể bán trực tiếp hoặc dùng cho đơn hàng đặc biệt.

---

## 9. Các chế độ nâng cấp

Hệ thống nâng cấp gồm bốn lớp, tạo cảm giác tiến bộ đều mà không ép người chơi theo một cách chơi duy nhất.

### 9.1. Nâng cấp công trình bằng vàng

#### Nhà Chính

| Cấp | Chi phí vàng | Vật liệu | Hiệu ứng |
|---:|---:|---:|---|
| 1 | — | — | Mở trang trại, năng lượng tối đa 100 |
| 2 | 2.000 | 10 gỗ | Năng lượng tối đa 110, mở 4 ô đất |
| 3 | 6.000 | 20 gỗ, 10 đá | Năng lượng tối đa 120, mở 4 ô đất |
| 4 | 15.000 | 35 gỗ, 25 đá | Năng lượng tối đa 130, thêm 1 hàng đợi nhiệm vụ |
| 5 | 35.000 | 60 gỗ, 40 đá | Năng lượng tối đa 140, mở khu hồ nhỏ |
| 6 | 70.000 | 100 gỗ, 80 đá | Năng lượng tối đa 150, mở Nhà Kính |
| 7 | 130.000 | 150 gỗ, 120 đá | Năng lượng tối đa 160, mở khu đất phía nam |

#### Kho nông sản

| Cấp | Sức chứa | Chi phí nâng cấp |
|---:|---:|---:|
| 1 | 50 | — |
| 2 | 70 | 2.500 vàng + 10 gỗ |
| 3 | 95 | 6.000 vàng + 20 gỗ |
| 4 | 125 | 14.000 vàng + 35 gỗ |
| 5 | 160 | 28.000 vàng + 50 gỗ |
| 6 | 200 | 55.000 vàng + 80 gỗ |
| 7 | 250 | 100.000 vàng + 120 gỗ |

#### Kho hạt giống và thức ăn

| Cấp | Sức chứa | Chi phí nâng cấp |
|---:|---:|---:|
| 1 | 30 | — |
| 2 | 50 | 1.500 vàng + 5 gỗ |
| 3 | 75 | 4.000 vàng + 12 gỗ |
| 4 | 105 | 9.000 vàng + 25 gỗ |
| 5 | 140 | 20.000 vàng + 40 gỗ |
| 6 | 180 | 45.000 vàng + 70 gỗ |

### 9.2. Mở rộng đất

Mỗi lần mở rộng thêm 4 ô trồng hoặc mở một khu chức năng. Khu đất chỉ mở khi đạt cả cấp nông dân và chi phí yêu cầu.

| Lần mở rộng | Cấp yêu cầu | Chi phí vàng | Vật liệu | Nội dung |
|---:|---:|---:|---:|---|
| 1 | 2 | 500 | 5 gỗ | 4 ô trồng |
| 2 | 4 | 1.200 | 8 gỗ | 4 ô trồng |
| 3 | 6 | 2.500 | 12 gỗ, 4 đá | 4 ô trồng |
| 4 | 8 | 5.000 | 18 gỗ, 8 đá | Chuồng gà mở rộng |
| 5 | 10 | 9.000 | 25 gỗ, 15 đá | 4 ô trồng |
| 6 | 12 | 15.000 | 35 gỗ, 25 đá | Vườn cây |
| 7 | 15 | 25.000 | 50 gỗ, 35 đá | 4 ô trồng |
| 8 | 18 | 40.000 | 70 gỗ, 55 đá | Nhà kính |
| 9 | 22 | 65.000 | 100 gỗ, 80 đá | Khu hồ mở rộng |
| 10 | 26 | 100.000 | 150 gỗ, 120 đá | 8 ô trồng cao cấp |

### 9.3. Nâng cấp máy chế biến

Áp dụng cho Cối Xay, Máy Ép, Nồi Mứt, Nhà Máy Sữa, Lò Bánh và các máy về sau.

| Cấp máy | Hàng đợi | Giảm thời gian | Chi phí tham khảo |
|---:|---:|---:|---:|
| 1 | 1 | 0% | Công trình ban đầu |
| 2 | 2 | 5% | 5.000 vàng + 15 gỗ |
| 3 | 3 | 10% | 15.000 vàng + 30 gỗ, 15 đá |
| 4 | 4 | 15% | 35.000 vàng + 50 gỗ, 35 đá |
| 5 | 5 | 20% | 80.000 vàng + 90 gỗ, 70 đá |

### 9.4. Nâng cấp chuồng

| Chuồng | Cấp 1 | Cấp 2 | Cấp 3 | Cấp 4 | Cấp 5 |
|---|---|---|---|---|---|
| Gà | 3 con | 4 con | 6 con | 8 con | 10 con |
| Bò | 2 con | 3 con | 4 con | 6 con | 8 con |
| Cừu | 2 con | 3 con | 4 con | 6 con | 8 con |
| Ong | 2 tổ | 3 tổ | 4 tổ | 6 tổ | 8 tổ |

Chi phí mỗi cấp chuồng gồm vàng + gỗ + đá, tăng theo quy tắc `1.000 / 3.000 / 8.000 / 20.000 vàng` cho cấp 2 đến 5.

### 9.5. Chuyên môn hóa nông dân

Mở ở cấp 10. Mỗi lần lên cấp sau cấp 10 nhận 1 Điểm Kỹ Năng. Có thể hoàn trả toàn bộ điểm với 20 kim cương, tối đa một lần mỗi 7 ngày.

#### Nhánh Trồng Trọt

| Nút | Chi phí điểm | Hiệu ứng |
|---|---:|---|
| Bàn tay xanh | 1 | Giảm 5% thời gian cây trồng |
| Đất màu mỡ | 2 | +5% cơ hội chất lượng Tươi tốt |
| Hạt giống tiết kiệm | 3 | 5% cơ hội nhận lại 1 hạt sau thu hoạch |
| Mùa bội thu | 4 | +1 sản phẩm cho cây nhiều lần thu hoạch, hồi chiêu 2 giờ |

#### Nhánh Chăn Nuôi

| Nút | Chi phí điểm | Hiệu ứng |
|---|---:|---|
| Người bạn nhỏ | 1 | Giảm 5% thời gian tạo sản phẩm vật nuôi |
| Máng ăn tốt | 2 | Thức ăn có 5% cơ hội không bị tiêu hao |
| Chăm sóc tận tâm | 3 | +10% tốc độ tăng tim thân thiết |
| Sản phẩm cao cấp | 4 | +8% giá bán sản phẩm vật nuôi |

#### Nhánh Chế Biến & Bán Hàng

| Nút | Chi phí điểm | Hiệu ứng |
|---|---:|---|
| Làm nhanh | 1 | Giảm 5% thời gian máy chế biến |
| Đóng gói đẹp | 2 | +5% giá bán sản phẩm chế biến |
| Người bán khéo | 3 | Đơn hàng thường có thêm 5% vàng |
| Khách quen | 4 | Mở thêm 1 ô đơn hàng và 1 lần đổi miễn phí/ngày |

Không có nhánh nào mạnh tuyệt đối. Người chơi có thể chọn theo thói quen: trồng nhiều, nuôi nhiều hoặc tập trung vào chế biến.

---

## 10. Cửa hàng, đơn hàng và nhiệm vụ

### 10.1. Cửa hàng

Cửa hàng có bốn tab:

1. **Hạt giống:** hạt cơ bản và hạt đã mở khóa.
2. **Vật nuôi:** gà, bò, cừu, ong và vật nuôi sự kiện.
3. **Vật liệu:** gỗ, đá, vải, mồi câu.
4. **Trang trí:** hàng rào, đèn, hoa, đường đi, hồ nước, bảng hiệu.

Giá hạt giống không dao động để người chơi dễ học hệ thống. Chỉ giá mua nguyên liệu phụ và phần thưởng đơn hàng có thể thay đổi nhẹ theo ngày.

### 10.2. Bảng đơn hàng

- Mở ở cấp 5.
- Có 4 ô đơn ở cấp 1.
- Mỗi đơn yêu cầu 1–4 loại sản phẩm.
- Đơn hoàn thành cho vàng, EXP và Sao Nông Trại.
- Mỗi 30 phút có thể bỏ một đơn không muốn làm; đơn mới xuất hiện sau 20 phút.
- Đơn đặc biệt có hình chiếc xe tải và thời hạn 2–8 giờ.

| Loại đơn | Số vật phẩm | Vàng | EXP | Sao |
|---|---:|---:|---:|---:|
| Nhỏ | 1 loại | 50–150 | 30–60 | 1 |
| Thường | 2 loại | 150–500 | 60–120 | 2 |
| Lớn | 3 loại | 500–1.500 | 120–250 | 4 |
| Đặc biệt | 4 loại | 1.500–5.000 | 250–500 | 8 |

### 10.3. Nhiệm vụ ngày

Mỗi ngày có 6 nhiệm vụ, người chơi chọn hoàn thành 3 nhiệm vụ để nhận rương ngày.

Ví dụ:

| Nhiệm vụ | Tiến độ | Phần thưởng |
|---|---:|---|
| Thu hoạch cây | 0/20 | 120 vàng + 50 EXP |
| Cho vật nuôi ăn | 0/10 | 150 vàng + 50 EXP |
| Giao đơn hàng | 0/3 | 300 vàng + 80 EXP + 3 Sao |
| Chế biến sản phẩm | 0/5 | 250 vàng + 70 EXP |
| Câu cá | 0/4 | 180 vàng + 60 EXP |
| Dọn đất | 0/3 | 200 vàng + 50 EXP |

Rương ngày sau khi hoàn thành 3 nhiệm vụ:

- 500 vàng;
- 100 EXP;
- 5–10 năng lượng;
- 1 vật liệu ngẫu nhiên;
- 10% cơ hội nhận 1 kim cương.

### 10.4. Nhiệm vụ cốt truyện

Chuỗi nhiệm vụ dẫn dắt người chơi qua các công trình. Mỗi chương có 5–8 nhiệm vụ nhỏ và một phần thưởng lớn.

| Chương | Nội dung | Phần thưởng hoàn chương |
|---:|---|---|
| 1 | Làm quen với mảnh đất | 1.000 vàng, 100 EXP |
| 2 | Xây chuồng gà | 2.000 vàng, 1 gà, 150 EXP |
| 3 | Mở chợ nông sản | 3.500 vàng, 10 kim cương |
| 4 | Chăm đàn bò | 6.000 vàng, 1 bò, 250 EXP |
| 5 | Làm món chế biến đầu tiên | 10.000 vàng, công thức mứt |
| 6 | Mở khu vườn | 18.000 vàng, cây cam, 400 EXP |
| 7 | Xây nhà kính | 35.000 vàng, 20 kim cương |

---

## 11. Mở khóa nội dung theo cấp

| Cấp | Nội dung mở khóa |
|---:|---|
| 1 | 12 ô đất, lúa mì, cà rốt, Nhà Chính cấp 1 |
| 2 | Mở rộng đất lần 1, kho nông sản |
| 3 | Chuồng gà, trứng, thức ăn gà |
| 4 | Ngô, cửa hàng hạt giống nâng cao |
| 5 | Bảng đơn hàng, khu giao hàng |
| 6 | Khoai tây, nâng cấp kho cấp 2 |
| 7 | Bắp cải, hồ câu cá cơ bản |
| 8 | Chuồng bò, sữa |
| 10 | Cối xay bột, cây kỹ năng |
| 12 | Vườn cây, mía, máy ép nước |
| 13 | Dâu tây, nồi mứt |
| 14 | Chuồng cừu, len |
| 15 | Nhà máy sữa, phô mai |
| 17 | Lò bánh |
| 18 | Bí ngô, trang trí nâng cao |
| 19 | Nhà kính |
| 20 | Nhà ong, mật ong |
| 21 | Dưa hấu, nước ép cao cấp |
| 23 | Cà phê, máy rang |
| 25 | Xưởng dệt, khu trang trại mở rộng |
| 28 | Ca cao, cây hiếm |
| 30 | Hệ thống mùa vụ và bộ sưu tập hoàn chỉnh |

---

## 12. Mùa vụ, thời tiết và sự kiện

### 12.1. Mùa vụ

Mùa vụ chỉ thay đổi hình ảnh, nhiệm vụ và một số phần thưởng; không làm cây trồng thường bị mất mùa.

| Mùa | Thời lượng | Điểm nhấn |
|---|---:|---|
| Xuân | 14 ngày | Hoa, dâu, nhiệm vụ trồng cây |
| Hạ | 14 ngày | Dưa hấu, câu cá, lễ hội bên hồ |
| Thu | 14 ngày | Bí ngô, táo, thu hoạch lớn |
| Đông | 14 ngày | Nhà kính, trang trí tuyết, đồ uống nóng |

### 12.2. Sự kiện cá nhân

Sự kiện không bắt buộc cạnh tranh với người khác. Người chơi đạt các mốc cá nhân để nhận quà.

Ví dụ sự kiện 7 ngày **“Lễ Hội Thu Hoạch”**:

| Mốc | Điều kiện | Phần thưởng |
|---:|---:|---|
| 1 | Thu 50 cây | 1.000 vàng |
| 2 | Thu 150 cây | 5 kim cương |
| 3 | Giao 15 đơn | 1 rương vật liệu |
| 4 | Chế biến 20 sản phẩm | 10 kim cương |
| 5 | Đạt 1.000 vé sự kiện | Trang trí xe nông sản |

---

## 13. Chất lượng sản phẩm và phần thưởng phụ

### 13.1. Chất lượng

Chất lượng không tạo thất bại; đây là lớp thưởng cho người chơi chăm sóc kỹ.

| Chất lượng | Điều kiện | Hiệu ứng |
|---|---|---|
| Bình thường | Thu hoạch sau khi cây chín | Giá 1,00x |
| Tươi tốt | Tưới ít nhất một lần và thu trong 72 giờ | Giá 1,05x |
| Hoàn hảo | Có kỹ năng, hạt cao cấp hoặc buff sự kiện | Giá 1,10x, có thể dùng cho đơn đặc biệt |

### 13.2. Sao Nông Trại

Sao thể hiện mức độ phát triển trang trại và mở khóa quà theo mốc.

| Mốc sao | Phần thưởng |
|---:|---|
| 50 | 500 vàng |
| 100 | 5 kim cương |
| 250 | 1 rương vật liệu |
| 500 | Trang trí hàng rào |
| 1.000 | 10 kim cương + danh hiệu |
| 2.500 | Trang trí cổng lớn |

---

## 14. Giao diện gameplay đề xuất

Dựa trên giao diện tham chiếu:

### 14.1. Thanh trên cùng

- góc trái: avatar, tên nông dân, cấp độ, thanh EXP;
- trung tâm trái: vàng và nút `+`;
- trung tâm: kim cương và nút `+`;
- trung tâm phải: năng lượng và nút `+`;
- góc phải: thư, quà, thành tựu, cài đặt.

### 14.2. Thanh chức năng bên trái

- `Nhiệm Vụ` – có chấm đỏ khi có nhiệm vụ mới;
- `Cửa Hàng` – hạt giống, vật nuôi, vật liệu, trang trí;
- `Kho Đồ` – sản phẩm, hạt giống, vật liệu.

### 14.3. Thanh chức năng bên phải

- `Thu Hoạch` – thu nhanh tất cả sản phẩm sẵn sàng;
- sự kiện đang diễn ra;
- quà đăng nhập hoặc phần thưởng mốc.

### 14.4. Thanh nhanh dưới cùng

Hiển thị 6 vật phẩm gần đây hoặc sản phẩm đang có số lượng cao. Có thể vuốt ngang để đổi nhóm:

1. hạt giống;
2. nông sản;
3. sản phẩm vật nuôi;
4. sản phẩm chế biến;
5. vật liệu;
6. vật phẩm sự kiện.

### 14.5. Phản hồi khi thao tác

- gieo hạt: số `+EXP` nhỏ bay lên;
- thu hoạch: sản phẩm bật nhẹ khỏi mặt đất rồi bay vào kho;
- hoàn thành đơn: xe tải rung nhẹ, tiền vàng bay vào thanh trên cùng;
- nâng cấp: công trình đổi hình ảnh ngay, có hiệu ứng bụi gỗ và pháo giấy;
- thu hoạch hàng loạt: cho phép giữ nút hoặc chạm hai lần, tránh mở quá nhiều cửa sổ.

---

## 15. Ví dụ một ngày chơi ở cấp 25

Giả sử người chơi có khoảng 20 ô trồng, 4 gà, 3 bò, 2 cừu, Cối Xay cấp 3 và Nhà Máy Sữa cấp 2.

### Buổi sáng – 5 phút

- thu 8 ô dâu tây: khoảng 560 vàng, 264 EXP;
- lấy 4 trứng và 3 sữa: 358 vàng, 80 EXP;
- gieo lại 8 ô cà rốt để dùng cho đơn nhanh;
- cho vật nuôi ăn.

### Buổi trưa – 10 phút

- thu cà rốt;
- đưa 2 sữa vào làm phô mai;
- xay 6 lúa mì thành 3 bột;
- giao 2 đơn thường: khoảng 700–1.200 vàng, 120–200 EXP.

### Buổi tối – 10 phút

- gieo ngô, dâu hoặc cây dài hạn tùy lịch quay lại;
- xếp hàng máy chế biến qua đêm;
- làm một nhiệm vụ ngày;
- dùng vàng cho nâng cấp kho hoặc tích lũy cho lần mở đất.

### Mục tiêu đầu ra

- vàng: khoảng 2.000–5.000/ngày từ chơi chủ động;
- EXP: khoảng 400–900/ngày;
- 1–3 nâng cấp nhỏ mỗi vài ngày;
- không cần đăng nhập liên tục để giữ sản lượng.

---

## 16. Công thức cân bằng dùng cho prototype

### 16.1. Thời gian cây

```text
Thời gian thực tế = Thời gian cơ bản × (1 - tổng bonus tốc độ)
```

Giới hạn:

```text
Tổng bonus tốc độ tối đa từ kỹ năng + công trình = 35%
Thời gian tối thiểu = 30 giây
```

### 16.2. Giá đơn hàng

```text
Giá đơn cơ sở = tổng giá bán trực tiếp của nguyên liệu
Giá đơn cuối = Giá đơn cơ sở × (1,10 đến 1,25)
```

### 16.3. EXP đơn hàng

```text
EXP đơn = 30 + 10 × số loại vật phẩm + 0,05 × vàng thưởng
```

Giới hạn EXP đơn:

```text
Tối thiểu 30, tối đa 500 EXP trước buff sự kiện
```

### 16.4. Giá nâng cấp

Đối với cấp nâng cấp `n`:

```text
Chi phí vàng cấp n = Chi phí cơ sở × 2^(n-1)
```

Sau khi playtest, có thể giảm chi phí ở hai cấp đầu để người chơi mới cảm thấy tiến bộ nhanh hơn.

### 16.5. Tỷ lệ vàng giữa các hoạt động

Mục tiêu cân bằng:

| Hoạt động | Tỷ lệ đóng góp vàng/ngày |
|---|---:|
| Trồng và bán trực tiếp | 30–40% |
| Đơn hàng | 25–35% |
| Chế biến | 20–30% |
| Vật nuôi và câu cá | 10–20% |
| Nhiệm vụ/sự kiện | 5–15% |

Không để một hoạt động duy nhất chiếm hơn 60% thu nhập, nhằm khuyến khích người chơi thử nhiều tính năng.

---

## 17. Ưu tiên triển khai MVP

### Giai đoạn 1 – vòng lặp tối thiểu

- 12 ô đất;
- lúa mì, cà rốt, ngô;
- thu hoạch và bán;
- vàng, EXP, cấp độ;
- Kho và Cửa Hàng;
- giao diện theo ảnh tham chiếu.

### Giai đoạn 2 – tạo chiều sâu

- Chuồng gà và trứng;
- đơn hàng;
- nhiệm vụ ngày;
- mở rộng đất;
- Cối Xay và một số công thức chế biến.

### Giai đoạn 3 – nội dung trung hạn

- bò, cừu;
- hồ câu cá;
- vườn cây;
- Nhà Kính;
- cây kỹ năng;
- sự kiện cá nhân.

### Giai đoạn 4 – nội dung dài hạn

- mùa vụ;
- nhà máy cao cấp;
- bộ sưu tập;
- trang trí theo chủ đề;
- khu đất mới;
- bảng thành tựu và danh hiệu.

---

## 18. Tiêu chí playtest cần đo

| Chỉ số | Mục tiêu ban đầu |
|---|---:|
| Thời gian từ mở game đến hành động có ích đầu tiên | dưới 30 giây |
| Thời gian đạt cấp 3 | 10–15 phút |
| Thời gian mở Chuồng Gà | 20–40 phút |
| Thời gian mở đơn hàng | trong ngày đầu |
| Thời gian người chơi mới có lần nâng cấp đầu tiên | dưới 10 phút |
| Số lần quay lại mục tiêu/ngày | 3–6 lần |
| Tỷ lệ người chơi hiểu cách bán hàng sau tutorial | trên 90% |
| Tỷ lệ người chơi hiểu EXP và vàng | trên 80% |
| Thời gian chờ trung bình trước khi có việc khác để làm | dưới 5 phút |

### Dấu hiệu cần điều chỉnh

- người chơi luôn thiếu năng lượng trước khi hiểu vì sao;
- kho đầy quá thường xuyên trước cấp 5;
- cây dài hạn có lợi nhuận kém hơn cây ngắn hạn một cách rõ rệt;
- người chơi chỉ bán nguyên liệu và bỏ qua chế biến;
- nâng cấp đầu tiên mất quá 30 phút;
- nhiệm vụ yêu cầu vật phẩm chưa mở khóa;
- quá nhiều cửa sổ bật lên sau một lần thu hoạch hàng loạt.

---

## 19. Tóm tắt cấu hình nền đề xuất

```yaml
game:
  name: "Nông Trại Vui Vẻ"
  genre: "casual farming simulation"
  starting_level: 1
  starting_plots: 12
  starting_gold: 500
  starting_gems: 50
  starting_energy: 100
  energy_regen_seconds: 180
  offline_production_cap_hours: 8
  crop_ready_grace_hours: 72
  max_speed_bonus: 0.35
  max_level_mvp: 30

reference_ui:
  sample_level: 25
  sample_exp: "1280/2500"
  sample_gold: 125360
  sample_gems: 1250
  sample_energy: 85

economy:
  direct_sale_order_bonus: 0.00
  normal_order_bonus: 0.10
  urgent_order_bonus: 0.18
  special_order_bonus: 0.25
  perfect_quality_bonus: 0.10
```

---

## 20. Kết luận thiết kế

`Nông Trại Vui Vẻ` nên tạo cảm giác “mỗi lần mở game đều có một việc vui để làm”, chứ không biến việc chăm sóc thành nghĩa vụ. Hệ thống cây trồng cung cấp dòng tiền, vật nuôi tạo nhịp quay lại, máy chế biến tạo mục tiêu trung hạn, còn đơn hàng và nâng cấp giúp người chơi luôn biết bước tiếp theo của mình là gì.

Các con số trong tài liệu là **baseline để prototype và playtest**. Khi có dữ liệu thật từ người chơi, ưu tiên điều chỉnh theo thứ tự:

1. thời gian mở khóa vòng lặp mới;
2. tốc độ đầy kho và tiêu hao năng lượng;
3. lợi nhuận giữa cây ngắn hạn và dài hạn;
4. chi phí nâng cấp;
5. phần thưởng nhiệm vụ và sự kiện.
