const { app, BrowserWindow, dialog, session, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const iconFilename = 'suno.ico';
const iconPath = path.join(app.getPath('userData'), iconFilename);
let splashWindow;

// ??? Download favicon if not present
function downloadFavicon(callback) {
  if (fs.existsSync(iconPath)) return callback();

  const file = fs.createWriteStream(iconPath);
  https.get('https://suno.com/favicon.ico', response => {
    response.pipe(file);
    file.on('finish', () => file.close(callback));
  }).on('error', err => {
    console.error('Failed to download favicon:', err);
    callback(); // Continue even if download fails
  });
}

// ?? Create splash screen
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    center: true,
    resizable: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined
  });

  splashWindow.loadURL(`data:text/html,
    <body style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
      <div>
        <h2>SunoShell</h2>
        <p>Loading Suno interface...</p>
      </div>
    </body>`);
}

// ?? Create main browser window
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('https://suno.com/login');

  // ?? Intercept downloads
  session.defaultSession.on('will-download', (event, item) => {
    event.preventDefault();

    const filename = item.getFilename();
    dialog.showSaveDialog(mainWindow, {
      title: 'Save your Suno file',
      defaultPath: filename,
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }).then(result => {
      if (!result.canceled) {
        const filePath = result.filePath;
        item.setSavePath(filePath);

        item.on('updated', (_, state) => {
          if (state === 'interrupted') {
            console.log('Download interrupted');
          }
        });

        item.on('done', (_, state) => {
          if (state === 'completed') {
            console.log('Download finished:', filePath);
          } else {
            console.log('Download failed:', state);
          }
        });
      }
    });
  });

  // ?? Restore default menu + Help
const fullMenu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      { role: 'quit', label: 'Exit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Check for Updates',
        click: () => shell.openExternal('https://www.github.com/SomeGuru/SunoShell/')
      },
      {
        label: 'About SunoShell',
        click: () => {
          const aboutMessage = `
Created by: Mike Larios
License: MIT

Copyright Notice:
Logos and services are trademarked and owned by Suno and therefore all rights are reserved.
Mike Larios and Suno are not responsible for misuse or copyright infringement based on this SunoShell Electron Application.

GitHub: https://www.github.com/SomeGuru/SunoShell/
Original URL: https://www.Suno.com/login
          `;

          dialog.showMessageBox({
            type: 'info',
            title: 'About SunoShell',
            message: 'About SunoShell',
            detail: aboutMessage,
            buttons: ['Open GitHub', 'Open Suno', 'Close'],
            noLink: true
          }).then(result => {
            if (result.response === 0) shell.openExternal('https://www.github.com/SomeGuru/SunoShell/');
            else if (result.response === 1) shell.openExternal('https://www.Suno.com/login');
          });
        }
      }
    ]
  }
]);

Menu.setApplicationMenu(fullMenu);
}

// ?? App lifecycle
app.whenReady().then(() => {
  createSplash();

  downloadFavicon(() => {
    setTimeout(() => {
      if (splashWindow) splashWindow.close();
      createMainWindow();
    }, 5000); // Show splash for 5 seconds
  });
});
