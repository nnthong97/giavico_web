import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-process-general',
  standalone: true,
  template: `
    <section class="process-page">
      <header class="process-heading">
        <div>
          <span class="process-kicker">GIAVICO DIGITAL DOCUMENT SYSTEM</span>
          <h2>{{ copy('Process general', 'Lưu trình chung', '整體流程') }}</h2>
          <p>{{ copy(
            'From customer request to formula approval, with complete document and decision control.',
            'Từ yêu cầu khách hàng đến phê duyệt công thức, với đầy đủ tài liệu và điểm kiểm soát.',
            '從客戶需求到配方核准，包含完整的文件與決策管控。'
          ) }}</p>
        </div>
        <div class="process-legend" aria-label="Process legend">
          <span><i class="blue"></i>{{ copy('Intake', 'Tiếp nhận', '接收') }}</span>
          <span><i class="purple"></i>R&amp;D</span>
          <span><i class="orange"></i>{{ copy('Approval', 'Phê duyệt', '核准') }}</span>
          <span><i class="green"></i>{{ copy('Completed', 'Hoàn tất', '完成') }}</span>
        </div>
      </header>

      <div class="process-scroll" role="region" [attr.aria-label]="copy('General process diagram', 'Sơ đồ lưu trình chung', '整體流程圖')" tabindex="0">
        <div class="process-canvas">
          <div class="stage-label stage-one">01 · {{ copy('Request and sample', 'Yêu cầu và gửi mẫu', '需求與寄樣') }}</div>
          <div class="stage-label stage-two">02 · {{ copy('COA confirmation', 'Xác nhận COA', 'COA 確認') }}</div>
          <div class="stage-label stage-three">03 · {{ copy('Formula and approval', 'Công thức và phê duyệt', '配方與核准') }}</div>

          <article class="step s-email blue"><span class="step-icon">EM</span><div><small>{{ copy('INPUT', 'ĐẦU VÀO', '輸入') }}</small><h3>{{ copy('Receive product request email', 'Nhận email yêu cầu sản phẩm', '接收產品需求郵件') }}</h3></div></article>
          <span class="arrow a-email"></span>
          <article class="step s-ai blue"><span class="step-icon">AI</span><div><small>{{ copy('AI EXTRACTION', 'AI PHÂN TÍCH', 'AI 分析') }}</small><h3>{{ copy('Analyze email requirements', 'Phân tích yêu cầu email', '分析郵件需求') }}</h3><p>{{ copy('Product, Brix, pH, specification and quantity', 'Tên sản phẩm, Brix, pH, quy cách và số lượng', '產品、Brix、pH、規格與數量') }}</p></div></article>
          <span class="arrow a-ai"></span>
          <article class="step s-order blue"><span class="step-icon">DO</span><div><small>{{ copy('DOCUMENTS', 'TÀI LIỆU', '文件') }}</small><h3>{{ copy('Create sample order', 'Tạo đơn hàng tăng đơn mẫu', '建立樣品訂單') }}</h3><ul><li>{{ copy('Sample production contact', 'Phiếu liên hệ sản xuất mẫu', '樣品生產聯絡單') }}</li><li>{{ copy('New product development forms', 'Phiếu phát triển sản phẩm mới', '新產品開發表') }}</li><li>{{ copy('Overseas sample contact', 'Phiếu liên hệ mẫu nước ngoài', '海外樣品聯絡單') }}</li></ul></div></article>
          <span class="arrow a-order"></span>
          <article class="step s-send blue"><span class="step-icon">SM</span><div><small>{{ copy('SEND SAMPLE', 'GỬI MẪU', '寄送樣品') }}</small><h3>{{ copy('Send sample to customer', 'Gửi mẫu cho khách hàng', '寄樣給客戶') }}</h3><p>{{ copy('Sample and overseas sample delivery register', 'Bảng ghi nhận gửi mẫu và mẫu nước ngoài', '樣品與海外樣品寄送紀錄') }}</p></div></article>
          <span class="arrow a-send"></span>
          <div class="decision d-sample"><strong>{{ copy('Customer evaluates sample', 'Khách hàng đánh giá mẫu', '客戶評估樣品') }}</strong></div>
          <span class="branch-label sample-no">{{ copy('Not OK', 'Không OK', '不通過') }}</span>
          <span class="arrow red a-sample-no"></span>
          <article class="step compact s-cancel-one red"><span class="step-icon">X</span><div><h3>{{ copy('Cancel order', 'Hủy đơn hàng', '取消訂單') }}</h3></div></article>

          <span class="branch-label sample-ok">OK</span>
          <span class="arrow down a-sample-down"></span>
          <article class="step s-coa blue"><span class="step-icon">COA</span><div><small>{{ copy('AI SEARCH', 'AI TÌM KIẾM', 'AI 搜尋') }}</small><h3>{{ copy('Find matching COA', 'Tìm COA phù hợp', '尋找合適 COA') }}</h3><p>{{ copy('User confirms the COA to send', 'Người dùng xác nhận COA cần gửi', '使用者確認要寄送的 COA') }}</p></div></article>
          <span class="arrow left a-coa-left"></span>
          <div class="decision d-coa"><strong>{{ copy('Customer confirms COA', 'Khách hàng xác nhận COA', '客戶確認 COA') }}</strong></div>
          <span class="branch-label coa-no">{{ copy('Not OK', 'Không OK', '不通過') }}</span>
          <span class="arrow red left a-coa-no"></span>
          <article class="step compact s-cancel-two red"><span class="step-icon">X</span><div><h3>{{ copy('Cancel order', 'Hủy đơn hàng', '取消訂單') }}</h3></div></article>

          <span class="branch-label coa-ok">OK</span>
          <span class="route-line coa-route"></span>
          <span class="arrow down a-formula-in"></span>
          <article class="step s-formula purple"><span class="step-icon">AI</span><div><small>{{ copy('FORMULA GENERATION', 'ĐỀ XUẤT CÔNG THỨC', '配方產生') }}</small><h3>{{ copy('AI proposes formula', 'AI đề xuất công thức', 'AI 提出配方') }}</h3></div></article>
          <span class="arrow a-formula"></span>
          <article class="step s-experiment purple"><span class="step-icon">RD</span><div><small>{{ copy('EXPERIMENT', 'LÀM MẪU THỬ', '試驗') }}</small><h3>{{ copy('R&D staff prepares trial sample', 'Nhân viên R&D làm mẫu thử', '研發人員製作試驗樣品') }}</h3></div></article>
          <span class="arrow a-experiment"></span>
          <article class="step s-report purple"><span class="step-icon">SR</span><div><small>#1 SAMPLE REPORT</small><h3>{{ copy('Create Sample Report', 'Tạo báo cáo mẫu', '建立樣品報告') }}</h3></div></article>
          <span class="arrow a-report"></span>
          <article class="step s-review orange"><span class="step-icon">RV</span><div><small>{{ copy('REVIEW', 'XEM XÉT', '審查') }}</small><h3>{{ copy('Report to management', 'Báo cáo cấp trên', '向主管報告') }}</h3><p>{{ copy('Review and feedback', 'Xem xét và phản hồi', '審查與回饋') }}</p></div></article>
          <span class="arrow orange-arrow a-review"></span>
          <div class="decision orange-decision d-approval"><strong>{{ copy('Management approval', 'Cấp trên duyệt', '主管核准') }}</strong></div>
          <span class="branch-label approval-ok">OK</span>
          <span class="arrow green a-approved"></span>
          <article class="step compact s-approved green"><span class="step-icon">OK</span><div><h3>{{ copy('Approved', 'Kết thúc', '已核准') }}</h3></div></article>

          <span class="branch-label approval-no">{{ copy('Not OK', 'Không OK', '不通過') }}</span>
          <span class="arrow red down a-approval-down"></span>
          <article class="step compact s-cancel-three red"><span class="step-icon">X</span><div><h3>{{ copy('Cancel order', 'Hủy đơn hàng', '取消訂單') }}</h3></div></article>
          <span class="route-line retry-line"></span>
          <span class="arrow red up a-retry"></span>
          <span class="retry-label">{{ copy('Return: AI proposes a revised formula', 'Quay lại: AI đề xuất công thức mới', '返回：AI 提出修訂配方') }}</span>
        </div>
      </div>

      <footer class="process-note">
        <span>15 {{ copy('controlled activities', 'hoạt động kiểm soát', '項受控活動') }}</span>
        <span>3 {{ copy('decision gates', 'điểm quyết định', '個決策關卡') }}</span>
        <span>3 {{ copy('controlled outcomes', 'kết quả kiểm soát', '個受控結果') }}</span>
      </footer>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .process-page { background: #fff; border: 1px solid #dbe4ef; border-radius: 16px; box-shadow: 0 14px 35px rgba(15, 23, 42, .08); color: #17233b; overflow: hidden; }
    .process-heading { align-items: flex-start; background: linear-gradient(135deg, #f8fbff, #eef5ff); border-bottom: 1px solid #dbe4ef; display: flex; gap: 24px; justify-content: space-between; padding: 24px 28px; }
    .process-kicker { color: #1766c2; font-size: .72rem; font-weight: 800; letter-spacing: .13em; }
    h2 { color: #102f67; font-size: 1.65rem; margin: 5px 0 6px; }
    .process-heading p { color: #5c6b82; margin: 0; max-width: 720px; }
    .process-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; justify-content: flex-end; padding-top: 5px; }
    .process-legend span { align-items: center; color: #526179; display: flex; font-size: .72rem; font-weight: 700; gap: 6px; white-space: nowrap; }
    .process-legend i { border-radius: 50%; display: inline-block; height: 8px; width: 8px; }
    .process-legend .blue { background: #1766c2; } .process-legend .purple { background: #7c3fc3; } .process-legend .orange { background: #ef8a21; } .process-legend .green { background: #23933c; }
    .process-scroll { overflow-x: auto; padding: 22px; }
    .process-scroll:focus-visible { outline: 3px solid #67a8ee; outline-offset: -4px; }
    .process-canvas { background-color: #fbfdff; background-image: linear-gradient(#e9eef5 1px, transparent 1px), linear-gradient(90deg, #e9eef5 1px, transparent 1px); background-size: 24px 24px; border: 1px solid #e0e7f0; border-radius: 12px; height: 780px; min-width: 1420px; position: relative; }
    .stage-label { border-radius: 6px; color: #fff; font-size: .69rem; font-weight: 800; left: 18px; letter-spacing: .06em; padding: 7px 11px; position: absolute; }
    .stage-one { background: #1766c2; top: 18px; } .stage-two { background: #16818a; top: 306px; } .stage-three { background: #7c3fc3; top: 438px; }
    .step { align-items: flex-start; background: #fff; border: 1.5px solid; border-radius: 11px; box-shadow: 0 6px 14px rgba(20, 43, 77, .08); display: flex; gap: 10px; min-height: 95px; padding: 13px; position: absolute; width: 190px; z-index: 2; }
    .step.compact { align-items: center; min-height: 55px; width: 148px; }
    .step-icon { align-items: center; border: 1px solid currentColor; border-radius: 8px; display: flex; flex: 0 0 37px; font-size: .68rem; font-weight: 900; height: 37px; justify-content: center; }
    .step small { display: block; font-size: .61rem; font-weight: 900; letter-spacing: .07em; margin-bottom: 4px; }
    .step h3 { color: #17233b; font-size: .78rem; line-height: 1.28; margin: 0; }
    .step p, .step li { color: #5d687a; font-size: .63rem; line-height: 1.35; }
    .step p { margin: 5px 0 0; } .step ul { margin: 6px 0 0; padding-left: 14px; }
    .step.blue { border-color: #3d83d3; color: #1766c2; } .step.purple { border-color: #9a64d0; color: #7c3fc3; } .step.orange { border-color: #f1a653; color: #df7312; } .step.green { border-color: #62ae70; color: #23843a; } .step.red { border-color: #ed6b64; color: #d92f27; }
    .decision { align-items: center; background: #f8fff7; border: 1.5px solid #6ca563; display: flex; height: 94px; justify-content: center; position: absolute; transform: rotate(45deg); width: 94px; z-index: 2; }
    .decision strong { color: #23332a; font-size: .68rem; line-height: 1.3; padding: 10px; text-align: center; transform: rotate(-45deg); }
    .orange-decision { background: #fffaf4; border-color: #efa04d; }
    .arrow { background: #263746; height: 2px; position: absolute; width: 28px; z-index: 1; }
    .arrow::after { border-bottom: 5px solid transparent; border-left: 8px solid currentColor; border-top: 5px solid transparent; content: ''; position: absolute; right: -1px; top: -4px; }
    .arrow.red { background: #dd3b32; color: #dd3b32; } .arrow.green { background: #259743; color: #259743; } .orange-arrow { background: #e5781a; color: #e5781a; }
    .arrow.left::after { border-left: 0; border-right: 8px solid currentColor; left: -1px; right: auto; }
    .arrow.down { height: 35px; width: 2px; } .arrow.down::after { border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 8px solid currentColor; bottom: -1px; left: -4px; right: auto; top: auto; }
    .arrow.up { height: 42px; width: 2px; } .arrow.up::after { border-bottom: 8px solid currentColor; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 0; left: -4px; right: auto; top: -1px; }
    .route-line { border-left: 2px solid #263746; border-top: 2px solid #263746; position: absolute; z-index: 1; }
    .branch-label, .retry-label { background: #fbfdff; color: #dd3b32; font-size: .63rem; font-weight: 900; padding: 2px 5px; position: absolute; z-index: 3; }
    .sample-ok, .coa-ok, .approval-ok { color: #24923e; }
    .s-email { left: 28px; top: 90px; } .a-email { left: 219px; top: 142px; } .s-ai { left: 247px; top: 90px; } .a-ai { left: 438px; top: 142px; } .s-order { left: 466px; top: 70px; min-height: 135px; width: 220px; } .a-order { left: 687px; top: 142px; } .s-send { left: 715px; top: 90px; width: 205px; } .a-send { left: 921px; top: 142px; }
    .d-sample { left: 963px; top: 95px; } .sample-no { left: 1072px; top: 111px; } .a-sample-no { left: 1062px; top: 142px; width: 80px; } .s-cancel-one { left: 1142px; top: 112px; }
    .sample-ok { left: 1002px; top: 202px; } .a-sample-down { left: 1010px; top: 198px; height: 42px; } .s-coa { left: 902px; top: 240px; width: 210px; } .a-coa-left { left: 858px; top: 292px; width: 44px; } .d-coa { left: 760px; top: 245px; } .coa-no { left: 632px; top: 261px; } .a-coa-no { left: 665px; top: 292px; width: 95px; } .s-cancel-two { left: 516px; top: 262px; }
    .coa-ok { left: 798px; top: 356px; } .coa-route { border-bottom: 2px solid #263746; border-left: 0; border-right: 2px solid #263746; border-top: 0; height: 95px; left: 115px; top: 344px; width: 690px; } .a-formula-in { left: 115px; top: 435px; height: 30px; }
    .s-formula { left: 28px; top: 465px; } .a-formula { left: 219px; top: 517px; } .s-experiment { left: 247px; top: 465px; } .a-experiment { left: 438px; top: 517px; } .s-report { left: 466px; top: 465px; } .a-report { left: 657px; top: 517px; } .s-review { left: 685px; top: 465px; } .a-review { left: 876px; top: 517px; } .d-approval { left: 918px; top: 470px; } .approval-ok { left: 1028px; top: 485px; } .a-approved { left: 1017px; top: 517px; width: 80px; } .s-approved { left: 1097px; top: 487px; }
    .approval-no { left: 943px; top: 582px; } .a-approval-down { left: 965px; top: 575px; height: 62px; } .s-cancel-three { left: 891px; top: 637px; }
    .retry-line { border-bottom: 2px solid #dd3b32; border-left-color: #dd3b32; border-top: 0; height: 92px; left: 115px; top: 590px; width: 776px; } .a-retry { left: 115px; top: 548px; } .retry-label { left: 400px; top: 670px; }
    .process-note { background: #f7faff; border-top: 1px solid #e0e7f0; display: flex; flex-wrap: wrap; gap: 20px; padding: 13px 28px; }
    .process-note span { color: #526179; font-size: .72rem; font-weight: 700; }
    @media (max-width: 800px) { .process-heading { display: block; padding: 20px; } .process-legend { justify-content: flex-start; margin-top: 14px; } .process-scroll { padding: 12px; } }
    :host-context(.dark-theme) .process-page { background: #111827; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .process-heading { background: linear-gradient(135deg, #111827, #17233b); border-color: #334155; }
    :host-context(.dark-theme) h2, :host-context(.dark-theme) .step h3 { color: #f1f5f9; }
    :host-context(.dark-theme) .process-heading p, :host-context(.dark-theme) .process-legend span, :host-context(.dark-theme) .step p, :host-context(.dark-theme) .step li { color: #aebcd0; }
    :host-context(.dark-theme) .process-canvas { background-color: #0f172a; background-image: linear-gradient(#243147 1px, transparent 1px), linear-gradient(90deg, #243147 1px, transparent 1px); border-color: #334155; }
    :host-context(.dark-theme) .step { background: #172033; } :host-context(.dark-theme) .decision { background: #14251c; } :host-context(.dark-theme) .decision strong { color: #e5efe7; }
    :host-context(.dark-theme) .orange-decision { background: #2b2116; } :host-context(.dark-theme) .branch-label, :host-context(.dark-theme) .retry-label { background: #0f172a; }
    :host-context(.dark-theme) .process-note { background: #111827; border-color: #334155; } :host-context(.dark-theme) .process-note span { color: #aebcd0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessGeneralComponent {
  private readonly language = inject(LanguageService);

  copy(en: string, vi: string, zh: string): string {
    const current: AppLanguage = this.language.language();
    return current === 'vi' ? vi : current === 'zh-TW' ? zh : en;
  }
}
