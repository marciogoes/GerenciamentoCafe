# ─── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifests e instala dependências
COPY package*.json ./
RUN npm ci

# Copia código-fonte e compila
COPY . .
RUN npm run build

# ─── Stage 2: serve com Nginx ─────────────────────────────────────────────────
FROM nginx:1.26-alpine AS runtime

# Remove config default do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuração customizada
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copia artefato React compilado
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
