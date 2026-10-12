#!/bin/bash

# Setup script for Baseline Fixer
# This script helps set up the project with the correct Python version

echo "🔧 Setting up Baseline Fixer..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Installing via Homebrew..."
    brew install python3
else
    echo "✅ Python 3 found: $(python3 --version)"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created!"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
echo "📦 Installing Python dependencies in virtual environment..."
source venv/bin/activate
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully!"
    echo ""
    echo "💡 To use the CLI tool, activate the virtual environment first:"
    echo "   source venv/bin/activate"
    echo "   python3 fix_vertical_metrics.py input.ttf output.ttf"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Check if Node.js is installed (for web interface)
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
    echo "📦 Installing Node.js dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        echo "✅ Node.js dependencies installed successfully!"
        echo ""
        echo "🎉 Setup complete! You can now:"
        echo "   - Run the web interface: npm run dev"
        echo "   - Use the CLI tool: python3 fix_vertical_metrics.py input.ttf output.ttf"
    else
        echo "❌ Failed to install Node.js dependencies. Try running: npm install"
    fi
else
    echo "⚠️  Node.js not found. Skipping web interface setup."
    echo "   You can still use the CLI tool: python3 fix_vertical_metrics.py input.ttf output.ttf"
fi
