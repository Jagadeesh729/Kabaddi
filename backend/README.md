# Kabaddi Platform

A full-stack Kabaddi match management platform built with modern technologies, providing real-time match stats, player profiles, live commentary, and more.

## 🚀 Live Demo

Check out the deployed application: [Kabaddi Platform Live Demo](https://kabach-kabach.netlify.app/)

---

## 🛠️ Tech Stack

- **Backend:** Spring Boot, Java, MongoDB  
  _Deployed on [Render](https://render.com/)_
- **Database:** MongoDB Atlas
- **Authentication & Security:** Spring Security, JWT (JSON Web Token)
- **Frontend:** React  
  _Deployed on [Netlify](https://www.netlify.com/)_
- **Real-time Communication:** WebSocket, STOMP
- **DevOps:** Docker (`kabaddi1:latest` image)

---

## 📦 Dockerization

The project is fully dockerized.  
Image name: `kabaddi1:latest`

---

## 📚 API Documentation

- **OpenAPI Spec:** [OAS 3.1](https://kabaddi1-latest.onrender.com/v3/api-docs)
- **Swagger UI:** [API Documentation](https://kabaddi1-latest.onrender.com/swagger-ui/index.html)

#### Contact: Sajjarao Mallikarjuna
#### License: Apache 2.0

Server: [https://kabaddi1-latest.onrender.com](https://kabaddi1-latest.onrender.com)

---

## ✨ Features

1. **Public Viewing:**
   - Any user, including non-logged-in users, can view matches, player stats, and live scores.

2. **Authenticated Actions:**
   - Only logged-in users (account holders) can create matches and participate in matches.

3. **Match Control:**
   - Only the match creator can update match status and scores.

4. **Real-Time Updates:**
   - Live scores and stats update instantly without page refresh.

5. **Live Commentary:**
   - Real-time match commentary is available during matches.

---

## 🔑 Authentication & Security

Authentication is implemented using **Spring Security** and **JWT**:

### Register

**Endpoint:**  
`POST /auth/register`

**Request Example:**
```json
{
  "name": "string",
  "username": "string",
  "password": "securePassword123",
  "image": "string",
  "phone": "1992679615",
  "location": "string",
  "about": "string",
  "height": 300,
  "weight": 0.1,
  "age": 0
}
```

**Response Example:**
```json
{
  "id": "string",
  "name": "string",
  "username": "string",
  "password": "string",
  "url": "string",
  "location": "string",
  "about": "string",
  "height": 0.1,
  "weight": 0.1,
  "phone": "string",
  "age": 0,
  "createdAt": "2025-09-05"
}
```

### Login

**Endpoint:**  
`POST /auth/login`

**Request Example:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response Example:**
```json
{
  "token": "string",
  "type": "string",
  "user": "string"
}
```

---

## 📑 API Endpoints

A reference list of all available API endpoints.  
For detailed usage, request/response fields, and examples, see the [Swagger API Docs](https://kabaddi1-latest.onrender.com/swagger-ui/index.html).

### Authentication
- `POST /auth/register`
- `POST /auth/login`

### User Management
- `PUT /users/user/update/{userId}`
- `GET /users/userdetails/{userId}`
- `GET /users/user/{userId}`
- `GET /users/user/{userId}/played-matches`
- `GET /users/user/{userId}/created-matches`
- `GET /users/user/{playerId}/profile`
- `GET /users/all`
- `DELETE /users/user/delete/{userId}`

### Match Stats
- `PUT /matchstats/match/{matchId}/update/{createrId}`
- `GET /matchstats/match/scorecard/{matchId}`
- `GET /matchstats/match/livescorecard/{matchId}/user`

### Match Management
- `POST /matches/create`
- `PUT /matches/match/update/{matchId}/{createrId}`
- `PUT /matches/match/{setType}/{matchId}/{createrId}`
- `GET /matches/search?matchName={name}`
- `GET /matches/match/{matchId}`
- `GET /matches/live`
- `GET /matches/completed`
- `GET /matches/all`
- `DELETE /matches/delete/{matchId}`

### Commentary
- `GET /commentary/match/{matchId}`

---

## 📦 Schemas

Commonly used request and response schemas:
- UserDto
- MatchDto
- CreateMatchRequest
- PlayerResponse
- ScoreCard
- Commentary

---

## 🤝 Contributing

Pull requests and suggestions are welcome!  
For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is licensed under the Apache 2.0 License.

---