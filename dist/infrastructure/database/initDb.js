"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite_1 = require("./sqlite");
console.log('==============================================================');
console.log('CONA - Inicializando Base de Datos SQLite...');
console.log('==============================================================');
const db = (0, sqlite_1.getSqliteConnection)();
const countResult = db.prepare('SELECT COUNT(*) as total FROM participantes').get();
console.log(`✔ Esquema SQLite verificado exitosamente.`);
console.log(`✔ Total de participantes registrados actualmente: ${countResult.total}`);
//# sourceMappingURL=initDb.js.map