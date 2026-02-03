# Segurança - Melhorias Implementadas

Este documento descreve as melhorias de segurança implementadas no sistema de autenticação.

## 🔐 Melhorias Implementadas

### 1. **Bcrypt para Hash de Senhas**
- ✅ Substituído SHA-256 por **bcrypt** (mais seguro para senhas)
- ✅ Hash com salt automático (10 rounds)
- ✅ Resiste a ataques de rainbow table

### 2. **Tokens JWT Assinados**
- ✅ Tokens assinados com secret key
- ✅ Expiração automática (7 dias)
- ✅ Verificação de assinatura em cada requisição
- ✅ Substituído token base64 simples

### 3. **Rate Limiting**
- ✅ Proteção contra ataques de força bruta
- ✅ Máximo de 5 tentativas por IP em 15 minutos
- ✅ Bloqueio de 30 minutos após exceder tentativas
- ✅ Limpeza automática de tentativas antigas

### 4. **Variáveis de Ambiente**
- ✅ Credenciais padrão via variáveis de ambiente
- ✅ JWT Secret configurável
- ✅ Arquivo `.env.example` criado

### 5. **Arquivo de Configuração Seguro**
- ✅ Arquivo movido para fora da pasta `public/`
- ✅ Senhas nunca retornadas pela API
- ✅ Hash bcrypt salvo ao invés de texto plano

## 📋 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Credenciais padrão (usadas apenas se auth-config.json não existir)
DEFAULT_AUTH_USERNAME=seu_usuario
DEFAULT_AUTH_PASSWORD=sua_senha_forte

# Secret para JWT (gere uma chave forte!)
JWT_SECRET=sua-chave-secreta-muito-forte-aqui

# Ambiente
NODE_ENV=production
```

### Gerar JWT Secret

```bash
# No Linux/Mac
openssl rand -base64 32

# Ou use qualquer gerador de string aleatória
```

## 🔒 Segurança Adicional Recomendada

Para produção, considere:

1. **HTTPS obrigatório** - Sempre use HTTPS em produção
2. **Firewall** - Configure regras de firewall
3. **Logs de segurança** - Monitore tentativas de login
4. **2FA** - Considere autenticação de dois fatores
5. **Redis para Rate Limiting** - Para múltiplos servidores

## 📝 Notas

- As senhas antigas (SHA-256) serão migradas automaticamente para bcrypt
- O rate limiting funciona por IP (pode precisar de Redis em produção)
- Tokens JWT expiram após 7 dias (configurável em `lib/jwt.ts`)









