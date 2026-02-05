# Vertical Metrics Fixer

A web application and CLI tool to fix inconsistent vertical metrics in font files. Based on [Max Kohler's guide](https://www.maxkohler.com/posts/2022-02-19-fixing-vertical-metrics/).

## Features

- 🎨 Beautiful drag-and-drop web interface
- 💻 Command-line tool for batch processing
- 🔧 Fixes vertical metrics inconsistencies across platforms
- 📦 Supports TTF, WOFF, and WOFF2 formats

## What it does

This tool fixes vertical metrics in font files by:

1. Setting the `USE_TYPO_METRICS` flag (fsSelect bit 7)
2. Syncing OS/2 typo metrics with hhea metrics
3. Setting OS/2 win metrics to match actual glyph bounds
4. Ensuring consistent rendering across Windows, macOS, and browsers

## Installation

### For Web Interface

```bash
# Install Node.js dependencies
npm install

# Create and activate a Python virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Run development server
npm run dev
```

### For CLI Only

```bash
# Create and activate a Python virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

**Note:** Modern Python installations (especially via Homebrew) use "externally-managed-environment" protection. Using a virtual environment is the recommended approach and avoids permission issues.

### Quick Setup Script

You can also use the provided setup script:

```bash
./setup.sh
```

This will automatically create a virtual environment and install all dependencies.

## Usage

### Web Interface

1. Open the app in your browser (default: http://localhost:3000)
2. Drag and drop a font file onto the upload area
3. Select your desired output format (TTF, WOFF, or WOFF2)
4. Click "Fix Vertical Metrics"
5. Download the fixed font file

### Command Line

**Important:** Make sure to activate the virtual environment first if you used one during setup:

```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Then run the script:

```bash
# Fix font and output as TTF
python3 fix_vertical_metrics.py input.ttf output.ttf

# Output as WOFF
python3 fix_vertical_metrics.py input.ttf output.woff --flavor woff

# Output as WOFF2
python3 fix_vertical_metrics.py input.ttf output.woff2 --flavor woff2
```

## Deployment

### Vercel (Recommended - All-in-One)

**Great news!** Vercel supports both Next.js and Python serverless functions, so you can deploy everything in one place!

#### Quick Deploy

1. Push your code to GitHub/GitLab/Bitbucket
2. Import to [Vercel](https://vercel.com/new)
3. Vercel will automatically:
   - Detect Next.js and build the frontend
   - Detect Python files in `/api` and use Python 3.9 runtime
   - Install dependencies from `requirements.txt`
4. Deploy! 🚀

The app includes:
- ✅ Next.js frontend (served from Vercel CDN)
- ✅ Python serverless function at `/api/fix-font.py` (runs on Vercel's Python runtime)
- ✅ Both on the same domain (no CORS issues!)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions and alternative options.

### Local Development

The app works perfectly for local development:

```bash
# Install Node.js dependencies
npm install

# Create virtual environment and install Python dependencies
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run development server
npm run dev
```

Then visit http://localhost:3000

**Note:** In local development, the app uses the Node.js API route (`app/api/fix-font/route.ts`) which calls the Python script. In production on Vercel, it automatically uses the Python serverless function (`api/fix-font.py`).

## Requirements

- Node.js 18+ (for web interface)
- Python 3.7+ (for font processing)
- fonttools (Python package)
- brotli (Python package)

## License

MIT
