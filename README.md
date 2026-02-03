# 🔍 Analisador de Perfil Kwai

Sistema moderno para extrair e exibir informações de perfis do Kwai.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS
- **Axios** - Cliente HTTP
- **Cheerio** - Parser HTML (web scraping)

## 📦 Instalação

```bash
# Instalar dependências
npm install
```

## 🎯 Como Usar

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Abra o navegador em: `http://localhost:3000`

3. Cole a URL do perfil Kwai e clique em "Analisar"

4. O sistema irá extrair:
   - Foto do perfil
   - Nome de usuário
   - Nome de exibição
   - Número de seguidores
   - Número de seguindo
   - Número de curtidas
   - Número de vídeos
   - Bio/Descrição
   - Status de verificação

## 🎨 Recursos

- Interface moderna e responsiva
- Design bonito com gradientes
- Estatísticas em cards visuais
- Exibição completa do perfil
- Dados técnicos para debug

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm start` - Inicia servidor de produção
- `npm run lint` - Executa o linter