# Deploy the backend to AWS (free-tier test setup, via Console)

One EC2 `t3.micro` (free tier) runs everything: Spring Boot jar + PostgreSQL + Caddy (free automatic HTTPS).
Cost: $0 within the free tier (new accounts: 750 h/month of t3.micro, 30 GB EBS for 12 months). Not highly
available, no backups: **for testing only**. Move the DB to RDS and the app to ECS/App Runner for production.

Result: `https://<elastic-ip>.sslip.io/api/v1/...` that the mobile app and admin dashboard can call.

## 0. Build the jar locally

```bash
cd backend
./mvnw clean package -DskipTests      # -> target/property-platform-0.0.1-SNAPSHOT.jar
```

Generate two secrets and keep them (used in step 5):

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # OTP_HMAC_SECRET
```

## 1. Launch the EC2 instance (Console)

1. Console -> region (e.g. **ap-south-1 Mumbai**) -> **EC2 -> Launch instance**.
2. Name `property-api`. AMI: **Ubuntu Server 24.04 LTS**. Type: **t3.micro** (or t2.micro where t3 is not free-tier).
3. **Key pair** -> Create new (RSA, `.pem`), save as `~/.ssh/property-api.pem`, then `chmod 400 ~/.ssh/property-api.pem`.
4. **Network settings -> Edit**, new security group with inbound rules:
   - SSH (22) from **My IP**
   - HTTP (80) from Anywhere (needed for the certificate)
   - HTTPS (443) from Anywhere
   - Do **not** open 8080 or 5432.
5. Storage: 20 GB gp3. Launch.

## 2. Give it a fixed address

EC2 -> **Elastic IPs -> Allocate** -> **Associate** with `property-api`. (Free while attached to a running instance.)
Your hostname is `<elastic-ip-with-dashes>.sslip.io`, e.g. `13-233-10-20.sslip.io` (sslip.io resolves it to the IP, no domain purchase).

## 3. Install software on the server

```bash
ssh -i ~/.ssh/property-api.pem ubuntu@<elastic-ip>
```

```bash
sudo apt update && sudo apt install -y openjdk-17-jre-headless postgresql caddy

# 1 GB RAM box: add swap so Java + Postgres do not get OOM-killed
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Create the database

```bash
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')   # note this value for step 5
echo "$DB_PASS"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER property_user WITH PASSWORD '$DB_PASS';
CREATE DATABASE property_app OWNER property_user;
SQL
```

Postgres listens on localhost only by default. Flyway creates the schema on first start.

## 5. Configure and upload the app

On the server:

```bash
sudo mkdir -p /opt/property /var/lib/property/media
sudo useradd --system --home /opt/property property
sudo chown -R property:property /opt/property /var/lib/property

sudo tee /etc/property.env >/dev/null <<'EOF'
DB_URL=jdbc:postgresql://localhost:5432/property_app
DB_USERNAME=property_user
DB_PASSWORD=<DB_PASS from step 4>
JWT_SECRET=<generated in step 0>
OTP_HMAC_SECRET=<generated in step 0>
JWT_ISSUER=property-platform
JWT_AUDIENCE=property-platform-app
CORS_ALLOWED_ORIGINS=https://<your admin dashboard origin>
MEDIA_STORAGE_ROOT=/var/lib/property/media
# Real OTP emails need SMTP (see note below). Without it nobody can finish OTP flows.
OTP_EMAIL_PROVIDER=smtp
OTP_SMS_PROVIDER=none
OTP_EMAIL_FROM=no-reply@yourdomain.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EOF
sudo chmod 600 /etc/property.env
```

From your Mac, upload the jar:

```bash
scp -i ~/.ssh/property-api.pem target/property-platform-0.0.1-SNAPSHOT.jar ubuntu@<elastic-ip>:/tmp/app.jar
```

On the server:

```bash
sudo mv /tmp/app.jar /opt/property/app.jar && sudo chown property:property /opt/property/app.jar
```

## 6. Run it as a service

```bash
sudo tee /etc/systemd/system/property.service >/dev/null <<'EOF'
[Unit]
Description=Property Platform API
After=network.target postgresql.service

[Service]
User=property
EnvironmentFile=/etc/property.env
ExecStart=/usr/bin/java -Xms256m -Xmx384m -jar /opt/property/app.jar --server.address=127.0.0.1 --server.port=8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload && sudo systemctl enable --now property
journalctl -u property -f            # wait for "Started PropertyPlatformApplication"
curl localhost:8080/actuator/health  # {"status":"UP"}
```

If it exits at startup, the log tells you which required setting is missing.

## 7. HTTPS reverse proxy

Replace the host with your own:

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
13-233-10-20.sslip.io {
	reverse_proxy 127.0.0.1:8080
}
EOF
sudo systemctl reload caddy
```

Test from your Mac: `curl https://13-233-10-20.sslip.io/actuator/health`

## 8. Point the apps at it

- Mobile app / admin-web base URL: `https://13-233-10-20.sslip.io/api/v1`
- Add the admin dashboard's origin to `CORS_ALLOWED_ORIGINS` in `/etc/property.env`, then `sudo systemctl restart property`.
  (Native mobile apps do not use CORS.)

## Redeploying a new version

```bash
./mvnw clean package -DskipTests
scp -i ~/.ssh/property-api.pem target/property-platform-0.0.1-SNAPSHOT.jar ubuntu@<elastic-ip>:/tmp/app.jar
ssh -i ~/.ssh/property-api.pem ubuntu@<elastic-ip> \
  'sudo mv /tmp/app.jar /opt/property/app.jar && sudo chown property:property /opt/property/app.jar && sudo systemctl restart property'
```

## Notes and gotchas

- **OTP delivery**: without the `dev` profile, the app needs a real email provider (SMTP). Free options: Gmail SMTP with an
  app password, or Amazon SES (sandbox mode only sends to verified addresses). Never run `dev` on the server.
- **Seed/admin data**: the first admin user and roles must exist. Check `src/main/resources/db/migration` for seeded
  accounts; do not copy dev seed data to a public server.
- **Costs to watch**: free tier ends 12 months after account creation; an Elastic IP not attached to a running instance is
  billed; set a **Billing -> Budgets** alert for $1.
- **Stop when idle**: stopping the instance stops compute charges (keep the Elastic IP associated or release it).
- **Backups**: `sudo -u postgres pg_dump property_app > backup.sql` (and copy `/var/lib/property/media`) before experiments.
