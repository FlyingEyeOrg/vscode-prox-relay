const vscode = require('vscode');
const http = require('http');
const net = require('net');
const httpProxy = require('http-proxy');

let proxyServer = null;
let statusBarItem = null;
let externalPort = null;   // 有其他 VS Code 实例已运行代理时记录端口

function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'proxyRelay.showStatus';
    updateStatusBar(false, 0);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand('proxyRelay.start', () => startProxy()),
        vscode.commands.registerCommand('proxyRelay.stop', () => stopProxy()),
        vscode.commands.registerCommand('proxyRelay.showStatus', () => showStatus())
    );

    const config = vscode.workspace.getConfiguration('proxyRelay');
    if (config.get('autoStart', true)) {
        startProxy();
    }
}


async function startProxy() {
    if (proxyServer) {
        vscode.window.showInformationMessage('代理已在运行中');
        return;
    }

    const cfg = vscode.workspace.getConfiguration('proxyRelay');
    const port = cfg.get('port', 8899);

    // http-proxy 实例：用于 HTTP 请求转发
    const proxy = httpProxy.createProxyServer({
        changeOrigin: true,
        proxyTimeout: 30000,
        timeout: 30000,
    });

    proxy.on('error', (err, req, res) => {
        if (res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Proxy error: ' + err.message);
        }
    });

    // HTTP 请求 → http-proxy 转发
    const server = http.createServer((req, res) => {
        const target = req.url;
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
            res.writeHead(400);
            res.end('Bad request: ' + target);
            return;
        }
        proxy.web(req, res, { target: target });
    });

    // CONNECT (HTTPS 隧道) → TCP 直连
    server.on('connect', (req, clientSocket) => {
        const [host, portStr] = req.url.split(':');
        const targetPort = parseInt(portStr) || 443;

        const targetSocket = new net.Socket();
        targetSocket.connect(targetPort, host, () => {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            targetSocket.pipe(clientSocket);
            clientSocket.pipe(targetSocket);
        });
        targetSocket.on('error', err => {
            clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
            clientSocket.end('Error: ' + err.message);
        });
        clientSocket.on('error', () => targetSocket.destroy());
    });

    // 尝试绑定到配置端口
    try {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, '127.0.0.1', resolve);
        });
    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            // 端口已被占用 — 不管是不是其他 VS Code 实例，都认为代理已存在，直接共享
            externalPort = port;
            updateStatusBar(true, port);
            vscode.window.showInformationMessage(
                `检测到其他实例已在 127.0.0.1:${port} 运行代理，本实例共享使用`
            );
            return;
        }
        vscode.window.showErrorMessage('代理错误: ' + err.message);
        return;
    }

    server.on('error', err => {
        vscode.window.showErrorMessage('代理错误: ' + err.message);
        stopProxy();
    });

    proxyServer = server;
    updateStatusBar(true, port);
    vscode.window.showInformationMessage('代理已启动: 127.0.0.1:' + port);
}

function stopProxy() {
    if (proxyServer) {
        proxyServer.close();
        proxyServer = null;
    }
    externalPort = null;
    updateStatusBar(false, 0);
}

function updateStatusBar(running, port) {
    if (running) {
        statusBarItem.text = '$(globe) 代理 :' + port;
        statusBarItem.tooltip = externalPort
            ? '共享其他实例 ' + '127.0.0.1:' + port
            : '运行中 127.0.0.1:' + port;
    } else {
        statusBarItem.text = '$(circle-slash) 代理';
        statusBarItem.tooltip = '点击启动代理';
    }
}

function showStatus() {
    if (proxyServer) {
        const addr = proxyServer.address();
        vscode.window.showInformationMessage('代理运行中: 127.0.0.1:' + addr.port + ' (HTTP/S)');
    } else if (externalPort) {
        vscode.window.showInformationMessage(
            '共享其他实例的代理: 127.0.0.1:' + externalPort + ' (HTTP/S)',
            '停止'
        ).then(sel => {
            if (sel === '停止') vscode.commands.executeCommand('proxyRelay.stop');
        });
    } else {
        vscode.window.showInformationMessage('代理未运行', '启动').then(sel => {
            if (sel === '启动') vscode.commands.executeCommand('proxyRelay.start');
        });
    }
}

function deactivate() {
    stopProxy();
}

module.exports = { activate, deactivate };
