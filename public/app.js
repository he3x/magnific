// ============================================================================
// MAGNIFIC KLING V3 MOTION CONTROL - WEB APPLICATION
// ============================================================================

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
        console.log(data);
    }
}

// Configuration
const CONFIG = {
    MAX_IMG_MB: 10,
    MAX_VID_MB: 100,
    MAX_QUOTA: 25,
    POLL_INTERVAL_MS: 10000, // 10 seconds
    MAX_POLL_ATTEMPTS: 60,
    ENDPOINTS: {
        std: {
            generate: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std',
            status: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std/'
        },
        pro: {
            generate: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro',
            status: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/'
        }
    }
};

// State Management
const state = {
    images: [],
    videos: [],
    apiKey: '',
    tier: 'std',
    processing: false,
    results: []
};

// DOM Elements
const elements = {
    apiKey: document.getElementById('apiKey'),
    tier: document.getElementById('tier'),
    imageInput: document.getElementById('imageInput'),
    videoInput: document.getElementById('videoInput'),
    imagePreview: document.getElementById('imagePreview'),
    videoPreview: document.getElementById('videoPreview'),
    generateBtn: document.getElementById('generateBtn'),
    progressSection: document.getElementById('progressSection'),
    progressContainer: document.getElementById('progressContainer'),
    resultsSection: document.getElementById('resultsSection'),
    resultsContainer: document.getElementById('resultsContainer'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    tiktokUrl: document.getElementById('tiktokUrl'),
    downloadTiktokBtn: document.getElementById('downloadTiktokBtn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    uploadTab: document.getElementById('uploadTab'),
    tiktokTab: document.getElementById('tiktokTab')
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showLoading(show = true) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    alert(message); // Simple notification, bisa diganti dengan toast library
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function validateFileSize(file, maxMB) {
    const sizeMB = file.size / (1024 * 1024);
    return sizeMB <= maxMB;
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(tabName) {
    // Update tab buttons
    elements.tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update tab content
    if (tabName === 'upload') {
        elements.uploadTab.classList.add('active');
        elements.tiktokTab.classList.remove('active');
    } else if (tabName === 'tiktok') {
        elements.uploadTab.classList.remove('active');
        elements.tiktokTab.classList.add('active');
    }
}

// ============================================================================
// FILE UPLOAD HANDLERS
// ============================================================================

function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (!validateFileSize(file, CONFIG.MAX_IMG_MB)) {
            showNotification(`File ${file.name} melebihi ${CONFIG.MAX_IMG_MB}MB`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            state.images.push({
                file: file,
                name: file.name,
                url: e.target.result,
                size: file.size
            });
            renderImagePreviews();
            updateGenerateButton();
        };
        reader.readAsDataURL(file);
    });
}

function handleVideoUpload(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (!validateFileSize(file, CONFIG.MAX_VID_MB)) {
            showNotification(`File ${file.name} melebihi ${CONFIG.MAX_VID_MB}MB`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            state.videos.push({
                file: file,
                name: file.name,
                url: e.target.result,
                size: file.size,
                isTikTok: false
            });
            renderVideoPreviews();
            updateGenerateButton();
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(index) {
    state.images.splice(index, 1);
    renderImagePreviews();
    updateGenerateButton();
}

function removeVideo(index) {
    state.videos.splice(index, 1);
    renderVideoPreviews();
    updateGenerateButton();
}

// ============================================================================
// TIKTOK DOWNLOAD
// ============================================================================

async function downloadTikTok() {
    const url = elements.tiktokUrl.value.trim();
    
    if (!url) {
        showNotification('Masukkan URL TikTok terlebih dahulu!', 'error');
        return;
    }
    
    if (!url.includes('tiktok.com')) {
        showNotification('URL tidak valid! Harus dari tiktok.com', 'error');
        return;
    }
    
    try {
        showLoading(true);
        elements.downloadTiktokBtn.disabled = true;
        elements.downloadTiktokBtn.textContent = '⏳ Downloading...';
        
        console.log('Downloading TikTok video:', url);
        
        const response = await fetch('/api/tiktok/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.videoUrl) {
            throw new Error('Failed to get video URL');
        }
        
        // Download video via proxy and create blob URL for preview
        const videoName = `TikTok_${data.metadata?.author || 'video'}_${Date.now()}.mp4`;
        
        console.log('📥 Fetching video for preview...');
        const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(data.videoUrl)}`;
        
        try {
            const videoResponse = await fetch(proxyUrl);
            if (!videoResponse.ok) {
                throw new Error('Failed to fetch video via proxy');
            }
            
            const videoBlob = await videoResponse.blob();
            const blobUrl = URL.createObjectURL(videoBlob);
            
            console.log('✅ Video blob created for preview');
            
            state.videos.push({
                file: null,
                name: videoName,
                url: blobUrl, // Use blob URL for preview
                size: videoBlob.size,
                isTikTok: true,
                publicUrl: data.videoUrl, // Public URL for download
                metadata: data.metadata
            });
        } catch (proxyError) {
            console.warn('⚠️ Failed to create blob, using direct URL:', proxyError.message);
            // Fallback: use original URL directly
            state.videos.push({
                file: null,
                name: videoName,
                url: data.videoUrl, // Use original URL as fallback
                size: 0,
                isTikTok: true,
                publicUrl: data.videoUrl,
                metadata: data.metadata
            });
        }
        
        renderVideoPreviews();
        updateGenerateButton();
        
        // Clear input and show success
        elements.tiktokUrl.value = '';
        showLoading(false);
        
        const metaInfo = data.metadata ? 
            `\n\nAuthor: @${data.metadata.author}\nLikes: ${data.metadata.likes?.toLocaleString() || 0}` : '';
        
        showNotification(`✅ TikTok video berhasil ditambahkan!${metaInfo}`, 'success');
        
        console.log('✅ TikTok video added:', videoName);
        
    } catch (error) {
        showLoading(false);
        console.error('TikTok download error:', error);
        showNotification(`Gagal download TikTok: ${error.message}`, 'error');
    } finally {
        elements.downloadTiktokBtn.disabled = false;
        elements.downloadTiktokBtn.textContent = '⬇️ Download';
    }
}

// Download TikTok video from public URL to user's computer
async function downloadTikTokLocal(videoUrl, filename) {
    try {
        showLoading(true);
        console.log('Downloading TikTok video:', filename);
        
        // Fetch video from public URL
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch video');
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
        
        showLoading(false);
        showNotification('✅ Download berhasil! Cek folder Downloads Anda.', 'success');
        console.log('✅ Download complete:', filename);
        
    } catch (error) {
        showLoading(false);
        console.error('Download error:', error);
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

// ============================================================================
// TELEGRAM NOTIFICATION
// ============================================================================

async function sendTelegramNotification(taskName, videoUrl) {
    try {
        const response = await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taskName: taskName,
                videoUrl: videoUrl
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            log('SUCCESS', 'Telegram notification sent', { taskName });
        }
    } catch (error) {
        log('DEBUG', 'Telegram notification skipped or failed', { error: error.message });
    }
}

// ============================================================================
// PREVIEW RENDERING
// ============================================================================

function renderImagePreviews() {
    elements.imagePreview.innerHTML = state.images.map((img, index) => `
        <div class="preview-item">
            <img src="${img.url}" alt="${img.name}">
            <div class="file-name" title="${img.name}">${img.name}</div>
            <button class="remove-btn" onclick="removeImage(${index})">×</button>
        </div>
    `).join('');
}

function renderVideoPreviews() {
    elements.videoPreview.innerHTML = state.videos.map((vid, index) => {
        // TikTok public URL button
        const tiktokButton = vid.isTikTok && vid.publicUrl ? `
            <div class="tiktok-url-section">
                <button class="btn-public-url" onclick="window.open('${vid.publicUrl}', '_blank')" title="Open public URL">
                    <span class="btn-icon">🔗</span>
                    <span class="btn-text">Public URL</span>
                </button>
            </div>
        ` : '';
        
        return `
            <div class="preview-item">
                <video src="${vid.url}" muted></video>
                <div class="file-name" title="${vid.name}">${vid.isTikTok ? '🎵 ' : ''}${vid.name}</div>
                <button class="remove-btn" onclick="removeVideo(${index})">×</button>
                ${tiktokButton}
            </div>
        `;
    }).join('');
}

function updateGenerateButton() {
    const hasFiles = state.images.length > 0 && state.videos.length > 0;
    elements.generateBtn.disabled = !hasFiles || state.processing;
}

// ============================================================================
// FILE UPLOAD TO PUBLIC SERVER
// ============================================================================

async function uploadFilePublic(file) {
    // If it's already a URL (TikTok video), return it directly
    if (typeof file === 'string') {
        return file;
    }
    
    // Try Litterbox first
    try {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('time', '72h');
        formData.append('fileToUpload', file);
        
        const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
            method: 'POST',
            body: formData
        });
        
        const url = await response.text();
        if (response.ok && url.startsWith('https://')) {
            console.log(`✅ Upload Litterbox berhasil: ${url}`);
            return url.trim();
        }
    } catch (error) {
        console.warn('Litterbox error:', error);
    }
    
    // Fallback to tmpfiles.org
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        const viewUrl = data?.data?.url;
        if (viewUrl) {
            const directUrl = viewUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            console.log(`✅ Upload tmpfiles.org berhasil: ${directUrl}`);
            return directUrl;
        }
    } catch (error) {
        console.error('tmpfiles.org error:', error);
    }
    
    throw new Error('Semua layanan upload gagal');
}

// ============================================================================
// MAGNIFIC API INTEGRATION
// ============================================================================

async function generateMotion(imageFile, videoData) {
    log('INFO', 'Starting generateMotion');
    
    const imageUrl = await uploadFilePublic(imageFile);
    
    // Handle TikTok videos (already have public URL)
    let videoUrl;
    if (videoData.isTikTok) {
        // TikTok video already has publicUrl from backend
        videoUrl = videoData.publicUrl;
        log('INFO', 'Using TikTok public URL', { videoUrl });
    } else {
        // Regular uploaded video needs to be uploaded
        videoUrl = await uploadFilePublic(videoData.file);
        log('INFO', 'Uploaded regular video', { videoUrl });
    }
    
    if (!imageUrl || !videoUrl) {
        log('ERROR', 'Missing URLs', { imageUrl, videoUrl });
        throw new Error('Gagal mendapatkan URL publik untuk file');
    }
    
    log('DEBUG', 'URLs ready for generation', { imageUrl, videoUrl });
    
    // Use backend proxy instead of direct Magnific API call
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            apiKey: state.apiKey,
            tier: state.tier
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        log('ERROR', 'Generate API failed', { 
            status: response.status, 
            error: errorData 
        });
        throw new Error(errorData.error || `API Error (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.taskId) {
        log('ERROR', 'Invalid response from generate API', { data });
        throw new Error('Gagal mendapatkan Task ID dari response');
    }
    
    log('SUCCESS', 'Task created', { taskId: data.taskId });
    return String(data.taskId);
}

async function pollTaskStatus(taskId, progressElement) {
    log('INFO', 'Starting pollTaskStatus', { taskId });
    
    for (let attempt = 1; attempt <= CONFIG.MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
        
        try {
            // Use backend proxy for status check
            const response = await fetch(`/api/status/${taskId}?apiKey=${encodeURIComponent(state.apiKey)}&tier=${state.tier}`);
            
            if (!response.ok) {
                log('WARN', `Status check failed, attempt ${attempt}/${CONFIG.MAX_POLL_ATTEMPTS}`, {
                    status: response.status
                });
                updateProgressStatus(progressElement, 'processing', `Cek status... (${attempt}/${CONFIG.MAX_POLL_ATTEMPTS})`);
                continue;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                log('WARN', 'Status check returned unsuccessful', { data });
                updateProgressStatus(progressElement, 'processing', `Cek status... (${attempt}/${CONFIG.MAX_POLL_ATTEMPTS})`);
                continue;
            }
            
            const status = String(data.status || '').toUpperCase();
            log('DEBUG', `Task status: ${status}`, { attempt, taskId });
            
            // Update progress bar
            const progress = Math.min((attempt / CONFIG.MAX_POLL_ATTEMPTS) * 100, 95);
            updateProgressBar(progressElement, progress);
            
            if (['COMPLETED', 'DONE', 'SUCCEEDED', 'SUCCESS'].includes(status)) {
                const videoUrl = data.videoUrl;
                
                if (videoUrl) {
                    log('SUCCESS', 'Task completed', { taskId, videoUrl });
                    updateProgressBar(progressElement, 100);
                    updateProgressStatus(progressElement, 'completed', '✅ Selesai!');
                    return videoUrl;
                } else {
                    log('ERROR', 'Status COMPLETED but no video URL', { data });
                    throw new Error('Status COMPLETED tapi URL video tidak ditemukan');
                }
            } else if (['FAILED', 'ERROR', 'CANCELLED'].includes(status)) {
                const errorMsg = data.message || 'Terjadi kesalahan di server';
                log('ERROR', 'Task failed', { taskId, status, errorMsg });
                throw new Error(errorMsg);
            }
            
            updateProgressStatus(progressElement, 'processing', `${status}... (${attempt}/${CONFIG.MAX_POLL_ATTEMPTS})`);
            
        } catch (error) {
            if (attempt === CONFIG.MAX_POLL_ATTEMPTS) {
                log('ERROR', 'Max poll attempts reached', { taskId, error: error.message });
                throw error;
            }
            log('WARN', 'Error during status check, will retry', { 
                attempt, 
                error: error.message 
            });
        }
    }
    
    log('ERROR', 'Timeout waiting for task', { taskId });
    throw new Error('Timeout! Render terlalu lama');
}

// ============================================================================
// PROGRESS UI MANAGEMENT
// ============================================================================

function createProgressItem(taskName) {
    const div = document.createElement('div');
    div.className = 'progress-item';
    div.innerHTML = `
        <div class="task-info">
            <span class="task-name">${taskName}</span>
            <span class="task-status status-processing">Memproses...</span>
        </div>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
    `;
    elements.progressContainer.appendChild(div);
    return div;
}

function updateProgressStatus(element, status, text) {
    const statusElement = element.querySelector('.task-status');
    statusElement.className = `task-status status-${status}`;
    statusElement.textContent = text;
}

function updateProgressBar(element, percentage) {
    const fillElement = element.querySelector('.progress-bar-fill');
    fillElement.style.width = `${percentage}%`;
}

// ============================================================================
// RESULTS MANAGEMENT
// ============================================================================

function addResult(taskName, videoUrl) {
    state.results.push({ taskName, videoUrl });
    renderResults();
}

function renderResults() {
    elements.resultsSection.style.display = 'block';
    elements.resultsContainer.innerHTML = state.results.map((result, index) => `
        <div class="result-item">
            <div class="result-info">
                <h4>${result.taskName}</h4>
                <p>Video berhasil di-generate</p>
            </div>
            <div class="result-actions">
                <button class="btn-preview" onclick="previewVideo('${result.videoUrl}')">
                    👁️ Preview
                </button>
                <button class="btn-download" onclick="downloadVideo('${result.videoUrl}', '${result.taskName}')">
                    ⬇️ Download
                </button>
            </div>
        </div>
    `).join('');
}

function previewVideo(url) {
    window.open(url, '_blank');
}

async function downloadVideo(url, filename) {
    try {
        showLoading(true);
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${filename}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        
        showLoading(false);
        showNotification('Download berhasil!', 'success');
    } catch (error) {
        showLoading(false);
        showNotification('Gagal download. Silakan coba manual: ' + url, 'error');
    }
}

// ============================================================================
// MAIN GENERATION PROCESS
// ============================================================================

async function startGeneration() {
    // Get single API key from input
    const apiKey = elements.apiKey.value.trim();
    
    if (!apiKey) {
        showNotification('Masukkan API Key terlebih dahulu!', 'error');
        return;
    }
    
    state.apiKey = apiKey;
    state.tier = elements.tier.value;
    
    if (state.images.length === 0 || state.videos.length === 0) {
        showNotification('Upload minimal 1 gambar dan 1 video!', 'error');
        return;
    }
    
    // Prepare tasks
    let tasks = [];
    if (state.videos.length === 1) {
        tasks = state.images.map(img => ({ image: img, video: state.videos[0] }));
    } else if (state.images.length === 1) {
        tasks = state.videos.map(vid => ({ image: state.images[0], video: vid }));
    } else {
        const minLength = Math.min(state.images.length, state.videos.length);
        tasks = Array.from({ length: minLength }, (_, i) => ({
            image: state.images[i],
            video: state.videos[i]
        }));
    }
    
    // Limit to quota
    tasks = tasks.slice(0, CONFIG.MAX_QUOTA);
    
    // Start processing
    state.processing = true;
    updateGenerateButton();
    elements.progressSection.style.display = 'block';
    elements.progressContainer.innerHTML = '';
    
    console.log(`Memulai ${tasks.length} tugas generasi...`);
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskName = `${task.image.name} + ${task.video.name}`;
        const progressElement = createProgressItem(taskName);
        
        try {
            updateProgressStatus(progressElement, 'processing', 'Mengupload file...');
            updateProgressBar(progressElement, 10);
            
            const taskId = await generateMotion(task.image.file, task.video);
            
            updateProgressStatus(progressElement, 'processing', 'Menunggu render...');
            updateProgressBar(progressElement, 30);
            
            const videoUrl = await pollTaskStatus(taskId, progressElement);
            
            addResult(taskName, videoUrl);
            
            // Send Telegram notification if enabled
            await sendTelegramNotification(taskName, videoUrl);
            
            console.log(`✅ Tugas ${i + 1}/${tasks.length} selesai`);
            
            // Delay before next task
            if (i < tasks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.error(`❌ Tugas ${i + 1} gagal:`, error);
            updateProgressStatus(progressElement, 'failed', `❌ Gagal: ${error.message}`);
        }
    }
    
    state.processing = false;
    updateGenerateButton();
    
    showNotification(`Selesai! ${state.results.length}/${tasks.length} tugas berhasil`, 'success');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

elements.imageInput.addEventListener('change', handleImageUpload);
elements.videoInput.addEventListener('change', handleVideoUpload);
elements.generateBtn.addEventListener('click', startGeneration);
elements.downloadTiktokBtn.addEventListener('click', downloadTikTok);

// Tab switching
elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

// Enter key on TikTok URL input
elements.tiktokUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        downloadTikTok();
    }
});

// Make functions globally accessible for onclick handlers
window.removeImage = removeImage;
window.removeVideo = removeVideo;
window.previewVideo = previewVideo;
window.downloadVideo = downloadVideo;
window.downloadTikTokLocal = downloadTikTokLocal;

// Initialize
console.log('Magnific Kling V3 Motion Control Web App - Ready!');
console.log('🎵 TikTok Download Feature: Enabled');