# VS Code Proxy Relay

Run an HTTP/S proxy inside VS Code to share its network access.

## Features

- Start a local HTTP proxy (default port 8899) within VS Code
- Supports both HTTP and HTTPS (CONNECT tunnel) traffic
- Auto-finds a free port if the default is in use
- Status bar indicator showing proxy status and port
- Auto-start on activation (configurable)

## Commands

| Command | Description |
|---|---|
| `Proxy Relay: Start` | Start the proxy server |
| `Proxy Relay: Stop` | Stop the proxy server |
| `Proxy Relay: Show Status` | Show current proxy status |

## Configuration

| Setting | Default | Description |
|---|---|---|
| `proxyRelay.port` | `8899` | Port to listen on |
| `proxyRelay.autoStart` | `true` | Auto-start on activation |

## Development

```bash
npm install
```

Then press `F5` in VS Code to launch a new Extension Development Host window.
