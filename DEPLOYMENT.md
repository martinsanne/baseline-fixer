# Deployment Guide

This guide covers deploying the Vertical Metrics Fixer app to production.

## Option 1: Vercel (Recommended - All-in-One)

Vercel supports both Next.js frontend and Python serverless functions, so you can deploy everything in one place!

### Prerequisites

1. A [Vercel account](https://vercel.com)
2. Your code pushed to GitHub, GitLab, or Bitbucket

### Deployment Steps

1. **Push your code to a Git repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import project to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will auto-detect Next.js

3. **Configure build settings**
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Install Command:** `npm install` (default)
   - **Output Directory:** `.next` (default)

4. **Add Python dependencies**
   Vercel will automatically detect Python files in `/api` and install dependencies from `requirements.txt` during build.

5. **Deploy!**
   Click "Deploy" and Vercel will:
   - Build your Next.js app
   - Set up Python 3.9 runtime for `/api/fix-font.py`
   - Install Python dependencies from `requirements.txt`
   - Deploy everything

### How It Works

- **Frontend:** Next.js app served from Vercel's CDN
- **Backend:** Python serverless function at `/api/fix-font.py` runs on Vercel's Python runtime
- **Both on the same domain:** No CORS issues!

### Environment Variables

No environment variables needed for basic functionality.

### File Size Limits

- Vercel serverless functions have a 50MB limit for the function code
- Request body size limit: 4.5MB (for Hobby plan) or 4.5MB+ (for Pro)
- Font files are typically small, so this should be sufficient

## Option 2: Separate Services (Alternative)

If you prefer to separate frontend and backend:

### Frontend: Vercel
- Deploy Next.js frontend to Vercel
- Update API endpoint in `app/page.tsx` to point to your Python service

### Backend: Choose one:

#### Railway
1. Create a new project on [Railway](https://railway.app)
2. Connect your Git repository
3. Railway auto-detects Python
4. Add `requirements.txt` (already exists)
5. Create a simple Flask/FastAPI wrapper (see below)

#### Render
1. Create a new Web Service on [Render](https://render.com)
2. Connect your Git repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: Your Python server command

#### Fly.io
1. Install Fly CLI: `brew install flyctl`
2. Run: `fly launch`
3. Follow prompts to deploy

### Example Flask Wrapper (for separate backend)

Create `server.py`:

```python
from flask import Flask, request, send_file
from flask_cors import CORS
import tempfile
import os
from fix_vertical_metrics import fix_vertical_metrics

app = Flask(__name__)
CORS(app)

@app.route('/api/fix-font', methods=['POST'])
def fix_font():
    if 'file' not in request.files:
        return {'error': 'No file provided'}, 400
    
    file = request.files['file']
    output_format = request.form.get('format', 'ttf')
    
    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, file.filename)
        file.save(input_path)
        
        base_name = os.path.splitext(file.filename)[0]
        if output_format == 'woff':
            output_path = os.path.join(temp_dir, f'{base_name}-fixed.woff')
            flavor = 'woff'
        elif output_format == 'woff2':
            output_path = os.path.join(temp_dir, f'{base_name}-fixed.woff2')
            flavor = 'woff2'
        else:
            output_path = os.path.join(temp_dir, f'{base_name}-fixed.ttf')
            flavor = None
        
        fix_vertical_metrics(input_path, output_path, flavor)
        
        return send_file(
            output_path,
            mimetype=f'font/{output_format}',
            as_attachment=True,
            download_name=f'{base_name}-fixed.{output_format}'
        )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
```

Add to `requirements.txt`:
```
flask
flask-cors
```

## Option 3: Docker (Self-Hosted)

You can also containerize the entire app:

### Dockerfile

```dockerfile
FROM node:18

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy Python requirements
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

### Deploy to:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Your own server

## Testing Deployment

After deployment, test the API:

```bash
curl -X POST https://your-domain.com/api/fix-font \
  -F "file=@test-font.ttf" \
  -F "format=ttf" \
  --output fixed-font.ttf
```

## Troubleshooting

### Python function not working on Vercel

1. Ensure `requirements.txt` is in the root directory
2. Check that `api/fix-font.py` exists
3. Verify Python dependencies are listed in `requirements.txt`
4. Check Vercel build logs for Python installation errors

### CORS errors

If deploying separately, ensure CORS is enabled on the backend service.

### File size limits

If hitting file size limits:
- Compress fonts before upload
- Consider using a file storage service (S3, Cloudinary) for larger files
- Upgrade Vercel plan for higher limits

## Recommended: Vercel All-in-One

For simplicity, **Option 1 (Vercel)** is recommended because:
- ✅ Single deployment
- ✅ No CORS configuration needed
- ✅ Automatic scaling
- ✅ Free tier available
- ✅ Easy to set up
