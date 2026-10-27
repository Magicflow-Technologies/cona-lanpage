import { ParticipanteRecord } from './types.js';

interface SessionResponse {
  ok: boolean;
  authenticated: boolean;
  user?: { username: string; role: string };
}

interface ListParticipantesResponse {
  ok: boolean;
  total: number;
  filtrados: number;
  data: ParticipanteRecord[];
  message?: string;
}

class AdminPortalController {
  private readonly loginView: HTMLElement;
  private readonly dashboardView: HTMLElement;
  private readonly loginForm: HTMLFormElement;
  private readonly usernameInput: HTMLInputElement;
  private readonly passwordInput: HTMLInputElement;
  private readonly loginErrorBox: HTMLElement;
  private readonly loginSubmitBtn: HTMLButtonElement;

  private readonly adminUserBadge: HTMLElement;
  private readonly logoutBtn: HTMLButtonElement;
  private readonly searchInput: HTMLInputElement;
  private readonly fechaDesdeInput: HTMLInputElement;
  private readonly fechaHastaInput: HTMLInputElement;
  private readonly clearFiltersBtn: HTMLButtonElement;
  private readonly refreshBtn: HTMLButtonElement;
  private readonly exportExcelBtn: HTMLButtonElement;

  private readonly statTotal: HTMLElement;
  private readonly statSorteo: HTMLElement;
  private readonly statPromos: HTMLElement;
  private readonly statHoy: HTMLElement;
  private readonly tableBody: HTMLElement;
  private readonly resultsCounter: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly toastTitleEl: HTMLElement;
  private readonly toastTextEl: HTMLElement;

  private allRecords: ParticipanteRecord[] = [];
  private toastTimer: number | null = null;

  constructor() {
    this.loginView = document.getElementById('loginView') as HTMLElement;
    this.dashboardView = document.getElementById('dashboardView') as HTMLElement;
    this.loginForm = document.getElementById('adminLoginForm') as HTMLFormElement;
    this.usernameInput = document.getElementById('adminUsername') as HTMLInputElement;
    this.passwordInput = document.getElementById('adminPassword') as HTMLInputElement;
    this.loginErrorBox = document.getElementById('loginErrorBox') as HTMLElement;
    this.loginSubmitBtn = document.getElementById('loginSubmitBtn') as HTMLButtonElement;

    this.adminUserBadge = document.getElementById('adminUserBadge') as HTMLElement;
    this.logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
    this.fechaDesdeInput = document.getElementById('fechaDesde') as HTMLInputElement;
    this.fechaHastaInput = document.getElementById('fechaHasta') as HTMLInputElement;
    this.clearFiltersBtn = document.getElementById('clearFiltersBtn') as HTMLButtonElement;
    this.refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
    this.exportExcelBtn = document.getElementById('exportExcelBtn') as HTMLButtonElement;

    this.statTotal = document.getElementById('statTotal') as HTMLElement;
    this.statSorteo = document.getElementById('statSorteo') as HTMLElement;
    this.statPromos = document.getElementById('statPromos') as HTMLElement;
    this.statHoy = document.getElementById('statHoy') as HTMLElement;
    this.tableBody = document.getElementById('participantsTableBody') as HTMLElement;
    this.resultsCounter = document.getElementById('resultsCounter') as HTMLElement;
    this.toastEl = document.getElementById('adminToast') as HTMLElement;
    this.toastTitleEl = document.getElementById('adminToastTitle') as HTMLElement;
    this.toastTextEl = document.getElementById('adminToastText') as HTMLElement;

    this.bindEvents();
    this.checkSession();
  }

  private notify(title: string, text: string, isError = false): void {
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTitleEl.textContent = title;
    this.toastTextEl.textContent = text;
    this.toastEl.classList.toggle('error', isError);
    this.toastEl.classList.add('show');
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 4500);
  }

  private async checkSession(): Promise<void> {
    try {
      const res = await fetch('/api/admin/session', {
        method: 'GET',
        credentials: 'include'
      });
      if (res.status === 401) {
        this.showLogin('Tu sesión expiró o no está activa. Por favor, inicia sesión.');
        return;
      }
      const data = (await res.json()) as SessionResponse;
      if (data.authenticated && data.user) {
        await this.showDashboard(data.user.username);
      } else {
        this.showLogin();
      }
    } catch {
      this.showLogin();
    }
  }

  private showLogin(errorMessage?: string): void {
    this.dashboardView.hidden = true;
    this.loginView.hidden = false;
    if (errorMessage) {
      this.loginErrorBox.textContent = errorMessage;
      this.loginErrorBox.hidden = false;
    } else {
      this.loginErrorBox.hidden = true;
    }
    this.usernameInput.focus();
  }

  private async showDashboard(username: string): Promise<void> {
    this.adminUserBadge.textContent = `Usuario: ${username}`;
    const loaded = await this.loadParticipants();
    if (loaded) {
      this.loginView.hidden = true;
      this.dashboardView.hidden = false;
    }
  }

  private bindEvents(): void {
    this.loginForm.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      this.loginErrorBox.hidden = true;
      this.loginSubmitBtn.disabled = true;
      this.loginSubmitBtn.textContent = 'Verificando credenciales…';

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: this.usernameInput.value.trim(),
            password: this.passwordInput.value
          })
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          const msg = data.message || 'Credenciales administrativas inválidas.';
          this.showLogin(msg);
          this.notify('Acceso denegado', msg, true);
          return;
        }

        this.passwordInput.value = '';
        await this.showDashboard(data.user?.username || 'admin');
        if (!this.dashboardView.hidden) {
          this.notify('Bienvenido', 'Sesión administrativa iniciada con éxito.');
        }
      } catch {
        this.showLogin('Error de conexión con el servidor. Inténtalo nuevamente.');
      } finally {
        this.loginSubmitBtn.disabled = false;
        this.loginSubmitBtn.textContent = 'Ingresar al Portal Admin';
      }
    });

    this.logoutBtn.addEventListener('click', async () => {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      this.allRecords = [];
      this.notify('Sesión cerrada', 'Has salido del portal administrativo.');
      this.showLogin();
    });

    this.searchInput.addEventListener('input', () => this.applyClientFilters());
    this.fechaDesdeInput.addEventListener('change', () => this.applyClientFilters());
    this.fechaHastaInput.addEventListener('change', () => this.applyClientFilters());

    this.clearFiltersBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.fechaDesdeInput.value = '';
      this.fechaHastaInput.value = '';
      this.applyClientFilters();
    });

    this.refreshBtn.addEventListener('click', () => {
      this.loadParticipants(true);
    });

    this.exportExcelBtn.addEventListener('click', () => {
      this.exportToExcel();
    });
  }

  private async loadParticipants(announceRefresh = false): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/participantes', {
        method: 'GET',
        credentials: 'include'
      });
      if (res.status === 401) {
        const errData = await res.json().catch(() => ({}));
        const msg =
          errData?.message ||
          'No se pudo validar tu sesión administrativa (HTTP 401). Verifica que las cookies estén habilitadas e inicia sesión nuevamente.';
        this.showLogin(msg);
        this.notify('Sesión requerida', msg, true);
        return false;
      }

      const payload = (await res.json()) as ListParticipantesResponse;
      if (!payload.ok) {
        this.notify('Error', payload.message || 'No se pudieron cargar los registros.', true);
        return false;
      }

      this.allRecords = payload.data || [];
      this.updateStats();
      this.applyClientFilters();

      if (announceRefresh) {
        this.notify(
          'Padrón actualizado',
          `Se cargaron ${this.allRecords.length} participantes registrados.`
        );
      }
      return true;
    } catch {
      this.notify('Error de red', 'No fue posible obtener los registros del servidor.', true);
      return false;
    }
  }

  private updateStats(): void {
    const total = this.allRecords.length;
    const sorteoCount = this.allRecords.filter(
      (r) => r.estado_sorteo === 'Participando' && r.consentimiento_datos_personales
    ).length;
    const conHijosCount = this.allRecords.filter((r) => (r.hijos_menores || 0) > 0).length;
    const todayIso = new Date().toISOString().slice(0, 10);
    const hoyCount = this.allRecords.filter(
      (r) => (r.fecha_registro || '').slice(0, 10) === todayIso
    ).length;

    this.statTotal.textContent = String(total);
    this.statSorteo.textContent = String(sorteoCount);
    this.statPromos.textContent = String(conHijosCount);
    this.statHoy.textContent = String(hoyCount);
  }

  private applyClientFilters(): void {
    const query = this.searchInput.value.trim().toLowerCase();
    const desde = this.fechaDesdeInput.value.trim();
    const hasta = this.fechaHastaInput.value.trim();

    const filtered = this.allRecords.filter((item) => {
      if (query) {
        const haystack = [
          item.numero_documento || item.dni || '',
          item.tipo_documento || '',
          item.apellidos || '',
          item.nombres || '',
          item.nombres_apellidos || '',
          item.celular || '',
          item.correo || '',
          item.direccion || '',
          item.ruc_empresa || '',
          item.nombre_proyecto || '',
          item.categoria || '',
          item.especialidad || '',
          item.departamento || '',
          item.provincia || '',
          item.distrito || ''
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      const itemDate = (item.fecha_registro || '').slice(0, 10);
      if (desde && itemDate < desde) return false;
      if (hasta && itemDate > hasta) return false;

      return true;
    });

    this.resultsCounter.textContent = `Mostrando ${filtered.length} de ${this.allRecords.length} participantes registrados`;
    this.renderTable(filtered);
  }

  private formatDateTime(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d);
    } catch {
      return iso;
    }
  }

  private renderTable(records: ParticipanteRecord[]): void {
    this.tableBody.innerHTML = '';

    if (records.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="9" class="empty-cell">
          No se encontraron participantes con los criterios seleccionados.
        </td>
      `;
      this.tableBody.appendChild(tr);
      return;
    }

    records.forEach((r) => {
      const tr = document.createElement('tr');
      const ubicacion = [r.departamento, r.provincia, r.distrito].filter(Boolean).join(' / ');
      const numDoc = r.numero_documento || r.dni || '';
      const nombreCompleto =
        r.apellidos && r.nombres
          ? `${r.apellidos}, ${r.nombres}`
          : r.nombres_apellidos || `${r.nombres || ''} ${r.apellidos || ''}`.trim();

      tr.innerHTML = `
        <td class="col-id">#${r.id}</td>
        <td>
          <span class="doc-badge">${r.tipo_documento || 'DNI'}</span>
          <strong class="doc-num">${numDoc}</strong>
        </td>
        <td>
          <div class="participant-name">${nombreCompleto}</div>
          <small class="participant-meta">Hijos menores: ${r.hijos_menores ?? 0}</small>
        </td>
        <td>
          <span class="doc-badge">${r.categoria}</span>
          ${r.especialidad ? `<small class="participant-meta">Esp.: ${r.especialidad}</small>` : ''}
          ${r.ruc_empresa ? `<small class="participant-meta">RUC: ${r.ruc_empresa}</small>` : ''}
          ${r.nombre_proyecto ? `<small class="participant-meta">Proy.: ${r.nombre_proyecto}</small>` : ''}
        </td>
        <td>
          <div>${r.direccion || '-'}</div>
          <small class="participant-meta">${ubicacion}</small>
        </td>
        <td><a class="table-link" href="tel:${r.celular}">${r.celular}</a></td>
        <td>${r.correo ? `<a class="table-link" href="mailto:${r.correo}">${r.correo}</a>` : '<span class="participant-meta">(No indicado)</span>'}</td>
        <td class="col-date">${this.formatDateTime(r.fecha_registro)}</td>
        <td>
          <span class="status-pill status-active">✓ ${r.estado_sorteo}</span>
        </td>
      `;
      this.tableBody.appendChild(tr);
    });
  }

  private async exportToExcel(): Promise<void> {
    this.exportExcelBtn.disabled = true;
    const originalText = this.exportExcelBtn.innerHTML;
    this.exportExcelBtn.textContent = 'Generando .xlsx…';

    try {
      const params = new URLSearchParams();
      if (this.searchInput.value.trim()) params.set('q', this.searchInput.value.trim());
      if (this.fechaDesdeInput.value.trim()) params.set('desde', this.fechaDesdeInput.value.trim());
      if (this.fechaHastaInput.value.trim()) params.set('hasta', this.fechaHastaInput.value.trim());

      const url = `/api/admin/exportar-excel?${params.toString()}`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401) {
        this.showLogin('Tu sesión expiró (HTTP 401). Inicia sesión nuevamente para exportar.');
        return;
      }

      if (!res.ok) {
        throw new Error('Error generando reporte Excel');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = downloadUrl;
      a.download = `CONA_Participantes_Sorteo_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      this.notify(
        'Exportación exitosa',
        'El archivo Excel (.xlsx) se ha descargado correctamente.'
      );
    } catch {
      this.notify(
        'Error al exportar',
        'No se pudo descargar el archivo Excel. Inténtalo nuevamente.',
        true
      );
    } finally {
      this.exportExcelBtn.disabled = false;
      this.exportExcelBtn.innerHTML = originalText;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AdminPortalController();
});
