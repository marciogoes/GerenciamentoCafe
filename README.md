# Vending Manager SaaS

**Sistema de Gestão para Empresas de Locação de Máquinas de Café**

Desenvolvido a partir dos processos operacionais da **BelCafé Locação e Serviços Ltda — Belém/PA**

---

## Stack Tecnológica

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Backend    | Node.js 20 + NestJS 10 + TypeORM  |
| Frontend   | React 18 + TypeScript + Vite 5    |
| Banco      | MySQL 8.0                         |
| Auth       | JWT + bcrypt (custo 12) + 2FA TOTP|
| UI         | Tailwind CSS 3 + Recharts         |
| Container  | Docker + Docker Compose           |
| CI/CD      | GitHub Actions                    |

---

## Como Rodar (Desenvolvimento Local)

### Pré-requisitos
- Node.js 20+
- npm
- Acesso ao banco MySQL (`belcafe.mysql.dbaas.com.br`)

### 1. Configurar variáveis de ambiente

```bash
cd backend
cp .env.example .env
# Edite .env e preencha DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, MAIL_USER, MAIL_PASS
```

### 2. Executar scripts SQL no banco (phpMyAdmin)

Execute **na ordem** no banco `belcafe`:

```
backend/src/database/alter_sprint2.sql
backend/src/database/alter_sprint3.sql
backend/src/database/sprint4/01_... até 07_...
backend/src/database/alter_sprint5.sql
backend/src/database/alter_sprint6.sql
backend/src/database/alter_fix_atualizado_em.sql
backend/src/database/seed.sql
backend/src/database/alter_sprint7.sql
backend/src/database/alter_sprint7_fix17.sql
backend/src/database/alter_sprint8.sql
backend/src/database/alter_sprint9.sql
```

> No phpMyAdmin, ao executar `alter_sprint9.sql`, ignore o aviso
> `#1061 - Duplicate key name` — significa que o índice já existe.

### 3. Backend

```bash
cd backend
npm install
npm run start:dev
```

- API:   http://localhost:3000/api/v1
- Docs:  http://localhost:3000/docs  *(Swagger — apenas em dev)*
- Health: http://localhost:3000/api/v1/health

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173

---

## Primeiro Acesso

| Campo   | Valor                |
|---------|----------------------|
| Empresa | `belcafe`            |
| E-mail  | `admin@belcafe.com.br` |
| Senha   | `Admin@2026`         |

### Outros usuários de teste

| E-mail                        | Senha               | Perfil      |
|-------------------------------|---------------------|-------------|
| `financeiro@belcafe.com.br`   | `Financeiro@2026`   | Financeiro  |
| `operacional@belcafe.com.br`  | `Operacional@2026`  | Operacional |

---

## Rodar com Docker

```bash
# Copie e configure as variáveis
cp backend/.env.example .env

# Sobe API + Frontend (usando MySQL externo configurado no .env)
docker compose up --build
```

- Frontend: http://localhost
- API:      http://localhost:3000/api/v1

Para ambiente de produção com MySQL em container, veja [`DEPLOY.md`](./DEPLOY.md).

---

## Testes

```bash
cd backend
npm install

# Testes unitários
npm test

# Com cobertura
npm run test:cov

# Modo watch
npm run test:watch
```

Os testes cobrem:
- `StockService` — incluindo BUG-10 (race condition com SELECT FOR UPDATE)
- `AuthService` — login, bloqueio, 2FA e validação de senha
- `HealthController` — endpoint E2E

---

## Módulos Implementados

| Sprint | Módulo                          | Status       |
|--------|---------------------------------|--------------|
| 1      | Infraestrutura + Setup          | ✅ Concluído |
| 2      | Autenticação + JWT + 2FA        | ✅ Concluído |
| 3      | Tenants + Onboarding            | ✅ Concluído |
| 4      | Dashboard + KPIs + Gráficos     | ✅ Concluído |
| 5      | Módulo Máquinas                 | ✅ Concluído |
| 6      | Clientes e Contratos            | ✅ Concluído |
| 7      | Estoque de Insumos              | ✅ Concluído |
| 8      | Notificações e Relatórios       | ✅ Concluído |
| 9      | Usuários, Permissões e Auditoria| ✅ Concluído |
| 10     | Testes, Docker e Documentação   | ✅ Concluído |

---

## Endpoints Principais

### Autenticação
| Método | Rota                 | Descrição                    |
|--------|----------------------|------------------------------|
| POST   | `/auth/login`        | Login (e-mail + senha)       |
| POST   | `/auth/2fa/verify`   | Verificar código TOTP        |
| POST   | `/auth/2fa/setup`    | Iniciar configuração 2FA     |
| POST   | `/auth/2fa/confirm`  | Ativar 2FA                   |
| POST   | `/auth/refresh`      | Renovar access token         |
| GET    | `/auth/me`           | Dados do usuário autenticado |

### Dashboard
| Método | Rota         | Descrição       |
|--------|--------------|-----------------|
| GET    | `/dashboard` | KPIs e alertas  |

### Máquinas
| Método | Rota                           | Descrição               |
|--------|--------------------------------|-------------------------|
| GET    | `/machines`                    | Listar frota            |
| POST   | `/machines`                    | Cadastrar máquina       |
| POST   | `/machines/:id/departure`      | Registrar saída         |
| POST   | `/machines/:id/return`         | Registrar retorno       |
| GET    | `/machines/models`             | Catálogo de modelos     |

### Contratos e Cobranças
| Método | Rota                   | Descrição                    |
|--------|------------------------|------------------------------|
| GET    | `/contracts`           | Listar contratos             |
| POST   | `/contracts`           | Criar contrato               |
| GET    | `/invoices`            | Listar lançamentos           |
| POST   | `/invoices/generate`   | Gerar cobranças do mês       |
| POST   | `/invoices/:id/pay`    | Registrar pagamento          |
| GET    | `/invoices/overdue`    | Boletos em atraso            |

### Estoque
| Método | Rota                 | Descrição                   |
|--------|----------------------|-----------------------------|
| GET    | `/stock/products`    | Listar produtos com saldo   |
| POST   | `/stock/entry`       | Registrar entrada           |
| POST   | `/stock/exit`        | Registrar saída (com lock)  |
| GET    | `/stock/report`      | Relatório consolidado       |
| GET    | `/stock/alerts`      | Produtos abaixo do mínimo   |

### Usuários e Auditoria
| Método | Rota                        | Descrição                |
|--------|-----------------------------|--------------------------|
| GET    | `/users`                    | Listar usuários          |
| POST   | `/users/invite`             | Convidar usuário         |
| POST   | `/users/accept-invite`      | Aceitar convite          |
| PATCH  | `/users/:id/toggle`         | Ativar/desativar usuário |
| GET    | `/audit`                    | Log de auditoria         |

### Infra
| Método | Rota       | Descrição                    |
|--------|------------|------------------------------|
| GET    | `/health`  | Health check (API + banco)   |

---

## Variáveis de Ambiente Obrigatórias

| Variável              | Descrição                              |
|-----------------------|----------------------------------------|
| `DB_HOST`             | Host do MySQL                          |
| `DB_PORT`             | Porta do MySQL (padrão: 3306)          |
| `DB_NAME`             | Nome do banco                          |
| `DB_USER`             | Usuário do banco                       |
| `DB_PASSWORD`         | Senha do banco                         |
| `JWT_SECRET`          | Secret para assinar access tokens      |
| `JWT_REFRESH_SECRET`  | Secret para assinar refresh tokens     |
| `MAIL_USER`           | E-mail para envio (SMTP)               |
| `MAIL_PASS`           | Senha do e-mail (app password)         |

Veja o modelo completo em `backend/.env.example`.

---

## Estrutura de Pastas

```
BelCafe/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── audit/          # Log de auditoria
│   │   │   ├── auth/           # JWT + 2FA
│   │   │   ├── contracts/      # Clientes, contratos e cobranças
│   │   │   ├── dashboard/      # KPIs
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── machines/       # Frota e movimentações
│   │   │   ├── mail/           # Envio de e-mails
│   │   │   ├── reports/        # Relatórios e exportações
│   │   │   ├── stock/          # Estoque de insumos
│   │   │   ├── tenants/        # Gestão de tenants
│   │   │   └── users/          # Usuários e permissões
│   │   ├── database/           # Scripts SQL e migrations
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                   # Testes unitários e E2E
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── services/           # Chamadas à API (axios)
│   │   ├── types/              # Interfaces TypeScript
│   │   └── App.tsx
│   ├── nginx.conf
│   └── Dockerfile
├── .github/workflows/ci.yml    # GitHub Actions CI
├── docker-compose.yml          # Dev (MySQL externo)
├── docker-compose.prod.yml     # Prod (MySQL em container)
├── .gitignore
└── README.md
```

---

## Licença

Proprietário — BelCafé Locação e Serviços Ltda — Belém/PA
#   G e r e n c i a m e n t o C a f e  
 