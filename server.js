import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';
import { db } from './db.js';

// ─── Cloudinary Config ────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: upload buffer to Cloudinary and return secure URL
async function uploadToCloudinary(buffer, mimeType = 'image/png') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'pixelogic-bugreports',
        resource_type: 'image',
        format: mimeType.split('/')[1] || 'png'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

// ─── Express App ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// Use memory storage for multer (files go straight to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Auth Middleware ──────────────────────────────────────────
const validateAdminAuth = async (req, res, next) => {
  try {
    const password = req.headers['x-admin-password'];
    const settings = await db.getSettings();
    if (password !== settings.adminPassword) {
      return res.status(401).json({ error: 'Acesso negado. Senha administrativa incorreta.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno de autenticação.' });
  }
};

// ─── CLIENT PORTAL API ───────────────────────────────────────

// 1. Validate client password
app.post('/api/auth/client', async (req, res) => {
  try {
    const { slug, password } = req.body;
    if (!slug) return res.status(400).json({ error: 'O slug da empresa é obrigatório.' });

    const company = await db.getCompanyBySlug(slug);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });

    if (password !== company.password) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Validate admin password
app.post('/api/auth/admin', async (req, res) => {
  try {
    const { password } = req.body;
    const settings = await db.getSettings();
    if (password !== settings.adminPassword) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get company info by slug (public)
app.get('/api/companies/:slug', async (req, res) => {
  try {
    const company = await db.getCompanyBySlug(req.params.slug);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });

    res.json({
      id: company.id,
      name: company.name,
      slug: company.slug,
      members: company.members
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get reports for a company (client authenticated)
app.get('/api/companies/:slug/reports', async (req, res) => {
  try {
    const password = req.headers['x-client-password'] || req.query.password;
    const company = await db.getCompanyBySlug(req.params.slug);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });

    if (password !== company.password) {
      return res.status(401).json({ error: 'Acesso negado. Senha incorreta.' });
    }

    const reports = await db.getReportsByCompany(company.id);
    // Exclude internalNotes from client view
    const clientReports = reports.map(({ internalNotes, ...rest }) => rest);
    res.json(clientReports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Submit a new report (file upload OR base64 from Ctrl+V)
app.post('/api/reports', upload.single('file'), async (req, res) => {
  try {
    const { companyId, title, description, priority, reporter, url, screenshotBase64 } = req.body;

    if (!companyId || !title || !description || !reporter) {
      return res.status(400).json({ error: 'Campos obrigatórios: companyId, title, description, reporter.' });
    }

    let attachmentUrl = '';

    // Scenario A: Multer file upload → send buffer to Cloudinary
    if (req.file) {
      attachmentUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    }
    // Scenario B: Base64 from Ctrl+V → decode and send to Cloudinary
    else if (screenshotBase64) {
      const matches = screenshotBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer;
      let mimeType = 'image/png';

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(screenshotBase64, 'base64');
      }
      attachmentUrl = await uploadToCloudinary(buffer, mimeType);
    }

    const report = await db.createReport({
      companyId,
      title,
      description,
      priority,
      reporter,
      url,
      attachmentUrl
    });

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Erro interno ao processar o relatório.' });
  }
});

// ─── ADMIN MANAGEMENT API ─────────────────────────────────────

// 1. Get all reports
app.get('/api/admin/reports', validateAdminAuth, async (req, res) => {
  try {
    const reports = await db.getReports();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update report (status, priority, internalNotes)
app.patch('/api/admin/reports/:id', validateAdminAuth, async (req, res) => {
  try {
    const updated = await db.updateReport(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 3. Delete report
app.delete('/api/admin/reports/:id', validateAdminAuth, async (req, res) => {
  try {
    await db.deleteReport(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 4. Get all companies
app.get('/api/admin/companies', validateAdminAuth, async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Create company
app.post('/api/admin/companies', validateAdminAuth, async (req, res) => {
  try {
    const { name, slug, password, members } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Nome e slug são obrigatórios.' });
    }
    const created = await db.createCompany({ name, slug, password, members });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Update company
app.put('/api/admin/companies/:id', validateAdminAuth, async (req, res) => {
  try {
    const updated = await db.updateCompany(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Delete company
app.delete('/api/admin/companies/:id', validateAdminAuth, async (req, res) => {
  try {
    await db.deleteCompany(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 8. Get settings
app.get('/api/admin/settings', validateAdminAuth, async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Update settings
app.put('/api/admin/settings', validateAdminAuth, async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default app;

// ─── Local Dev Server ─────────────────────────────────────────
// In production (Vercel), this block is ignored.
// The app is exported above and used by api/index.js
if (process.env.NODE_ENV !== 'production') {
  import('path').then(({ default: path }) => {
    import('fs').then(({ default: fs }) => {
      import('url').then(({ fileURLToPath }) => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const buildPath = path.join(__dirname, 'dashboard', 'dist');
        if (fs.existsSync(buildPath)) {
          app.use(express.static(buildPath));
          app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api')) return next();
            res.sendFile(path.join(buildPath, 'index.html'));
          });
        }
        app.listen(PORT, () => {
          console.log(`Server running on http://localhost:${PORT}`);
          console.log(`Admin: http://localhost:${PORT}/admin`);
        });
      });
    });
  });
}
