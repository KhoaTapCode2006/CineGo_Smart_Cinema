# CineGo Smart Cinema — Frontend

The web client for CineGo Smart Cinema. It connects to the FastAPI backend API (`/api/v1`) and provides a modern, responsive, and cinematic movie booking experience.

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Vite + React 18** | High-performance build tool and UI library |
| **TypeScript** | Strict end-to-end type safety |
| **Tailwind CSS** | Custom cinematic dark theme tokens and utility styling |
| **React Router v6** | Client-side routing with protected routes and state management |
| **TanStack Query (v5)** | Server state management, smart caching, and re-fetching |
| **Zustand** | Lightweight client state for auth and seat booking store |
| **Axios** | HTTP client with automatic Bearer token injection and error handling |
| **qrcode.react** | SVG QR Code generation for cinema ticket check-in |
| **Lucide React** | Consistent iconography |
| **Vitest & Testing Library** | Unit and component testing suite |

---

## ⚙️ Biến Môi Trường (Environment Variables)

Tạo file `.env` tại thư mục gốc `frontend/`:

```env
# Base URL cho FastAPI backend (mặc định prefix /api/v1)
VITE_API_URL=http://localhost:8000/api/v1

# Bật/tắt chế độ dữ liệu giả lập (mock data)
# false = kết nối API backend thật (khuyên dùng)
# true  = dùng mock data nội bộ khi backend chưa chạy
VITE_USE_MOCK=false
```

| Biến | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Đường dẫn API backend FastAPI |
| `VITE_USE_MOCK` | `false` | `false`: gọi API backend thật; `true`: dùng dữ liệu mock nội bộ |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt dependencies
```bash
cd frontend
npm install
```

### 2. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

### 3. Kiểm tra kiểu dữ liệu & Build production
```bash
npm run build
```
Lệnh thực thi `tsc -b && vite build` để kiểm tra toàn bộ lỗi TypeScript và tạo gói production tối ưu trong thư mục `dist/`.

### 4. Chạy kiểm thử tự động (Unit Tests)
```bash
npm test
```
Chạy toàn bộ test suites với Vitest (bao gồm kiểm thử đặt vé, thanh toán, chọn ghế, hiển thị vé QR).

---

## 👤 Danh Sách Tài Khoản Demo

Hệ thống được khởi tạo sẵn các tài khoản demo (mật khẩu chung: **`Password123`**):

| Email | Mật khẩu | Họ và tên | Vai trò | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `customer1@cinego.vn` | `Password123` | Nguyễn Văn An | Customer | Khách hàng mới, đặt vé từ đầu |
| `customer2@cinego.vn` | `Password123` | Trần Thị Bình | Customer | Khách hàng thông thường |
| `customer3@cinego.vn` | `Password123` | Lê Hoàng Nam | Customer | **Đã có sẵn vé QR thanh toán** (tiện test ngay mục Vé của tôi) |
| `staff@cinego.vn` | `Password123` | Trần Thị Nhân Viên | Staff | Nhân viên rạp soát vé / check-in QR |
| `admin@cinego.vn` | `Password123` | Admin CineGo | Admin | Quản trị viên hệ thống |

> [!TIP]
> Bạn có thể sử dụng thông tin email và mật khẩu trong bảng trên để đăng nhập tại trang `/login`.

---

## 🎬 Toàn Bộ Luồng Trải Nghiệm Người Dùng (User Journey)

1. **Trang chủ (`/`)**:
   - Hero banner động với các phim nổi bật, nút xem trailer và đặt vé nhanh.
   - Thanh tìm kiếm và bộ lọc thể loại theo thời gian thực.
   - Danh sách phim Đang chiếu (*Now Showing*) và Sắp chiếu (*Coming Soon*).
2. **Chi tiết phim (`/movies/:id`)**:
   - Thông tin chi tiết: đạo diễn, diễn viên, thời lượng, phân loại độ tuổi, ngôn ngữ.
   - Xem trailer modal định dạng 16:9.
   - Lịch chiếu theo ngày và cụm rạp.
3. **Chọn suất chiếu**:
   - Chọn rạp và khung giờ chiếu phù hợp.
   - Bấm **"Book Tickets"** chuyển tiếp đến bước chọn ghế.
4. **Đăng nhập (`/login`)**:
   - Nếu chưa đăng nhập, hệ thống tự động điều hướng sang trang Đăng nhập và giữ lại đích đến thông qua query parameter `?redirect=...`.
   - Sau khi đăng nhập thành công, tự động quay lại đúng màn hình đặt chỗ.
5. **Chọn ghế & Giữ ghế (`/showtimes/:showtimeId/seats`)**:
   - Sơ đồ ghế tương tác trực quan (Standard, VIP, Sweetbox) với trạng thái khả dụng, đang giữ, đã bán.
   - Kết nối WebSocket cập nhật trạng thái ghế theo thời gian thực (real-time seat map).
   - Tính năng **Smart Seat** tự động gợi ý vị trí ghế tối ưu theo số lượng và khu vực.
   - Bấm **"Tiếp tục"** để gửi yêu cầu giữ ghế nguyên tử (`POST /showtimes/:id/seat-holds`) trong 5 phút.
6. **Xác nhận đơn & Thanh toán (`/checkout`)**:
   - Đếm ngược thời gian giữ ghế (countdown timer).
   - Chọn thêm bắp nước, combo đồ uống.
   - Nhập mã voucher giảm giá (nếu có).
   - Xác nhận đơn hàng (`POST /orders`).
   - Chọn phương thức thanh toán giả lập (`mock_card`, `mock_wallet`, `mock_cash`) với cơ chế `idempotency_key` chống trùng lặp giao dịch.
7. **Nhận vé QR điện tử (`/tickets`)**:
   - Hiển thị danh sách vé đã đặt với đầy đủ 9 trường thông tin (`TicketOut`).
   - Thời gian hiển thị chuẩn múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - `DD/MM/YYYY HH:mm`).
   - Badge trạng thái tiếng Việt: **Đã phát hành**, **Đã check-in**, **Hết hạn**, **Đã hủy**.
   - Làm nổi bật vé vừa thanh toán thành công thông qua query param `?new=...`.
   - Bấm vào từng vé để mở Modal chi tiết kèm mã QR khổ lớn phục vụ việc soát vé.

---

## 📱 Khả Năng Tương Thích Di Động (Mobile 375px)

- Giao diện được tối ưu hoàn toàn cho màn hình nhỏ từ **375px**:
  - **Navbar**: Menu trượt mượt mà, thanh tìm kiếm dạng mở rộng (collapsible search sheet).
  - **Sơ đồ ghế**: Vùng cuộn ngang mượt mà (`overflow-x-auto no-scrollbar`), thanh đặt vé ghim cố định ở đáy màn hình.
  - **Trang thanh toán**: Danh mục bắp nước và phương thức thanh toán tự động co giãn 1 cột trên mobile.
  - **Trang vé & Modal QR**: Khung mã QR tự co giãn theo tỷ lệ màn hình điện thoại.
