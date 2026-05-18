# Guia de Deploy — Vending Manager SaaS

## Opção 1 — Deploy com Docker Compose (recomendado para VPS)

### Pré-requisitos
- Ubuntu 22.04 LTS (ou Debian 12)
- Docker 24+
- Docker Compose v2

### Passo a passo

#### 1. Instalar Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout e login para aplicar grupo
```

#### 2. Clonar o repositório
```bash
git clone https://github.com/sua-org/vendingmanager.git
cd vendingmanager
```

#### 3. Criar arquivo de variáveis de produção
```bash
cp backend/.env.example .env.prod
nano .env.prod
```

Preencha obrigatoriamente:
- `DB_PASSWORD` — senha forte para o MySQL
- `DB_ROOT_PASSWORD` — senha root do MySQL em container
- `JWT_SECRET` — mínimo 64 caracteres aleatórios
- `JWT_REFRESH_SECRET` — mínimo 64 caracteres aleatórios
- `MAIL_USER` / `MAIL_PASS` — credenciais SMTP
- `FRONTEND_URL` — URL pública do frontend

Gerar secrets fortes:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 4. Subir os containers
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

#### 5. Verificar saúde dos serviços
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/api/v1/health
```

---

## Opção 2 — Deploy manual (sem Docker)

### Backend
```bash
cd backend
npm ci --omit=dev
npm run build
# Configure PM2 ou systemd para manter o processo ativo
pm2 start dist/main.js --name vendingmanager-api
pm2 save
```

### Frontend
```bash
cd frontend
npm ci
VITE_API_URL=https://api.suaempresa.com.br/api/v1 npm run build
# Copie a pasta dist/ para o servidor Nginx
```

---

## Configuração do Nginx (proxy reverso)

Exemplo `/etc/nginx/sites-available/vendingmanager`:

```nginx
server {
    listen 80;
    server_name suaempresa.com.br www.suaempresa.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name suaempresa.com.br www.suaempresa.com.br;

    ssl_certificate     /etc/letsencrypt/live/suaempresa.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/suaempresa.com.br/privkey.pem;

    # Frontend (React)
    root /var/www/vendingmanager/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API NestJS
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### SSL gratuito com Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d suaempresa.com.br -d www.suaempresa.com.br
```

---

## Banco de Dados

### Executar migrations no MySQL de produção
```bash
# Copie os scripts SQL para o servidor e execute via MySQL client:
mysql -h HOST -u USER -p BANCO < backend/src/database/alter_sprint2.sql
# ... (execute todos os scripts em ordem, conforme README.md)
```

### Backup automático
```bash
# Adicione ao crontab para backup diário às 2h
0 2 * * * mysqldump -h HOST -u USER -pSENHA BANCO | gzip > /backups/belcafe_$(date +\%Y\%m\%d).sql.gz
# Remover backups com mais de 30 dias
0 3 * * * find /backups -name "*.sql.gz" -mtime +30 -delete
```

---

## Variáveis de Ambiente de Produção

| Variável              | Valor recomendado                          |
|-----------------------|--------------------------------------------|
| `APP_ENV`             | `production`                               |
| `DB_HOST`             | `db` (container) ou IP/host externo        |
| `JWT_SECRET`          | String aleatória de 64+ caracteres         |
| `JWT_REFRESH_SECRET`  | String aleatória diferente de JWT_SECRET   |
| `JWT_EXPIRES_IN`      | `8h`                                       |
| `JWT_REFRESH_EXPIRES_IN` | `30d`                                   |
| `MAIL_HOST`           | `smtp.gmail.com` ou SMTP corporativo       |
| `MAIL_PORT`           | `587` (TLS) ou `465` (SSL)                 |
| `LOGIN_MAX_ATTEMPTS`  | `5`                                        |
| `LOGIN_BLOCK_MINUTES` | `15`                                       |

---

## Monitoramento

### Logs dos containers
```bash
docker logs vendingmanager_api -f
docker logs vendingmanager_web -f
```

### Health check
```bash
curl https://suaempresa.com.br/api/v1/health
# Resposta esperada: { "status": "ok", "services": { "database": "ok", "api": "ok" } }
```

### PM2 (deploy manual)
```bash
pm2 status
pm2 logs vendingmanager-api
pm2 monit
```

---

## CI/CD com GitHub Actions

O workflow `.github/workflows/ci.yml` roda automaticamente em:
- Push para `main` ou `develop`
- Pull Requests para `main` ou `develop`

**Jobs executados:**
1. `backend` — lint + testes unitários + build TypeScript
2. `frontend` — build Vite
3. `docker-build` — verifica se as imagens Docker constroem (apenas em push para `main`)

Para deploy automático, adicione um job `deploy` ao workflow com seus secrets de SSH ou credenciais de nuvem configurados em **Settings → Secrets and variables → Actions** no GitHub.
