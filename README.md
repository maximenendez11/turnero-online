# Pixel TV - Monorepo Starter

Un Pixel TV es una Proyecto base profesional, desarrollada con NX, Angular 21, NestJS, MySQL, Prisma.

## 🚀 Características

- **Monorepo NX** - Gestión eficiente de múltiples aplicaciones
- **Angular 21** - Frontend con standalone components y signals
- **NestJS 10+** - Backend robusto con TypeScript
- **MySQL + Prisma** - Base de datos relacional con ORM moderno
- **Autenticación JWT** - Access y refresh tokens
- **CRUD Genérico** - Componentes reutilizables
- **Docker** - Multi-stage builds optimizados
- **CI/CD** - GitHub Actions configurado
- **TypeScript Estricto** - Código type-safe
- **UI Nativa** - HTML/CSS personalizado sin dependencias de UI library

## 📁 Estructura del Proyecto

```
proyecto-base/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Angular
├── libs/
│   └── shared/       # Tipos e interfaces compartidas
├── docker/           # Configuración Docker
└── .github/          # Workflows CI/CD
```

## 🛠️ Requisitos Previos

- Node.js 20+
- npm o yarn
- Docker y Docker Compose (recomendado para desarrollo)
- Git

## 📦 Instalación Inicial

### Opción 1: Usar el Script Automático (Recomendado)

Si quieres crear un nuevo proyecto basado en este proyecto-base:

```bash
# Desde el directorio del proyecto-base
npm run create-project mi-nuevo-proyecto

# O con el script bash (Linux/Mac)
./scripts/create-project.sh mi-nuevo-proyecto

# O con PowerShell (Windows)
.\scripts\create-project.ps1 mi-nuevo-proyecto
```

Esto creará un nuevo proyecto en el directorio padre con todos los cambios aplicados.

### Opción 2: Usar el proyecto-base Directamente

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd proyecto-base
```

2. **Instalar dependencias**
```bash
npm install
# o
yarn install
```

3. **Configurar variables de entorno**
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores (ver ENV_SETUP.md para más detalles)
```

4. **Base de datos** (elegir una opción)

   **Opción A: MySQL en Hostinger (o otro hosting)**  
   En `.env` poné la `DATABASE_URL` con el host, usuario, contraseña y nombre de base que te da el panel. En Hostinger el usuario no puede crear bases; por eso **no** uses `prisma migrate dev` contra esa DB. Creá las migraciones en local (Docker) una vez, y después aplicálas con: `npm run prisma:migrate:deploy` (ver paso 5).

   **Opción B: MySQL local con Docker**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d mysql
   docker-compose -f docker/docker-compose.yml ps mysql
   ```
   Y en `.env`: `DATABASE_URL=mysql://user:password@localhost:3306/proyecto-base`

5. **Configurar base de datos**
```bash
npm run prisma:generate
```
   - **Si usás DB local (Docker):** `npm run prisma:migrate` (crea y aplica migraciones). Luego: `npm run prisma:seed`.
   - **Si usás Hostinger (u otro hosting sin permiso CREATE DATABASE):** primero generá la migración inicial en local con Docker (`DATABASE_URL` apuntando a localhost, `npm run prisma:migrate`). Después en `.env` poné la URL de Hostinger y ejecutá solo: `npm run prisma:migrate:deploy` (aplica migraciones sin usar shadow DB). Opcional: `npm run prisma:seed`.

## 🚀 Desarrollo

### Desarrollo Local

```bash
# Levantar API y Web en paralelo
npm run dev
# o
yarn dev
```

- **API**: http://localhost:3000/api
- **Web**: http://localhost:4200
- **Swagger**: http://localhost:3000/api/docs

### Desarrollo con Docker Completo

```bash
# Levantar todos los servicios (mysql, api, web)
npm run docker:up
# o
yarn docker:up

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f

# Detener servicios
npm run docker:down
# o
yarn docker:down
```

### Comandos Docker Útiles

```bash
# Ver estado de los servicios
docker-compose -f docker/docker-compose.yml ps

# Ver logs de un servicio específico
docker-compose -f docker/docker-compose.yml logs -f api
docker-compose -f docker/docker-compose.yml logs -f mysql

# Reiniciar un servicio
docker-compose -f docker/docker-compose.yml restart mysql

# Detener y eliminar volúmenes (⚠️ elimina datos)
docker-compose -f docker/docker-compose.yml down -v

# Reconstruir imágenes
docker-compose -f docker/docker-compose.yml build --no-cache
```

## 📝 Scripts Disponibles

### Root
- `npm run dev` / `yarn dev` - Desarrollo (API + Web en paralelo)
- `npm run build` / `yarn build` - Build de producción
- `npm run lint` / `yarn lint` - Linter
- `npm run format` / `yarn format` - Formatear código con Prettier
- `npm run docker:up` / `yarn docker:up` - Levantar todos los servicios Docker
- `npm run docker:down` / `yarn docker:down` - Detener servicios Docker

### API
- `nx serve api` - Desarrollo API con hot reload
- `nx build api` - Build API para producción
- `npm run prisma:generate` - Generar Prisma Client
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:seed` - Seed database con usuario admin

### Web
- `nx serve web` - Desarrollo Web en http://localhost:4200
- `nx build web` - Build Web para producción

## 🔐 Autenticación

### Usuario Admin por Defecto

Después de ejecutar el seed:
- **Email**: `admin@example.com`
- **Password**: `Admin123!`

### Endpoints de Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Refrescar access token

### Flujo de Autenticación

1. Usuario se registra o inicia sesión
2. Recibe `accessToken` (15 minutos) y `refreshToken` (7 días)
3. `accessToken` se envía en header `Authorization: Bearer <token>`
4. Si `accessToken` expira, se usa `refreshToken` para obtener uno nuevo
5. El interceptor maneja esto automáticamente

## 🗄️ Base de Datos

### Schema Prisma

El schema incluye:
- **User** - Usuarios con roles (ADMIN, USER)
- Soft delete implementado (`deletedAt`)
- Timestamps automáticos (`createdAt`, `updatedAt`)

### Migraciones

```bash
# Crear nueva migración
cd api && npx prisma migrate dev --name migration_name

# Aplicar migraciones en producción
npx prisma migrate deploy

# Ver estado de migraciones
npx prisma migrate status
```

### Prisma Studio (GUI para la DB)

```bash
cd api && npx prisma studio
# Abre en http://localhost:5555
```

## 🐳 Docker

### Servicios Incluidos

- **mysql** - Base de datos MySQL 8
- **api** - Backend NestJS (puerto 3000)
- **web** - Frontend Angular con Nginx (puerto 80)

### Variables de Entorno Docker

Configurar en `.env` en la raíz del proyecto:
- `MYSQL_USER` - Usuario MySQL (default: user)
- `MYSQL_PASSWORD` - Contraseña MySQL (default: password)
- `MYSQL_DATABASE` - Nombre de la base de datos (default: proyecto-base)
- `MYSQL_PORT` - Puerto MySQL (default: 3306)
- `MYSQL_ROOT_PASSWORD` - Contraseña root (default: rootpassword)
- `JWT_SECRET` - Secret para JWT (mínimo 32 caracteres)
- `JWT_REFRESH_SECRET` - Secret para refresh token
- `API_PORT` - Puerto API (default: 3000)
- `WEB_PORT` - Puerto Web (default: 80)

### Levantar Solo MySQL

```bash
# Levantar solo MySQL
docker-compose -f docker/docker-compose.yml up -d mysql

# Esperar a que esté listo (health check)
docker-compose -f docker/docker-compose.yml ps mysql
```

## 🧪 Testing

### Tests Unitarios

```bash
# Tests unitarios del API
nx test api

# Tests unitarios del Web
nx test web
```

### Tests E2E (End-to-End)

```bash
# Tests e2e del frontend (Playwright)
npm run test:e2e:web
# o
nx e2e web-e2e

# Tests e2e del backend (Jest)
npm run test:e2e:api
# o
nx e2e api-e2e

# Ejecutar todos los tests e2e
npm run test:e2e:all
```

**Ver `E2E_TESTING.md` para guía completa de testing e2e.**

## 📚 Documentación API

Swagger disponible en:
- **Desarrollo**: http://localhost:3000/api/docs
- **Producción**: https://your-domain.com/api/docs

La documentación incluye:
- Todos los endpoints
- Schemas de request/response
- Autenticación Bearer Token
- Ejemplos de uso

## 🔒 Seguridad

- **JWT** con access y refresh tokens
- **Bcrypt** para hash de passwords (10 rounds)
- **Helmet** para headers de seguridad
- **Rate Limiting** con Throttler (10 requests/minuto)
- **CORS** configurado
- **Validación** de inputs con class-validator
- **Soft Delete** para preservar datos

## 🎨 UI Components

El proyecto usa HTML/CSS nativo sin dependencias de UI library:
- Componentes reutilizables con estilos personalizados
- Diseño responsive
- Gradientes y animaciones CSS
- Tabla CRUD genérica
- Formularios reactivos con validación

## 📦 Build para Producción

```bash
# Build completo
npm run build

# Build individual
nx build api
nx build web
```

Los builds se generan en:
- API: `dist/api/`
- Web: `dist/web/browser/`

## 🚢 Deployment

### Docker

```bash
# Build imágenes
docker-compose -f docker/docker-compose.yml build

# Levantar servicios en producción
docker-compose -f docker/docker-compose.yml up -d

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f
```

### Coolify (volumen persistente para logs)

Si desplegás la API en **Coolify**, los errores se escriben en `/app/logs` dentro del contenedor. Para que no se pierdan al redeployar, añadí un **volumen persistente** en el recurso de la API:

- **Ruta en el contenedor**: `/app/logs`

Ver **[docs/COOLIFY.md](docs/COOLIFY.md)** para más detalle.

### Variables de Entorno Producción

Asegúrate de configurar en `.env`:
- `DATABASE_URL` - URL de MySQL en producción
- `JWT_SECRET` - Secret seguro (generar con `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` - Secret seguro para refresh
- `CORS_ORIGIN` - Origen permitido para CORS (URL de tu frontend)
- `NODE_ENV=production`

## 🔧 Troubleshooting

### MySQL no inicia

```bash
# Verificar logs
docker-compose -f docker/docker-compose.yml logs mysql

# Reiniciar contenedor
docker-compose -f docker/docker-compose.yml restart mysql

# Eliminar y recrear (⚠️ elimina datos)
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up -d mysql
```

### Error de conexión a la base de datos

1. Verificar que MySQL esté corriendo: `docker-compose ps mysql`
2. Verificar `DATABASE_URL` en `.env`
3. Verificar que las credenciales coincidan con las de Docker

### Error de migraciones

```bash
# Resetear base de datos (⚠️ elimina datos)
cd api && npx prisma migrate reset

# O aplicar migraciones manualmente
cd api && npx prisma migrate deploy
```

## 📚 Documentación

- **[Guía de Desarrollo](docs/DEVELOPMENT.md)** - Estructura del proyecto, convenciones y buenas prácticas
- **[Guía de Testing E2E](docs/E2E_TESTING.md)** - Cómo escribir y ejecutar tests end-to-end
- **[Guía para Nuevo Proyecto](docs/SETUP_NEW_PROJECT.md)** - Cómo crear un nuevo proyecto desde este proyecto-base
- **[Despliegue en Coolify](docs/COOLIFY.md)** - Volumen persistente para logs de la API

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT

## 🆘 Soporte

Para problemas o preguntas:
- Abre un issue en el repositorio
- Revisa la [Guía de Desarrollo](docs/DEVELOPMENT.md) para estructura y buenas prácticas
- Revisa la [Guía de Testing E2E](docs/E2E_TESTING.md) para tests
- Revisa la [Guía para Nuevo Proyecto](docs/SETUP_NEW_PROJECT.md) para crear un nuevo proyecto

---

**Hecho con ❤️ para freelancers**
