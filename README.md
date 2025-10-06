# InterVue2 - Real-time Polling App

A comprehensive real-time polling application with two personas: Teacher and Student. Built with React, Express.js, and Socket.io for real-time communication, featuring live chat, participant management, and poll history tracking.

## Features

### Teacher Persona
- Create polls and get unique poll IDs
- Ask questions one at a time with multiple choice options (2-6 options)
- Set custom timer limits (15, 30, 45, or 60 seconds)
- View live results as students answer in real-time
- Can only proceed to next question when all students answer or time is up
- Real-time student connection status and participant management
- **Kick out disruptive students** with temporary ban system (10-minute ban)
- **Live chat system** for communication with students
- **Poll history viewer** to review past questions and results
- Mark correct answers for each option
- Responsive design with modern UI

### Student Persona
- Join polls with a unique name per tab
- Answer questions when they appear
- View live results after submitting or when time window ends
- Customizable time limits per question (15-60 seconds)
- Tab uniqueness maintained via local storage
- **Live chat system** for communication with teacher and other students
- **Real-time participant list** showing who's in the poll
- **Ban protection** - kicked students are temporarily banned
- Responsive design optimized for mobile and desktop

### Additional Features
- **Real-time Chat System**: Both teachers and students can communicate via live chat
- **Participant Management**: Teachers can view and kick out students
- **Ban System**: Kicked students are temporarily banned for 10 minutes
- **Poll History**: Teachers can view all past questions and their results
- **Tab-based Identity**: Each browser tab maintains a unique identity
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Error Handling**: Comprehensive error handling and user feedback
- **Real-time Updates**: All interactions happen in real-time via WebSocket

## Tech Stack

- **Frontend**: React 18, Redux Toolkit, React Router, Socket.io Client
- **Backend**: Express.js, Socket.io, CORS, UUID
- **Real-time**: Socket.io for WebSocket communication
- **State Management**: Redux Toolkit with slices for poll and socket state
- **Routing**: React Router DOM for client-side routing
- **Storage**: In-memory with local storage for tab management and ban tracking
- **Deployment**: Docker, Vercel (server), and static hosting
- **Development**: Nodemon for server development, Concurrently for running both servers

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd intervue2
```

2. Install dependencies:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

3. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

### Production Deployment

#### Using Docker (Recommended)

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Access the application at http://localhost:5000

The Docker setup includes:
- Multi-stage build for optimized production image
- Health checks for container monitoring
- Automatic restart policies
- Production environment configuration

#### Vercel Deployment

1. Deploy the server to Vercel:
```bash
cd server
vercel --prod
```

2. Update the client proxy configuration in `client/package.json`:
```json
{
  "proxy": "https://your-vercel-app.vercel.app"
}
```

3. Deploy the client to your preferred static hosting service

#### Manual Deployment

1. Build the client:
```bash
cd client && npm run build
```

2. Start the production server:
```bash
cd server && npm start
```

#### Deployment Scripts

- **Windows**: Run `deploy.bat` for automated deployment
- **Linux/Mac**: Run `deploy.sh` for automated deployment

## API Endpoints

### REST API

- `POST /api/poll` - Create a new poll (returns teacherId)
- `GET /api/poll` - Get current poll information
- `POST /api/poll/join` - Join a poll as student (requires name and tabId)
- `POST /api/poll/questions` - Add a question (teacher only, requires question, options, timerSec)
- `GET /api/poll/ban/check` - Check if a tab is banned (requires tabId)

### Socket.io Events

#### Client to Server
- `joinPoll` - Join a poll room (requires userType, studentId, name)
- `submitAnswer` - Submit an answer to a question (requires studentId, questionId, answer)
- `requestResults` - Request results for a specific question (requires questionId)
- `chat:message` - Send a chat message (requires userId, userType, name, text, ts)
- `participant:kick` - Kick a student (teacher only, requires studentId)

#### Server to Client
- `pollJoined` - Confirmation of joining poll
- `userJoined` - User joined notification with updated participant list
- `newQuestion` - New question available with timer
- `answerSubmitted` - Answer submitted by student with updated results
- `allStudentsAnswered` - All students have answered
- `questionTimeUp` - Question time limit reached
- `questionResults` - Question results data for specific question
- `participants:list` - Updated list of participants
- `participantKicked` - Student was kicked notification
- `forceDisconnect` - Force disconnect with reason (for kicked students)
- `chat:message` - Chat message from another user

## Project Structure

```
intervue2/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── style/      # Component-specific CSS files
│   │   │   ├── ChatWidget.js
│   │   │   ├── HomePage.js
│   │   │   ├── KickedOut.js
│   │   │   ├── PollHistory.js
│   │   │   ├── StudentDashboard.js
│   │   │   ├── StudentEntry.js
│   │   │   └── TeacherDashboard.js
│   │   ├── store/          # Redux store and slices
│   │   │   ├── slices/
│   │   │   │   ├── pollSlice.js
│   │   │   │   └── socketSlice.js
│   │   │   └── store.js
│   │   ├── services/       # API and Socket services
│   │   │   ├── apiService.js
│   │   │   └── socketService.js
│   │   ├── utils/          # Utility functions
│   │   │   ├── banUtils.js
│   │   │   └── localStorage.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Main server file
│   ├── package.json
│   ├── ecosystem.config.js # PM2 configuration
│   └── vercel.json        # Vercel deployment config
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Multi-stage Docker build file
├── deploy.bat            # Windows deployment script
├── deploy.sh             # Linux/Mac deployment script
├── package.json          # Root package.json with scripts
└── README.md
```

## Usage

### For Teachers

1. Go to the homepage and select "I'm a Teacher"
2. Click "Continue" to create a new poll
3. Share the Poll ID with students
4. Create questions with multiple choice options (2-6 options)
5. Set timer limits (15, 30, 45, or 60 seconds)
6. Mark correct answers for each option
7. View live results as students answer in real-time
8. Use the chat system to communicate with students
9. Manage participants - view who's connected and kick disruptive students
10. View poll history to review past questions and results
11. Proceed to next question when all students answer or time is up

### For Students

1. Go to the homepage and select "I'm a Student"
2. Enter your name and click "Continue"
3. Wait for the teacher to share the Poll ID
4. Enter the Poll ID and click "Join Poll"
5. Wait for questions to appear
6. Answer questions within the specified time limit
7. Use the chat system to communicate with teacher and other students
8. View real-time participant list
9. View results after submitting or when time is up
10. If kicked out, you'll be temporarily banned for 10 minutes

## Key Features

- **Real-time Communication**: Uses Socket.io for instant updates and live chat
- **Tab Uniqueness**: Each browser tab maintains a unique identity via local storage
- **Flexible Timer Management**: Customizable countdown timers (15-60 seconds) per question
- **Live Results**: Real-time result updates with percentage calculations
- **Participant Management**: Teachers can view and kick out disruptive students
- **Ban System**: Temporary 10-minute bans for kicked students
- **Poll History**: Complete history of all questions and their results
- **Live Chat**: Real-time messaging between teachers and students
- **Responsive Design**: Optimized for desktop and mobile devices
- **Error Handling**: Comprehensive error handling and user feedback
- **Answer Validation**: Teachers can mark correct answers for each option
- **Connection Status**: Real-time connection indicators for all users

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend client
- `npm run build` - Build the frontend for production
- `npm start` - Start the production server

### Environment Variables

Create a `.env` file in the server directory:

```
PORT=5000
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Current Status

The application is currently deployed and includes:
- ✅ Full real-time polling functionality
- ✅ Live chat system with participant management
- ✅ Ban system for disruptive students
- ✅ Poll history tracking
- ✅ Responsive design for all devices
- ✅ Docker containerization
- ✅ Vercel deployment configuration
- ✅ Production-ready error handling

## Notes

- The application uses a single-poll model - only one poll can be active at a time
- Students are identified by browser tab, preventing multiple connections from the same tab
- The ban system uses both server-side and client-side storage for reliability
- All real-time features are powered by Socket.io WebSocket connections
- The application is optimized for educational environments with features like participant management and answer validation

## License

This project is licensed under the MIT License.
