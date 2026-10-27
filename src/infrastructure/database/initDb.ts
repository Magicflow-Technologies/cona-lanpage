import { getSqliteConnection } from './sqlite';

console.log('==============================================================');
console.log('CONA - Inicializando Base de Datos SQLite...');
console.log('==============================================================');

const db = getSqliteConnection();
const countResult = db.prepare('SELECT COUNT(*) as total FROM participantes').get() as {
  total: number;
};

console.log(`✔ Esquema SQLite verificado exitosamente.`);
console.log(`✔ Total de participantes registrados actualmente: ${countResult.total}`);
