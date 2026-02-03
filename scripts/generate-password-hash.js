// Script para gerar hash bcrypt da senha
// Use: node scripts/generate-password-hash.js <senha>
// Ou: node scripts/generate-password-hash.js (usa senha padrão)

const bcrypt = require('bcrypt');

const password = process.argv[2] || '202022';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erro ao gerar hash:', err);
    process.exit(1);
  }
  
  console.log('\n✅ Hash gerado com sucesso!\n');
  console.log('Senha:', password);
  console.log('Hash:', hash);
  console.log('\n📋 Configure no Vercel como variável de ambiente:');
  console.log('DEFAULT_AUTH_PASSWORD_HASH=' + hash);
  console.log('\n');
});

