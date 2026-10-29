# Dashboard Doanh Thu Tâm Đức Smile (Bản Độc Lập - Standalone)

Trang web thống kê và phân tích Báo Cáo Doanh Thu, Chi Phí (VAT), Lợi Nhuận, Tỷ Lệ CP/DT, Tỷ Lệ Chốt Dịch Vụ, Khách Việt Kiều độc lập, đồng bộ trực tiếp với Google Sheets theo thời gian thực (realtime).

---

## 🚀 Hướng Dẫn Đưa Lên GitHub & Triển Khai Lên Vercel

### Bước 1: Chuẩn bị trên máy tính của bạn
Sau khi giải nén thư mục `tamduc-doanh-thu-app`:
1. Mở Terminal (hoặc Command Prompt / PowerShell / Git Bash trên Windows) tại thư mục dự án vừa giải nén.
2. Kiểm tra các file: Bạn sẽ thấy `package.json`, `vite.config.ts`, `vercel.json`, `src/App.tsx`, v.v.

### Bước 2: Tạo Repository mới trên GitHub
1. Truy cập [github.com](https://github.com) và đăng nhập.
2. Nhấn nút **New** (Tạo repo mới) hoặc vào `https://github.com/new`.
3. Đặt tên Repository, ví dụ: `tamduc-doanh-thu` (chọn Public hoặc Private tuỳ bạn).
4. **Không** tích chọn "Add a README file" (vì đã có sẵn file trong thư mục này).
5. Nhấn **Create repository**.
6. Copy đường link repo GitHub vừa tạo (dạng: `https://github.com/<tai-khoan-cua-ban>/tamduc-doanh-thu.git`).

### Bước 3: Đẩy mã nguồn lên GitHub
Trong Terminal tại thư mục này, chạy lần lượt các lệnh sau:

```bash
# 1. Khởi tạo Git
git init

# 2. Thêm tất cả các file
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: init standalone revenue dashboard for Tam Duc Smile"

# 4. Đổi tên nhánh chính thành main
git branch -M main

# 5. Gắn link GitHub của bạn (thay bằng link repo thực tế của bạn)
git remote add origin https://github.com/<tai-khoan-cua-ban>/tamduc-doanh-thu.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

---

### Bước 4: Triển khai (Deploy) lên Vercel MIỄN PHÍ

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub của bạn.
2. Tại trang Dashboard của Vercel, nhấn **Add New...** -> chọn **Project**.
3. Bạn sẽ thấy danh sách Repo GitHub, tìm `tamduc-doanh-thu` và nhấn **Import**.
4. Cấu hình triển khai:
   - **Framework Preset**: Chọn `Vite` (Vercel thường tự nhận diện).
   - **Root Directory**: Để mặc định `./`.
   - **Build Command**: `npm run build` (hoặc để mặc định).
   - **Output Directory**: `dist` (đã được cấu hình trong `vercel.json`).
5. Nhấn nút **Deploy**.
6. Chờ khoảng 30-45 giây, Vercel sẽ cấp cho bạn một tên miền miễn phí dạng:
   👉 `https://tamduc-doanh-thu.vercel.app` (hoặc tên tương tự).
7. Bạn có thể gắn tên miền riêng (Custom Domain) của phòng khám vào nếu muốn trong phần **Settings -> Domains**.

---

## ⚡ Các Tính Năng Nổi Bật của Bản Độc Lập Này
- ✅ **Độc Lập Hoàn Toàn**: Không phụ thuộc vào backend server hay database riêng, chạy thuần Static SPA trên Vercel cực kỳ nhẹ và nhanh.
- ✅ **Google Sheets Live**: Tự động đồng bộ số liệu doanh thu trực tiếp từ Google Sheet phòng khám mỗi 30 giây hoặc qua nút "Đồng Bộ Ngay".
- ✅ **Lọc Đầy Đủ**: Lọc theo Quý (Quý 1, Quý 2, Quý 3, Quý 4), Lọc theo Tháng (Tháng 1 -> Tháng 11), và Xem Tổng Quan 6 Tháng.
- ✅ **8 Khối Biểu Đồ & Bảng Phân Tích Chuyên Sâu**:
  - Biểu đồ chi phí VAT theo khu vực (Cần Thơ, HCM, Tiền Giang, Tây Ninh, Vũng Tàu, Đà Lạt, Nha Trang, Bình Dương...)
  - Biểu đồ doanh thu thực tế theo khu vực
  - Doanh thu theo cơ cấu dịch vụ (Implant, Răng Sứ, Chỉnh Nha, Tổng Quát...)
  - Biểu đồ doanh thu theo từng ngày trong tháng
  - Biểu đồ kết hợp Doanh thu & Chi phí
  - Phân tích khách Việt Kiều
  - Bảng chi tiết từng cơ sở & phòng khám
- ✅ **Chuyển Đổi Đơn Vị**: VNĐ, Triệu VNĐ, Tỷ VNĐ linh hoạt.
