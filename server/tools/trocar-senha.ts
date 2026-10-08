import { getUserByUsername, hashPassword, updateUser } from '../src/auth';
import { writeAudit } from '../src/audit';
import readline from 'readline';

const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Uso: npx ts-node tools/trocar-senha.ts <usuario>');
    process.exit(1);
}

const username = args[0];
const user = getUserByUsername(username);

if (!user) {
    console.error(`Erro: Usuário '${username}' não encontrado.`);
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(rl as any).stdoutMuted = true;
(rl as any)._writeToOutput = function _writeToOutput(stringToWrite: string) {
    if ((rl as any).stdoutMuted && stringToWrite !== '\n' && stringToWrite !== '\r\n') {
        // mutado
    } else {
        rl.output.write(stringToWrite);
    }
};

rl.question(`Digite a nova senha para '${username}' (sem eco): \n`, (password) => {
    if (password.length < 4) {
        console.error('Erro: Senha muito curta.');
        process.exit(1);
    }
    
    const newHash = hashPassword(password);
    updateUser(user.id, { passwordHash: newHash });
    
    writeAudit({
        timestamp: new Date().toISOString(),
        username: 'CLI',
        role: 'Admin',
        ip: '127.0.0.1',
        target: 'AUTH',
        command: 'CHANGE_PASSWORD',
        value: username,
        result: 'success'
    });
    
    console.log(`Senha do usuário '${username}' alterada com sucesso!`);
    process.exit(0);
});
