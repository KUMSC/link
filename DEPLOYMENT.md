# Deployment & Operations Guide

This guide walks you through deploying and configuring the Club Link application on Cloudflare's serverless infrastructure. The platform runs entirely on Cloudflare's free tier.

---

## Architecture Overview

- **Compute & Routing**: Cloudflare Worker (via Hono)
- **Frontend SPA**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Media & Uploads**: Cloudflare R2 (Object Storage for avatars, banners, and card thumbnails)
- **Edge Cache (Optional)**: Cloudflare Workers KV (Public page payload cache)
- **Admin Access Protection**: Cloudflare Access Zero Trust with JWT assertion verification
- **Observability**: Cloudflare Workers Logs with structured JSON telemetry

---

## Prerequisites

1. **Cloudflare Account**: [Sign up for Cloudflare](https://dash.cloudflare.com/sign-up) (Free tier).
2. **Node.js**: Version >= 22.22 installed locally.
3. **Wrangler CLI**: Cloudflare CLI tool (invoked via `npx wrangler`).

---

## Step 1: One-Time Account Setup (Activate R2)

Before deploying any Worker that references an R2 bucket binding, you must activate R2 in your Cloudflare account:

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the sidebar, select **R2**.
3. Click **Activate R2**.

*(R2 is free for up to 10 GB of storage and 1 million class A operations per month, but activation is required to prevent `code: 10042` during provisioning).*

---

## Step 2: Deployment Methods

### Option A: Automatic Git Integration via Cloudflare Dashboard (Recommended)

1. **Push your repository to GitHub**:
   Ensure your latest code is pushed to your remote repository branch (`main`).

2. **Connect to Cloudflare Workers**:
   - Go to **Workers & Pages** in the Cloudflare Dashboard.
   - Click **Create application** -> **Workers** -> **Import repository**.
   - Connect your GitHub account and select your repository.

3. **Auto-Provisioning**:
   - Cloudflare reads `wrangler.jsonc` and automatically provisions:
     - `club-link-db` (D1 Database)
     - `club-link-uploads` (R2 Bucket)
   - Click **Save and Deploy**.

4. **Apply Database Migrations to Remote D1**:
   Run the migration script locally to initialize database tables on the remote D1 instance:
   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```
   *(The script automatically queries your Cloudflare account to resolve the provisioned D1 database ID).*

---

### Option B: Manual CLI Deployment with Wrangler

1. **Log in to Cloudflare CLI**:
   ```bash
   npx wrangler login
   ```

2. **Create Cloudflare Resources**:
   ```bash
   # Create the D1 Database
   npx wrangler d1 create club-link-db

   # Create the R2 Storage Bucket
   npx wrangler r2 bucket create club-link-uploads
   ```

3. **Copy the D1 Database ID**:
   Take the `database_id` output from the `wrangler d1 create` command and paste it into `wrangler.jsonc`:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "club-link-db",
       "database_id": "YOUR_D1_DATABASE_ID"
     }
   ]
   ```

4. **Build and Deploy**:
   ```bash
   npm run deploy
   ```

5. **Run Remote Database Migrations**:
   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

---

## Step 3: Configure Cloudflare Access for Admin Protection

Protect `/admin` and `/api/admin/*` so only authorized organization members can log in.

1. **Navigate to Zero Trust**:
   In the Cloudflare Dashboard, open **Zero Trust** -> **Access** -> **Applications**.

2. **Add an Application**:
   - Click **Add an application** -> Select **Self-hosted**.
   - **Application Name**: `Club Link Admin`
   - **Session Duration**: E.g., `24 hours`
   - **Application Domain**:
     - Subdomain: `your-worker-subdomain` (or custom domain)
     - Domain: `workers.dev` (or your domain)
     - Path: `/admin`

3. **Configure Path Rules (Regex Match)**:
   Ensure the following routes are captured by Access:
   - Path Rule 1: `/admin*`
   - Path Rule 2: `/api/admin/*`

4. **Define Access Policy**:
   - Policy Name: `Club Officers`
   - Action: `Allow`
   - **Configure rules**: Select **Emails** (or **Email domain**) and enter the allowed administrator emails.

5. **Retrieve the Application Audience (AUD) Tag**:
   - Save the application.
   - Click **Edit** on the application, go to **Overview** / **Additional Settings**, and copy the **Application Audience (AUD) Tag**.

6. **Set Worker Secrets**:
   Set the Access secrets on your Worker so the backend verifies the `Cf-Access-Jwt-Assertion` cryptographic token:
   ```bash
   # Set your Cloudflare Access team domain (e.g. https://yourteam.cloudflareaccess.com)
   npx wrangler secret put ACCESS_TEAM_DOMAIN

   # Set your Access Application AUD Tag
   npx wrangler secret put ACCESS_AUD
   ```

---

## Step 4: Optional High-Performance KV Caching

To serve the public payload from ultra-fast Workers KV memory:

1. **Create KV Namespace**:
   ```bash
   npx wrangler kv namespace create CACHE
   ```

2. **Add Binding to `wrangler.jsonc`**:
   ```jsonc
   "kv_namespaces": [
     {
       "binding": "CACHE",
       "id": "YOUR_KV_NAMESPACE_ID"
     }
   ]
   ```

3. **Deploy the Update**:
   ```bash
   npm run deploy
   ```

---

## Step 5: Custom Domain Setup (Optional)

To serve your Link in Bio on your organization's custom root or subdomain (e.g., `links.yourclub.org`):

1. In Cloudflare Dashboard, go to **Workers & Pages** -> select your `link` Worker.
2. Navigate to **Settings** -> **Domains & Routes**.
3. Click **Add** -> **Custom Domain**.
4. Enter your domain (e.g. `links.yourclub.org`) and confirm. Cloudflare automatically provisions SSL certificates and configures edge routing.

---

## Database Maintenance & Backups

### Automated Auto-Healing
The Worker includes an automated schema self-healing routine (`ensureSchema`) that verifies required tables and missing columns on boot.

### 1-Click JSON Backup & Restore
Administrators can download and restore complete organization snapshots directly from the **Branding** tab in the admin dashboard:
- **Export Backup (JSON)**: Exports organization profile, themes, colors, social links, and event tickets.
- **Restore Backup (JSON)**: Replaces current setup with an exported configuration file.

---

## Troubleshooting

### 1. `code: 10042 (Please enable R2)`
- **Solution**: Open the Cloudflare Dashboard -> **R2** -> Click **Activate R2**.

### 2. `403 Unauthorized` when accessing `/api/admin/*`
- **Solution**: Verify that `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are correctly set via `npx wrangler secret put`. In local development, leave these variables empty in `.dev.vars` to bypass authentication.

### 3. Database Schema Out of Sync
- **Solution**: Run `npm run db:migrate:remote` to apply all migrations in sequence.

---

## Real-Time Observability & Monitoring

Stream production logs directly in your shell:
```bash
npx wrangler tail link
```
