const { Client } = require("ssh2");
const conn = new Client();

const nginxConf = `
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream openfront_workers {
    random;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

map $worker $worker_port {
    default 3001;
    0 3001;
    1 3002;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    # Worker specific routes: /w0/..., /w1/... (both HTTP and WebSockets)
    location ~* ^/w(\\d+)(/.*)?$ {
        set $worker $1;
        proxy_pass http://127.0.0.1:$worker_port$2$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Game creation route distributed across workers
    location = /api/create_game {
        proxy_pass http://openfront_workers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/adminbot/create_game {
        proxy_pass http://openfront_workers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Master / Default route
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

const commands = [
  `cat << 'EOF' > /tmp/nginx_default.conf\n${nginxConf.trim()}\nEOF`,
  "echo 'Loic898696+8' | sudo -S cp /tmp/nginx_default.conf /etc/nginx/sites-available/default",
  "echo 'Loic898696+8' | sudo -S nginx -t",
  "echo 'Loic898696+8' | sudo -S systemctl reload nginx",
  "echo '=== NGINX_WORKERS_ROUTING_RELOADED ==='",
].join("\n");

conn
  .on("ready", () => {
    conn.shell((err, stream) => {
      if (err) throw err;
      stream.on("close", () => conn.end());
      stream.on("data", (d) => process.stdout.write(d));
      stream.write(commands + "\nexit\n");
    });
  })
  .connect({
    host: "46.105.28.146",
    port: 22,
    username: "ubuntu",
    password: "Loic898696+8",
    algorithms: {
      kex: [
        "curve25519-sha256",
        "curve25519-sha256@libssh.org",
        "diffie-hellman-group14-sha256",
      ],
    },
  });
