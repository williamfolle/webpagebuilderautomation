# WPB 1.1 - Automatização de Atributos HTML

Esta aplicação web permite processar arquivos ZIP contendo websites HTML e adicionar atributos personalizados com base em dados de arquivos CSV. A aplicação é projetada para funcionar perfeitamente no navegador e como serviço no backend.

## Funcionalidades

- Upload de arquivos ZIP contendo websites HTML
- Upload de múltiplos arquivos CSV com dados de parametrização
- Processamento automático de atributos HTML usando valores do CSV
- Renomeação de diretórios (public/ para img/)
- Remoção de arquivos desnecessários (404.html, 404.css)
- Adição de scripts personalizados (LLWebServerExtended.js, etc.)
- Remoção de referências externas (Google Fonts, unpkg)
- Download do pacote processado como website.zip

## Implementação

A aplicação utiliza uma abordagem híbrida:

1. **Processamento no cliente**: Quando possível, todo o processamento é realizado diretamente no navegador usando JavaScript.
2. **Processamento no servidor**: Como fallback, o servidor processa os arquivos quando o cliente não consegue.

## Tecnologias

- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: Express.js, serverless functions
- **Processamento**: JSZip, PapaParse, DOMParser/JSDOM
- **Hospedagem**: Vercel

## Implantação na Vercel

Para implantar o projeto na Vercel:

1. Conecte seu repositório à Vercel
2. Configure com as seguintes opções:
   - Framework: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

A configuração do Vercel já está definida no arquivo `vercel.json` com as regras de roteamento apropriadas.

## Desenvolvimento Local

Para iniciar o projeto localmente:

```bash
npm install
npm run dev
```

## Observações Importantes

- Certifique-se de que os elementos HTML possuam atributos `nv` que correspondam aos valores nos arquivos CSV
- A correspondência entre os valores é case-insensitive para maior flexibilidade
- Os CSV devem ter colunas que contenham informações de endereço/variável e formato
- A aplicação realiza múltiplas tentativas para encontrar correspondências entre os valores do HTML e CSV