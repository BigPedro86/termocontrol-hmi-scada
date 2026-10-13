// Ambiente isolado para os testes (regra 13: nunca tocar data/scada.db).
// Segredos gerados na hora: nada fixo no repositório.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.DEVICE_SECRET = crypto.randomBytes(32).toString('hex');
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS_HASH = bcrypt.hashSync(crypto.randomBytes(12).toString('hex'), 4);
