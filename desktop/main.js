// نسخة الكمبيوتر: نفس التطبيق ونفس Firebase داخل نافذة Windows
const {app, BrowserWindow, Menu, shell} = require('electron');
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = 47831; // ثابت علشان تسجيل الدخول يفضل محفوظ بين مرات التشغيل
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'};

function serve() {
  const root = path.join(__dirname, 'www');
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(root, path.normalize(p));
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
      res.end(d);
    });
  });
  return new Promise(resolve => {
    server.on('error', () => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    server.listen(PORT, '127.0.0.1', () => resolve(PORT));
  });
}

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(async () => {
  const port = await serve();
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({width: 1180, height: 820, minWidth: 420, minHeight: 600, title: 'خدمة أسرة ثانوي', icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true, backgroundColor: '#0b1b3f'});
  win.loadURL('http://localhost:' + port + '/');
  win.webContents.setWindowOpenHandler(({url}) => { shell.openExternal(url); return {action: 'deny'}; });
  app.on('second-instance', () => { if (win.isMinimized()) win.restore(); win.focus(); });
});
app.on('window-all-closed', () => app.quit());
