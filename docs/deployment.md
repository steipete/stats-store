# Deployment Guide

This guide will help you deploy your own instance of stats.store.

## Prerequisites

- [Supabase](https://supabase.com/) account (free tier works!)
- [Vercel](https://vercel.com/) account (free tier works!)
- [GitHub](https://github.com/) account

## Step 1: Set Up Supabase

1. **Create a new Supabase project**

   - Go to [app.supabase.com](https://app.supabase.com/)
   - Click "New project"
   - Choose a name and password
   - Select a region close to your users

2. **Run the database migrations**

   - In your Supabase dashboard, go to SQL Editor
   - Run each file from the `scripts/` directory in order:
     - Start with `01-create-apps-table.sql`
     - End with `13-create-realtime-triggers.sql`
   - Each script should show "Success" ✅

3. **Enable real-time (optional but cool!)**

   - Go to Database → Replication
   - Enable replication for:
     - `realtime_events` table
     - `stats_cache` table

4. **Get your credentials**
   - Go to Settings → API
   - Copy these values:
     - Project URL
     - `anon` public key
     - `service_role` secret key (keep this safe!)

## Step 2: Deploy to Vercel

### Option A: One-Click Deploy (Easiest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsteipete%2Fstats-store&env=SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

Click the button and fill in your Supabase credentials!

### Option B: Manual Deploy

1. **Fork the repository**
   \`\`\`bash

   # On GitHub, click "Fork" button

   # Then clone your fork:

   git clone https://github.com/YOUR_USERNAME/stats-store.git
   \`\`\`

2. **Import to Vercel**

   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your forked repository
   - Configure environment variables:
     \`\`\`
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     \`\`\`
     Alternatively, in Vercel UI, set:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL` (same as `SUPABASE_URL`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same as `SUPABASE_ANON_KEY`)

3. **Deploy!**
   - Click "Deploy"
   - Wait for the build to complete
   - Visit your new stats.store! 🎉

## Step 3: Add Your First App

1. **Go to your Supabase dashboard**
2. **Navigate to Table Editor → apps**
3. **Insert a new row:**
   \`\`\`
   name: Your App Name
   bundle_identifier: com.yourcompany.yourapp
   appcast_base_url: https://github.com/you/yourapp
   \`\`\`

4. **Update your app's Sparkle URL** (see README)

## Custom Domain (Optional)

Want to use your own domain instead of `*.vercel.app`?

1. In Vercel, go to your project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow the DNS instructions

## Troubleshooting

### "Application not found" error

- Double-check the bundle identifier in the apps table
- Make sure it matches exactly (case-sensitive!)

### Database connection errors

- Verify all environment variables are set correctly
- Check that your Supabase project is not paused

### Build failures

- Make sure you're using Node.js 20+
- Check the Vercel build logs for specific errors

## Updating Your Deployment

When new features are released:

1. **Sync your fork** (if you forked)
   \`\`\`bash
   git remote add upstream https://github.com/steipete/stats-store.git
   git fetch upstream
   git merge upstream/main
   git push origin main
   \`\`\`

2. **Run new migrations** (if any)

   - Check the `scripts/` directory for new SQL files
   - Run them in order in your Supabase SQL editor

3. **Redeploy**
   - Vercel will automatically redeploy when you push to main
   - Or manually trigger a redeploy in the Vercel dashboard

## Security Checklist

- [ ] Keep your `service_role` key secret (never commit it!)
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Use strong passwords for Supabase
- [ ] Consider enabling 2FA on all accounts
- [ ] Regularly update dependencies

## Need Help?

- Check the [architecture docs](architecture.md) for technical details
- Open an [issue on GitHub](https://github.com/steipete/stats-store/issues)
- Tweet [@steipete](https://twitter.com/steipete)
