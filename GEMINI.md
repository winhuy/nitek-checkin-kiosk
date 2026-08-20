# UI/UX & Frontend Craft Guidelines (Impeccable Standard)

Mọi thay đổi hoặc tạo mới giao diện web trong dự án này phải tuân thủ nghiêm ngặt các nguyên tắc thiết kế đỉnh cao từ **Impeccable** (Paul Bakaus):

---

## 1. Loại bỏ hoàn toàn "AI Slop" (Anti-Patterns)
- ❌ **Không lồng Card trong Card** (`cards nested in cards`). Card chỉ là container cấp 1, không lạm dụng để bọc mọi thứ.
- ❌ **Không dùng font mặc định nhàm chán** (Inter/Roboto cho mọi thứ mà không có font display định hình cá tính thương hiệu).
- ❌ **Không dùng màu xám/đen thuần chết** (`#000`, `#888`, `#333`). Luôn pha sắc thái (tinting) theo gam màu chủ đạo của nền/thương hiệu (ví dụ warm black `oklch(14% 0.018 95)` hoặc slate ink).
- ❌ **Không dùng chữ xám trên nền có màu** (Secondary text trên nền có màu phải được tint cùng dải hue hoặc màu chữ chính mờ, không lấy màu gray).
- ❌ **Không dùng hiệu ứng bounce/elastic giật cục** (`cubic-bezier(0.34, 1.56, ...)`). Dùng exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) mượt mà, tự nhiên.
- ❌ **Không animate layout properties** (`width`, `height`, `padding`, `margin`). Chỉ animate `transform`, `opacity`, hoặc dùng `grid-template-rows` cho mở rộng accordion để tránh giật lag layout.
- ❌ **Không tạo "Ghost Card"** (vừa border 1px vừa shadow mờ to đùng). Chỉ chọn 1 ngôn ngữ độ nổi (Elevation): **Border sắc nét** HOẶC **Soft Box-Shadow có offset & blur**, không phối hợp vụng về.
- ❌ **Không dùng Icon Unicode/Emoji làm icon hệ thống**. Dùng SVG icon đồng nhất về độ dày nét (stroke weight).

---

## 2. Tiêu chuẩn Craft Floor (Bộ tiêu chuẩn tay nghề tối thiểu)
- **Contrast & Hierarchy**: Body text ≥ 4.5:1, large text ≥ 3:1 theo chuẩn WCAG. Tiêu đề phân cấp rõ ràng (size, weight, line-height).
- **Typography**: 
  - Body measure lý tưởng từ 65–75 ký tự/dòng (`65-75ch`).
  - Display heading có letter-spacing âm nhẹ (`tracking: -0.02em` đến `-0.03em`).
  - Khoảng cách phía trên heading luôn lớn hơn khoảng cách phía dưới heading (`margin-top > margin-bottom`).
- **Browser Surfaces Styling**: Chăm chút toàn diện các bề mặt trình duyệt mặc định:
  - `::selection` (màu nền và màu chữ được chọn theo theme).
  - Custom scrollbar (`::-webkit-scrollbar` mỏng, tinh tế).
  - Focus ring (`:focus-visible` sắc nét, có offset).
  - Dấu nháy nhập liệu (`caret-color`).
- **Motion with Purpose**: Mỗi trang chỉ nên có **1 authored moment** (1 điểm nhấn chuyển động chính), không rải rác hiệu ứng lung tung khiến người dùng mỏi mắt.

---

## 3. Chế độ thiết kế theo bề mặt (Surface Modes)
- **Operate Mode** (Dành cho App UI, Dashboard, Quản lý Sự kiện, Modal): Ưu tiên tính dễ quét thông tin (scanability), bố cục mạch lạc, phím tắt, trạng thái phản hồi tức thì (loading, empty state, hover, active, error).
- **Persuade Mode** (Dành cho Landing page, Public Welcome screen, Check-in live banner): Bắt mắt, ấn tượng thị giác cao, chuyển động hoành tráng, typography giàu năng lượng.
