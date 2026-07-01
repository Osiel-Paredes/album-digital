// server.js
// Servidor del álbum digital: sirve el frontend y expone una API sencilla
// para subir, listar, editar y borrar recuerdos (foto + nota).
// Base de datos: PostgreSQL (ver db.js).

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// UPLOADS_DIR permite apuntar a un disco persistente cuando despliegues
// (por ejemplo un Volume de Railway/Render). Si no se define, usa la
// carpeta local public/uploads.
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --- Configuración de subida de imágenes ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, nombreUnico + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por foto
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen'));
    }
    cb(null, true);
  }
});

app.use(express.json());
// Frontend estático (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, 'public')));
// Fotos subidas — servidas aparte porque uploadsDir puede vivir fuera de /public
// cuando se usa un disco persistente en producción.
app.use('/uploads', express.static(uploadsDir));

// --- API ---

// Listar todos los recuerdos, ordenados por fecha (los sin fecha al final)
app.get('/api/photos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM photos
       ORDER BY (date_taken IS NULL) ASC, date_taken ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar un nuevo recuerdo (foto + nota)
app.post('/api/photos', upload.single('photo'), async (req, res) => {
  try {
    const { title, note, date } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Falta la foto.' });
    }
    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Escribe una nota para este recuerdo.' });
    }

    const result = await pool.query(
      `INSERT INTO photos (filename, title, note, date_taken)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        req.file.filename,
        title && title.trim() ? title.trim() : null,
        note.trim(),
        date && date.trim() ? date.trim() : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar el título, nota o fecha de un recuerdo existente
app.put('/api/photos/:id', async (req, res) => {
  try {
    const existente = await pool.query('SELECT * FROM photos WHERE id = $1', [req.params.id]);
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Ese recuerdo no existe.' });
    }
    const actual = existente.rows[0];
    const { title, note, date } = req.body;

    if (note !== undefined && !note.trim()) {
      return res.status(400).json({ error: 'La nota no puede quedar vacía.' });
    }

    const result = await pool.query(
      `UPDATE photos SET title = $1, note = $2, date_taken = $3 WHERE id = $4 RETURNING *`,
      [
        title !== undefined ? (title.trim() || null) : actual.title,
        note !== undefined ? note.trim() : actual.note,
        date !== undefined ? (date.trim() || null) : actual.date_taken,
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un recuerdo (y su archivo de imagen)
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const existente = await pool.query('SELECT * FROM photos WHERE id = $1', [req.params.id]);
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Ese recuerdo no existe.' });
    }

    const rutaArchivo = path.join(uploadsDir, existente.rows[0].filename);
    if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);

    await pool.query('DELETE FROM photos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manejo de errores (por ejemplo, tipo de archivo inválido o muy pesado)
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'Ocurrió un error inesperado.' });
});

// Arrancar: primero aseguramos que la tabla exista, luego levantamos el servidor
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`💌 Álbum digital corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });
