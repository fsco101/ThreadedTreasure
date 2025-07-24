// File Upload API Routes for CRUD Manager
// Admin Access Only

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-this-in-production';

// Admin Authentication Middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        req.user = user;
        next();
    });
};

// Ensure upload directories exist
const ensureUploadDirs = async () => {
    const dirs = [
        'public/uploads',
        'public/uploads/products',
        'public/uploads/categories',
        'public/uploads/users',
        'public/uploads/documents'
    ];
    
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
};

// Initialize upload directories
ensureUploadDirs();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine upload directory based on file type or form data
        let uploadDir = 'public/uploads';
        
        if (req.body.entity) {
            uploadDir = `public/uploads/${req.body.entity}s`;
        } else {
            // Determine by file type
            const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (imageTypes.includes(file.mimetype)) {
                uploadDir = 'public/uploads/products'; // Default for images
            } else {
                uploadDir = 'public/uploads/documents';
            }
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDF, and documents are allowed.'), false);
    }
};

// Multer middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Maximum 10 files per request
    }
});

// Upload endpoint
router.post('/upload', authenticateAdmin, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }
        
        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: `/uploads/${path.relative('public/uploads', file.path)}`,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date().toISOString()
        }));
        
        // Log upload activity
        console.log(`📁 Files uploaded by admin ${req.user.email}:`, uploadedFiles.map(f => f.originalname));
        
        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path).catch(console.error);
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Upload failed'
        });
    }
});

// Delete uploaded file endpoint
router.delete('/upload/:filename', authenticateAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const { directory } = req.query;
        
        // Validate filename
        if (!/^[a-zA-Z0-9\-_.]+$/.test(filename)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename'
            });
        }
        
        // Construct file path
        const filePath = directory ? 
            path.join('public/uploads', directory, filename) :
            path.join('public/uploads', filename);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        
        // Delete file
        await fs.unlink(filePath);
        
        console.log(`🗑️ File deleted by admin ${req.user.email}: ${filename}`);
        
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file'
        });
    }
});

// Get upload directory contents (for admin file management)
router.get('/uploads/:directory?', authenticateAdmin, async (req, res) => {
    try {
        const { directory } = req.params;
        const uploadDir = directory ? 
            path.join('public/uploads', directory) :
            'public/uploads';
        
        const files = await fs.readdir(uploadDir);
        const fileDetails = await Promise.all(
            files.map(async (filename) => {
                const filePath = path.join(uploadDir, filename);
                const stats = await fs.stat(filePath);
                
                return {
                    filename,
                    size: stats.size,
                    modified: stats.mtime,
                    isDirectory: stats.isDirectory(),
                    path: `/uploads/${directory ? directory + '/' : ''}${filename}`
                };
            })
        );
        
        res.json({
            success: true,
            directory: directory || 'root',
            files: fileDetails.filter(f => !f.isDirectory),
            directories: fileDetails.filter(f => f.isDirectory)
        });
        
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list files'
        });
    }
});

// Bulk file operations
router.post('/uploads/bulk', authenticateAdmin, async (req, res) => {
    try {
        const { action, files, directory } = req.body;
        
        if (!action || !files || !Array.isArray(files)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bulk operation parameters'
            });
        }
        
        const results = [];
        
        for (const filename of files) {
            try {
                const filePath = directory ?
                    path.join('public/uploads', directory, filename) :
                    path.join('public/uploads', filename);
                
                switch (action) {
                    case 'delete':
                        await fs.unlink(filePath);
                        results.push({ filename, success: true, action: 'deleted' });
                        break;
                        
                    case 'move':
                        const { targetDirectory } = req.body;
                        if (!targetDirectory) {
                            throw new Error('Target directory required for move operation');
                        }
                        
                        const targetPath = path.join('public/uploads', targetDirectory, filename);
                        await fs.rename(filePath, targetPath);
                        results.push({ filename, success: true, action: 'moved', target: targetDirectory });
                        break;
                        
                    default:
                        results.push({ filename, success: false, error: 'Unknown action' });
                }
            } catch (error) {
                results.push({ filename, success: false, error: error.message });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        console.log(`📊 Bulk ${action} operation by admin ${req.user.email}: ${successCount}/${files.length} successful`);
        
        res.json({
            success: true,
            message: `Bulk ${action} completed: ${successCount}/${files.length} successful`,
            results
        });
        
    } catch (error) {
        console.error('Bulk operation error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk operation failed'
        });
    }
});

module.exports = router;
