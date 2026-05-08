# Setup Guide - JEE3 Firebase Studio

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git configured on your machine

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/parmkgr/jee3.git
cd jee3
```

### 2. Install Dependencies
```bash
cd "project (1)"
npm install
```

### 3. Configure Environment Variables

Create `.env.local` in the `project (1)` directory:

```env
# Firebase Config (Get from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxx

# Genkit AI (Get from Google AI Studio)
GOOGLE_GENAI_API_KEY=xxxxx
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

## Deployment Configuration

### GitHub Pages (Auto-Deploy)

**Status:** ✅ Ready

The repository has GitHub Pages enabled with automatic deployment:
1. Push to `main` branch
2. GitHub Actions automatically builds and deploys
3. App is live at: `https://parmkgr.github.io/jee3`

**Configure in:** Settings → Pages
- Source: Deploy from a branch
- Branch: `gh-pages` (created by workflow)

### First-Time Setup

1. Go to [Repository Settings → Pages](https://github.com/parmkgr/jee3/settings/pages)
2. Select "Deploy from a branch" as source
3. Select `gh-pages` branch
4. Save settings
5. Push to `main` to trigger deployment

## Build Process

### Development Build
```bash
npm run dev --turbopack -p 9002
```

### Production Build
```bash
NODE_ENV=production npm run build
```

### Start Production Server
```bash
npm start
```

## Type Checking & Linting

```bash
# Run TypeScript type checker
npm run typecheck

# Run ESLint
npm run lint
```

## Genkit AI Setup

### Development Mode
```bash
npm run genkit:dev
```

### Watch Mode
```bash
npm run genkit:watch
```

Configuration file: `src/ai/dev.ts`

## Troubleshooting

### Issue: `ENOENT: no such file or directory`
**Solution:** Ensure you're in the correct directory:
```bash
cd "project (1)"
npm install
```

### Issue: Port 9002 already in use
**Solution:** Use a different port:
```bash
npm run dev -- -p 3000
```

### Issue: Firebase authentication failing
**Solution:** 
- Verify `.env.local` has correct Firebase credentials
- Check Firebase project is active
- Enable required Firebase services (Auth, Firestore, etc.)

### Issue: Build fails with TypeScript errors
**Solution:**
- Errors are currently ignored (see `next.config.ts`)
- For actual errors: `npm run typecheck`
- Fix errors and re-run build

## CI/CD Pipeline

### GitHub Actions Workflow

Located in: `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` branch
- Manual trigger via "Run workflow"

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run linting & type checking
5. Build Next.js app
6. Deploy to GitHub Pages

**Status:** ✅ Active and ready

## Repository Structure

```
jee3/
├── project (1)/              # Main Next.js application
│   ├── src/
│   │   ├── app/             # Next.js pages & routes
│   │   ├── components/      # React components
│   │   ├── ai/             # Genkit AI config
│   │   └── lib/            # Utilities
│   ├── public/             # Static files
│   ├── .env.local          # Environment variables (git-ignored)
│   ├── package.json        # Dependencies
│   └── next.config.ts      # Next.js config
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD workflow
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

## Common Tasks

### Add a New Dependency
```bash
cd "project (1)"
npm install package-name
```

### Update Dependencies
```bash
cd "project (1)"
npm update
```

### Create a New Page
```
src/app/pages/my-page/page.tsx
```

### Add Environment Variable
1. Add to `.env.local`
2. If client-side: prefix with `NEXT_PUBLIC_`
3. Restart dev server

## Getting Help

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com/docs/primitives/overview/introduction)

---

**Ready to deploy?** Push to `main` branch and GitHub Actions will handle the rest! 🚀
