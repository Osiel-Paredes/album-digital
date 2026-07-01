# Nuestro Álbum 💌

Un álbum digital romántico que simula un libro de recuerdos: subes una foto,
escribes una nota debajo, y queda guardada para siempre. Pasa las páginas
como en un libro real, edita o elimina cualquier recuerdo, y todo se guarda
en una base de datos **PostgreSQL** que persiste sin importar dónde lo
abras.

## ¿Qué incluye?

- **Frontend** (`public/index.html`, `public/style.css`, `public/script.js`):
  portada, libro con paso de página, subir/editar/borrar recuerdos, diseño
  responsivo (en móvil el libro muestra una página a la vez y se navega con
  swipe), paleta romántica (vino profundo, rosa empolvado, dorado, papel
  crema).
- **Backend** (`server.js`): API en Express que recibe las fotos y las notas.
- **Base de datos** (`db.js`): PostgreSQL mediante el driver `pg`. Se
  conecta usando la variable `DATABASE_URL` (la misma tanto en tu PC como
  cuando esté desplegado en internet), y crea la tabla `photos` sola la
  primera vez que arranca.
- Las imágenes se guardan como archivos (en `public/uploads/` localmente,
  o en `UPLOADS_DIR` si lo defines) y la base de datos guarda su nombre,
  título, nota y fecha.

## Cómo correrlo en tu PC

Necesitas [Node.js](https://nodejs.org) (versión 18+) y una base de datos
PostgreSQL ya creada (por ejemplo gratis en [Railway](https://railway.app)
o [Render](https://render.com)).

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` como `.env` y pega tu cadena de conexión real:
   ```
   DATABASE_URL=postgresql://usuario:contrasena@host:5432/nombre_basedatos
   UPLOADS_DIR=
   ```
3. Arranca el servidor:
   ```bash
   npm start
   ```
4. Abre **http://localhost:3000**. La primera vez que arranca, el servidor
   crea solo la tabla `photos` en tu base de datos — no hay que escribir
   SQL a mano.

> ⚠️ Nunca subas tu archivo `.env` a Git — ya está excluido en
> `.gitignore` porque contiene tu contraseña de base de datos.

## Estructura del proyecto

```
album-digital/
├── server.js          # API (subir, listar, editar, borrar)
├── db.js              # Conexión a PostgreSQL y creación de la tabla
├── package.json
├── .env.example        # plantilla — cópiala como .env con tus datos reales
├── .gitignore
└── public/
    ├── index.html
    ├── style.css
    ├── script.js
    └── uploads/         # fotos subidas (solo si NO usas UPLOADS_DIR)
```

## Cómo usarlo

1. En la portada, toca **"Abrir el álbum"**.
2. Si está vacío, toca **"Agregar el primer recuerdo"**.
3. Arrastra una foto (o tócala para elegirla desde tu galería), escribe una
   nota, y opcionalmente un título y una fecha.
4. Guarda — la página se agrega al final del libro.
5. Navega con las flechas, los puntos de abajo (marcapáginas), o
   deslizando el dedo en el celular.
6. Toca **"editar este recuerdo"** en cualquier página para cambiar el
   texto o eliminarlo.

## Compartirlo con alguien más (para que ambos suban al mismo álbum)

Correrlo en tu PC solo tú lo puedes ver. Para que otra persona suba fotos
al mismo álbum, hay que **desplegarlo** en internet:

1. Sube este proyecto a un repositorio de GitHub (`.env`, `node_modules` y
   las fotos ya quedan excluidos gracias al `.gitignore`).
2. En Railway, dentro del **mismo proyecto** donde tengas tu base de datos
   Postgres, crea un nuevo servicio **"Deploy from GitHub repo"** apuntando
   a ese repositorio.
3. En ese nuevo servicio, en **Variables**, agrega:
   - `DATABASE_URL` → referenciando tu servicio de Postgres (para que use
     la misma base de datos).
   - `UPLOADS_DIR` → `/data/uploads`
4. En **Settings → Volumes**, agrega un volumen con mount path `/data`,
   para que las fotos no se pierdan si el servicio se reinicia.
5. Railway te da una URL pública (algo como
   `https://tu-album.up.railway.app`). Compártela — cualquiera que la abra
   sube fotos a la misma base de datos y ve el mismo álbum.

## Notas de diseño

- Paleta: vino profundo, rosa empolvado, papel crema y dorado envejecido.
- Tipografía: Playfair Display (títulos), Cormorant Garamond (cuerpo),
  Caveat (las notas, como si estuvieran escritas a mano).
- Cada foto se muestra como una polaroid con una "cinta washi", ligeramente
  inclinada, como en un álbum de recortes real.
