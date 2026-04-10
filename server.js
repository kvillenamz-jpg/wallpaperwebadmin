const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

// --- Asegurar carpetas necesarias --- //
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const campaignsFile = path.join(dataDir, 'campaigns.json');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

ensureDir(uploadsDir);
ensureDir(dataDir);

if (!fs.existsSync(campaignsFile)) {
    fs.writeFileSync(campaignsFile, '[]', 'utf8');
}

// --- Middleware --- //
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático
app.use(express.static(__dirname));

// Servir imágenes subidas
app.use('/uploads', express.static(uploadsDir));

// --- Configuración de Multer --- //
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, '_');

        const uniqueName = `${Date.now()}-${baseName}${ext}`;
        cb(null, uniqueName);
    }
});

const allowedMimeTypes = ['image/jpeg', 'image/png'];

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: function (req, file, cb) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Solo se permiten imágenes JPG o PNG.'));
        }
        cb(null, true);
    }
});

// --- Utilidades --- //
async function readCampaigns() {
    const raw = await fsp.readFile(campaignsFile, 'utf8');
    return JSON.parse(raw);
}

async function writeCampaigns(campaigns) {
    await fsp.writeFile(campaignsFile, JSON.stringify(campaigns, null, 2), 'utf8');
}

// --- Rutas --- //
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        message: 'Backend operativo'
    });
});

app.get('/api/campaigns', async (req, res) => {
    try {
        const campaigns = await readCampaigns();
        res.json({
            ok: true,
            total: campaigns.length,
            campaigns
        });
    } catch (error) {
        console.error('Error al leer campañas:', error);
        res.status(500).json({
            ok: false,
            message: 'No se pudieron leer las campañas.'
        });
    }
});

app.post('/api/campaigns', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                message: 'Debes subir una imagen.'
            });
        }

        const { applyTo, targetGroup, startDate, endDate } = req.body;

        const campaign = {
            id: Date.now().toString(),
            fileName: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            imageUrl: `/uploads/${req.file.filename}`,
            applyTo: applyTo || 'both',
            targetGroup: targetGroup || 'all',
            startDate: startDate || null,
            endDate: endDate || null,
            status: 'published',
            createdAt: new Date().toISOString()
        };

        const campaigns = await readCampaigns();
        campaigns.unshift(campaign);
        await writeCampaigns(campaigns);

        res.status(201).json({
            ok: true,
            message: 'Campaña guardada correctamente.',
            campaign
        });
    } catch (error) {
        console.error('Error al crear campaña:', error);
        res.status(500).json({
            ok: false,
            message: error.message || 'Error interno al guardar la campaña.'
        });
    }
});

// --- Manejo de errores de Multer y generales --- //
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            ok: false,
            message: `Error de carga: ${error.message}`
        });
    }

    if (error) {
        return res.status(400).json({
            ok: false,
            message: error.message || 'Error en la solicitud.'
        });
    }

    next();
});

// --- Inicio --- //
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});