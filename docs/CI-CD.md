# CI/CD – Urbano E-commerce

Pipeline con **GitHub Actions**: CI en cada push/PR y CD (imágenes Docker) en push a `main`.

---

## Workflows

### 1. CI (`.github/workflows/ci.yml`)

**Cuándo:** en cada `push` y `pull_request` a las ramas `main`, `master` o `develop`.

**Pasos:**

1. Checkout del código.
2. Setup de Node.js 20 (con cache de `npm`).
3. `npm ci` (instalación limpia según `package-lock.json`).
4. `npm run lint` (ESLint).
5. `npm run build:all` (compila los 5 microservicios: catalog, users, auth, inventory, order).

Si alguno falla, el workflow marca el check en rojo. Útil para no mergear PRs con lint o build roto.

---

### 2. CD (`.github/workflows/cd.yml`)

**Cuándo:** en cada `push` a `main` o `master`.

**Qué hace:** construye las 5 imágenes Docker (una por microservicio) y las sube al **GitHub Container Registry** (ghcr.io).

**Imágenes generadas:**

| Servicio         | Imagen (ejemplo)                          |
|------------------|--------------------------------------------|
| catalog-service  | `ghcr.io/<OWNER>/urbano-catalog-service`   |
| users-service    | `ghcr.io/<OWNER>/urbano-users-service`     |
| auth-service     | `ghcr.io/<OWNER>/urbano-auth-service`      |
| inventory-service| `ghcr.io/<OWNER>/urbano-inventory-service` |
| order-service    | `ghcr.io/<OWNER>/urbano-order-service`     |

**Tags:** `latest` (solo en main/master), el nombre de la rama y el SHA del commit.

**Permisos:** se usa `GITHUB_TOKEN` con `packages: write`; no hace falta configurar secretos extra para GHCR del mismo repo.

---

## Cómo usar las imágenes en otro entorno

Tras un push a `main`, las imágenes estarán en GHCR. Para usarlas:

1. **Público:** si el repo es público, las imágenes son visibles; para pull desde otra máquina o cluster hace falta login:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u <tu-usuario> --password-stdin
   docker pull ghcr.io/<owner>/urbano-catalog-service:latest
   ```
2. **Privado:** el token debe tener scope `read:packages` (o ser un PAT con ese permiso).

En **Kubernetes** o **ECS** se configura el registry como privado y se usa un secret de Docker o de la plataforma para el pull.

---

## Desactivar o cambiar CD

- **No publicar imágenes:** borra o desactiva `.github/workflows/cd.yml` (en la pestaña Actions → desactivar el workflow).
- **Otro registry (ECR, Docker Hub):** en `cd.yml` sustituye el paso `docker/login-action` por el registry que uses y ajusta el prefijo de las imágenes en `docker/metadata-action` y `docker/build-push-action`.

---

## Scripts locales equivalentes a CI

Para reproducir lo que hace CI en tu máquina:

```bash
npm ci
npm run lint
npm run build:all
```

Para compilar un solo servicio:

```bash
nest build catalog-service
# o
nest build users-service
# etc.
```
