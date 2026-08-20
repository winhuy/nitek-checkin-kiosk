# 🎫 EventPass — QR Event Check-in App

Ứng dụng check-in sự kiện bằng mã QR với đồng bộ **Realtime** không cần reload trang.

---

## 🏗️ Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | React 18 + Vite |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime Subscriptions |
| QR Scanner | html5-qrcode |
| QR Generator | qrcode.react |
| Styling | Vanilla CSS (Dark glassmorphism) |

---

## 🚀 Hướng dẫn cài đặt & chạy

### Bước 1 — Tạo Supabase Project

1. Truy cập [https://supabase.com](https://supabase.com) → **New Project**
2. Đặt tên project, chọn region (Singapore để độ trễ thấp tại VN)
3. Sau khi project tạo xong → vào **Settings → API**
4. Copy 2 giá trị:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### Bước 2 — Khởi tạo Database Schema

1. Trong Supabase Dashboard → **SQL Editor → New Query**
2. Copy toàn bộ nội dung file `sql/schema.sql`
3. Paste vào SQL Editor → **Run** (hoặc Ctrl+Enter)
4. Kiểm tra: Table Editor → phải thấy 2 bảng `attendees` và `checkin_logs` với 5 dòng mẫu

### Bước 3 — Cấu hình biến môi trường

```bash
cd /Users/huynhquochuy/.gemini/antigravity-ide/scratch/qr-checkin-app

# Copy file mẫu
cp .env.example .env
```

Mở file `.env` và điền credentials từ Bước 1:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Bước 4 — Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

---

## 📖 Hướng dẫn sử dụng

### Tab Admin Dashboard

| Tính năng | Mô tả |
|---|---|
| Stats Widget | Bộ đếm realtime: Tổng / Đã check-in / Chưa đến / Tỷ lệ % |
| Danh sách khách | Bảng cập nhật tự động khi có check-in mới |
| Thêm một khách | Form nhập họ tên, email, mã vé |
| Import CSV | Kéo thả file CSV → preview → import hàng loạt |
| Xem QR | Click "Xem QR" để xem mã QR đầy đủ |
| Tải QR | Click download trong modal để lưu PNG |

**Định dạng CSV import:**
```csv
full_name,email,ticket_code
Nguyen Van A,a@email.com,EVT-010
Tran Thi B,b@email.com,EVT-011
```

### Tab Scanner / Soát Vé

| Tính năng | Mô tả |
|---|---|
| Bật Camera | Click Bật Camera → cho phép quyền camera |
| Quét QR | Hướng camera vào mã QR của khách |
| Chuyển camera | Click nút để đổi camera trước/sau |
| Nhập tay | Gõ mã vé vào ô input → Enter |
| Kết quả xanh | Check-in thành công + phát beep |
| Kết quả vàng | Mã đã được dùng trước đó |
| Kết quả đỏ | Mã không tồn tại |

---

## 📂 Cấu trúc thư mục

```
qr-checkin-app/
├── sql/
│   └── schema.sql          # Chạy trên Supabase SQL Editor
├── src/
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── components/
│   │   ├── AdminDashboard.jsx
│   │   ├── AttendeeTable.jsx   # Bảng realtime
│   │   ├── QRCodeCard.jsx      # Hiển thị + download QR
│   │   ├── AddAttendeeForm.jsx # Thêm / Import CSV
│   │   ├── StatsWidget.jsx     # Bộ đếm thống kê
│   │   └── ScannerView.jsx     # Camera scanner
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .env                    # Tạo từ .env.example
├── index.html
└── vite.config.js
```

---

## 🔧 Troubleshooting

**Camera không hoạt động:**
- Trình duyệt yêu cầu HTTPS hoặc localhost để dùng camera
- Kiểm tra quyền camera trong settings trình duyệt
- Dùng Chrome hoặc Firefox

**Không kết nối được Supabase:**
- Kiểm tra lại URL và ANON_KEY trong `.env`
- Đảm bảo file `.env` nằm ở thư mục gốc project
- Restart dev server sau khi sửa `.env`

**Realtime không cập nhật:**
- Vào Supabase Dashboard → Database → Replication
- Đảm bảo bảng `attendees` đã được enable trong `supabase_realtime`
- Hoặc chạy lại: `ALTER PUBLICATION supabase_realtime ADD TABLE attendees;`

**Lỗi RLS permission denied:**
- Kiểm tra Authentication → Policies trong Supabase Dashboard
- Đảm bảo các policy đã được tạo từ schema.sql

---

## 🛠️ Commands

```bash
npm run dev      # Chạy development server
npm run build    # Build production bundle
npm run preview  # Preview production build
```
