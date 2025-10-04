@echo off
echo 🚀 Starting deployment process...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...

REM Install root dependencies
npm install

REM Install server dependencies
cd server
npm install
cd ..

REM Install client dependencies
cd client
npm install
cd ..

echo 🏗️ Building client for production...

REM Build the React app
cd client
npm run build
cd ..

echo ✅ Build completed successfully!

echo 🌐 Starting production server...

REM Set production environment
set NODE_ENV=production

REM Start the server
cd server
npm start
