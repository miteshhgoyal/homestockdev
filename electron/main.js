const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

let mainWindow;
let pythonProcess;
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// Check if backend is responding
async function checkBackend() {
    try {
        await axios.get(BACKEND_URL, { timeout: 2000 });
        return true;
    } catch (error) {
        return false;
    }
}

// Start Python backend
function startPythonBackend() {
    return new Promise((resolve, reject) => {
        console.log('Starting Python backend...');

        const isDev = process.env.NODE_ENV === 'development';
        let pythonCmd, pythonArgs, pythonCwd;

        if (isDev) {
            // Development mode: run Python script directly
            pythonCmd = 'python';
            pythonArgs = ['main.py'];
            pythonCwd = path.join(__dirname, '../python-backend');

            console.log('Development mode - Running:', pythonCmd, pythonArgs);
            console.log('Working directory:', pythonCwd);

            if (!fs.existsSync(path.join(pythonCwd, 'main.py'))) {
                reject(new Error('main.py not found in python-backend folder'));
                return;
            }
        } else {
            // Production mode: run bundled executable
            if (process.platform === 'win32') {
                pythonCmd = path.join(process.resourcesPath, 'python-backend', 'main.exe');
            } else if (process.platform === 'darwin') {
                pythonCmd = path.join(process.resourcesPath, 'python-backend', 'main');
            } else {
                pythonCmd = path.join(process.resourcesPath, 'python-backend', 'main');
            }

            pythonArgs = [];
            pythonCwd = path.join(process.resourcesPath, 'python-backend');

            console.log('Production mode - Running:', pythonCmd);
            console.log('Working directory:', pythonCwd);

            if (!fs.existsSync(pythonCmd)) {
                reject(new Error(`Python backend not found at: ${pythonCmd}`));
                return;
            }
        }

        // Spawn the Python process
        pythonProcess = spawn(pythonCmd, pythonArgs, {
            cwd: pythonCwd,
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`[Python] ${data.toString().trim()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Python Error] ${data.toString().trim()}`);
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python:', error);
            reject(error);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
        });

        console.log(`Python backend starting on ${BACKEND_URL}`);

        // Wait for backend to be ready
        let attempts = 0;
        const maxAttempts = 60; // 30 seconds (60 * 500ms)

        const checkInterval = setInterval(async () => {
            attempts++;
            const isReady = await checkBackend();

            if (isReady) {
                clearInterval(checkInterval);
                console.log('✅ Python backend is ready!');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('Backend failed to start in 30 seconds'));
            } else {
                console.log(`Waiting for backend... (${attempts}/${maxAttempts})`);
            }
        }, 500);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        backgroundColor: '#f3f4f6',
        icon: path.join(__dirname, '../public/icon.png'),
        show: false // Don't show until ready
    });

    const isDev = process.env.NODE_ENV === 'development';
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`;

    console.log('Loading URL:', startUrl);
    mainWindow.loadURL(startUrl);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('✅ Application window ready');
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle navigation errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load page:', errorCode, errorDescription);
    });
}

// App ready event
app.whenReady().then(async () => {
    try {
        console.log('🚀 Starting HomeStock Application...');
        console.log('Environment:', process.env.NODE_ENV || 'production');
        console.log('Platform:', process.platform);

        // Start Python backend first
        await startPythonBackend();

        // Then create window
        createWindow();

        console.log('✅ Application started successfully');

    } catch (error) {
        console.error('❌ Failed to start application:', error);

        // Show error dialog to user
        dialog.showErrorBox(
            'Startup Error',
            `Failed to start HomeStock:\n\n${error.message}\n\nPlease check the logs for more details.`
        );

        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Window closed
app.on('window-all-closed', () => {
    if (pythonProcess) {
        console.log('Stopping Python backend...');
        pythonProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// App quit
app.on('before-quit', () => {
    if (pythonProcess) {
        console.log('Killing Python process...');
        pythonProcess.kill();
    }
});

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});
