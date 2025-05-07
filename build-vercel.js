// Script de build específico para Vercel
// Este script é usado como buildCommand no vercel.json
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Iniciando build personalizado para Vercel...');

// Ajustando index.html para funcionar na Vercel
try {
  const indexHtmlPath = path.join(__dirname, 'client', 'index.html');
  console.log(`Ajustando ${indexHtmlPath}...`);
  
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  
  // Alterando a referência do script para que a Vercel possa encontrá-lo
  indexHtml = indexHtml.replace(
    '<script type="module" src="src/main.tsx"></script>',
    '<script type="module" src="/src/main.tsx"></script>'
  );
  
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('✅ index.html ajustado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao ajustar index.html:', error);
  process.exit(1);
}

// Executando o comando de build original após os ajustes
try {
  console.log('📦 Executando build do Vite e do servidor...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completo!');
} catch (error) {
  console.error('❌ Erro durante o build:', error);
  process.exit(1);
}