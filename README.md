# Footage Color Analyzer

Ứng dụng desktop phân tích độ phơi sáng (*exposure*) và cân bằng màu sắc (*color cast*) cho các video footage dành cho video editor, colorist và content creator.

![UI Overview](https://raw.githubusercontent.com/placeholder/preview.png)

## Các tính năng chính

1. **Lõi phân tích siêu nhẹ (Analysis Engine)**:
   - Sử dụng `FFmpeg` với filter `signalstats`.
   - Lấy mẫu 1 frame/giây và downscale về 128x72, không decode full resolution hay full framerate, đạt tốc độ phân tích video hàng chục phút chỉ trong vài giây.
   - Trích xuất tự động: Độ sáng trung bình ($Y_{avg}$), kênh Đỏ ($R_{avg}$), kênh Xanh lá ($G_{avg}$), kênh Xanh dương ($B_{avg}$) và độ bão hòa màu ($SAT_{avg}$).

2. **Phát hiện lỗi & Gom phân đoạn (Continuous Segments)**:
   - **Cháy sáng (Overexposed)**: $Y > 200$.
   - **Thiếu sáng (Underexposed)**: $Y < 40$.
   - **Ám xanh lạnh (Cool Cast)**: Kênh Blue chiếm ưu thế vượt trội so với Red và Green.
   - **Ám vàng ấm (Warm Cast)**: Kênh Red & Green chiếm ưu thế so với Blue.
   - **Ám xanh lá / Ám đỏ hồng**.
   - Gom các frame liền kề cùng lỗi thành 1 dải thời gian liên tục (`start`, `end`, `duration`, `severity`).

3. **Color Timeline tương tác**:
   - Thanh timeline trực quan với màu sắc tương ứng từng loại lỗi.
   - Hover chuột xem chi tiết từng phân đoạn (mức độ lỗi %, các chỉ số Y, R, G, B trung bình).
   - Click vào bất kỳ segment nào để tua video (seek) ngay lập tức đến đoạn đó.

4. **Cache SQLite tốc độ cao (`better-sqlite3`)**:
   - Tự động sinh `QuickHash` (kết hợp `file_size + mtime + header chunk`).
   - Mở lại app hoặc chuyển thư mục không cần phân tích lại footage cũ.

5. **Trình phát video HTML5 tối ưu**:
   - Streaming local video qua giao thức tùy biến `media://` hỗ trợ Range requests (tua mượt mà, không lag).
   - HUD hiển thị thông số màu sắc thời gian thực ngay trên video.
   - Phím tắt tiện lợi: `Space` (Play/Pause), `←` / `→` (Tua 1 giây).

6. **Tùy chỉnh ngưỡng (Threshold Presets)**:
   - Sẵn các preset cho từng trường hợp: `Standard Rec.709`, `Night / Low Light`, `Flat / S-Log Profile`, `High Key Studio`.
   - Cho phép kéo thanh trượt tùy ý điều chỉnh độ nhạy theo ý muốn.

---

## Cấu trúc thư mục

```
footage-color-analyzer/
├── analysis-engine/
│   ├── ffmpegSampler.js       # Quản lý child_process FFmpeg, stream metadata
│   ├── parseSignalstats.js    # Parser log signalstats & chuyển đổi YUV -> RGB
│   ├── detectIssues.js        # Thuật toán gán nhãn lỗi và tính severity
│   ├── segmentBuilder.js      # Gộp các frame mẫu thành segments & tính tổng hợp
│   └── thresholdConfig.js     # Danh sách preset và ngưỡng mặc định
├── electron/
│   ├── main.js                # Main process, protocol media://, IPC handlers
│   ├── preload.js             # contextBridge an toàn
│   └── ipc/
│       ├── scanFolder.js      # Quét folder tìm video & tra cứu cache SQLite
│       ├── analyzeClip.js     # Điều phối phân tích và báo tiến trình
│       ├── thumbnail.js       # Tạo thumbnail và hover scrub preview bằng FFmpeg
│       └── cacheDB.js         # SQLite database client (better-sqlite3)
└── src/ (React)
    ├── components/
    │   ├── FolderTree.jsx     # Toolbar chọn thư mục & lọc lỗi
    │   ├── ClipList.jsx       # Danh sách clips kèm thanh tìm kiếm
    │   ├── ClipCard.jsx       # Card video với thumbnail và mini indicator
    │   ├── PlayerPanel.jsx    # Video player HTML5 + live HUD
    │   ├── ColorTimeline.jsx  # Thanh timeline tô màu trực quan
    │   └── ThresholdSettings.jsx # Modal tùy chỉnh ngưỡng
    ├── hooks/
    │   └── useClipAnalysis.js # Custom hook quản lý state toàn bộ ứng dụng
    ├── App.jsx
    └── main.jsx
```

---

## Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Kiểm thử CLI Engine
Chạy test script độc lập tạo video mẫu 6s (chứa cả cảnh thường, cháy sáng và ám xanh) và đo đạc tốc độ:
```bash
npm test
```

### 2. Khởi chạy ứng dụng Desktop
Chạy lệnh sau để build giao diện và mở cửa sổ ứng dụng:
```bash
npm start
```
Hoặc trong môi trường phát triển (HMR):
```bash
# Terminal 1: Chạy dev server Vite
npm run dev

# Terminal 2: Chạy Electron
npm run electron:dev
```
