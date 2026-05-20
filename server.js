// ============================================================================
// MAGNIFIC KLING V3 - NODE.JS SERVER
// Backend server untuk handling multi-user dan API proxy
// ============================================================================

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3001;

// Create temporary directory for TikTok videos
const TEMP_TIKTOK_DIR = path.join(__dirname, 'temp_tiktok');
if (!fs.existsSync(TEMP_TIKTOK_DIR)) {
    fs.mkdirSync(TEMP_TIKTOK_DIR, { recursive: true });
    console.log('📁 Created temp_tiktok directory');
}

// ============================================================================
// TELEGRAM BOT CONFIGURATION
// ============================================================================

// Telegram configuration from environment variables
const TELEGRAM_CONFIG = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''
};

let telegramBot = null;

// Initialize Telegram bot on startup if credentials are provided
function initTelegramBot() {
    try {
        if (TELEGRAM_CONFIG.BOT_TOKEN && TELEGRAM_CONFIG.BOT_TOKEN.trim().length > 0) {
            telegramBot = new TelegramBot(TELEGRAM_CONFIG.BOT_TOKEN, { polling: false });
            log('SUCCESS', 'Telegram bot initialized from environment variables');
            return true;
        } else {
            log('INFO', 'Telegram bot not configured (TELEGRAM_BOT_TOKEN not set)');
            return false;
        }
    } catch (error) {
        log('ERROR', 'Failed to initialize Telegram bot', {
            error: error.message
        });
        return false;
    }
}

async function sendTelegramNotification(taskName, videoUrl) {
    // Skip if Telegram not configured
    if (!telegramBot || !TELEGRAM_CONFIG.CHAT_ID) {
        log('DEBUG', 'Telegram not configured, skipping notification');
        return false;
    }

    try {
        const message = `🎬 *Magnific Kling V3 - Generation Complete*\n\n` +
                       `📝 Task: ${taskName}\n` +
                       `✅ Status: Completed\n` +
                       `🔗 Video URL: ${videoUrl}`;

        // Send text message
        await telegramBot.sendMessage(TELEGRAM_CONFIG.CHAT_ID, message, {
            parse_mode: 'Markdown'
        });

        // Send video if URL provided
        if (videoUrl) {
            await telegramBot.sendVideo(TELEGRAM_CONFIG.CHAT_ID, videoUrl, {
                caption: '🎬 Generated Video'
            });
        }

        log('SUCCESS', 'Telegram notification sent', { taskName });
        return true;
    } catch (error) {
        log('ERROR', 'Failed to send Telegram notification', {
            error: error.message,
            taskName
        });
        return false;
    }
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================

const LOG_LEVELS = {
    ERROR: '❌',
    WARN: '⚠️',
    INFO: 'ℹ️',
    SUCCESS: '✅',
    DEBUG: '🔍'
};

function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = LOG_LEVELS[level] || 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
    log('INFO', `${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    log('ERROR', 'Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    }
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    ENDPOINTS: {
        std: {
            generate: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std',
            status: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std/'
        },
        pro: {
            generate: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro',
            status: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/'
        }
    },
    POLL_INTERVAL_MS: 10000,
    MAX_POLL_ATTEMPTS: 60
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadToLitterbox(fileBuffer, filename) {
    try {
        log('INFO', `Uploading to Litterbox: ${filename}`, {
            size: fileBuffer.length
        });

        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('time', '72h');
        formData.append('fileToUpload', fileBuffer, filename);

        const response = await axios.post(
            'https://litterbox.catbox.moe/resources/internals/api.php',
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 180000
            }
        );

        const url = response.data.trim();
        if (url.startsWith('https://')) {
            log('SUCCESS', `Litterbox upload successful: ${url}`);
            return url;
        }
        
        log('WARN', 'Litterbox returned invalid URL', { response: response.data });
        return null;
    } catch (error) {
        log('ERROR', 'Litterbox upload failed', {
            error: error.message,
            filename
        });
        return null;
    }
}

async function uploadToTmpfiles(fileBuffer, filename) {
    try {
        log('INFO', `Uploading to tmpfiles.org: ${filename}`, {
            size: fileBuffer.length
        });

        const formData = new FormData();
        formData.append('file', fileBuffer, filename);

        const response = await axios.post(
            'https://tmpfiles.org/api/v1/upload',
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 180000
            }
        );

        const viewUrl = response.data?.data?.url;
        if (viewUrl) {
            const directUrl = viewUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            log('SUCCESS', `tmpfiles.org upload successful: ${directUrl}`);
            return directUrl;
        }
        
        log('WARN', 'tmpfiles.org returned no URL', { response: response.data });
        return null;
    } catch (error) {
        log('ERROR', 'tmpfiles.org upload failed', {
            error: error.message,
            filename
        });
        return null;
    }
}

async function uploadFilePublic(fileBuffer, filename) {
    log('INFO', `Starting public upload for: ${filename}`);
    
    let url = await uploadToLitterbox(fileBuffer, filename);
    if (!url) {
        log('WARN', 'Litterbox failed, trying tmpfiles.org');
        url = await uploadToTmpfiles(fileBuffer, filename);
    }
    
    if (!url) {
        log('ERROR', 'All upload services failed', { filename });
        throw new Error('Semua layanan upload gagal');
    }
    
    log('SUCCESS', `File uploaded successfully: ${url}`);
    return url;
}

// Send TikTok video to Telegram from temp file, then delete
async function sendTikTokToTelegram(tempFilePath, publicUrl, metadata) {
    if (!telegramBot || !TELEGRAM_CONFIG.CHAT_ID) {
        log('DEBUG', 'Telegram not configured, skipping TikTok notification');
        // Delete temp file even if Telegram not configured
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            log('DEBUG', 'Temp file deleted (Telegram not configured)');
        }
        return false;
    }
    
    try {
        const author = metadata?.author || 'TikTok User';
        const description = metadata?.description || 'Downloaded from TikTok';
        const likes = metadata?.likes ? `❤️ ${metadata.likes.toLocaleString()}` : '';
        const comments = metadata?.comments ? `💬 ${metadata.comments.toLocaleString()}` : '';
        
        // Don't use Markdown to avoid parsing errors
        const caption = `🎵 TikTok Video\n\n` +
                       `👤 ${author}\n` +
                       `📝 ${description}\n` +
                       `${likes} ${comments}\n\n` +
                       `🔗 ${publicUrl}`;
        
        // Send video file from temp storage (no parse_mode to avoid errors)
        await telegramBot.sendVideo(TELEGRAM_CONFIG.CHAT_ID, tempFilePath, {
            caption: caption,
            supports_streaming: true
        });
        
        log('SUCCESS', 'TikTok video sent to Telegram', {
            author,
            tempFile: path.basename(tempFilePath)
        });
        
        // Delete temp file after successful send
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            log('SUCCESS', 'Temp file deleted after Telegram send');
        }
        
        return true;
    } catch (error) {
        log('ERROR', 'Failed to send TikTok video to Telegram', {
            error: error.message
        });
        
        // Delete temp file even on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            log('DEBUG', 'Temp file deleted after error');
        }
        
        return false;
    }
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
    log('INFO', 'Health check requested');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Download TikTok video - Multiple fallback methods
app.post('/api/tiktok/download', async (req, res) => {
    const requestId = Date.now();
    
    try {
        const { url } = req.body;

        if (!url) {
            log('WARN', `[${requestId}] TikTok URL missing`);
            return res.status(400).json({ error: 'TikTok URL required' });
        }

        log('INFO', `[${requestId}] TikTok download started`, { url });

        // Method 1: Try TikWM API
        try {
            log('DEBUG', `[${requestId}] Trying TikWM API`);
            
            const tikwmResponse = await axios.post('https://www.tikwm.com/api/', {
                url: url,
                hd: 1
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000,
                validateStatus: () => true
            });

            if (tikwmResponse.data && tikwmResponse.data.code === 0) {
                const data = tikwmResponse.data.data;
                const videoUrl = data.hdplay || data.play || data.wmplay;

                if (videoUrl) {
                    log('SUCCESS', `[${requestId}] TikWM API success`);
                    log('DEBUG', `[${requestId}] Downloading video from TikWM`);
                    
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://www.tikwm.com/'
                        }
                    });

                    const videoBuffer = Buffer.from(videoResponse.data);
                    log('DEBUG', `[${requestId}] Video downloaded, size: ${videoBuffer.length} bytes`);
                    
                    // Prepare metadata
                    const metadata = {
                        author: data.author?.unique_id || 'TikTok User',
                        description: data.title || 'Downloaded from TikTok',
                        likes: data.digg_count,
                        comments: data.comment_count,
                        shares: data.share_count,
                        plays: data.play_count
                    };
                    
                    // Save to temp file
                    const tempFileName = `tiktok_${Date.now()}.mp4`;
                    const tempFilePath = path.join(TEMP_TIKTOK_DIR, tempFileName);
                    fs.writeFileSync(tempFilePath, videoBuffer);
                    log('DEBUG', `[${requestId}] Saved to temp: ${tempFileName}`);
                    
                    // Upload to public URL
                    const publicUrl = await uploadFilePublic(videoBuffer, tempFileName);
                    
                    // Send to Telegram (will delete temp file after)
                    await sendTikTokToTelegram(tempFilePath, publicUrl, metadata);

                    log('SUCCESS', `[${requestId}] TikTok download complete`, {
                        publicUrl,
                        author: metadata.author
                    });

                    return res.json({
                        success: true,
                        videoUrl: publicUrl,
                        metadata: metadata
                    });
                }
            }
            log('WARN', `[${requestId}] TikWM API returned no video URL`);
        } catch (tikwmError) {
            log('ERROR', `[${requestId}] TikWM API failed`, {
                error: tikwmError.message
            });
        }

        // Method 2: Try SSSTik API
        try {
            log('DEBUG', `[${requestId}] Trying SSSTik API`);
            
            const ssstikResponse = await axios.post('https://ssstik.io/abc?url=dl', 
                `id=${encodeURIComponent(url)}&locale=en&tt=bWlkZGxl`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'HX-Request': 'true',
                        'HX-Target': 'target',
                        'HX-Current-URL': 'https://ssstik.io/en'
                    },
                    timeout: 30000,
                    validateStatus: () => true
                }
            );

            if (ssstikResponse.data) {
                const html = ssstikResponse.data;
                const match = html.match(/href="([^"]+)"[^>]*>Download<\/a>/i) || 
                             html.match(/href="([^"]+)"[^>]*download/i);
                
                if (match && match[1]) {
                    let videoUrl = match[1];
                    if (videoUrl.startsWith('//')) {
                        videoUrl = 'https:' + videoUrl;
                    } else if (videoUrl.startsWith('/')) {
                        videoUrl = 'https://ssstik.io' + videoUrl;
                    }

                    log('SUCCESS', `[${requestId}] SSSTik API success`);
                    log('DEBUG', `[${requestId}] Downloading video from SSSTik`);
                    
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://ssstik.io/'
                        }
                    });

                    const videoBuffer = Buffer.from(videoResponse.data);
                    log('DEBUG', `[${requestId}] Video downloaded, size: ${videoBuffer.length} bytes`);
                    
                    // Prepare metadata
                    const metadata = {
                        author: 'TikTok User',
                        description: 'Downloaded from TikTok via SSSTik'
                    };
                    
                    // Save to temp file
                    const tempFileName = `tiktok_${Date.now()}.mp4`;
                    const tempFilePath = path.join(TEMP_TIKTOK_DIR, tempFileName);
                    fs.writeFileSync(tempFilePath, videoBuffer);
                    log('DEBUG', `[${requestId}] Saved to temp: ${tempFileName}`);
                    
                    // Upload to public URL
                    const publicUrl = await uploadFilePublic(videoBuffer, tempFileName);
                    
                    // Send to Telegram (will delete temp file after)
                    await sendTikTokToTelegram(tempFilePath, publicUrl, metadata);

                    log('SUCCESS', `[${requestId}] TikTok download complete via SSSTik`, {
                        publicUrl
                    });

                    return res.json({
                        success: true,
                        videoUrl: publicUrl,
                        metadata: metadata
                    });
                }
            }
            log('WARN', `[${requestId}] SSSTik API returned no video URL`);
        } catch (ssstikError) {
            log('ERROR', `[${requestId}] SSSTik API failed`, {
                error: ssstikError.message
            });
        }

        // Method 3: Try MusicalDown API
        try {
            log('DEBUG', `[${requestId}] Trying MusicalDown API`);
            
            const musicalResponse = await axios.post('https://musicaldown.com/download', 
                `url=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 30000,
                    validateStatus: () => true
                }
            );

            if (musicalResponse.data) {
                const html = musicalResponse.data;
                const match = html.match(/href="([^"]+)"[^>]*>Download Video/i);
                
                if (match && match[1]) {
                    let videoUrl = match[1];
                    if (videoUrl.startsWith('//')) {
                        videoUrl = 'https:' + videoUrl;
                    }

                    log('SUCCESS', `[${requestId}] MusicalDown API success`);
                    log('DEBUG', `[${requestId}] Downloading video from MusicalDown`);
                    
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    const videoBuffer = Buffer.from(videoResponse.data);
                    log('DEBUG', `[${requestId}] Video downloaded, size: ${videoBuffer.length} bytes`);
                    
                    // Prepare metadata
                    const metadata = {
                        author: 'TikTok User',
                        description: 'Downloaded from TikTok via MusicalDown'
                    };
                    
                    // Save to temp file
                    const tempFileName = `tiktok_${Date.now()}.mp4`;
                    const tempFilePath = path.join(TEMP_TIKTOK_DIR, tempFileName);
                    fs.writeFileSync(tempFilePath, videoBuffer);
                    log('DEBUG', `[${requestId}] Saved to temp: ${tempFileName}`);
                    
                    // Upload to public URL
                    const publicUrl = await uploadFilePublic(videoBuffer, tempFileName);
                    
                    // Send to Telegram (will delete temp file after)
                    await sendTikTokToTelegram(tempFilePath, publicUrl, metadata);

                    log('SUCCESS', `[${requestId}] TikTok download complete via MusicalDown`, {
                        publicUrl
                    });

                    return res.json({
                        success: true,
                        videoUrl: publicUrl,
                        metadata: metadata
                    });
                }
            }
            log('WARN', `[${requestId}] MusicalDown API returned no video URL`);
        } catch (musicalError) {
            log('ERROR', `[${requestId}] MusicalDown API failed`, {
                error: musicalError.message
            });
        }

        // All methods failed
        log('ERROR', `[${requestId}] All TikTok download methods failed`);
        throw new Error('Semua metode download TikTok gagal. Silakan coba video lain atau download manual dari ssstik.io atau snaptik.app');

    } catch (error) {
        log('ERROR', `[${requestId}] TikTok download error`, {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: error.message || 'Failed to download TikTok video',
            suggestion: 'Coba download manual dari: https://ssstik.io atau https://snaptik.app'
        });
    }
});

// Upload files and get public URLs
app.post('/api/upload', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    const requestId = Date.now();
    
    try {
        const imageFile = req.files['image']?.[0];
        const videoFile = req.files['video']?.[0];

        if (!imageFile || !videoFile) {
            log('WARN', `[${requestId}] Missing files in upload request`);
            return res.status(400).json({ error: 'Image dan video harus diupload' });
        }

        log('INFO', `[${requestId}] Upload request received`, {
            image: imageFile.originalname,
            video: videoFile.originalname,
            imageSize: imageFile.size,
            videoSize: videoFile.size
        });

        const [imageUrl, videoUrl] = await Promise.all([
            uploadFilePublic(imageFile.buffer, imageFile.originalname),
            uploadFilePublic(videoFile.buffer, videoFile.originalname)
        ]);

        log('SUCCESS', `[${requestId}] Upload complete`, {
            imageUrl,
            videoUrl
        });

        res.json({
            success: true,
            imageUrl,
            videoUrl
        });

    } catch (error) {
        log('ERROR', `[${requestId}] Upload error`, {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: error.message });
    }
});

// Generate motion video
app.post('/api/generate', async (req, res) => {
    const requestId = Date.now();
    
    try {
        const { imageUrl, videoUrl, apiKey, tier = 'std' } = req.body;

        if (!imageUrl || !videoUrl || !apiKey) {
            log('WARN', `[${requestId}] Missing parameters in generate request`);
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        log('INFO', `[${requestId}] Generate request started`, {
            tier,
            imageUrl: imageUrl.substring(0, 50) + '...',
            videoUrl: videoUrl.substring(0, 50) + '...'
        });

        const endpoint = CONFIG.ENDPOINTS[tier].generate;
        const payload = {
            image_url: imageUrl,
            video_url: videoUrl,
            character_orientation: 'video',
            cfg_scale: 0.5,
            mode: tier
        };

        log('DEBUG', `[${requestId}] Sending request to Magnific API`, {
            endpoint,
            payload
        });

        const response = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-magnific-api-key': apiKey
            },
            timeout: 60000
        });

        const data = response.data;
        let taskId;

        if (data.data && typeof data.data === 'object') {
            taskId = data.data.task_id || data.data.id || data.data.taskId;
        } else {
            taskId = data.id || data.task_id || data.taskId;
        }

        if (!taskId) {
            log('ERROR', `[${requestId}] No task ID in response`, { response: data });
            throw new Error('Gagal mendapatkan Task ID dari response');
        }

        log('SUCCESS', `[${requestId}] Task created`, { taskId });

        res.json({
            success: true,
            taskId: String(taskId)
        });

    } catch (error) {
        log('ERROR', `[${requestId}] Generate error`, {
            error: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        res.status(500).json({ 
            error: error.response?.data || error.message 
        });
    }
});

// Check task status
app.get('/api/status/:taskId', async (req, res) => {
    const requestId = Date.now();
    
    try {
        const { taskId } = req.params;
        const { apiKey, tier = 'std' } = req.query;

        if (!apiKey) {
            log('WARN', `[${requestId}] API Key missing in status check`);
            return res.status(400).json({ error: 'API Key required' });
        }

        log('DEBUG', `[${requestId}] Checking status for task: ${taskId}`);

        let statusUrl = `${CONFIG.ENDPOINTS[tier].status}${taskId}`;

        let response = await axios.get(statusUrl, {
            headers: {
                'x-magnific-api-key': apiKey
            },
            timeout: 15000
        }).catch(async (error) => {
            // Try alternative endpoint if 404
            if (error.response?.status === 404) {
                log('WARN', `[${requestId}] 404 on primary endpoint, trying alternative`);
                const altUrl = `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/${taskId}`;
                return await axios.get(altUrl, {
                    headers: {
                        'x-magnific-api-key': apiKey
                    },
                    timeout: 15000
                });
            }
            throw error;
        });

        const rawData = response.data;
        const data = rawData.data || rawData;

        log('DEBUG', `[${requestId}] Task status: ${data.status}`, {
            taskId,
            status: data.status
        });

        res.json({
            success: true,
            status: data.status,
            videoUrl: data.video_url || 
                     data.url || 
                     data.output || 
                     data.result?.video_url ||
                     data.outputs?.[0] ||
                     data.generated?.[0],
            message: data.message || data.error,
            data: data
        });

    } catch (error) {
        log('ERROR', `[${requestId}] Status check error`, {
            error: error.message,
            taskId: req.params.taskId
        });
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

// Proxy endpoint untuk video URLs (bypass CORS)
app.get('/api/proxy-video', async (req, res) => {
    const requestId = Date.now();
    
    try {
        const { url } = req.query;
        
        if (!url) {
            log('WARN', `[${requestId}] Proxy URL missing`);
            return res.status(400).json({ error: 'URL parameter required' });
        }

        log('INFO', `[${requestId}] Proxying video`, {
            url: url.substring(0, 50) + '...'
        });

        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 120000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Set appropriate headers
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Pipe the video stream to response
        response.data.pipe(res);

        log('SUCCESS', `[${requestId}] Video proxy successful`);

    } catch (error) {
        log('ERROR', `[${requestId}] Proxy error`, {
            error: error.message,
            url: req.query.url
        });
        res.status(500).json({ error: 'Failed to proxy video' });
    }
});

// ============================================================================
// TELEGRAM NOTIFICATION ENDPOINT
// ============================================================================

// Send notification to Telegram (called by frontend after generation completes)
app.post('/api/telegram/notify', async (req, res) => {
    const requestId = Date.now();
    
    try {
        const { taskName, videoUrl } = req.body;

        if (!taskName || !videoUrl) {
            log('WARN', `[${requestId}] Missing parameters for Telegram notification`);
            return res.status(400).json({ error: 'Task name and video URL required' });
        }

        log('INFO', `[${requestId}] Telegram notification request`, {
            taskName,
            hasVideo: !!videoUrl
        });

        // Send notification (will be skipped if Telegram not configured)
        const success = await sendTelegramNotification(taskName, videoUrl);

        res.json({
            success: success,
            message: success ? 'Notification sent to Telegram' : 'Telegram not configured'
        });

    } catch (error) {
        log('ERROR', `[${requestId}] Telegram notify error`, {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    log('WARN', `404 Not Found: ${req.path}`);
    res.status(404).json({ error: 'Not found' });
});

// ============================================================================
// START SERVER
// ============================================================================

// Support both Unix socket and TCP port
const SOCKET_PATH = process.env.SOCKET_PATH || null;
const USE_SOCKET = SOCKET_PATH && process.env.NODE_ENV === 'production';

let server;

if (USE_SOCKET) {
    // Production: Use Unix socket
    
    // Cleanup old socket file if exists
    if (fs.existsSync(SOCKET_PATH)) {
        try {
            fs.unlinkSync(SOCKET_PATH);
            log('INFO', 'Removed old socket file', { path: SOCKET_PATH });
        } catch (error) {
            log('WARN', 'Could not remove old socket file', { 
                path: SOCKET_PATH, 
                error: error.message 
            });
        }
    }
    
    server = app.listen(SOCKET_PATH, () => {
        // Set socket permissions (readable/writable by all)
        try {
            fs.chmodSync(SOCKET_PATH, '666');
            log('INFO', 'Socket permissions set to 666');
        } catch (error) {
            log('WARN', 'Could not set socket permissions', { error: error.message });
        }
        
        const banner = '='.repeat(60);
        const title = '🚀 MAGNIFIC KLING V3 SERVER RUNNING';
        const padding = ' '.repeat(Math.floor((60 - title.length) / 2));
        
        console.log(banner);
        console.log(padding + title);
        console.log(banner);
        console.log(`\n Server: Unix Socket`);
        console.log(` Socket Path: ${SOCKET_PATH}`);
        console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(` Time: ${new Date().toLocaleString()}`);
        console.log(` Node: ${process.version}`);
        console.log(`\n Logging: ENABLED`);
        console.log(` Log Levels: ERROR, WARN, INFO, SUCCESS, DEBUG`);
        console.log('\n' + banner + '\n');
        
        log('SUCCESS', 'Server started successfully on Unix socket', {
            socketPath: SOCKET_PATH,
            env: process.env.NODE_ENV || 'development'
        });
        
        // Initialize Telegram bot after server starts
        initTelegramBot();
    });
} else {
    // Development: Use TCP port
    server = app.listen(PORT, () => {
        const banner = '='.repeat(60);
        const title = '🚀 MAGNIFIC KLING V3 SERVER RUNNING';
        const padding = ' '.repeat(Math.floor((60 - title.length) / 2));
        
        console.log(banner);
        console.log(padding + title);
        console.log(banner);
        console.log(`\n Server: http://localhost:${PORT}`);
        console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(` Time: ${new Date().toLocaleString()}`);
        console.log(` Node: ${process.version}`);
        console.log(`\n Logging: ENABLED`);
        console.log(` Log Levels: ERROR, WARN, INFO, SUCCESS, DEBUG`);
        console.log('\n' + banner + '\n');
        
        log('SUCCESS', 'Server started successfully', {
            port: PORT,
            env: process.env.NODE_ENV || 'development'
        });
        
        // Initialize Telegram bot after server starts
        initTelegramBot();
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    log('INFO', 'SIGTERM signal received: closing HTTP server');
    server.close(() => {
        log('INFO', 'HTTP server closed');
        
        // Cleanup socket file if using Unix socket
        if (USE_SOCKET && SOCKET_PATH && fs.existsSync(SOCKET_PATH)) {
            try {
                fs.unlinkSync(SOCKET_PATH);
                log('INFO', 'Socket file cleaned up', { path: SOCKET_PATH });
            } catch (error) {
                log('WARN', 'Could not cleanup socket file', { error: error.message });
            }
        }
        
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log('INFO', 'SIGINT signal received: closing HTTP server');
    server.close(() => {
        log('INFO', 'HTTP server closed');
        
        // Cleanup socket file if using Unix socket
        if (USE_SOCKET && SOCKET_PATH && fs.existsSync(SOCKET_PATH)) {
            try {
                fs.unlinkSync(SOCKET_PATH);
                log('INFO', 'Socket file cleaned up', { path: SOCKET_PATH });
            } catch (error) {
                log('WARN', 'Could not cleanup socket file', { error: error.message });
            }
        }
        
        process.exit(0);
    });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', 'Unhandled Rejection', {
        reason: reason,
        promise: promise
    });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    log('ERROR', 'Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});