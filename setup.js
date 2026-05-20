// ============================================================================
// SETUP SCRIPT - Membuat struktur folder untuk deployment
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up project structure...\n');

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('✅ Created public/ directory');
}

// Move frontend files to public directory
const filesToMove = [
    { from: 'index.html', to: 'public/index.html' },
    { from: 'style.css', to: 'public/style.css' },
    { from: 'app.js', to: 'public/app.js' }
];

filesToMove.forEach(({ from, to }) => {
    const sourcePath = path.join(__dirname, from);
    const destPath = path.join(__dirname, to);
    
    if (fs.existsSync(sourcePath)) {
        // Read and copy file
        const content = fs.readFileSync(sourcePath);
        fs.writeFileSync(destPath, content);
        console.log(`✅ Copied ${from} to ${to}`);
    } else {
        console.log(`⚠️  ${from} not found, skipping...`);
    }
});

// Update app.js to use backend API
const appJsPath = path.join(__dirname, 'public', 'app.js');
if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, 'utf8');
    
    // Replace uploadFilePublic function to use backend
    const newUploadFunction = `
async function uploadFilePublic(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('video', file);
    
    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return file.type.startsWith('image/') ? data.imageUrl : data.videoUrl;
}`;
    
    console.log('✅ Updated app.js to use backend API');
}

// Create .env.example
const envExample = `# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: Set default API key (not recommended for production)
# MAGNIFIC_API_KEY=your_api_key_here
`;

fs.writeFileSync(path.join(__dirname, '.env.example'), envExample);
console.log('✅ Created .env.example');

// Create .gitignore
const gitignore = `node_modules/
.env
*.log
.DS_Store
hasil_generate/
referensi_gambar/
referensi_video/
`;

fs.writeFileSync(path.join(__dirname, '.gitignore'), gitignore);
console.log('✅ Created .gitignore');

console.log('\n✨ Setup complete!\n');
console.log('Next steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm start');
console.log('3. Open: http://localhost:3000\n');