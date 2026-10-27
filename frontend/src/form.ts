import { ApiResponse, HijoFormItem, ParticipantePayload, TipoDocumento } from './types.js';

const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

interface UbigeoData {
  departamentos: Array<{ id: string; departamento: string }>;
  provincias: Array<{ id: string; provincia: string; departamento_id: string }>;
  distritos: Array<{
    id: string;
    ubigeo: string;
    distrito: string;
    provincia_id: string;
    departamento_id: string;
  }>;
}

const UBIGEO_CSV =
  'https://raw.githubusercontent.com/Rodasluis/Peru-maps/main/salida/ubigeos_2026.csv';
const UBIGEO_FALLBACK = {
  departamentos:
    'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/1_ubigeo_departamentos.json',
  provincias:
    'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/2_ubigeo_provincias.json',
  distritos:
    'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/3_ubigeo_distritos.json'
};

const LOCAL_UBIGEO_FALLBACK: UbigeoData = {
  departamentos: [
    { id: '150000', departamento: 'Lima' },
    { id: '040000', departamento: 'Arequipa' },
    { id: '130000', departamento: 'La Libertad' },
    { id: '080000', departamento: 'Cusco' },
    { id: '200000', departamento: 'Piura' },
    { id: '070000', departamento: 'Callao' }
  ],
  provincias: [
    { id: '150100', provincia: 'Lima', departamento_id: '150000' },
    { id: '040100', provincia: 'Arequipa', departamento_id: '040000' },
    { id: '130100', provincia: 'Trujillo', departamento_id: '130000' },
    { id: '080100', provincia: 'Cusco', departamento_id: '080000' },
    { id: '200100', provincia: 'Piura', departamento_id: '200000' },
    { id: '070100', provincia: 'Callao', departamento_id: '070000' }
  ],
  distritos: [
    { id: '150101', ubigeo: '150101', distrito: 'Lima', provincia_id: '150100', departamento_id: '150000' },
    { id: '150115', ubigeo: '150115', distrito: 'La Victoria', provincia_id: '150100', departamento_id: '150000' },
    { id: '150132', ubigeo: '150132', distrito: 'San Juan de Lurigancho', provincia_id: '150100', departamento_id: '150000' },
    { id: '150142', ubigeo: '150142', distrito: 'Villa El Salvador', provincia_id: '150100', departamento_id: '150000' },
    { id: '040101', ubigeo: '040101', distrito: 'Arequipa', provincia_id: '040100', departamento_id: '040000' },
    { id: '130101', ubigeo: '130101', distrito: 'Trujillo', provincia_id: '130100', departamento_id: '130000' },
    { id: '080101', ubigeo: '080101', distrito: 'Cusco', provincia_id: '080100', departamento_id: '080000' },
    { id: '200101', ubigeo: '200101', distrito: 'Piura', provincia_id: '200100', departamento_id: '200000' },
    { id: '070101', ubigeo: '070101', distrito: 'Callao', provincia_id: '070100', departamento_id: '070000' }
  ]
};

export class FormController {
  private readonly form: HTMLFormElement;
  private readonly tipoDocSelect: HTMLSelectElement;
  private readonly docLabel: HTMLElement | null;
  private readonly docHint: HTMLElement | null;
  private readonly numDocInput: HTMLInputElement;
  private readonly apellidosInput: HTMLInputElement;
  private readonly nombresInput: HTMLInputElement;
  private readonly celularInput: HTMLInputElement;
  private readonly correoInput: HTMLInputElement;
  private readonly direccionInput: HTMLInputElement;
  private readonly dptoSelect: HTMLSelectElement;
  private readonly provSelect: HTMLSelectElement;
  private readonly distSelect: HTMLSelectElement;
  private readonly ubigeoInput: HTMLInputElement;
  private readonly ubigeoStatus: HTMLElement;
  private readonly rucEmpresaInput: HTMLInputElement;
  private readonly nombreProyectoInput: HTMLInputElement;
  private readonly categoriaSelect: HTMLSelectElement;
  private readonly especialidadInput: HTMLInputElement;
  private readonly hijosInput: HTMLInputElement;
  private readonly sinHijosCheck: HTMLInputElement;
  private readonly agregarHijoBtn: HTMLButtonElement;
  private readonly quitarHijoBtn: HTMLButtonElement;
  private readonly childrenList: HTMLElement;
  private readonly consentimientoDatosCheck: HTMLInputElement;
  private readonly consentToggle: HTMLButtonElement;
  private readonly consentDetail: HTMLElement;
  private readonly submitBtn: HTMLButtonElement;
  private readonly toastEl: HTMLElement;
  private readonly toastTitleEl: HTMLElement;
  private readonly toastTextEl: HTMLElement;
  private toastTimeout: number | null = null;
  private ubigeoData: UbigeoData = LOCAL_UBIGEO_FALLBACK;

  constructor(private readonly apiEndpoint = '/api/participantes') {
    this.form = document.getElementById('updateDataForm') as HTMLFormElement;
    this.tipoDocSelect = document.getElementById('tipo_documento') as HTMLSelectElement;
    this.docLabel = document.getElementById('docLabel') as HTMLElement | null;
    this.docHint = document.getElementById('docHint') as HTMLElement | null;
    this.numDocInput = (document.getElementById('numero_documento') ||
      document.getElementById('dni')) as HTMLInputElement;
    this.apellidosInput = document.getElementById('apellidos') as HTMLInputElement;
    this.nombresInput = document.getElementById('nombres') as HTMLInputElement;
    this.celularInput = document.getElementById('celular') as HTMLInputElement;
    this.correoInput = document.getElementById('correo') as HTMLInputElement;
    this.direccionInput = document.getElementById('direccion') as HTMLInputElement;
    this.dptoSelect = document.getElementById('departamento') as HTMLSelectElement;
    this.provSelect = document.getElementById('provincia') as HTMLSelectElement;
    this.distSelect = document.getElementById('distrito') as HTMLSelectElement;
    this.ubigeoInput = document.getElementById('ubigeo') as HTMLInputElement;
    this.ubigeoStatus = document.getElementById('ubigeoStatus') as HTMLElement;
    this.rucEmpresaInput = document.getElementById('ruc_empresa') as HTMLInputElement;
    this.nombreProyectoInput = document.getElementById('nombre_proyecto') as HTMLInputElement;
    this.categoriaSelect = document.getElementById('categoria') as HTMLSelectElement;
    this.especialidadInput = document.getElementById('especialidad') as HTMLInputElement;
    this.hijosInput = document.getElementById('hijos') as HTMLInputElement;
    this.sinHijosCheck = document.getElementById('sinHijos') as HTMLInputElement;
    this.agregarHijoBtn = document.getElementById('agregarHijo') as HTMLButtonElement;
    this.quitarHijoBtn = document.getElementById('quitarHijo') as HTMLButtonElement;
    this.childrenList = document.getElementById('childrenList') as HTMLElement;
    this.consentimientoDatosCheck = document.getElementById(
      'consentimientoDatos'
    ) as HTMLInputElement;
    this.consentToggle = document.getElementById('consentToggle') as HTMLButtonElement;
    this.consentDetail = document.getElementById('consentDetail') as HTMLElement;
    this.submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
    this.toastEl = document.getElementById('toast') as HTMLElement;
    this.toastTitleEl = document.getElementById('toastTitle') as HTMLElement;
    this.toastTextEl = document.getElementById('toastText') as HTMLElement;

    this.initDocumentTypeSwitch();
    this.initRealtimeValidation();
    this.initConsentAccordion();
    this.initChildrenControls();
    this.initUbigeoCatalog();
    this.bindSubmit();
  }

  public announce(title: string, message: string, isError = false): void {
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    this.toastTitleEl.textContent = '';
    this.toastTextEl.textContent = '';

    window.requestAnimationFrame(() => {
      this.toastTitleEl.textContent = title;
      this.toastTextEl.textContent = message;
      this.toastEl.classList.toggle('error', isError);
      this.toastEl.classList.add('show');
    });

    this.toastTimeout = window.setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 4500);
  }

  private setFieldError(input: HTMLElement, errorMessage: string): void {
    const fieldContainer = input.closest('.field') || input.parentElement;
    if (!fieldContainer) return;

    let errorEl = fieldContainer.querySelector<HTMLElement>('.field-error-msg');
    if (!errorEl) {
      errorEl = document.createElement('small');
      errorEl.className = 'field-error-msg';
      errorEl.setAttribute('role', 'alert');
      fieldContainer.appendChild(errorEl);
    }

    if (errorMessage) {
      errorEl.textContent = errorMessage;
      errorEl.style.display = 'block';
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      input.setAttribute('aria-invalid', 'false');
    }
  }

  private initDocumentTypeSwitch(): void {
    if (!this.tipoDocSelect) return;
    this.tipoDocSelect.addEventListener('change', () => {
      this.updateDocumentRules();
    });
    this.updateDocumentRules();
  }

  private updateDocumentRules(): void {
    if (!this.tipoDocSelect || !this.numDocInput) return;
    const tipo = this.tipoDocSelect.value;
    if (tipo === 'Carnet de Extranjería' || tipo === 'Carnet de Extranjeria') {
      if (this.docLabel) {
        this.docLabel.innerHTML = 'Número de documento (Carnet de Extranjería) <span class="req">*</span>';
      }
      this.numDocInput.placeholder = '9 dígitos numéricos';
      this.numDocInput.maxLength = 9;
      this.numDocInput.pattern = '[0-9]{9}';
      if (this.docHint) {
        this.docHint.textContent = 'Ingresa exactamente 9 dígitos numéricos.';
      }
    } else {
      if (this.docLabel) {
        this.docLabel.innerHTML = 'Número de documento (DNI) <span class="req">*</span>';
      }
      this.numDocInput.placeholder = '8 dígitos numéricos';
      this.numDocInput.maxLength = 8;
      this.numDocInput.pattern = '[0-9]{8}';
      if (this.docHint) {
        this.docHint.textContent = 'Ingresa exactamente 8 dígitos numéricos.';
      }
    }

    if (this.numDocInput.value.length > this.numDocInput.maxLength) {
      this.numDocInput.value = this.numDocInput.value.slice(0, this.numDocInput.maxLength);
    }
    this.setFieldError(this.numDocInput, '');
  }

  private initRealtimeValidation(): void {
    [this.numDocInput, this.celularInput, this.rucEmpresaInput].forEach((el) => {
      if (!el) return;
      el.addEventListener('input', () => {
        el.value = el.value.replace(/\D/g, '');
        this.setFieldError(el, '');
      });
    });

    [this.apellidosInput, this.nombresInput, this.direccionInput].forEach((el) => {
      if (!el) return;
      el.addEventListener('input', () => {
        this.setFieldError(el, '');
      });
    });

    if (this.correoInput) {
      this.correoInput.addEventListener('input', () => {
        const val = this.correoInput.value.trim();
        if (val && !RFC_EMAIL_REGEX.test(val)) {
          this.setFieldError(this.correoInput, 'Formato de correo inválido.');
        } else {
          this.setFieldError(this.correoInput, '');
        }
      });
    }

    if (this.rucEmpresaInput) {
      this.rucEmpresaInput.addEventListener('blur', () => {
        const val = this.rucEmpresaInput.value.trim();
        if (val && !/^[0-9]{11}$/.test(val)) {
          this.setFieldError(
            this.rucEmpresaInput,
            'El RUC debe tener exactamente 11 dígitos numéricos.'
          );
        } else {
          this.setFieldError(this.rucEmpresaInput, '');
        }
      });
    }
  }

  private initConsentAccordion(): void {
    this.consentToggle.addEventListener('click', () => {
      const willOpen = this.consentDetail.hidden;
      this.consentDetail.hidden = !willOpen;
      this.consentToggle.setAttribute('aria-expanded', String(willOpen));
      this.consentToggle.textContent = willOpen
        ? 'Ocultar autorización'
        : 'Ver autorización completa';
      if (willOpen) {
        this.consentDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  private renderChildren = (): void => {
    const previous = Array.from(this.childrenList.querySelectorAll('.child-card')).map(
      (_, idx) => ({
        edad:
          (document.getElementById(`hijo_${idx + 1}_edad`) as HTMLInputElement | null)?.value || '',
        sexo:
          (document.getElementById(`hijo_${idx + 1}_sexo`) as HTMLSelectElement | null)?.value || ''
      })
    );

    const count = Math.max(
      0,
      Math.min(20, Number.parseInt(this.hijosInput.value || '0', 10) || 0)
    );
    this.hijosInput.value = String(count);
    this.sinHijosCheck.checked = count === 0;
    this.agregarHijoBtn.disabled = count >= 20;
    this.quitarHijoBtn.disabled = count <= 0;
    this.childrenList.innerHTML = '';

    if (count === 0) {
      this.childrenList.innerHTML =
        '<div class="children-empty">No se han registrado hijos menores de edad.</div>';
      return;
    }

    for (let i = 1; i <= count; i++) {
      const card = document.createElement('div');
      card.className = 'child-card';
      card.innerHTML = `
        <div class="child-badge">Hijo(a)<br>${i}</div>
        <div class="field">
          <label for="hijo_${i}_edad">Edad <span class="req">*</span></label>
          <input id="hijo_${i}_edad" name="hijo_${i}_edad" type="number" inputmode="numeric" min="0" max="17" step="1" required placeholder="Edad" aria-label="Edad del hijo ${i}">
        </div>
        <div class="field">
          <label for="hijo_${i}_sexo">Sexo <span class="req">*</span></label>
          <select id="hijo_${i}_sexo" name="hijo_${i}_sexo" required aria-label="Sexo del hijo ${i}">
            <option value="">Selecciona</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>
        </div>`;
      this.childrenList.appendChild(card);

      if (previous[i - 1]) {
        const edadEl = document.getElementById(`hijo_${i}_edad`) as HTMLInputElement | null;
        const sexoEl = document.getElementById(`hijo_${i}_sexo`) as HTMLSelectElement | null;
        if (edadEl) edadEl.value = previous[i - 1].edad;
        if (sexoEl) sexoEl.value = previous[i - 1].sexo;
      }
    }
  };

  private initChildrenControls(): void {
    this.sinHijosCheck.addEventListener('change', () => {
      if (this.sinHijosCheck.checked) {
        this.hijosInput.value = '0';
      } else if (Number.parseInt(this.hijosInput.value || '0', 10) === 0) {
        this.hijosInput.value = '1';
      }
      this.renderChildren();
    });

    this.hijosInput.addEventListener('input', this.renderChildren);
    this.hijosInput.addEventListener('change', this.renderChildren);

    this.agregarHijoBtn.addEventListener('click', () => {
      const count = Math.max(0, Number.parseInt(this.hijosInput.value || '0', 10) || 0);
      if (count < 20) this.hijosInput.value = String(count + 1);
      this.renderChildren();
    });

    this.quitarHijoBtn.addEventListener('click', () => {
      const count = Math.max(0, Number.parseInt(this.hijosInput.value || '0', 10) || 0);
      if (count > 0) this.hijosInput.value = String(count - 1);
      this.renderChildren();
    });

    this.renderChildren();
  }

  private createOption(value: string, text: string): HTMLOptionElement {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  }

  private resetSelect(select: HTMLSelectElement, placeholder: string): void {
    select.innerHTML = '';
    select.appendChild(this.createOption('', placeholder));
  }

  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === ',' && !quoted) {
        out.push(value);
        value = '';
      } else {
        value += ch;
      }
    }
    out.push(value);
    return out;
  }

  private normalizeUbigeoCsv(csvText: string): UbigeoData {
    const lines = csvText
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(Boolean);
    const headers = this.parseCsvLine(lines.shift() || '');
    const rows = lines.map((line) => {
      const cols = this.parseCsvLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
    });
    const departamentos = rows
      .filter((r) => r.nivel === 'departamento')
      .map((r) => ({ id: r.ubigeo, departamento: r.nombre }));
    const provincias = rows
      .filter((r) => r.nivel === 'provincia')
      .map((r) => ({
        id: r.ubigeo,
        provincia: r.nombre,
        departamento_id: r.ubigeo_departamento
      }));
    const distritos = rows
      .filter((r) => r.nivel === 'distrito')
      .map((r) => ({
        id: r.ubigeo,
        ubigeo: r.ubigeo,
        distrito: r.nombre,
        provincia_id: r.ubigeo_provincia,
        departamento_id: r.ubigeo_departamento
      }));
    if (!departamentos.length || !provincias.length || !distritos.length) {
      throw new Error('Catálogo UBIGEO incompleto');
    }
    return { departamentos, provincias, distritos };
  }

  private async loadUbigeoFallback(): Promise<UbigeoData> {
    const [rd, rp, rdi] = await Promise.all([
      fetch(UBIGEO_FALLBACK.departamentos),
      fetch(UBIGEO_FALLBACK.provincias),
      fetch(UBIGEO_FALLBACK.distritos)
    ]);
    if (!rd.ok || !rp.ok || !rdi.ok) {
      throw new Error('No se pudo cargar el catálogo alternativo');
    }
    return {
      departamentos: await rd.json(),
      provincias: await rp.json(),
      distritos: await rdi.json()
    };
  }

  private async initUbigeoCatalog(): Promise<void> {
    this.ubigeoStatus.style.display = 'block';
    this.ubigeoStatus.style.color = 'var(--cona-blue)';
    this.ubigeoStatus.textContent = 'Cargando catálogo de ubicaciones del Perú…';
    this.dptoSelect.disabled = true;
    this.provSelect.disabled = true;
    this.distSelect.disabled = true;

    try {
      try {
        const res = await fetch(UBIGEO_CSV, { cache: 'force-cache' });
        if (!res.ok) throw new Error('No se pudo cargar el catálogo UBIGEO');
        this.ubigeoData = this.normalizeUbigeoCsv(await res.text());
      } catch {
        try {
          this.ubigeoData = await this.loadUbigeoFallback();
        } catch {
          this.ubigeoData = LOCAL_UBIGEO_FALLBACK;
        }
      }
      this.resetSelect(this.dptoSelect, 'Departamento');
      this.resetSelect(this.provSelect, 'Provincia');
      this.resetSelect(this.distSelect, 'Distrito');
      this.ubigeoData.departamentos
        .slice()
        .sort((a, b) => a.departamento.localeCompare(b.departamento, 'es', { sensitivity: 'base' }))
        .forEach((x) => this.dptoSelect.appendChild(this.createOption(String(x.id), x.departamento)));
      this.dptoSelect.disabled = false;
      this.ubigeoStatus.style.display = 'none';
    } catch {
      this.ubigeoStatus.textContent =
        'No fue posible cargar el catálogo de ubicaciones. Verifica tu conexión a internet y recarga la página.';
      this.ubigeoStatus.style.color = '#b42318';
      this.dptoSelect.disabled = true;
    }

    this.dptoSelect.addEventListener('change', () => {
      this.resetSelect(this.provSelect, 'Provincia');
      this.resetSelect(this.distSelect, 'Distrito');
      this.distSelect.disabled = true;
      this.ubigeoInput.value = '';
      if (!this.dptoSelect.value) {
        this.provSelect.disabled = true;
        return;
      }
      const list = this.ubigeoData.provincias
        .filter((x) => String(x.departamento_id) === this.dptoSelect.value)
        .sort((a, b) => a.provincia.localeCompare(b.provincia, 'es', { sensitivity: 'base' }));
      list.forEach((x) => this.provSelect.appendChild(this.createOption(String(x.id), x.provincia)));
      this.provSelect.disabled = false;
    });

    this.provSelect.addEventListener('change', () => {
      this.resetSelect(this.distSelect, 'Distrito');
      this.ubigeoInput.value = '';
      if (!this.provSelect.value) {
        this.distSelect.disabled = true;
        return;
      }
      const list = this.ubigeoData.distritos
        .filter((x) => String(x.provincia_id) === this.provSelect.value)
        .sort((a, b) => a.distrito.localeCompare(b.distrito, 'es', { sensitivity: 'base' }));
      list.forEach((x) => this.distSelect.appendChild(this.createOption(String(x.id), x.distrito)));
      this.distSelect.disabled = false;
    });

    this.distSelect.addEventListener('change', () => {
      const item = this.ubigeoData.distritos.find((x) => String(x.id) === this.distSelect.value);
      this.ubigeoInput.value = item ? item.ubigeo : '';
    });
  }

  private firstInvalidField(): void {
    const el = this.form.querySelector<HTMLElement>(':invalid');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => el.focus({ preventScroll: true }), 350);
  }

  private bindSubmit(): void {
    this.form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();

      if (!this.form.checkValidity()) {
        this.form.reportValidity();
        this.firstInvalidField();
        this.announce(
          'Revisa el formulario',
          'Hay campos obligatorios pendientes de completar.',
          true
        );
        return;
      }

      const rawTipo = this.tipoDocSelect.value;
      const tipoDocValue: TipoDocumento =
        rawTipo === 'Carnet de Extranjería' || rawTipo === 'Carnet de Extranjeria'
          ? 'Carnet de Extranjería'
          : 'DNI';

      const numDocVal = this.numDocInput.value.trim().replace(/\D/g, '');
      const expectedLength = tipoDocValue === 'Carnet de Extranjería' ? 9 : 8;
      const docName =
        tipoDocValue === 'Carnet de Extranjería' ? 'Carnet de Extranjería' : 'DNI';

      if (numDocVal.length !== expectedLength) {
        this.setFieldError(
          this.numDocInput,
          `El ${docName} debe tener exactamente ${expectedLength} dígitos numéricos.`
        );
        this.announce(
          'Documento inválido',
          `El ${docName} debe tener exactamente ${expectedLength} dígitos numéricos.`,
          true
        );
        this.numDocInput.focus();
        return;
      }

      const rucVal = this.rucEmpresaInput.value.trim().replace(/\D/g, '');
      if (rucVal.length > 0 && rucVal.length !== 11) {
        this.setFieldError(
          this.rucEmpresaInput,
          'El RUC de la empresa debe tener exactamente 11 dígitos numéricos.'
        );
        this.announce(
          'RUC inválido',
          'Si ingresas el RUC de la empresa, debe tener exactamente 11 dígitos numéricos.',
          true
        );
        this.rucEmpresaInput.focus();
        return;
      }

      if (!this.ubigeoInput.value) {
        this.announce('Ubicación incompleta', 'Selecciona departamento, provincia y distrito.', true);
        this.distSelect.focus();
        return;
      }

      const countHijos = Math.max(
        0,
        Number.parseInt(this.hijosInput.value || '0', 10) || 0
      );
      const hijos: HijoFormItem[] = Array.from({ length: countHijos }, (_, idx) => {
        const n = idx + 1;
        const edadEl = document.getElementById(`hijo_${n}_edad`) as HTMLInputElement | null;
        const sexoEl = document.getElementById(`hijo_${n}_sexo`) as HTMLSelectElement | null;
        return {
          orden: n,
          edad: Number(edadEl?.value || 0),
          sexo: sexoEl?.value === 'Femenino' ? 'Femenino' : 'Masculino'
        };
      });

      const dptoText = this.dptoSelect.options[this.dptoSelect.selectedIndex]?.text || '';
      const provText = this.provSelect.options[this.provSelect.selectedIndex]?.text || '';
      const distText = this.distSelect.options[this.distSelect.selectedIndex]?.text || '';

      const payload: ParticipantePayload = {
        tipo_documento: tipoDocValue,
        numero_documento: numDocVal,
        apellidos: this.apellidosInput.value.trim(),
        nombres: this.nombresInput.value.trim(),
        celular: this.celularInput.value.trim(),
        correo: this.correoInput.value.trim(),
        direccion: this.direccionInput.value.trim(),
        departamento: dptoText,
        provincia: provText,
        distrito: distText,
        ubigeo: this.ubigeoInput.value,
        ruc_empresa: rucVal,
        nombre_proyecto: this.nombreProyectoInput.value.trim(),
        categoria: this.categoriaSelect.value,
        especialidad: this.especialidadInput.value.trim(),
        hijos_menores: countHijos,
        sin_hijos: countHijos === 0,
        hijos,
        hijos_json: JSON.stringify(hijos),
        consentimiento_datos_personales: this.consentimientoDatosCheck.checked,
        version_consentimiento: '2026-10-16',
        fecha_registro: new Date().toISOString()
      };

      this.submitBtn.disabled = true;
      this.submitBtn.textContent = 'Enviando…';

      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = (await response.json()) as ApiResponse;

        if (response.status === 409) {
          this.setFieldError(this.numDocInput, result.message);
          this.announce(`${docName} ya registrado`, result.message, true);
          this.numDocInput.focus();
          return;
        }

        if (!response.ok || !result.ok) {
          this.announce(
            'No se pudo enviar',
            result.message || 'Intenta nuevamente en unos momentos.',
            true
          );
          return;
        }

        this.announce(
          '¡Datos actualizados!',
          'Tu información fue actualizada correctamente y ya estás participando en el sorteo.',
          false
        );
        this.showSuccessScreen(payload);
        return;
      } catch {
        this.announce('No se pudo enviar', 'Intenta nuevamente en unos momentos.', true);
      } finally {
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Actualizar datos y participar';
      }
    });
  }

  private resetFormState(): void {
    if (this.form) {
      this.form.reset();
    }
    if (this.tipoDocSelect) {
      this.tipoDocSelect.value = 'DNI';
      this.updateDocumentRules();
    }
    if (this.dptoSelect) {
      this.dptoSelect.value = '';
    }
    if (this.provSelect) {
      this.resetSelect(this.provSelect, 'Provincia');
      this.provSelect.disabled = true;
    }
    if (this.distSelect) {
      this.resetSelect(this.distSelect, 'Distrito');
      this.distSelect.disabled = true;
    }
    if (this.ubigeoInput) {
      this.ubigeoInput.value = '';
    }
    if (this.hijosInput) {
      this.hijosInput.value = '1';
    }
    if (this.sinHijosCheck) {
      this.sinHijosCheck.checked = false;
    }
    this.renderChildren();

    this.form?.querySelectorAll('.is-valid, .is-invalid').forEach((el) => {
      el.classList.remove('is-valid', 'is-invalid');
      el.removeAttribute('aria-invalid');
    });
    this.form?.querySelectorAll<HTMLElement>('.field-error-msg').forEach((el) => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }

  private showSuccessScreen(payload: ParticipantePayload): void {
    const shell = document.getElementById('actualizacion');
    if (!shell) return;

    const nombreCompleto = `${payload.nombres} ${payload.apellidos}`.trim();

    // Ocultar el bloque de introducción y el formulario mientras se muestra la confirmación de éxito
    const introEl = shell.querySelector<HTMLElement>('.intro');
    if (introEl) introEl.hidden = true;
    if (this.form) this.form.hidden = true;

    let successContainer = document.getElementById('successScreenContainer');
    if (!successContainer) {
      successContainer = document.createElement('div');
      successContainer.id = 'successScreenContainer';
      shell.appendChild(successContainer);
    }

    successContainer.innerHTML = `
      <div class="success-card" role="dialog" aria-modal="true" aria-labelledby="successTitleHeading">
        <div class="success-icon-wrap">
          <div class="success-icon" aria-hidden="true">✓</div>
        </div>

        <div class="success-badge">
          <span>✓</span> Registro completado con éxito
        </div>

        <h2 class="success-title" id="successTitleHeading">¡Muchas gracias por tu participación!</h2>

        <p class="success-subtitle">
          Tus datos han sido actualizados exitosamente en <strong>CONA</strong> y ya estás participando en el <strong>sorteo de grandes premios para tu hogar</strong>.
        </p>

        <div class="success-ticket">
          <div class="ticket-header">
            <span class="ticket-brand">CONA · Campaña de Actualización</span>
            <span class="ticket-status">Registrado</span>
          </div>
          <div class="ticket-grid">
            <div class="ticket-item">
              <span class="ticket-label">Aportante</span>
              <span class="ticket-value">${this.escapeHtml(nombreCompleto)}</span>
            </div>
            <div class="ticket-item">
              <span class="ticket-label">${this.escapeHtml(payload.tipo_documento)}</span>
              <span class="ticket-value">${this.escapeHtml(payload.numero_documento)}</span>
            </div>
            <div class="ticket-item">
              <span class="ticket-label">Categoría</span>
              <span class="ticket-value">${this.escapeHtml(payload.categoria)}${payload.especialidad ? ` (${this.escapeHtml(payload.especialidad)})` : ''}</span>
            </div>
            <div class="ticket-item">
              <span class="ticket-label">Ubicación</span>
              <span class="ticket-value">${this.escapeHtml(`${payload.distrito}, ${payload.provincia}`)}</span>
            </div>
          </div>
          <div class="ticket-footer">
            <span>Comprobante de actualización para sorteo CONA 2026</span>
          </div>
        </div>

        <div class="success-notice">
          <p>
            <strong>Información importante:</strong> Tu actualización ya quedó guardada de forma segura. Presiona el botón inferior para finalizar y volver al inicio de la página.
          </p>
        </div>

        <div class="success-actions">
          <button type="button" class="btn-close-window" id="btnCloseWindow">
            Cerrar página
          </button>
          <p class="close-hint" id="closeHint">
            Al cerrar se limpiará el formulario y volverás al inicio de la campaña.
          </p>
        </div>
      </div>
    `;

    shell.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const btnClose = document.getElementById('btnCloseWindow') as HTMLButtonElement | null;
    if (btnClose) {
      btnClose.focus();
      btnClose.addEventListener('click', () => {
        this.resetFormState();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.location.href = '/';
      });
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
