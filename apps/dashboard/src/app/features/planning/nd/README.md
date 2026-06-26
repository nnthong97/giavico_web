# planning/nd/ – ND (Thạch Dừa / Nata de Coco)

Placeholder – sẽ phát triển sau khi có file phân tích ND排程.

Dự kiến chứa:
- `data/nd-mock.data.ts` – dữ liệu ND (đơn hàng, lịch cấy/thu/cắt/gia nhiệt)
- `models/nd.model.ts` – ND-specific types (NataStep, CultivationPlan)
- `utils/nd-backward-scheduler.ts` – backward scheduler: ngày SX → cấy/thu/cắt/gia nhiệt
- `data-access/nd.service.ts` – ND Angular service

Điểm đặc thù ND:
- Backward scheduling phức tạp: cấy vi sinh → nuôi 14-21 ngày → thu hoạch → gia nhiệt → cắt hạt → SX thành phẩm
- Tồn kho BTP (thạch thô, thạch đã cắt) theo dõi lũy kế
