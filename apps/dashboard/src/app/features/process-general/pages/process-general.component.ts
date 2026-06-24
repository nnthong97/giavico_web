import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  AppLanguage,
  LanguageService,
} from '../../../core/i18n/language.service';

type WorkflowId = 'general' | 'qc-change' | 'product-release';
type StepStatus = 'pending' | 'active' | 'done' | 'blocked';
type StepTone = 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'teal';
type ActionKind =
  | 'receive-email'
  | 'extract-email'
  | 'generate-documents'
  | 'send'
  | 'approve'
  | 'reject'
  | 'revise'
  | 'broadcast'
  | 'inspect'
  | 'release'
  | 'reset';

interface CopyText {
  en: string;
  vi: string;
  zh: string;
}

interface ProcessAction {
  id: string;
  kind: ActionKind;
  label: CopyText;
}

interface ProcessDocument {
  id: string;
  name: CopyText;
  kind: 'PDF' | 'Word' | 'Excel' | 'Email' | 'AI' | 'Record';
  sourcePath?: string;
  simulated?: boolean;
}

interface ProcessStep {
  id: string;
  phase: CopyText;
  title: CopyText;
  role: CopyText;
  description: CopyText;
  icon: string;
  tone: StepTone;
  documents: string[];
  actions: ProcessAction[];
}

interface ProcessWorkflow {
  id: WorkflowId;
  title: CopyText;
  subtitle: CopyText;
  summary: CopyText;
  steps: ProcessStep[];
}

interface TimelineEvent {
  id: number;
  title: string;
  detail: string;
}

interface EmailExtraction {
  product: string;
  brix: string;
  ph: string;
  quantity: string;
  market: string;
  specification: string;
}

interface FormulaSimulation {
  name: string;
  targetBrix: string;
  acidity: string;
  notes: string;
}

const c = (en: string, vi: string, zh: string): CopyText => ({ en, vi, zh });

const DOCUMENT_LIBRARY: ProcessDocument[] = [
  {
    id: 'email-request',
    name: c(
      'Customer request email',
      'Email yêu cầu khách hàng',
      '客戶需求郵件',
    ),
    kind: 'Email',
    simulated: true,
  },
  {
    id: 'ai-extraction',
    name: c(
      'AI email extraction result',
      'Kết quả AI phân tích email',
      'AI 郵件分析結果',
    ),
    kind: 'AI',
    simulated: true,
  },
  {
    id: 'sample-production-contact',
    name: c(
      'Sample production contact form',
      'Phiếu liên hệ sản xuất mẫu',
      '樣品生產聯絡單',
    ),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'new-product-dev-1',
    name: c(
      'New product development contact (1)',
      'Phiếu phát triển sản phẩm mới (1)',
      '新產品開發聯絡單 (1)',
    ),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'new-product-dev-2',
    name: c(
      'New product development contact (2)',
      'Phiếu phát triển sản phẩm mới (2)',
      '新產品開發聯絡單 (2)',
    ),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'overseas-sample-contact',
    name: c(
      'Overseas sample contact form',
      'Phiếu liên hệ mẫu nước ngoài',
      '海外樣品聯絡單',
    ),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'sample-send-register',
    name: c(
      'Sample delivery register',
      'Bảng ghi nhận gửi mẫu',
      '樣品寄送紀錄表',
    ),
    kind: 'Excel',
    simulated: true,
  },
  {
    id: 'overseas-sample-register',
    name: c(
      'Overseas sample delivery register',
      'Bảng ghi nhận gửi mẫu nước ngoài',
      '海外樣品寄送紀錄表',
    ),
    kind: 'Excel',
    simulated: true,
  },
  {
    id: 'coa-attn',
    name: c(
      'COA customer attention document',
      'Tài liệu COA gửi khách hàng',
      'COA 客戶通知文件',
    ),
    kind: 'Word',
    sourcePath: '/Users/nguyennhutthong/Downloads/COA_Attn.doc',
  },
  {
    id: 'sample-report',
    name: c(
      'Sample Report - GIAVICO INTERNATIONAL FOOD COMPANY Ltd',
      'Báo cáo mẫu - GIAVICO INTERNATIONAL FOOD COMPANY Ltd',
      '樣品報告 - GIAVICO INTERNATIONAL FOOD COMPANY Ltd',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/1. 表P-RS1 003-01 03 SAMPLE REPORT - GIAVICO INTERNATIONAL FOOD COMPANY Ltd.pdf',
  },
  {
    id: 'engineering-change-notice',
    name: c(
      'Engineering change notice',
      'Bảng thay đổi quy trình và phương thức',
      '工程變更通知單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/2. 表P-RS1 002-05.04工程變更通知單bang thay doi qui trinh va phuong thuc.pdf',
  },
  {
    id: 'change-proposal',
    name: c(
      'Process, formula and specification change proposal',
      'Bảng đề xuất thay đổi quy trình, phương thức và quy cách',
      '製程、配方、規格提議更改單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/3. 表P-RS1 002-01.07 製程、配方、規格提議更改單bang de xuat thay doi qui trinh phuong thuc va qui cach.pdf',
  },
  {
    id: 'engineering-change-request',
    name: c(
      'Engineering change request',
      'Phiếu yêu cầu thay đổi kỹ thuật',
      '工程變更申請單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/4. 表P-RS1 002-06.01工程變更申請單-新增表單bang de xuat thay doi cong trinh.pdf',
  },
  {
    id: 'ecr-extra',
    name: c('Supplemental ECR file', 'ECR bổ sung', 'ECR 補充文件'),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'recall-half-finished',
    name: c(
      'Semi-finished acceptance standard recall sign-off',
      'Thu hồi bảng quy cách nghiệm thu bán thành phẩm',
      '半成品允收規格表回收簽收單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/5. 表P-RS1 003-10.01 半成品允收規格表回收簽收單bang ky nhan va thu hoi bang quy cach nghiem thu BTP.pdf',
  },
  {
    id: 'recall-product-spec',
    name: c(
      'New product specification recall sign-off',
      'Thu hồi bảng diễn giải quy cách sản phẩm mới',
      '新產品規格說明單回收簽收單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/6. 表P-RS1 002-04 01〝新產品規格說明單〞回收簽收單.pdf',
  },
  {
    id: 'recall-change-notice',
    name: c(
      'Process/formula/spec change notice recall sign-off',
      'Thu hồi thông báo sửa đổi quy trình, phương thức và quy cách',
      '產品支撐配方規格更改通知單回收簽單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/7. 表P-RS1 002-03.02 產品支撐配方規格更改通知單回收簽單.pdf',
  },
  {
    id: 'recall-manufacturing-notice',
    name: c(
      'New product manufacturing notice recall sign-off',
      'Thu hồi thông báo chế biến sản phẩm',
      '新產品製作通知單回收簽收單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/8. 表P-RS1 002-02 02 新產品製作通知單〞回收簽收單~bang ky nhan va thu hoi bag tb che bien sp.pdf',
  },
  {
    id: 'process-change-notice',
    name: c(
      'Product process, formula and specification change notice',
      'Thông báo sửa đổi quy trình, phương thức và quy cách',
      '產品製程、配方、規格更改通知單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/9. 表P-RS1 002-07.03 產品製程、配方、規格更改通知單.pdf',
  },
  {
    id: 'manufacturing-notice',
    name: c(
      'New product manufacturing notice',
      'Bảng thông báo chế biến sản phẩm',
      '新產品製造通知單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/10. 表P-RS1 001-01.02 新產品製造通知單-Bang thong bao che bien san pham.pdf',
  },
  {
    id: 'product-specification',
    name: c(
      'New product specification',
      'Bảng diễn giải quy cách sản phẩm mới',
      '新產品規格說明書',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/11. 表P-RS1 001-03.02新產品規格說明書.pdf',
  },
  {
    id: 'finished-acceptance',
    name: c(
      'Finished product acceptance specification',
      'Bảng quy cách nghiệm thu thành phẩm',
      '成品允收規格表',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/12. 表P-RS1 001-02 02 成品允收規格表 -2025.07.01.pdf',
  },
  {
    id: 'semi-finished-acceptance',
    name: c(
      'Semi-finished product acceptance standard',
      'Bảng quy cách nghiệm thu bán thành phẩm',
      '半成品允收標準表單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/13. 表P-RS1 003-09 03 半成品允收標準表單bang quy cach nghiem thu ban thanh pham.pdf',
  },
  {
    id: 'raw-material-acceptance',
    name: c(
      'Raw material acceptance standard',
      'Bảng quy cách nghiệm thu nguyên liệu',
      '原料允收標準表單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/14. 表P-RS1 003-03 02 原料允收標準表單Bang qui cach nghiem thu nguyen lieu.pdf',
  },
  {
    id: 'product-code-rule-zh',
    name: c(
      'Giavico product code rules - Chinese',
      'Quy tắc mã hóa sản phẩm Giavico - Chinese',
      'Giavico 國際廠產品代號編碼原則 (Chinese)',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/15. 表P-RS1 001-07 02 Giavico國際廠產品代號編碼原則(Chinese ) 20240311.pdf',
  },
  {
    id: 'product-code-rule-vi',
    name: c(
      'Giavico product code rules - Vietnam',
      'Quy tắc mã hóa sản phẩm Giavico - Vietnam',
      'Giavico 國際廠產品代號編碼原則 (Vietnam)',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/16. 表P-RS1 001-07 02 Giavico國際廠產品代號編碼原則(Vietnam) 20240311.pdf',
  },
  {
    id: 'product-confirmation',
    name: c(
      'Coordination meeting product confirmation',
      'Bảng xác định sản phẩm hợp thỏa thuận',
      '協調會 - 產品確認單',
    ),
    kind: 'PDF',
    sourcePath:
      '/Users/nguyennhutthong/Downloads/giavico-rnd-forms/17. 表P-RS1 001-06.03協調會-產品確認單~bang xac dinh san pham hop thoa thuan.pdf',
  },
  {
    id: 'xnqc-1',
    name: c(
      'XNQC-1 sample specification confirmation',
      'XNQC-1 xác nhận quy cách hàng mẫu',
      'XNQC-1 樣品規格確認單',
    ),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'xnqc-2',
    name: c(
      'XNQC-2 sample specification confirmation notice',
      'XNQC-2 bảng xác nhận quy cách hàng mẫu',
      'XNQC-2 樣品規格確認通知單',
    ),
    kind: 'Word',
    simulated: true,
  },
  {
    id: 'notification-record',
    name: c(
      'Notification and approval audit record',
      'Nhật ký thông báo và phê duyệt',
      '通知與核准稽核紀錄',
    ),
    kind: 'Record',
    simulated: true,
  },
];

const action = (
  id: string,
  kind: ActionKind,
  en: string,
  vi: string,
  zh: string,
): ProcessAction => ({
  id,
  kind,
  label: c(en, vi, zh),
});

const PROCESS_WORKFLOWS: ProcessWorkflow[] = [
  {
    id: 'general',
    title: c('General process', 'Lưu trình chung', '整體流程'),
    subtitle: c(
      'From customer email to formula approval',
      'Từ email khách hàng đến phê duyệt công thức',
      '從客戶郵件到配方核准',
    ),
    summary: c(
      'Simulates the AI and document path shown in the Giavico overview: request intake, sample handling, COA confirmation, formula generation, sample report and management approval.',
      'Mô phỏng lộ trình AI và tài liệu trong sơ đồ Giavico: tiếp nhận yêu cầu, xử lý mẫu, xác nhận COA, đề xuất công thức, báo cáo mẫu và phê duyệt.',
      '模擬 Giavico 總覽中的 AI 與文件流程：需求接收、寄樣、COA 確認、配方產生、樣品報告與主管核准。',
    ),
    steps: [
      {
        id: 'email',
        phase: c('1. Request intake', '1. Tiếp nhận yêu cầu', '1. 需求接收'),
        title: c(
          'Receive customer email',
          'Nhận email khách hàng',
          '接收客戶郵件',
        ),
        role: c('Sales / System', 'Kinh doanh / Hệ thống', '業務 / 系統'),
        description: c(
          'A simulated customer email starts the product request.',
          'Email khách hàng mô phỏng khởi tạo yêu cầu sản phẩm.',
          '以模擬客戶郵件啟動產品需求。',
        ),
        icon: 'EM',
        tone: 'blue',
        documents: ['email-request'],
        actions: [
          action(
            'receive-email',
            'receive-email',
            'Simulate email received',
            'Mô phỏng nhận email',
            '模擬收到郵件',
          ),
        ],
      },
      {
        id: 'extract',
        phase: c('1. Request intake', '1. Tiếp nhận yêu cầu', '1. 需求接收'),
        title: c(
          'AI extracts requirements',
          'AI phân tích yêu cầu',
          'AI 分析需求',
        ),
        role: c('AI engine', 'AI engine', 'AI 引擎'),
        description: c(
          'Extracts product, Brix, pH, specification, quantity and market.',
          'Trích xuất sản phẩm, Brix, pH, quy cách, số lượng và thị trường.',
          '萃取產品、Brix、pH、規格、數量與市場。',
        ),
        icon: 'AI',
        tone: 'blue',
        documents: ['ai-extraction'],
        actions: [
          action(
            'extract-email',
            'extract-email',
            'Run AI extraction',
            'Chạy AI phân tích',
            '執行 AI 分析',
          ),
        ],
      },
      {
        id: 'sample-order',
        phase: c('2. Sample documents', '2. Tài liệu mẫu', '2. 樣品文件'),
        title: c('Create sample order', 'Tạo đơn hàng mẫu', '建立樣品訂單'),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Creates the four sample-order forms from the deck.',
          'Tạo 4 biểu mẫu tầng đơn mẫu trong slide.',
          '建立投影片中的四份樣品訂單文件。',
        ),
        icon: 'DO',
        tone: 'blue',
        documents: [
          'sample-production-contact',
          'new-product-dev-1',
          'new-product-dev-2',
          'overseas-sample-contact',
        ],
        actions: [
          action(
            'generate-sample-order',
            'generate-documents',
            'Generate sample forms',
            'Tạo biểu mẫu đơn mẫu',
            '產生樣品表單',
          ),
        ],
      },
      {
        id: 'send-sample',
        phase: c('2. Sample documents', '2. Tài liệu mẫu', '2. 樣品文件'),
        title: c(
          'Send sample to customer',
          'Gửi mẫu cho khách hàng',
          '寄樣給客戶',
        ),
        role: c('Staff RD / Sales', 'R&D / Kinh doanh', '研發 / 業務'),
        description: c(
          'Records domestic or overseas sample shipment.',
          'Ghi nhận gửi mẫu trong nước hoặc nước ngoài.',
          '記錄國內或海外寄樣。',
        ),
        icon: 'SM',
        tone: 'blue',
        documents: ['sample-send-register', 'overseas-sample-register'],
        actions: [
          action('send-sample', 'send', 'Send sample', 'Gửi mẫu', '寄送樣品'),
        ],
      },
      {
        id: 'sample-evaluation',
        phase: c('3. Customer gates', '3. Cổng khách hàng', '3. 客戶關卡'),
        title: c(
          'Customer evaluates sample',
          'Khách hàng đánh giá mẫu',
          '客戶評估樣品',
        ),
        role: c('Customer', 'Khách hàng', '客戶'),
        description: c(
          'The order continues only if the sample is accepted.',
          'Quy trình tiếp tục khi mẫu được chấp nhận.',
          '樣品通過後流程才會繼續。',
        ),
        icon: 'OK?',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action(
            'sample-ok',
            'approve',
            'Mark sample OK',
            'Đánh dấu mẫu OK',
            '標記樣品通過',
          ),
          action(
            'sample-not-ok',
            'reject',
            'Cancel order',
            'Hủy đơn hàng',
            '取消訂單',
          ),
        ],
      },
      {
        id: 'coa-search',
        phase: c('3. Customer gates', '3. Cổng khách hàng', '3. 客戶關卡'),
        title: c(
          'AI finds matching COA',
          'AI tìm COA phù hợp',
          'AI 尋找合適 COA',
        ),
        role: c(
          'AI + User confirmation',
          'AI + người dùng xác nhận',
          'AI + 使用者確認',
        ),
        description: c(
          'Simulates COA matching and user confirmation before sending.',
          'Mô phỏng tìm COA và người dùng xác nhận trước khi gửi.',
          '模擬 COA 比對並由使用者確認後寄送。',
        ),
        icon: 'COA',
        tone: 'blue',
        documents: ['coa-attn'],
        actions: [
          action(
            'send-coa',
            'send',
            'Confirm and send COA',
            'Xác nhận và gửi COA',
            '確認並寄送 COA',
          ),
        ],
      },
      {
        id: 'coa-confirm',
        phase: c('3. Customer gates', '3. Cổng khách hàng', '3. 客戶關卡'),
        title: c(
          'Customer confirms COA',
          'Khách hàng xác nhận COA',
          '客戶確認 COA',
        ),
        role: c('Customer', 'Khách hàng', '客戶'),
        description: c(
          'COA confirmation opens the R&D formula flow.',
          'COA được xác nhận sẽ mở luồng công thức R&D.',
          'COA 確認後進入研發配方流程。',
        ),
        icon: 'OK?',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action(
            'coa-ok',
            'approve',
            'Mark COA OK',
            'Đánh dấu COA OK',
            '標記 COA 通過',
          ),
          action(
            'coa-not-ok',
            'reject',
            'Cancel order',
            'Hủy đơn hàng',
            '取消訂單',
          ),
        ],
      },
      {
        id: 'formula',
        phase: c(
          '4. Formula and approval',
          '4. Công thức và phê duyệt',
          '4. 配方與核准',
        ),
        title: c('AI proposes formula', 'AI đề xuất công thức', 'AI 提出配方'),
        role: c('AI engine', 'AI engine', 'AI 引擎'),
        description: c(
          'Generates a simulated R&D formula for the accepted request.',
          'Tạo công thức R&D mô phỏng cho yêu cầu đã được chấp nhận.',
          '為已接受需求產生模擬研發配方。',
        ),
        icon: 'AI',
        tone: 'purple',
        documents: ['ai-extraction'],
        actions: [
          action(
            'generate-formula',
            'generate-documents',
            'Generate formula',
            'Tạo công thức',
            '產生配方',
          ),
        ],
      },
      {
        id: 'experiment',
        phase: c(
          '4. Formula and approval',
          '4. Công thức và phê duyệt',
          '4. 配方與核准',
        ),
        title: c(
          'R&D prepares trial sample',
          'R&D làm mẫu thử',
          '研發製作試驗樣品',
        ),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Confirms the experiment has been completed.',
          'Xác nhận đã hoàn thành mẫu thử.',
          '確認試驗樣品已完成。',
        ),
        icon: 'RD',
        tone: 'purple',
        documents: ['notification-record'],
        actions: [
          action(
            'complete-experiment',
            'inspect',
            'Complete experiment',
            'Hoàn thành mẫu thử',
            '完成試驗',
          ),
        ],
      },
      {
        id: 'sample-report',
        phase: c(
          '4. Formula and approval',
          '4. Công thức và phê duyệt',
          '4. 配方與核准',
        ),
        title: c('Create Sample Report', 'Tạo Sample Report', '建立樣品報告'),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Generates document #1 from the provided PDF template.',
          'Tạo tài liệu #1 từ PDF đã cung cấp.',
          '依提供的 PDF 範本產生文件 #1。',
        ),
        icon: 'SR',
        tone: 'purple',
        documents: ['sample-report'],
        actions: [
          action(
            'generate-sample-report',
            'generate-documents',
            'Generate Sample Report',
            'Tạo Sample Report',
            '產生樣品報告',
          ),
        ],
      },
      {
        id: 'management-review',
        phase: c(
          '4. Formula and approval',
          '4. Công thức và phê duyệt',
          '4. 配方與核准',
        ),
        title: c('Management approval', 'Cấp trên phê duyệt', '主管核准'),
        role: c('Manager / Director', 'Quản lý / Giám đốc', '經理 / 主管'),
        description: c(
          'Approval completes the general process; rejection returns to formula generation.',
          'Duyệt để hoàn tất; không duyệt quay lại bước đề xuất công thức.',
          '核准即完成；不通過則返回配方產生。',
        ),
        icon: 'RV',
        tone: 'orange',
        documents: ['notification-record'],
        actions: [
          action(
            'approve-management',
            'approve',
            'Approve',
            'Phê duyệt',
            '核准',
          ),
          action(
            'return-formula',
            'revise',
            'Return for revised formula',
            'Trả về sửa công thức',
            '返回修訂配方',
          ),
        ],
      },
      {
        id: 'approved',
        phase: c('5. Outcome', '5. Kết quả', '5. 結果'),
        title: c('Approved', 'Hoàn tất', '已核准'),
        role: c('System', 'Hệ thống', '系統'),
        description: c(
          'The simulated order has completed the general process.',
          'Đơn hàng mô phỏng đã hoàn tất lưu trình chung.',
          '模擬訂單已完成整體流程。',
        ),
        icon: 'OK',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action(
            'reset-general',
            'reset',
            'Restart simulation',
            'Chạy lại mô phỏng',
            '重新開始模擬',
          ),
        ],
      },
    ],
  },
  {
    id: 'qc-change',
    title: c('QC change flow', 'Lưu trình thay đổi QC', 'QC 變更流程'),
    subtitle: c(
      'Approvals, recalls, standards and inspections',
      'Phê duyệt, thu hồi, tiêu chuẩn và kiểm tra',
      '核准、回收、標準與檢驗',
    ),
    summary: c(
      'Simulates the QC/PT change process from slide 6, including generated change documents, recall forms, standard broadcasts and QC checkpoints.',
      'Mô phỏng lưu trình thay đổi QC/PT ở slide 6, gồm tài liệu thay đổi, thu hồi, phát hành tiêu chuẩn và kiểm tra QC.',
      '模擬第 6 張投影片的 QC/PT 變更流程，包含變更文件、回收表、標準廣播與 QC 檢驗點。',
    ),
    steps: [
      {
        id: 'qc-start',
        phase: c(
          '1. Approval and related orders',
          '1. Phê duyệt và đơn liên quan',
          '1. 核准與相關單據',
        ),
        title: c(
          'Start approved QC change',
          'Bắt đầu thay đổi QC đã duyệt',
          '啟動已核准 QC 變更',
        ),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Creates the first change proposal package.',
          'Tạo bộ đề xuất thay đổi đầu tiên.',
          '建立第一份變更提案套件。',
        ),
        icon: '5A',
        tone: 'orange',
        documents: [
          'change-proposal',
          'engineering-change-request',
          'engineering-change-notice',
          'ecr-extra',
        ],
        actions: [
          action(
            'create-change-package',
            'generate-documents',
            'Create change package',
            'Tạo bộ tài liệu thay đổi',
            '建立變更套件',
          ),
        ],
      },
      {
        id: 'qc-manager-approval',
        phase: c(
          '1. Approval and related orders',
          '1. Phê duyệt và đơn liên quan',
          '1. 核准與相關單據',
        ),
        title: c(
          'Manager approves change',
          'Quản lý duyệt thay đổi',
          '經理核准變更',
        ),
        role: c('Manager', 'Quản lý', '經理'),
        description: c(
          'Simulates manager approval and notification.',
          'Mô phỏng quản lý duyệt và gửi thông báo.',
          '模擬經理核准與通知。',
        ),
        icon: 'MG',
        tone: 'orange',
        documents: ['notification-record'],
        actions: [
          action(
            'approve-qc-manager',
            'approve',
            'Approve change',
            'Duyệt thay đổi',
            '核准變更',
          ),
        ],
      },
      {
        id: 'qc-director-approval',
        phase: c(
          '1. Approval and related orders',
          '1. Phê duyệt và đơn liên quan',
          '1. 核准與相關單據',
        ),
        title: c(
          'Director confirms final change order',
          'Director xác nhận đơn thay đổi',
          '主管確認最終變更單',
        ),
        role: c('Director', 'Director', '主管'),
        description: c(
          'Creates the downstream change notice after confirmation.',
          'Sinh thông báo thay đổi sau khi xác nhận.',
          '確認後產生後續變更通知。',
        ),
        icon: 'DR',
        tone: 'orange',
        documents: ['process-change-notice', 'notification-record'],
        actions: [
          action('confirm-director', 'approve', 'Confirm', 'Xác nhận', '確認'),
        ],
      },
      {
        id: 'qc-recall',
        phase: c('2. Recall documents', '2. Thu hồi tài liệu', '2. 文件回收'),
        title: c(
          'Create recall package',
          'Tạo bộ thu hồi tài liệu',
          '建立回收套件',
        ),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Collects related recall forms for affected documents.',
          'Tạo các đơn thu hồi liên quan đến tài liệu bị ảnh hưởng.',
          '建立受影響文件的相關回收表。',
        ),
        icon: 'RC',
        tone: 'red',
        documents: [
          'recall-half-finished',
          'recall-product-spec',
          'recall-change-notice',
          'recall-manufacturing-notice',
        ],
        actions: [
          action(
            'create-recall',
            'generate-documents',
            'Create recall forms',
            'Tạo đơn thu hồi',
            '產生回收表',
          ),
        ],
      },
      {
        id: 'qc-standard',
        phase: c('3. Standards', '3. Tiêu chuẩn', '3. 標準'),
        title: c(
          'Generate standards',
          'Sinh tài liệu tiêu chuẩn',
          '產生標準文件',
        ),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Creates manufacturing, product specification and acceptance standards.',
          'Tạo thông báo chế biến, quy cách sản phẩm và tiêu chuẩn nghiệm thu.',
          '建立製造通知、產品規格與允收標準。',
        ),
        icon: 'STD',
        tone: 'teal',
        documents: [
          'manufacturing-notice',
          'product-specification',
          'finished-acceptance',
          'semi-finished-acceptance',
        ],
        actions: [
          action(
            'generate-standards',
            'generate-documents',
            'Generate standards',
            'Sinh tiêu chuẩn',
            '產生標準',
          ),
        ],
      },
      {
        id: 'qc-broadcast',
        phase: c('3. Standards', '3. Tiêu chuẩn', '3. 標準'),
        title: c(
          'Broadcast standard release',
          'Thông báo phát hành tiêu chuẩn',
          '廣播標準發行',
        ),
        role: c('System', 'Hệ thống', '系統'),
        description: c(
          'Notifies planning, production, storage and QC teams.',
          'Thông báo cho Planning, Product, Storage và QC.',
          '通知 Planning、Product、Storage 與 QC 團隊。',
        ),
        icon: 'NT',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action(
            'broadcast-standards',
            'broadcast',
            'Broadcast',
            'Thông báo',
            '廣播',
          ),
        ],
      },
      {
        id: 'qc-raw',
        phase: c('4. Quality control', '4. Quản lý chất lượng', '4. 品質管制'),
        title: c(
          'QC checks raw materials',
          'QC kiểm tra nguyên liệu',
          'QC 檢查原料',
        ),
        role: c('Staff QC', 'Nhân viên QC', 'QC 人員'),
        description: c(
          'Uses raw material acceptance standard document #14.',
          'Sử dụng bảng quy cách nghiệm thu nguyên liệu #14.',
          '使用原料允收標準 #14。',
        ),
        icon: 'QC',
        tone: 'purple',
        documents: ['raw-material-acceptance'],
        actions: [
          action(
            'inspect-raw',
            'inspect',
            'Pass inspection',
            'Đạt kiểm tra',
            '檢驗通過',
          ),
        ],
      },
      {
        id: 'qc-semi',
        phase: c('4. Quality control', '4. Quản lý chất lượng', '4. 品質管制'),
        title: c(
          'QC checks semi-finished product',
          'QC kiểm tra bán thành phẩm',
          'QC 檢查半成品',
        ),
        role: c('Staff QC', 'Nhân viên QC', 'QC 人員'),
        description: c(
          'Uses semi-finished acceptance standard document #13.',
          'Sử dụng bảng quy cách nghiệm thu bán thành phẩm #13.',
          '使用半成品允收標準 #13。',
        ),
        icon: 'QC',
        tone: 'purple',
        documents: ['semi-finished-acceptance'],
        actions: [
          action(
            'inspect-semi',
            'inspect',
            'Pass inspection',
            'Đạt kiểm tra',
            '檢驗通過',
          ),
        ],
      },
      {
        id: 'qc-finished',
        phase: c('4. Quality control', '4. Quản lý chất lượng', '4. 品質管制'),
        title: c(
          'QC checks finished product',
          'QC kiểm tra thành phẩm',
          'QC 檢查成品',
        ),
        role: c('Staff QC', 'Nhân viên QC', 'QC 人員'),
        description: c(
          'Uses finished product acceptance specification document #12.',
          'Sử dụng bảng quy cách nghiệm thu thành phẩm #12.',
          '使用成品允收規格 #12。',
        ),
        icon: 'QC',
        tone: 'purple',
        documents: ['finished-acceptance'],
        actions: [
          action(
            'inspect-finished',
            'inspect',
            'Pass inspection',
            'Đạt kiểm tra',
            '檢驗通過',
          ),
        ],
      },
      {
        id: 'qc-complete',
        phase: c('5. Outcome', '5. Kết quả', '5. 結果'),
        title: c(
          'Quality control complete',
          'Hoàn thành Quality Control',
          '品質管制完成',
        ),
        role: c('System', 'Hệ thống', '系統'),
        description: c(
          'Notifies manager and director that QC is complete.',
          'Thông báo Manager và Director rằng QC đã hoàn thành.',
          '通知經理與主管 QC 已完成。',
        ),
        icon: 'OK',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action(
            'reset-qc',
            'reset',
            'Restart simulation',
            'Chạy lại mô phỏng',
            '重新開始模擬',
          ),
        ],
      },
    ],
  },
  {
    id: 'product-release',
    title: c(
      'Product release flow',
      'Lưu trình release sản phẩm',
      '產品發行流程',
    ),
    subtitle: c(
      'From R&D development to customer confirmation and market release',
      'Từ R&D đến xác nhận khách hàng và release thị trường',
      '從研發到客戶確認與上市發行',
    ),
    summary: c(
      'Simulates the full sample-to-finished-product flow from slide 7, including XNQC, standards, QC checks, final product confirmation and release.',
      'Mô phỏng toàn bộ lộ trình từ mẫu đến thành phẩm ở slide 7, gồm XNQC, tiêu chuẩn, kiểm tra QC, xác nhận sản phẩm và release.',
      '模擬第 7 張投影片的完整樣品到成品流程，包含 XNQC、標準、QC 檢查、產品確認與上市。',
    ),
    steps: [
      {
        id: 'release-formula',
        phase: c('1. R&D development', '1. Phát triển R&D', '1. 研發開發'),
        title: c('AI proposes formula', 'AI đề xuất công thức', 'AI 提出配方'),
        role: c('AI engine', 'AI engine', 'AI 引擎'),
        description: c(
          'Starts from the approved R&D formula path.',
          'Bắt đầu từ lộ trình công thức R&D được phê duyệt.',
          '從已核准的研發配方流程開始。',
        ),
        icon: 'AI',
        tone: 'purple',
        documents: ['ai-extraction'],
        actions: [
          action(
            'release-generate-formula',
            'generate-documents',
            'Generate formula',
            'Tạo công thức',
            '產生配方',
          ),
        ],
      },
      {
        id: 'release-experiment',
        phase: c('1. R&D development', '1. Phát triển R&D', '1. 研發開發'),
        title: c('R&D trial sample', 'R&D làm mẫu thử', '研發試驗樣品'),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Completes the experiment before Sample Report.',
          'Hoàn thành mẫu thử trước Sample Report.',
          '在樣品報告前完成試驗。',
        ),
        icon: 'RD',
        tone: 'purple',
        documents: ['notification-record'],
        actions: [
          action(
            'release-experiment',
            'inspect',
            'Complete experiment',
            'Hoàn thành thử nghiệm',
            '完成試驗',
          ),
        ],
      },
      {
        id: 'release-sample-report',
        phase: c('1. R&D development', '1. Phát triển R&D', '1. 研發開發'),
        title: c('Create Sample Report', 'Tạo Sample Report', '建立樣品報告'),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Creates the Sample Report used for management review.',
          'Tạo Sample Report để báo cáo cấp trên.',
          '建立供主管審查的樣品報告。',
        ),
        icon: 'SR',
        tone: 'purple',
        documents: ['sample-report'],
        actions: [
          action(
            'release-sample-report',
            'generate-documents',
            'Generate Sample Report',
            'Tạo Sample Report',
            '產生樣品報告',
          ),
        ],
      },
      {
        id: 'release-management',
        phase: c(
          '2. Customer confirmation',
          '2. Xác nhận khách hàng',
          '2. 客戶確認',
        ),
        title: c(
          'Management approves Sample Report',
          'Cấp trên duyệt Sample Report',
          '主管核准樣品報告',
        ),
        role: c('Manager / Director', 'Quản lý / Giám đốc', '經理 / 主管'),
        description: c(
          'If not approved, the flow returns to formula generation.',
          'Nếu không duyệt, quy trình quay về bước đề xuất công thức.',
          '不通過則返回配方產生。',
        ),
        icon: 'RV',
        tone: 'orange',
        documents: ['notification-record'],
        actions: [
          action(
            'release-management-ok',
            'approve',
            'Approve',
            'Phê duyệt',
            '核准',
          ),
          action(
            'release-management-revise',
            'revise',
            'Return to formula',
            'Trả về công thức',
            '返回配方',
          ),
        ],
      },
      {
        id: 'release-xnqc',
        phase: c(
          '2. Customer confirmation',
          '2. Xác nhận khách hàng',
          '2. 客戶確認',
        ),
        title: c('Create and send XNQC', 'Tạo và gửi XNQC', '建立並寄送 XNQC'),
        role: c('Staff RD', 'Nhân viên R&D', '研發人員'),
        description: c(
          'Sends sample specification confirmation documents to the customer.',
          'Gửi tài liệu xác nhận quy cách hàng mẫu cho khách hàng.',
          '寄送樣品規格確認文件給客戶。',
        ),
        icon: 'XN',
        tone: 'blue',
        documents: ['xnqc-1', 'xnqc-2'],
        actions: [
          action('send-xnqc', 'send', 'Send XNQC', 'Gửi XNQC', '寄送 XNQC'),
        ],
      },
      {
        id: 'release-customer-confirm',
        phase: c(
          '2. Customer confirmation',
          '2. Xác nhận khách hàng',
          '2. 客戶確認',
        ),
        title: c(
          'Customer confirms XNQC',
          'Khách hàng xác nhận XNQC',
          '客戶確認 XNQC',
        ),
        role: c('Customer', 'Khách hàng', '客戶'),
        description: c(
          'Satisfaction generates product specification document #11.',
          'Khách hàng hài lòng thì sinh tài liệu #11.',
          '客戶滿意後產生文件 #11。',
        ),
        icon: 'OK?',
        tone: 'green',
        documents: ['product-specification'],
        actions: [
          action(
            'xnqc-ok',
            'approve',
            'Customer satisfied',
            'Khách hàng hài lòng',
            '客戶滿意',
          ),
          action(
            'xnqc-not-ok',
            'revise',
            'Return to Sample Report',
            'Quay lại Sample Report',
            '返回樣品報告',
          ),
        ],
      },
      {
        id: 'release-standards',
        phase: c('3. Standards and QC', '3. Tiêu chuẩn và QC', '3. 標準與 QC'),
        title: c('Generate standards', 'Sinh tiêu chuẩn', '產生標準'),
        role: c('Manager / System', 'Quản lý / Hệ thống', '經理 / 系統'),
        description: c(
          'Approves #11, generates #10, and prepares quality standards.',
          'Duyệt #11, sinh #10 và chuẩn bị các tiêu chuẩn chất lượng.',
          '核准 #11、產生 #10 並準備品質標準。',
        ),
        icon: 'STD',
        tone: 'teal',
        documents: [
          'product-specification',
          'manufacturing-notice',
          'finished-acceptance',
          'semi-finished-acceptance',
          'raw-material-acceptance',
        ],
        actions: [
          action(
            'release-generate-standards',
            'generate-documents',
            'Generate standards',
            'Sinh tiêu chuẩn',
            '產生標準',
          ),
        ],
      },
      {
        id: 'release-broadcast',
        phase: c('3. Standards and QC', '3. Tiêu chuẩn và QC', '3. 標準與 QC'),
        title: c(
          'Broadcast to production teams',
          'Thông báo đến các bộ phận',
          '廣播給生產團隊',
        ),
        role: c('System', 'Hệ thống', '系統'),
        description: c(
          'Notifies all staff before raw material, semi-finished and finished inspections.',
          'Thông báo trước các bước kiểm tra nguyên liệu, bán thành phẩm và thành phẩm.',
          '在原料、半成品與成品檢驗前通知所有人員。',
        ),
        icon: 'NT',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action(
            'release-broadcast',
            'broadcast',
            'Broadcast',
            'Thông báo',
            '廣播',
          ),
        ],
      },
      {
        id: 'release-qc',
        phase: c('3. Standards and QC', '3. Tiêu chuẩn và QC', '3. 標準與 QC'),
        title: c(
          'Complete QC inspections',
          'Hoàn tất kiểm tra QC',
          '完成 QC 檢驗',
        ),
        role: c('Staff QC / Manager', 'QC / Quản lý', 'QC 人員 / 經理'),
        description: c(
          'Runs the three QC gates for raw, semi-finished and finished product.',
          'Chạy 3 cổng QC cho nguyên liệu, bán thành phẩm và thành phẩm.',
          '執行原料、半成品與成品三個 QC 關卡。',
        ),
        icon: 'QC',
        tone: 'purple',
        documents: [
          'raw-material-acceptance',
          'semi-finished-acceptance',
          'finished-acceptance',
        ],
        actions: [
          action(
            'release-qc-pass',
            'inspect',
            'Pass QC gates',
            'QC đạt',
            'QC 通過',
          ),
        ],
      },
      {
        id: 'release-confirm-product',
        phase: c('4. Release', '4. Release', '4. 發行'),
        title: c(
          'Product confirmation meeting',
          'Họp xác nhận sản phẩm',
          '產品確認會議',
        ),
        role: c(
          'CEO / Director / Manager',
          'Tổng Giám đốc / Giám đốc / Manager',
          '總經理 / 主管 / 經理',
        ),
        description: c(
          'Generates document #17 and routes it for final approval.',
          'Sinh tài liệu #17 và chuyển duyệt cuối cùng.',
          '產生文件 #17 並進行最終核准。',
        ),
        icon: '17',
        tone: 'orange',
        documents: ['product-confirmation'],
        actions: [
          action(
            'confirm-product',
            'approve',
            'Approve document #17',
            'Duyệt tài liệu #17',
            '核准文件 #17',
          ),
        ],
      },
      {
        id: 'release-market',
        phase: c('4. Release', '4. Release', '4. 發行'),
        title: c(
          'Release to market',
          'Phát hành sản phẩm ra thị trường',
          '上市發行',
        ),
        role: c('System', 'Hệ thống', '系統'),
        description: c(
          'The product is released after final product confirmation.',
          'Sản phẩm được phát hành sau khi xác nhận cuối cùng.',
          '最終產品確認後發行上市。',
        ),
        icon: 'GO',
        tone: 'green',
        documents: ['notification-record'],
        actions: [
          action('release-market', 'release', 'Release', 'Release', '發行'),
          action(
            'reset-release',
            'reset',
            'Restart simulation',
            'Chạy lại mô phỏng',
            '重新開始模擬',
          ),
        ],
      },
    ],
  },
];

@Component({
  selector: 'app-process-general',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="process-page">
      <header class="process-heading">
        <div>
          <span class="process-kicker"
            >GIAVICO DIGITAL DOCUMENT SYSTEM + AI</span
          >
          <h2>{{ copy('Process general', 'Lưu trình chung', '整體流程') }}</h2>
          <p>
            {{
              copy(
                'Interactive simulation based on the Giavico analysis deck, with document control, approval gates and mocked AI/email actions.',
                'Mô phỏng tương tác dựa trên file phân tích Giavico, gồm kiểm soát tài liệu, cổng phê duyệt và AI/email mô phỏng.',
                '依 Giavico 分析簡報建立互動模擬，包含文件管控、核准關卡與模擬 AI/郵件動作。'
              )
            }}
          </p>
        </div>
        <div class="process-actions">
          <button type="button" (click)="runCurrentWorkflow()">
            {{
              copy(
                'Auto-run selected flow',
                'Tự chạy lưu trình',
                '自動執行流程'
              )
            }}
          </button>
          <button
            type="button"
            class="secondary"
            (click)="resetCurrentWorkflow()"
          >
            {{ copy('Reset', 'Đặt lại', '重設') }}
          </button>
        </div>
      </header>

      <nav class="workflow-tabs" aria-label="Giavico workflows">
        <button
          *ngFor="let workflow of workflows"
          type="button"
          [class.active]="workflow.id === activeWorkflowId()"
          (click)="selectWorkflow(workflow.id)"
        >
          <strong>{{ text(workflow.title) }}</strong>
          <span>{{ text(workflow.subtitle) }}</span>
        </button>
      </nav>

      <div class="workflow-overview">
        <div>
          <span>{{
            copy('Selected workflow', 'Lưu trình đang chọn', '目前流程')
          }}</span>
          <strong>{{ text(currentWorkflow().title) }}</strong>
          <p>{{ text(currentWorkflow().summary) }}</p>
        </div>
        <div class="progress-box">
          <span>{{ copy('Progress', 'Tiến độ', '進度') }}</span>
          <strong
            >{{ completedCount() }}/{{ currentWorkflow().steps.length }}</strong
          >
          <div class="progress-track">
            <i [style.width.%]="progressPercent()"></i>
          </div>
        </div>
        <div class="progress-box">
          <span>{{ copy('Document artifacts', 'Tài liệu', '文件') }}</span>
          <strong>{{ workflowDocumentCount() }}</strong>
          <p>
            {{
              copy('Provided + simulated', 'Có sẵn + mô phỏng', '已提供 + 模擬')
            }}
          </p>
        </div>
      </div>

      <div class="process-workspace">
        <section
          class="timeline-panel"
          [attr.aria-label]="
            copy('Workflow steps', 'Các bước lưu trình', '流程步驟')
          "
        >
          <ol class="step-list">
            <li
              *ngFor="let step of currentWorkflow().steps; let index = index"
              [class.selected]="selectedStepId() === step.id"
              [class.done]="statusFor(step.id) === 'done'"
              [class.active]="statusFor(step.id) === 'active'"
              [class.blocked]="statusFor(step.id) === 'blocked'"
            >
              <div *ngIf="isFirstInPhase(step, index)" class="phase-label">
                {{ text(step.phase) }}
              </div>
              <button
                type="button"
                class="step-button"
                (click)="selectStep(step.id)"
              >
                <span class="step-index">{{ index + 1 }}</span>
                <span class="step-icon" [ngClass]="step.tone">{{
                  step.icon
                }}</span>
                <span class="step-copy">
                  <strong>{{ text(step.title) }}</strong>
                  <small>{{ text(step.role) }}</small>
                </span>
                <span class="status-chip">{{
                  statusLabel(statusFor(step.id))
                }}</span>
              </button>
            </li>
          </ol>
        </section>

        <section class="detail-panel" *ngIf="selectedStep() as step">
          <div class="detail-title">
            <span class="step-icon large" [ngClass]="step.tone">{{
              step.icon
            }}</span>
            <div>
              <span>{{ text(step.phase) }}</span>
              <h3>{{ text(step.title) }}</h3>
              <p>{{ text(step.description) }}</p>
            </div>
          </div>

          <div class="detail-meta">
            <span>{{ copy('Owner', 'Phụ trách', '負責') }}</span>
            <strong>{{ text(step.role) }}</strong>
          </div>

          <div class="action-row">
            <button
              *ngFor="let item of step.actions"
              type="button"
              [class.danger]="item.kind === 'reject'"
              [class.secondary]="
                item.kind === 'reset' || item.kind === 'revise'
              "
              (click)="runAction(step, item)"
            >
              {{ text(item.label) }}
            </button>
          </div>

          <div class="document-list">
            <h4>
              {{ copy('Related documents', 'Tài liệu liên quan', '相關文件') }}
            </h4>
            <article *ngFor="let doc of documentsFor(step)">
              <span class="doc-kind">{{ doc.kind }}</span>
              <div>
                <strong>{{ text(doc.name) }}</strong>
                <small *ngIf="doc.sourcePath; else simulatedDoc">{{
                  copy('Provided file', 'File đã cung cấp', '已提供文件')
                }}</small>
                <ng-template #simulatedDoc>
                  <small>{{
                    copy(
                      'Simulated until integration',
                      'Mô phỏng đến khi tích hợp',
                      '整合前模擬'
                    )
                  }}</small>
                </ng-template>
                <code *ngIf="doc.sourcePath">{{ doc.sourcePath }}</code>
              </div>
            </article>
          </div>
        </section>

        <aside class="simulation-panel">
          <section>
            <h3>
              {{ copy('Simulation state', 'Trạng thái mô phỏng', '模擬狀態') }}
            </h3>
            <div class="state-block">
              <span>{{
                copy('Incoming email', 'Email đầu vào', '輸入郵件')
              }}</span>
              <strong>{{
                copy(
                  'Yuzu Black Tea sample request',
                  'Yêu cầu mẫu Yuzu Black Tea',
                  '柚子紅茶樣品需求'
                )
              }}</strong>
              <p>
                {{
                  copy(
                    'Market: APAC - Japan. Target: 11.2 Brix, pH 4.1, 2,000 bottles.',
                    'Thị trường: APAC - Japan. Mục tiêu: 11.2 Brix, pH 4.1, 2.000 chai.',
                    '市場：APAC-日本。目標：11.2 Brix、pH 4.1、2,000 瓶。'
                  )
                }}
              </p>
            </div>

            <div
              class="state-block"
              *ngIf="emailExtraction(); else noExtraction"
            >
              <span>{{
                copy('AI extraction', 'AI phân tích', 'AI 分析')
              }}</span>
              <dl>
                <div>
                  <dt>Product</dt>
                  <dd>{{ emailExtraction()?.product }}</dd>
                </div>
                <div>
                  <dt>Brix</dt>
                  <dd>{{ emailExtraction()?.brix }}</dd>
                </div>
                <div>
                  <dt>pH</dt>
                  <dd>{{ emailExtraction()?.ph }}</dd>
                </div>
                <div>
                  <dt>Qty</dt>
                  <dd>{{ emailExtraction()?.quantity }}</dd>
                </div>
                <div>
                  <dt>Market</dt>
                  <dd>{{ emailExtraction()?.market }}</dd>
                </div>
              </dl>
            </div>
            <ng-template #noExtraction>
              <div class="state-block muted">
                <span>{{
                  copy('AI extraction', 'AI phân tích', 'AI 分析')
                }}</span>
                <p>
                  {{
                    copy(
                      'Run an AI action to populate this section.',
                      'Chạy thao tác AI để điền phần này.',
                      '執行 AI 動作後會填入此區。'
                    )
                  }}
                </p>
              </div>
            </ng-template>

            <div class="state-block" *ngIf="formulaSimulation()">
              <span>{{
                copy('Formula simulation', 'Công thức mô phỏng', '配方模擬')
              }}</span>
              <strong>{{ formulaSimulation()?.name }}</strong>
              <p>{{ formulaSimulation()?.notes }}</p>
            </div>
          </section>

          <section>
            <h3>{{ copy('Activity log', 'Nhật ký hoạt động', '活動紀錄') }}</h3>
            <ol class="event-log">
              <li *ngFor="let event of eventLog()">
                <strong>{{ event.title }}</strong>
                <span>{{ event.detail }}</span>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .process-page {
        background: #f8fbff;
        border: 1px solid #dbe4ef;
        border-radius: 16px;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
        color: #17233b;
        overflow: hidden;
      }
      .process-heading {
        align-items: flex-start;
        background: linear-gradient(135deg, #ffffff, #edf5ff);
        border-bottom: 1px solid #dbe4ef;
        display: flex;
        gap: 24px;
        justify-content: space-between;
        padding: 24px 28px;
      }
      .process-kicker {
        color: #1766c2;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.13em;
      }
      h2,
      h3,
      h4,
      p {
        margin-top: 0;
      }
      h2 {
        color: #102f67;
        font-size: 1.65rem;
        margin-bottom: 6px;
      }
      .process-heading p {
        color: #5c6b82;
        margin-bottom: 0;
        max-width: 820px;
      }
      button {
        border: 0;
        cursor: pointer;
        font: inherit;
      }
      .process-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }
      .process-actions button,
      .action-row button {
        background: #1766c2;
        border-radius: 8px;
        color: #fff;
        font-size: 0.78rem;
        font-weight: 800;
        padding: 10px 13px;
      }
      .process-actions .secondary,
      .action-row .secondary {
        background: #e8eff8;
        color: #23415f;
      }
      .action-row .danger {
        background: #d92f27;
        color: #fff;
      }
      .workflow-tabs {
        background: #fff;
        border-bottom: 1px solid #dbe4ef;
        display: grid;
        gap: 1px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .workflow-tabs button {
        background: #fff;
        border-right: 1px solid #e0e7f0;
        color: #526179;
        min-height: 82px;
        padding: 16px 20px;
        text-align: left;
      }
      .workflow-tabs button:last-child {
        border-right: 0;
      }
      .workflow-tabs button.active {
        background: #eef6ff;
        box-shadow: inset 0 -3px 0 #1766c2;
        color: #102f67;
      }
      .workflow-tabs strong,
      .workflow-tabs span {
        display: block;
      }
      .workflow-tabs strong {
        font-size: 0.95rem;
        margin-bottom: 4px;
      }
      .workflow-tabs span {
        font-size: 0.72rem;
        line-height: 1.35;
      }
      .workflow-overview {
        align-items: stretch;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr) 190px 190px;
        padding: 18px 22px;
      }
      .workflow-overview > div {
        background: #fff;
        border: 1px solid #e0e7f0;
        border-radius: 10px;
        padding: 15px;
      }
      .workflow-overview span,
      .detail-meta span,
      .state-block span {
        color: #64748b;
        display: block;
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.07em;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      .workflow-overview strong {
        color: #102f67;
        display: block;
        font-size: 1rem;
      }
      .workflow-overview p {
        color: #5c6b82;
        font-size: 0.82rem;
        line-height: 1.45;
        margin: 6px 0 0;
      }
      .progress-box strong {
        font-size: 1.55rem;
      }
      .progress-track {
        background: #e3eaf4;
        border-radius: 999px;
        height: 8px;
        margin-top: 11px;
        overflow: hidden;
      }
      .progress-track i {
        background: linear-gradient(90deg, #1766c2, #23933c);
        display: block;
        height: 100%;
      }
      .process-workspace {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(320px, 430px) minmax(360px, 1fr) minmax(
            280px,
            360px
          );
        padding: 0 22px 22px;
      }
      .timeline-panel,
      .detail-panel,
      .simulation-panel {
        min-width: 0;
      }
      .timeline-panel,
      .detail-panel,
      .simulation-panel section {
        background: #fff;
        border: 1px solid #e0e7f0;
        border-radius: 12px;
      }
      .timeline-panel {
        max-height: 720px;
        overflow: auto;
        padding: 14px;
      }
      .step-list,
      .event-log {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .step-list li {
        margin: 0;
        padding: 0 0 10px 18px;
        position: relative;
      }
      .step-list li::before {
        background: #cbd8e7;
        bottom: 0;
        content: '';
        left: 7px;
        position: absolute;
        top: 40px;
        width: 2px;
      }
      .step-list li:last-child::before {
        display: none;
      }
      .phase-label {
        color: #1766c2;
        font-size: 0.67rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        margin: 8px 0 8px -18px;
        text-transform: uppercase;
      }
      .step-button {
        align-items: center;
        background: #f9fbfe;
        border: 1px solid #dbe4ef;
        border-radius: 10px;
        display: grid;
        gap: 9px;
        grid-template-columns: 24px 42px minmax(0, 1fr) auto;
        padding: 10px;
        text-align: left;
        width: 100%;
      }
      li.selected .step-button {
        border-color: #1766c2;
        box-shadow: 0 0 0 3px rgba(23, 102, 194, 0.13);
      }
      li.done .step-button {
        background: #f1fbf3;
        border-color: #b7dfbf;
      }
      li.active .step-button {
        background: #eef6ff;
      }
      li.blocked .step-button {
        background: #fff4f3;
        border-color: #f2b4ae;
      }
      .step-index {
        align-items: center;
        background: #e5edf8;
        border-radius: 999px;
        color: #526179;
        display: flex;
        font-size: 0.68rem;
        font-weight: 900;
        height: 24px;
        justify-content: center;
        width: 24px;
      }
      .step-icon {
        align-items: center;
        border: 1.5px solid currentColor;
        border-radius: 9px;
        display: inline-flex;
        flex: 0 0 auto;
        font-size: 0.68rem;
        font-weight: 900;
        height: 38px;
        justify-content: center;
        width: 38px;
      }
      .step-icon.large {
        font-size: 0.78rem;
        height: 48px;
        width: 48px;
      }
      .step-icon.blue {
        color: #1766c2;
      }
      .step-icon.purple {
        color: #7c3fc3;
      }
      .step-icon.orange {
        color: #df7312;
      }
      .step-icon.green {
        color: #23933c;
      }
      .step-icon.red {
        color: #d92f27;
      }
      .step-icon.teal {
        color: #16818a;
      }
      .step-copy {
        min-width: 0;
      }
      .step-copy strong {
        color: #17233b;
        display: block;
        font-size: 0.8rem;
        line-height: 1.25;
      }
      .step-copy small {
        color: #64748b;
        display: block;
        font-size: 0.66rem;
        margin-top: 3px;
      }
      .status-chip {
        background: #edf2f7;
        border-radius: 999px;
        color: #53657c;
        font-size: 0.62rem;
        font-weight: 900;
        padding: 4px 7px;
        white-space: nowrap;
      }
      li.done .status-chip {
        background: #dff4e4;
        color: #197033;
      }
      li.active .status-chip {
        background: #dfeeff;
        color: #1766c2;
      }
      li.blocked .status-chip {
        background: #ffe0dd;
        color: #b42318;
      }
      .detail-panel {
        background: #fff;
        border: 1px solid #e0e7f0;
        border-radius: 12px;
        padding: 18px;
      }
      .detail-title {
        align-items: flex-start;
        display: flex;
        gap: 13px;
      }
      .detail-title span:not(.step-icon) {
        color: #1766c2;
        font-size: 0.7rem;
        font-weight: 900;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }
      .detail-title h3 {
        color: #102f67;
        font-size: 1.2rem;
        margin: 3px 0 7px;
      }
      .detail-title p {
        color: #5c6b82;
        font-size: 0.86rem;
        line-height: 1.5;
        margin-bottom: 0;
      }
      .detail-meta {
        background: #f7faff;
        border: 1px solid #e0e7f0;
        border-radius: 10px;
        margin-top: 15px;
        padding: 12px;
      }
      .detail-meta strong {
        color: #17233b;
        font-size: 0.88rem;
      }
      .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 16px 0;
      }
      .document-list {
        border-top: 1px solid #e0e7f0;
        padding-top: 15px;
      }
      .document-list h4 {
        color: #102f67;
        font-size: 0.9rem;
        margin-bottom: 10px;
      }
      .document-list article {
        align-items: flex-start;
        background: #fbfdff;
        border: 1px solid #e3ebf5;
        border-radius: 9px;
        display: flex;
        gap: 10px;
        margin-bottom: 8px;
        padding: 10px;
      }
      .doc-kind {
        background: #e8eff8;
        border-radius: 6px;
        color: #1766c2;
        flex: 0 0 auto;
        font-size: 0.62rem;
        font-weight: 900;
        padding: 5px 7px;
      }
      .document-list strong {
        color: #17233b;
        display: block;
        font-size: 0.78rem;
        line-height: 1.3;
      }
      .document-list small {
        color: #64748b;
        display: block;
        font-size: 0.68rem;
        margin-top: 3px;
      }
      .document-list code {
        background: transparent;
        color: #64748b;
        display: block;
        font-size: 0.62rem;
        line-height: 1.35;
        margin-top: 5px;
        overflow-wrap: anywhere;
      }
      .simulation-panel {
        display: grid;
        gap: 16px;
      }
      .simulation-panel section {
        padding: 16px;
      }
      .simulation-panel h3 {
        color: #102f67;
        font-size: 0.98rem;
        margin-bottom: 12px;
      }
      .state-block {
        background: #fbfdff;
        border: 1px solid #e3ebf5;
        border-radius: 10px;
        margin-bottom: 10px;
        padding: 12px;
      }
      .state-block.muted {
        background: #f7faff;
      }
      .state-block strong {
        color: #17233b;
        display: block;
        font-size: 0.82rem;
      }
      .state-block p {
        color: #5c6b82;
        font-size: 0.75rem;
        line-height: 1.45;
        margin: 6px 0 0;
      }
      dl {
        display: grid;
        gap: 7px;
        margin: 0;
      }
      dl div {
        display: grid;
        gap: 8px;
        grid-template-columns: 64px 1fr;
      }
      dt {
        color: #64748b;
        font-size: 0.66rem;
        font-weight: 900;
      }
      dd {
        color: #17233b;
        font-size: 0.76rem;
        margin: 0;
      }
      .event-log {
        display: grid;
        gap: 8px;
        max-height: 280px;
        overflow: auto;
      }
      .event-log li {
        border-left: 3px solid #1766c2;
        padding-left: 9px;
      }
      .event-log strong {
        color: #17233b;
        display: block;
        font-size: 0.74rem;
      }
      .event-log span {
        color: #64748b;
        display: block;
        font-size: 0.68rem;
        line-height: 1.4;
        margin-top: 2px;
      }
      @media (max-width: 1280px) {
        .process-workspace {
          grid-template-columns: minmax(320px, 420px) minmax(360px, 1fr);
        }
        .simulation-panel {
          grid-column: 1 / -1;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 900px) {
        .process-heading {
          display: block;
          padding: 20px;
        }
        .process-actions {
          justify-content: flex-start;
          margin-top: 14px;
        }
        .workflow-tabs,
        .workflow-overview,
        .process-workspace,
        .simulation-panel {
          grid-template-columns: 1fr;
        }
        .workflow-tabs button {
          border-bottom: 1px solid #e0e7f0;
          border-right: 0;
        }
      }
      :host-context(.dark-theme) .process-page {
        background: #0f172a;
        border-color: #334155;
        color: #e2e8f0;
      }
      :host-context(.dark-theme) .process-heading {
        background: linear-gradient(135deg, #111827, #17233b);
        border-color: #334155;
      }
      :host-context(.dark-theme) h2,
      :host-context(.dark-theme) h3,
      :host-context(.dark-theme) h4,
      :host-context(.dark-theme) .workflow-overview strong,
      :host-context(.dark-theme) .step-copy strong,
      :host-context(.dark-theme) .detail-title h3,
      :host-context(.dark-theme) .detail-meta strong,
      :host-context(.dark-theme) .document-list strong,
      :host-context(.dark-theme) .state-block strong,
      :host-context(.dark-theme) dd,
      :host-context(.dark-theme) .event-log strong {
        color: #f1f5f9;
      }
      :host-context(.dark-theme) .process-heading p,
      :host-context(.dark-theme) .workflow-overview p,
      :host-context(.dark-theme) .detail-title p,
      :host-context(.dark-theme) .document-list small,
      :host-context(.dark-theme) .document-list code,
      :host-context(.dark-theme) .state-block p,
      :host-context(.dark-theme) .event-log span {
        color: #aebcd0;
      }
      :host-context(.dark-theme) .workflow-tabs,
      :host-context(.dark-theme) .workflow-tabs button,
      :host-context(.dark-theme) .workflow-overview > div,
      :host-context(.dark-theme) .timeline-panel,
      :host-context(.dark-theme) .detail-panel,
      :host-context(.dark-theme) .simulation-panel section {
        background: #111827;
        border-color: #334155;
      }
      :host-context(.dark-theme) .workflow-tabs button.active,
      :host-context(.dark-theme) .step-button,
      :host-context(.dark-theme) .detail-meta,
      :host-context(.dark-theme) .document-list article,
      :host-context(.dark-theme) .state-block {
        background: #172033;
        border-color: #334155;
      }
      :host-context(.dark-theme) .step-button {
        color: #e2e8f0;
      }
      :host-context(.dark-theme) .process-actions .secondary,
      :host-context(.dark-theme) .action-row .secondary,
      :host-context(.dark-theme) .doc-kind,
      :host-context(.dark-theme) .status-chip,
      :host-context(.dark-theme) .step-index {
        background: #263247;
        color: #d8e3f2;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessGeneralComponent {
  private readonly language = inject(LanguageService);

  readonly workflows = PROCESS_WORKFLOWS;
  readonly activeWorkflowId = signal<WorkflowId>('general');
  readonly selectedStepId = signal(PROCESS_WORKFLOWS[0].steps[0].id);
  readonly stepStatuses = signal<Record<string, StepStatus>>(
    this.createInitialStatuses(PROCESS_WORKFLOWS[0]),
  );
  readonly emailExtraction = signal<EmailExtraction | null>(null);
  readonly formulaSimulation = signal<FormulaSimulation | null>(null);
  readonly eventLog = signal<TimelineEvent[]>([
    {
      id: 1,
      title: this.copy(
        'Simulation ready',
        'Mô phỏng đã sẵn sàng',
        '模擬已就緒',
      ),
      detail: this.copy(
        'Select a step or run an action to begin.',
        'Chọn bước hoặc chạy thao tác để bắt đầu.',
        '選擇步驟或執行動作以開始。',
      ),
    },
  ]);

  copy(en: string, vi: string, zh: string): string {
    const current: AppLanguage = this.language.language();
    return current === 'vi' ? vi : current === 'zh-TW' ? zh : en;
  }

  text(value: CopyText): string {
    return this.copy(value.en, value.vi, value.zh);
  }

  currentWorkflow(): ProcessWorkflow {
    return (
      this.workflows.find(
        (workflow) => workflow.id === this.activeWorkflowId(),
      ) ?? this.workflows[0]
    );
  }

  selectedStep(): ProcessStep {
    return (
      this.currentWorkflow().steps.find(
        (step) => step.id === this.selectedStepId(),
      ) ?? this.currentWorkflow().steps[0]
    );
  }

  selectWorkflow(id: WorkflowId): void {
    const workflow =
      this.workflows.find((item) => item.id === id) ?? this.workflows[0];
    this.activeWorkflowId.set(workflow.id);
    this.selectedStepId.set(workflow.steps[0].id);
    this.stepStatuses.set(this.createInitialStatuses(workflow));
    this.emailExtraction.set(null);
    this.formulaSimulation.set(null);
    this.eventLog.set([
      {
        id: Date.now(),
        title: this.text(workflow.title),
        detail: this.copy(
          'Workflow selected and reset.',
          'Đã chọn và đặt lại lưu trình.',
          '已選擇並重設流程。',
        ),
      },
    ]);
  }

  selectStep(id: string): void {
    this.selectedStepId.set(id);
  }

  statusFor(stepId: string): StepStatus {
    return this.stepStatuses()[stepId] ?? 'pending';
  }

  statusLabel(status: StepStatus): string {
    if (status === 'done') {
      return this.copy('Done', 'Xong', '完成');
    }
    if (status === 'active') {
      return this.copy('Active', 'Đang xử lý', '進行中');
    }
    if (status === 'blocked') {
      return this.copy('Stopped', 'Đã dừng', '停止');
    }
    return this.copy('Pending', 'Chờ', '待處理');
  }

  isFirstInPhase(step: ProcessStep, index: number): boolean {
    const previous = this.currentWorkflow().steps[index - 1];
    return !previous || this.text(previous.phase) !== this.text(step.phase);
  }

  documentsFor(step: ProcessStep): ProcessDocument[] {
    return step.documents
      .map((id) => DOCUMENT_LIBRARY.find((document) => document.id === id))
      .filter((document): document is ProcessDocument => Boolean(document));
  }

  completedCount(): number {
    return this.currentWorkflow().steps.filter(
      (step) => this.statusFor(step.id) === 'done',
    ).length;
  }

  progressPercent(): number {
    return Math.round(
      (this.completedCount() / this.currentWorkflow().steps.length) * 100,
    );
  }

  workflowDocumentCount(): number {
    const ids = new Set(
      this.currentWorkflow().steps.flatMap((step) => step.documents),
    );
    return ids.size;
  }

  resetCurrentWorkflow(): void {
    this.selectWorkflow(this.currentWorkflow().id);
  }

  runCurrentWorkflow(): void {
    for (const step of this.currentWorkflow().steps) {
      const primaryAction = step.actions.find(
        (stepAction) => stepAction.kind !== 'reset',
      );
      if (primaryAction) {
        this.runAction(step, primaryAction, false);
      } else {
        this.patchStatus(step.id, 'done');
      }
    }
    const finalStep = this.currentWorkflow().steps.at(-1);
    if (finalStep) {
      this.selectedStepId.set(finalStep.id);
    }
  }

  runAction(step: ProcessStep, item: ProcessAction, selectNext = true): void {
    if (item.kind === 'reset') {
      this.resetCurrentWorkflow();
      return;
    }

    if (item.kind === 'reject') {
      this.patchStatus(step.id, 'blocked');
      this.addEvent(
        this.text(step.title),
        this.copy(
          'Order was cancelled in this simulation.',
          'Đơn hàng đã bị hủy trong mô phỏng.',
          '此模擬中的訂單已取消。',
        ),
      );
      return;
    }

    if (item.kind === 'revise') {
      const target = this.findRevisionTarget();
      this.patchStatus(step.id, 'active');
      this.patchStatus(target.id, 'active');
      this.selectedStepId.set(target.id);
      this.formulaSimulation.set({
        name: 'Yuzu Black Tea R2',
        targetBrix: '11.2',
        acidity: 'pH 4.1',
        notes: this.copy(
          'Revision requested. AI will adjust acid balance and flavor ratio.',
          'Đã yêu cầu chỉnh sửa. AI sẽ cân bằng acid và tỷ lệ hương.',
          '已要求修訂。AI 將調整酸度平衡與風味比例。',
        ),
      });
      this.addEvent(
        this.text(item.label),
        this.copy(
          'Flow returned to the most relevant formula/report step.',
          'Quy trình quay lại bước công thức/báo cáo phù hợp.',
          '流程已返回最相關的配方/報告步驟。',
        ),
      );
      return;
    }

    if (item.kind === 'extract-email') {
      this.emailExtraction.set({
        product: 'Yuzu Black Tea',
        brix: '11.2 °Bx',
        ph: '4.1',
        quantity: '2,000 bottles',
        market: 'APAC - Japan',
        specification: 'Preservative-free, natural flavor only, low viscosity',
      });
    }

    if (
      item.kind === 'generate-documents' &&
      (step.id.includes('formula') || step.id === 'formula')
    ) {
      this.formulaSimulation.set({
        name: 'Yuzu Black Tea R1',
        targetBrix: '11.2',
        acidity: 'pH 4.1',
        notes: this.copy(
          'Mock formula generated from extracted request and baseline BOM.',
          'Công thức mô phỏng được tạo từ yêu cầu và BOM tham chiếu.',
          '依擷取需求與基準 BOM 產生模擬配方。',
        ),
      });
    }

    this.patchStatus(step.id, 'done');
    this.addEvent(this.text(item.label), this.text(step.title));

    const next = this.nextStep(step.id);
    if (next) {
      if (this.statusFor(next.id) === 'pending') {
        this.patchStatus(next.id, 'active');
      }
      if (selectNext) {
        this.selectedStepId.set(next.id);
      }
      return;
    }

    if (item.kind === 'release') {
      this.addEvent(
        this.copy('Released', 'Đã release', '已發行'),
        this.copy(
          'The simulated product is ready for market.',
          'Sản phẩm mô phỏng đã sẵn sàng ra thị trường.',
          '模擬產品已可上市。',
        ),
      );
    }
  }

  private createInitialStatuses(
    workflow: ProcessWorkflow,
  ): Record<string, StepStatus> {
    return workflow.steps.reduce<Record<string, StepStatus>>(
      (statuses, step, index) => {
        statuses[step.id] = index === 0 ? 'active' : 'pending';
        return statuses;
      },
      {},
    );
  }

  private patchStatus(stepId: string, status: StepStatus): void {
    this.stepStatuses.update((statuses) => ({ ...statuses, [stepId]: status }));
  }

  private nextStep(stepId: string): ProcessStep | undefined {
    const steps = this.currentWorkflow().steps;
    const currentIndex = steps.findIndex((step) => step.id === stepId);
    return currentIndex >= 0 ? steps[currentIndex + 1] : undefined;
  }

  private findRevisionTarget(): ProcessStep {
    const workflow = this.currentWorkflow();
    return (
      workflow.steps.find((step) => step.id.includes('formula')) ??
      workflow.steps.find((step) => step.id.includes('sample-report')) ??
      workflow.steps[0]
    );
  }

  private addEvent(title: string, detail: string): void {
    this.eventLog.update((events) =>
      [{ id: Date.now() + events.length, title, detail }, ...events].slice(
        0,
        12,
      ),
    );
  }
}
