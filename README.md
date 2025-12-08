# W-Chat Backend

This is the complete backend for a real-time chat application, built with Node.js, Express, MongoDB, and Socket.io. It features JWT authentication, one-to-one and group chats, real-time messaging, and online status tracking.

## Features

- **Authentication**: User registration and login with JWT.
- **Users**: Search for users, update profiles.
- **Chats**: Create/access one-to-one chats and create group chats.
- **Messaging**: Send text messages with pagination support.
- **Real-time**: Powered by Socket.io for instant messaging, typing indicators, and online status updates.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (local instance or a cloud-hosted one like MongoDB Atlas)

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd w-chat-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the following variables. Replace the placeholder values with your own.

    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/w-chat
    JWT_SECRET=your_super_secret_jwt_key
    CORS_ORIGIN=http://localhost:3000
    ```
    - `MONGO_URI`: Your MongoDB connection string.
    - `JWT_SECRET`: A long, random string for signing JWTs.
    - `CORS_ORIGIN`: The URL of your frontend application.

## Running the Server

-   **Development Mode:**
    This will run the server with `nodemon`, which automatically restarts on file changes.
    ```bash
    npm run dev
    ```

-   **Production Mode:**
    ```bash
    npm start
    ```

The server will be running on the port specified in your `.env` file (default is 5000).

## API Endpoints

All protected routes require a Bearer Token in the `Authorization` header.

### Auth Routes (`/api/auth`)

-   `POST /register`: Register a new user.
-   `POST /login`: Log in a user and get a token.
-   `GET /me`: (Protected) Get the logged-in user's profile.

### User Routes (`/api/users`)

-   `GET /?search=<keyword>`: (Protected) Search for users by name or email.
-   `PUT /profile`: (Protected) Update the logged-in user's profile (name, avatar).

### Chat Routes (`/api/chats`)

-   `POST /`: (Protected) Access or create a one-to-one chat with a user.
-   `GET /`: (Protected) Get all chats for the logged-in user.
-   `POST /group`: (Protected) Create a new group chat.
-   `POST /message`: (Protected) Send a new message to a chat.
-   `GET /:chatId/messages`: (Protected) Get all messages for a specific chat (with pagination).
-   `POST /message/seen`: (Protected) Mark a message as seen.

## Socket.io Events

### Emitted from Client

-   `add-user` (userId): Registers the user as online.
-   `join-chat` (chatId): Joins the user to a specific chat room.
-   `send-msg` (data): Sends a message to a chat room.
--  `typing` (chatId): Indicates the user is typing in a chat.
-   `stop-typing` (chatId): Indicates the user has stopped typing.

### Listened for on Client

-   `msg-received` (data): Receives a new message.
-   `user-online` (userId): A user has come online.
-   `user-offline` (userId): A user has gone offline.
-   `typing` (chatId): A user is typing in the specified chat.
-   `stop-typing` (chatId): A user has stopped typing.
