# Deploy Mobile TD Wars (Phone-Only Instructions)

You can deploy and test this game entirely from your phone! Here's how:

## Quick Deploy Options

### Option 1: Railway (Easiest for Server) + Vercel (For Client)

#### Deploy Server to Railway

1. **Install Railway app** or use web browser
2. Go to [railway.app](https://railway.app)
3. Sign in with GitHub
4. Click "New Project" → "Deploy from GitHub repo"
5. Select `mobile-td-wars` repository
6. Select branch `claude/mobile-td-wars-game-011CUzraHcRUBwuEJPtzPZKR`
7. Railway will auto-detect and deploy
8. Go to Settings → Generate Domain
9. Copy your server URL (e.g., `https://mobile-td-wars-production.up.railway.app`)

#### Deploy Client to Vercel

1. Go to [vercel.com](https://vercel.com) on your phone
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your `mobile-td-wars` repository
5. Select branch `claude/mobile-td-wars-game-011CUzraHcRUBwuEJPtzPZKR`
6. Add Environment Variable:
   - Key: `VITE_SERVER_URL`
   - Value: (Your Railway server URL from step 9 above)
7. Click "Deploy"
8. Once deployed, click on your site URL
9. Play the game!

### Option 2: Render (All-in-One)

1. Go to [render.com](https://render.com) on your phone
2. Sign in with GitHub
3. Click "New +" → "Web Service"
4. Connect your `mobile-td-wars` repository
5. Use these settings:
   - **Name**: mobile-td-wars-server
   - **Branch**: claude/mobile-td-wars-game-011CUzraHcRUBwuEJPtzPZKR
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
6. Click "Create Web Service"
7. Copy your server URL

Then deploy the client:
1. Click "New +" → "Static Site"
2. Connect same repository
3. Use these settings:
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`
4. Add Environment Variable:
   - Key: `VITE_SERVER_URL`
   - Value: (Your server URL from step 7)
5. Click "Create Static Site"

### Option 3: Glitch (Simplest One-Click)

For quick testing without separate deployments:

1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Import from GitHub"
3. Paste: `https://github.com/bradleesand/mobile-td-wars`
4. Wait for import
5. The game will be live at `your-project-name.glitch.me`

## After Deployment

Once deployed, you can:
- Share the URL with friends to play multiplayer
- Test from any device with a browser
- Play from anywhere with internet connection

## Cost

All the services above offer free tiers that are perfect for this game:
- **Railway**: Free tier with 500 hours/month
- **Vercel**: Free for personal projects
- **Render**: Free tier available
- **Glitch**: Free with some limitations

## Updating the Game

After deployment, any time you push to your GitHub branch, the services will automatically redeploy your updates!

## Troubleshooting

**"Can't connect to server"**
- Make sure you set the `VITE_SERVER_URL` environment variable in your client deployment
- Check that the server URL includes `https://` (not `http://`)
- Verify the server is running in your hosting dashboard

**"Room join failed"**
- This is normal if you're testing alone
- Open two browser tabs or invite a friend to test multiplayer

**"Slow performance"**
- Free tiers may have cold starts (first load is slow)
- After first load, should be fast
- Consider upgrading to paid tier for production use

## Need Help?

Check the hosting platform's documentation:
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Glitch Docs](https://glitch.com/help)
