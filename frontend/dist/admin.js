class AdminPortalController {
    constructor() {
        this.activeRecords = [];
        this.deletedRecords = [];
        this.currentTab = 'activos';
        this.pendingDeleteId = null;
        this.pendingRestoreId = null;
        this.toastTimer = null;
        this.loginView = document.getElementById('loginView');
        this.dashboardView = document.getElementById('dashboardView');
        this.loginForm = document.getElementById('adminLoginForm');
        this.usernameInput = document.getElementById('adminUsername');
        this.passwordInput = document.getElementById('adminPassword');
        this.loginErrorBox = document.getElementById('loginErrorBox');
        this.loginSubmitBtn = document.getElementById('loginSubmitBtn');
        this.adminUserBadge = document.getElementById('adminUserBadge');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.tabActivosBtn = document.getElementById('tabActivosBtn');
        this.tabEliminadosBtn = document.getElementById('tabEliminadosBtn');
        this.activeCountBadge = document.getElementById('activeCountBadge');
        this.trashCountBadge = document.getElementById('trashCountBadge');
        this.searchInput = document.getElementById('searchInput');
        this.fechaDesdeInput = document.getElementById('fechaDesde');
        this.fechaHastaInput = document.getElementById('fechaHasta');
        this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.exportExcelBtn = document.getElementById('exportExcelBtn');
        this.statTotal = document.getElementById('statTotal');
        this.statSorteo = document.getElementById('statSorteo');
        this.statPromos = document.getElementById('statPromos');
        this.statHoy = document.getElementById('statHoy');
        this.tableBody = document.getElementById('participantsTableBody');
        this.resultsCounter = document.getElementById('resultsCounter');
        this.deleteConfirmModal = document.getElementById('deleteConfirmModal');
        this.deleteModalDesc = document.getElementById('deleteModalDesc');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        this.restoreModal = document.getElementById('restoreModal');
        this.restoreModalDesc = document.getElementById('restoreModalDesc');
        this.restoreErrorBox = document.getElementById('restoreErrorBox');
        this.restoreForm = document.getElementById('restoreForm');
        this.restoreAdminPasswordInput = document.getElementById('restoreAdminPassword');
        this.cancelRestoreBtn = document.getElementById('cancelRestoreBtn');
        this.confirmRestoreBtn = document.getElementById('confirmRestoreBtn');
        this.toastEl = document.getElementById('adminToast');
        this.toastTitleEl = document.getElementById('adminToastTitle');
        this.toastTextEl = document.getElementById('adminToastText');
        this.bindEvents();
        this.checkSession();
    }
    notify(title, text, isError = false) {
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
    async checkSession() {
        try {
            const res = await fetch('/api/admin/session', {
                method: 'GET',
                credentials: 'include'
            });
            if (res.status === 401) {
                this.showLogin('Tu sesión expiró o no está activa. Por favor, inicia sesión.');
                return;
            }
            const data = (await res.json());
            if (data.authenticated && data.user) {
                await this.showDashboard(data.user.username);
            }
            else {
                this.showLogin();
            }
        }
        catch {
            this.showLogin();
        }
    }
    showLogin(errorMessage) {
        this.closeDeleteModal();
        this.closeRestoreModal();
        this.dashboardView.hidden = true;
        this.loginView.hidden = false;
        if (errorMessage) {
            this.loginErrorBox.textContent = errorMessage;
            this.loginErrorBox.hidden = false;
        }
        else {
            this.loginErrorBox.hidden = true;
        }
        this.usernameInput.focus();
    }
    async showDashboard(username) {
        this.adminUserBadge.textContent = `Usuario: ${username}`;
        const loaded = await this.loadParticipants();
        if (loaded) {
            this.loginView.hidden = true;
            this.dashboardView.hidden = false;
        }
    }
    switchTab(tab) {
        this.currentTab = tab;
        const isActivos = tab === 'activos';
        this.tabActivosBtn.classList.toggle('is-active', isActivos);
        this.tabActivosBtn.setAttribute('aria-selected', String(isActivos));
        this.tabEliminadosBtn.classList.toggle('is-active', !isActivos);
        this.tabEliminadosBtn.setAttribute('aria-selected', String(!isActivos));
        this.applyClientFilters();
    }
    bindEvents() {
        this.loginForm.addEventListener('submit', async (e) => {
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
            }
            catch {
                this.showLogin('Error de conexión con el servidor. Inténtalo nuevamente.');
            }
            finally {
                this.loginSubmitBtn.disabled = false;
                this.loginSubmitBtn.textContent = 'Ingresar al Portal Admin';
            }
        });
        this.logoutBtn.addEventListener('click', async () => {
            await fetch('/api/admin/logout', {
                method: 'POST',
                credentials: 'include'
            });
            this.activeRecords = [];
            this.deletedRecords = [];
            this.notify('Sesión cerrada', 'Has salido del portal administrativo.');
            this.showLogin();
        });
        this.tabActivosBtn.addEventListener('click', () => this.switchTab('activos'));
        this.tabEliminadosBtn.addEventListener('click', () => this.switchTab('eliminados'));
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
        // Eventos del Modal de Eliminación (Soft Delete)
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.executeSoftDelete());
        // Eventos del Modal de Restauración con contraseña administrativa
        this.cancelRestoreBtn.addEventListener('click', () => this.closeRestoreModal());
        this.restoreForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.executeRestore();
        });
        // Delegación de clics en los botones Eliminar / Restaurar de la tabla
        this.tableBody.addEventListener('click', (e) => {
            const target = e.target;
            const deleteBtn = target.closest('[data-delete-id]');
            if (deleteBtn) {
                const id = Number(deleteBtn.dataset.deleteId);
                const name = deleteBtn.dataset.participantName || `#${id}`;
                this.openDeleteModal(id, name);
                return;
            }
            const restoreBtn = target.closest('[data-restore-id]');
            if (restoreBtn) {
                const id = Number(restoreBtn.dataset.restoreId);
                const name = restoreBtn.dataset.participantName || `#${id}`;
                this.openRestoreModal(id, name);
            }
        });
    }
    openDeleteModal(id, participantName) {
        this.pendingDeleteId = id;
        this.deleteModalDesc.textContent = `¿Estás seguro de que deseas enviar a "${participantName}" a la papelera de eliminados? Podrás restaurarlo posteriormente ingresando tu contraseña administrativa.`;
        this.deleteConfirmModal.hidden = false;
        this.confirmDeleteBtn.focus();
    }
    closeDeleteModal() {
        this.pendingDeleteId = null;
        this.deleteConfirmModal.hidden = true;
    }
    async executeSoftDelete() {
        if (this.pendingDeleteId === null)
            return;
        const id = this.pendingDeleteId;
        this.confirmDeleteBtn.disabled = true;
        this.confirmDeleteBtn.textContent = 'Eliminando…';
        try {
            const res = await fetch(`/api/admin/participantes/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.status === 401) {
                this.showLogin('Tu sesión expiró (HTTP 401). Inicia sesión nuevamente.');
                return;
            }
            const data = await res.json();
            if (!res.ok || !data.ok) {
                this.notify('No se pudo eliminar', data.message || 'Error al enviar a papelera.', true);
                return;
            }
            this.closeDeleteModal();
            await this.loadParticipants();
            this.notify('Enviado a papelera', data.message || 'Registro enviado a papelera.');
        }
        catch {
            this.notify('Error de red', 'No se pudo conectar con el servidor.', true);
        }
        finally {
            this.confirmDeleteBtn.disabled = false;
            this.confirmDeleteBtn.textContent = '🗑 Sí, Eliminar';
        }
    }
    openRestoreModal(id, participantName) {
        this.pendingRestoreId = id;
        this.restoreErrorBox.hidden = true;
        this.restoreAdminPasswordInput.value = '';
        this.restoreModalDesc.textContent = `Vas a restaurar a "${participantName}" para que vuelva a figurar activo en el padrón oficial y en la exportación de Excel.`;
        this.restoreModal.hidden = false;
        this.restoreAdminPasswordInput.focus();
    }
    closeRestoreModal() {
        this.pendingRestoreId = null;
        this.restoreErrorBox.hidden = true;
        this.restoreAdminPasswordInput.value = '';
        this.restoreModal.hidden = true;
    }
    async executeRestore() {
        if (this.pendingRestoreId === null)
            return;
        const id = this.pendingRestoreId;
        const adminPassword = this.restoreAdminPasswordInput.value;
        if (!adminPassword) {
            this.restoreErrorBox.textContent = 'Ingresa tu contraseña de administrador.';
            this.restoreErrorBox.hidden = false;
            return;
        }
        this.confirmRestoreBtn.disabled = true;
        this.confirmRestoreBtn.textContent = 'Verificando…';
        this.restoreErrorBox.hidden = true;
        try {
            const res = await fetch(`/api/admin/participantes/${id}/restaurar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ adminPassword })
            });
            if (res.status === 401) {
                this.showLogin('Tu sesión expiró (HTTP 401). Inicia sesión nuevamente.');
                return;
            }
            const data = await res.json();
            if (res.status === 403 || !res.ok || !data.ok) {
                const errMsg = data.error ||
                    data.message ||
                    'Contraseña administrativa incorrecta para autorizar la restauración.';
                this.restoreErrorBox.textContent = errMsg;
                this.restoreErrorBox.hidden = false;
                this.notify('Autorización rechazada', errMsg, true);
                this.restoreAdminPasswordInput.focus();
                return;
            }
            this.closeRestoreModal();
            await this.loadParticipants();
            this.notify('Registro restaurado', data.message || 'Registro restaurado exitosamente en el padrón activo.');
        }
        catch {
            this.restoreErrorBox.textContent = 'Error de conexión con el servidor.';
            this.restoreErrorBox.hidden = false;
        }
        finally {
            this.confirmRestoreBtn.disabled = false;
            this.confirmRestoreBtn.textContent = 'Confirmar Reingreso';
        }
    }
    async loadParticipants(announceRefresh = false) {
        try {
            const [activeRes, trashRes] = await Promise.all([
                fetch('/api/admin/participantes', {
                    method: 'GET',
                    credentials: 'include'
                }),
                fetch('/api/admin/participantes/eliminados', {
                    method: 'GET',
                    credentials: 'include'
                })
            ]);
            if (activeRes.status === 401 || trashRes.status === 401) {
                const errData = await activeRes.json().catch(() => ({}));
                const msg = errData?.message ||
                    'No se pudo validar tu sesión administrativa (HTTP 401). Verifica que las cookies estén habilitadas e inicia sesión nuevamente.';
                this.showLogin(msg);
                this.notify('Sesión requerida', msg, true);
                return false;
            }
            const activePayload = (await activeRes.json());
            const trashPayload = trashRes.ok
                ? (await trashRes.json().catch(() => ({ ok: false, total: 0, filtrados: 0, data: [] })))
                : { ok: false, total: 0, filtrados: 0, data: [] };
            if (!activePayload.ok) {
                this.notify('Error', activePayload.message || 'No se pudieron cargar los registros.', true);
                return false;
            }
            this.activeRecords = activePayload.data || [];
            this.deletedRecords = trashPayload.ok ? trashPayload.data || [] : [];
            this.activeCountBadge.textContent = String(this.activeRecords.length);
            this.trashCountBadge.textContent = String(this.deletedRecords.length);
            this.updateStats();
            this.applyClientFilters();
            if (announceRefresh) {
                this.notify('Padrón actualizado', `Activos: ${this.activeRecords.length} · En papelera: ${this.deletedRecords.length}`);
            }
            return true;
        }
        catch {
            this.notify('Error de red', 'No fue posible obtener los registros del servidor.', true);
            return false;
        }
    }
    updateStats() {
        // Las tarjetas de métricas reflejan exclusivamente el padrón activo (WHERE activo = 1)
        const total = this.activeRecords.length;
        const sorteoCount = this.activeRecords.filter((r) => r.estado_sorteo === 'Participando' && r.consentimiento_datos_personales).length;
        const conHijosCount = this.activeRecords.filter((r) => (r.hijos_menores || 0) > 0).length;
        const todayIso = new Date().toISOString().slice(0, 10);
        const hoyCount = this.activeRecords.filter((r) => (r.fecha_registro || '').slice(0, 10) === todayIso).length;
        this.statTotal.textContent = String(total);
        this.statSorteo.textContent = String(sorteoCount);
        this.statPromos.textContent = String(conHijosCount);
        this.statHoy.textContent = String(hoyCount);
    }
    applyClientFilters() {
        const query = this.searchInput.value.trim().toLowerCase();
        const desde = this.fechaDesdeInput.value.trim();
        const hasta = this.fechaHastaInput.value.trim();
        const sourceList = this.currentTab === 'activos' ? this.activeRecords : this.deletedRecords;
        const filtered = sourceList.filter((item) => {
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
            if (desde && itemDate < desde)
                return false;
            if (hasta && itemDate > hasta)
                return false;
            return true;
        });
        const labelTipo = this.currentTab === 'activos' ? 'participantes activos' : 'registros en papelera';
        this.resultsCounter.textContent = `Mostrando ${filtered.length} de ${sourceList.length} ${labelTipo}`;
        this.renderTable(filtered);
    }
    formatDateTime(iso) {
        if (!iso)
            return '-';
        try {
            const normalized = iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`;
            const d = new Date(normalized);
            if (Number.isNaN(d.getTime()))
                return iso;
            return new Intl.DateTimeFormat('es-PE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(d);
        }
        catch {
            return iso;
        }
    }
    renderTable(records) {
        this.tableBody.innerHTML = '';
        if (records.length === 0) {
            const tr = document.createElement('tr');
            const emptyMsg = this.currentTab === 'activos'
                ? 'No se encontraron participantes activos con los criterios seleccionados.'
                : 'La papelera de eliminados está vacía.';
            tr.innerHTML = `
        <td colspan="10" class="empty-cell">
          ${emptyMsg}
        </td>
      `;
            this.tableBody.appendChild(tr);
            return;
        }
        records.forEach((r) => {
            const tr = document.createElement('tr');
            const ubicacion = [r.departamento, r.provincia, r.distrito].filter(Boolean).join(' / ');
            const numDoc = r.numero_documento || r.dni || '';
            const nombreCompleto = r.apellidos && r.nombres
                ? `${r.apellidos}, ${r.nombres}`
                : r.nombres_apellidos || `${r.nombres || ''} ${r.apellidos || ''}`.trim();
            const isTrashView = this.currentTab === 'eliminados';
            const statusHtml = isTrashView
                ? `<span class="status-pill status-deleted">🗑 Eliminado</span>
           ${r.fecha_eliminacion ? `<small class="participant-meta">Baja: ${this.formatDateTime(r.fecha_eliminacion)}</small>` : ''}`
                : `<span class="status-pill status-active">✓ ${r.estado_sorteo}</span>`;
            const actionHtml = isTrashView
                ? `<button type="button" class="btn-restore-row" data-restore-id="${r.id}" data-participant-name="${nombreCompleto}">
             ↺ Restaurar
           </button>`
                : `<button type="button" class="btn-delete-row" data-delete-id="${r.id}" data-participant-name="${nombreCompleto}">
             🗑 Eliminar
           </button>`;
            tr.innerHTML = `
        <td class="col-id">#${r.id}</td>
        <td>
          <span class="doc-badge">${r.tipo_documento || 'DNI'}</span>
          <strong class="doc-num">${numDoc}</strong>
          ${r.fecha_nacimiento ? `<small class="participant-meta">Nac.: ${r.fecha_nacimiento}</small>` : ''}
        </td>
        <td>
          <div class="participant-name">${nombreCompleto}</div>
          <small class="participant-meta">Hijos menores: ${r.hijos_menores ?? 0}</small>
        </td>
        <td>
          <span class="doc-badge">${r.categoria_laboral || r.categoria || '-'}</span>
          ${(r.especialidad_laboral || r.especialidad) ? `<small class="participant-meta">Esp.: ${r.especialidad_laboral || r.especialidad}</small>` : ''}
          ${r.trabaja_en_obra !== undefined ? `<small class="participant-meta">En obra: ${r.trabaja_en_obra ? 'Sí' : 'No'}</small>` : ''}
          ${(r.ruc_empleador || r.ruc_empresa) ? `<small class="participant-meta">RUC: ${r.ruc_empleador || r.ruc_empresa}</small>` : ''}
          ${r.nombre_proyecto ? `<small class="participant-meta">Proy.: ${r.nombre_proyecto}</small>` : ''}
        </td>
        <td>
          <div>${r.direccion_domiciliaria || r.direccion || '-'}</div>
          <small class="participant-meta">${ubicacion}</small>
        </td>
        <td><a class="table-link" href="tel:${r.celular}">${r.celular}</a></td>
        <td>${r.correo ? `<a class="table-link" href="mailto:${r.correo}">${r.correo}</a>` : '<span class="participant-meta">(No indicado)</span>'}</td>
        <td class="col-date">${this.formatDateTime(r.fecha_registro)}</td>
        <td>${statusHtml}</td>
        <td>${actionHtml}</td>
      `;
            this.tableBody.appendChild(tr);
        });
    }
    async exportToExcel() {
        this.exportExcelBtn.disabled = true;
        const originalText = this.exportExcelBtn.innerHTML;
        this.exportExcelBtn.textContent = 'Generando .xlsx…';
        try {
            const params = new URLSearchParams();
            if (this.searchInput.value.trim())
                params.set('q', this.searchInput.value.trim());
            if (this.fechaDesdeInput.value.trim())
                params.set('desde', this.fechaDesdeInput.value.trim());
            if (this.fechaHastaInput.value.trim())
                params.set('hasta', this.fechaHastaInput.value.trim());
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
            this.notify('Exportación exitosa', 'El archivo Excel (.xlsx) con el padrón activo se ha descargado correctamente.');
        }
        catch {
            this.notify('Error al exportar', 'No se pudo descargar el archivo Excel. Inténtalo nuevamente.', true);
        }
        finally {
            this.exportExcelBtn.disabled = false;
            this.exportExcelBtn.innerHTML = originalText;
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new AdminPortalController();
});
export {};
