
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-qms-shell', standalone: true, imports: [RouterModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="qms-app">
      <aside>
        <a class="brand" routerLink="/"><span class="brand-mark">G</span><span><strong>GIAVICO</strong><small>Quality management</small></span></a>
        <nav>
          <span class="nav-heading">Overview</span><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}"><mat-icon>space_dashboard</mat-icon>Dashboard</a>
          <span class="nav-heading">Document control</span><a routerLink="/documents" routerLinkActive="active"><mat-icon>description</mat-icon>All documents</a>
          <a routerLink="/documents/new" [queryParams]="{type:'NEW_PRODUCT_NOTICE'}"><mat-icon>science</mat-icon>Product development</a>
          <a routerLink="/documents" [queryParams]="{category:'change'}"><mat-icon>change_circle</mat-icon>Change control</a>
          <a routerLink="/documents" [queryParams]="{category:'standard'}"><mat-icon>fact_check</mat-icon>Acceptance standards</a>
          <a routerLink="/documents" [queryParams]="{type:'RECEIPT_TRACKING'}"><mat-icon>move_to_inbox</mat-icon>Receipt tracking</a>
        </nav>
        <div class="sidebar-foot"><mat-icon>verified_user</mat-icon><span><strong>Controlled workspace</strong><small>Mock API mode</small></span></div>
      </aside>
      <section class="workspace">
        <header><div class="crumb"><mat-icon>corporate_fare</mat-icon><span>Food Manufacturing QMS</span></div><div class="header-actions"><button mat-icon-button aria-label="Notifications"><mat-icon>notifications_none</mat-icon></button><span class="avatar">QA</span><span class="user"><strong>Quality Admin</strong><small>Document Control</small></span></div></header>
        <main><router-outlet /></main>
      </section>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsShellComponent {}
