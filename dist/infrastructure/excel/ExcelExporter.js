"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExporter = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
class ExcelExporter {
    /**
     * Genera un libro de Excel (.xlsx) en memoria con estilos corporativos de CONA,
     * incluyendo toda la matriz oficial de campos, cabeceras formateadas, filtros y auto-ajuste de columnas.
     */
    static async buildParticipantesWorkbook(participantes) {
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'CONA - Sistema de Actualización de Datos';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Participantes Sorteo CONA', {
            views: [{ state: 'frozen', ySplit: 3 }]
        });
        // Definición de columnas (Fila 3 como cabecera de datos - 19 columnas: A..S)
        const headers = [
            'ID',
            'Tipo Doc',
            'DNI / CE',
            'Apellidos',
            'Nombres',
            'N.º de Celular',
            'Correo Electrónico',
            'Dirección',
            'Departamento',
            'Provincia',
            'Distrito',
            'RUC Empresa',
            'Nombre de Proyecto',
            'Categoría',
            'Especialidad',
            'N.º Hijos Menores',
            'Detalle Hijos (Edad / Sexo)',
            'Estado en el Sorteo',
            'Fecha y Hora de Registro'
        ];
        // Fila 1: Título Institucional (19 columnas: A..S)
        sheet.mergeCells('A1:S1');
        const titleCell = sheet.getCell('A1');
        titleCell.value =
            'CONA · CAMPAÑA DE ACTUALIZACIÓN DE DATOS — PADRÓN OFICIAL DE PARTICIPANTES DEL SORTEO';
        titleCell.font = {
            name: 'Segoe UI',
            size: 13,
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF002554' }
        };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).height = 30;
        // Fila 2: Subtítulo con fecha de exportación y conteo
        sheet.mergeCells('A2:S2');
        const subtitleCell = sheet.getCell('A2');
        const nowFormatted = new Intl.DateTimeFormat('es-PE', {
            dateStyle: 'full',
            timeStyle: 'medium'
        }).format(new Date());
        subtitleCell.value = `Reporte generado el: ${nowFormatted} | Total de registros exportados: ${participantes.length}`;
        subtitleCell.font = {
            name: 'Segoe UI',
            size: 10,
            italic: true,
            color: { argb: 'FF002554' }
        };
        subtitleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0EFDD' }
        };
        subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        sheet.getRow(2).height = 22;
        const headerRow = sheet.getRow(3);
        headers.forEach((headerText, idx) => {
            const cell = headerRow.getCell(idx + 1);
            cell.value = headerText;
            cell.font = {
                name: 'Segoe UI',
                size: 10,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF073B77' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF002554' } },
                bottom: { style: 'medium', color: { argb: 'FFFC4C02' } },
                left: { style: 'thin', color: { argb: 'FF1F4E78' } },
                right: { style: 'thin', color: { argb: 'FF1F4E78' } }
            };
        });
        headerRow.height = 26;
        const unescapeForExcel = (text) => (text || '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&#x60;/g, '`');
        participantes.forEach((p, index) => {
            const detalleHijos = p.hijos_detalle && p.hijos_detalle.length > 0
                ? p.hijos_detalle.map((h) => `Hijo ${h.orden}: ${h.edad} años (${h.sexo})`).join(', ')
                : 'Sin hijos menores';
            const fechaFormateada = ExcelExporter.formatIsoDate(p.fecha_registro);
            const rowValues = [
                p.id,
                p.tipo_documento || 'DNI',
                unescapeForExcel(p.numero_documento || p.dni),
                unescapeForExcel(p.apellidos),
                unescapeForExcel(p.nombres),
                p.celular,
                unescapeForExcel(p.correo) || '(No indicado)',
                unescapeForExcel(p.direccion),
                unescapeForExcel(p.departamento),
                unescapeForExcel(p.provincia),
                unescapeForExcel(p.distrito),
                unescapeForExcel(p.ruc_empresa) || '(No indicado)',
                unescapeForExcel(p.nombre_proyecto) || '(No indicado)',
                unescapeForExcel(p.categoria),
                unescapeForExcel(p.especialidad) || '(No indicado)',
                p.hijos_menores ?? 0,
                detalleHijos,
                p.estado_sorteo,
                fechaFormateada
            ];
            const row = sheet.addRow(rowValues);
            row.height = 20;
            const isEven = index % 2 === 1;
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF172033' } };
                if (isEven) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FBFF' }
                    };
                }
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD8E2EE' } },
                    bottom: { style: 'thin', color: { argb: 'FFD8E2EE' } },
                    left: { style: 'thin', color: { argb: 'FFD8E2EE' } },
                    right: { style: 'thin', color: { argb: 'FFD8E2EE' } }
                };
                if ([1, 2, 3, 6, 12, 14, 16, 18, 19].includes(colNumber)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
                else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
                if (colNumber === 18) {
                    cell.font = {
                        name: 'Segoe UI',
                        size: 10,
                        bold: true,
                        color: { argb: 'FF137A4E' }
                    };
                }
            });
        });
        sheet.autoFilter = {
            from: { row: 3, column: 1 },
            to: { row: Math.max(3, participantes.length + 3), column: headers.length }
        };
        headers.forEach((headerText, idx) => {
            const colIndex = idx + 1;
            const column = sheet.getColumn(colIndex);
            let maxLen = headerText.length + 4;
            column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
                if (rowNumber >= 3) {
                    const valStr = cell.value ? String(cell.value) : '';
                    if (valStr.length + 3 > maxLen) {
                        maxLen = valStr.length + 3;
                    }
                }
            });
            column.width = Math.min(Math.max(maxLen, 12), 48);
        });
        return workbook.xlsx.writeBuffer();
    }
    static formatIsoDate(iso) {
        try {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime()))
                return iso;
            return new Intl.DateTimeFormat('es-PE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(date);
        }
        catch {
            return iso;
        }
    }
}
exports.ExcelExporter = ExcelExporter;
//# sourceMappingURL=ExcelExporter.js.map