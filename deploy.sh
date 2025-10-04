#!/bin/bash

# Deployment script for InterVue2

echo "🚀 Starting deployment process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..

echo "🏗️ Building client for production..."

# Build the React app
cd client
npm run build
cd ..

echo "✅ Build completed successfully!"

echo "🌐 Starting production server..."

# Set production environment
export NODE_ENV=production

# Start the server
cd server
npm start
