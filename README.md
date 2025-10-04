# InterVue2 - Real-time Polling App

A real-time polling application with two personas: Teacher and Student. Built with React, Express.js, and Socket.io for real-time communication.

## Features

### Teacher Persona
- Create polls and get unique poll IDs
- Ask questions one at a time with multiple choice options
- View live results as students answer
- Can only proceed to next question when all students answer or time is up
- Real-time student connection status

### Student Persona
- Join polls with a unique name per tab
- Answer questions when they appear
- View live results after submitting or when time window ends
- 60-second time limit per question
- Tab uniqueness maintained via local storage

## Tech Stack

- **Frontend**: React 18, Redux Toolkit, React Router, Socket.io Client
- **Backend**: Express.js, Socket.io, CORS
- **Real-time**: Socket.io for WebSocket communication
- **Storage**: In-memory (can be extended with database)

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

#### Using Docker

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Access the application at http://localhost:5000

#### Manual Deployment

1. Build the client:
```bash
cd client && npm run build
```

2. Start the production server:
```bash
cd server && npm start
```

## API Endpoints

### REST API

- `POST /api/polls` - Create a new poll
- `GET /api/polls/:pollId` - Get poll information
- `POST /api/polls/:pollId/join` - Join a poll as student
- `POST /api/polls/:pollId/questions` - Add a question (teacher only)

### Socket.io Events

#### Client to Server
- `joinPoll` - Join a poll room
- `submitAnswer` - Submit an answer to a question
- `requestResults` - Request results for a question

#### Server to Client
- `pollJoined` - Confirmation of joining poll
- `newQuestion` - New question available
- `answerSubmitted` - Answer submitted by student
- `allStudentsAnswered` - All students have answered
- `questionTimeUp` - Question time limit reached
- `questionResults` - Question results data

## Project Structure

```
intervue2/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API and Socket services
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Main server file
│   └── package.json
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker build file
└── package.json          # Root package.json
```

## Usage

### For Teachers

1. Go to the homepage
2. Click "Create New Poll" to create a poll
3. Share the Poll ID with students
4. Add questions with multiple choice options
5. View live results as students answer
6. Proceed to next question when all students answer or time is up

### For Students

1. Go to the homepage
2. Enter the Poll ID and your name
3. Click "Join Poll"
4. Wait for questions to appear
5. Answer questions within the 60-second time limit
6. View results after submitting or when time is up

## Features

- **Real-time Communication**: Uses Socket.io for instant updates
- **Tab Uniqueness**: Each browser tab maintains a unique identity
- **Timer Management**: 60-second countdown for each question
- **Live Results**: Real-time result updates for both teachers and students
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error handling and user feedback

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

## License

This project is licensed under the MIT License.
