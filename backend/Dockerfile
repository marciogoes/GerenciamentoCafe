# --- ETAPA 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copia os arquivos de configuração de pacotes
COPY package*.json ./

# Instala TODAS as dependências (incluindo as de desenvolvimento para poder rodar o 'nest build')
RUN npm ci

# Copia o restante dos arquivos do backend
COPY . .

# Gera a pasta /dist compilada
RUN npm run build

# --- ETAPA 2: Produção ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia apenas o package.json e o lock
COPY package*.json ./

# Instala APENAS as dependências de produção para o container final ficar leve
RUN npm ci --omit=dev && npm cache clean --force

# Copia a pasta compilada da etapa anterior
COPY --from=builder /app/dist ./dist

# Garante que a porta será lida dinamicamente do Railway
EXPOSE 3000

# Comando para rodar a aplicação em produção
CMD ["node", "dist/main"]
