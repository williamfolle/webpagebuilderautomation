// Script específico para build da Vercel
import { build } from 'vite';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

async function buildForVercel() {
  console.log('🚀 Iniciando build para Vercel...');

  try {
    // Modifica o index.html para funcionar corretamente
    const indexHtmlPath = path.resolve('./client/index.html');
    console.log(`Ajustando ${indexHtmlPath}...`);
    
    if (fs.existsSync(indexHtmlPath)) {
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      
      // Ajusta o caminho do script principal
      indexHtml = indexHtml.replace(
        /<script type="module" src="[^"]*">/,
        '<script type="module" src="/src/main.tsx">'
      );
      
      fs.writeFileSync(indexHtmlPath, indexHtml);
      console.log('✅ index.html ajustado com sucesso!');
    } else {
      console.error('❌ Arquivo index.html não encontrado!');
    }
    
    // Build do frontend com Vite
    console.log('📦 Executando build do frontend...');
    await build({
      configFile: false, // Não usa arquivo de configuração
      build: {
        outDir: './dist/public',
        emptyOutDir: true,
      },
      root: './client'
    });
    
    // Build do backend com esbuild
    console.log('📦 Executando build do backend...');
    await execPromise('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist');
    
    console.log('✅ Build completo!');
  } catch (error) {
    console.error('❌ Erro durante o build:', error);
    process.exit(1);
  }
}

buildForVercel();