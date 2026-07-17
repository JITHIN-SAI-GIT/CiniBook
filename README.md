# 🎬 CineBook — Movie Ticket Booking System

**Full-Stack: React + Java Spring Boot + MySQL**

A modern, feature-rich movie ticket booking platform featuring real Telugu movies (2024-2025), real-time seat selection, JWT authentication, and a stunning dark cinema UI.

---

## 🚀 Quick Start

### Prerequisites
- ✅ Java 17+ (verified installed)
- ✅ MySQL 8.x (verified installed)
- ✅ Node.js (verified installed)
- ⚠️ Maven — downloaded automatically by `mvnw.cmd` on first run

### 1. Start Everything (One Click)

Double-click **`START_CINEBOOK.bat`** in the root folder.

This will:
1. Start MySQL service
2. Launch Spring Boot backend (port 8080)
3. Launch React frontend (port 5173)

### 2. Manual Start

**Backend:**
```bash
cd backend
mvnw.cmd spring-boot:run
```

**Frontend:**
```bash
cd project
npm run dev
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/api |
| Admin Panel | http://localhost:5173/admin |

---

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cinebook.com | admin123 |
| User | (register via /signup) | (your choice) |

---

## 🎥 Features

### 🎭 Movies
- **13 Telugu & Bollywood movies** seeded (Kalki 2898-AD, Pushpa 2, Devara, HanuMan, etc.)
- Genre and language filtering
- Real-time search
- Trending & Top-Rated sections
- Trailer popup player

### 🎫 Booking Flow
1. Browse movies → Select a movie
2. Choose showdate & showtime
3. Select seats on interactive seat map
4. Seats lock for **5 minutes** (prevents double-booking)
5. Checkout with card details (simulated)
6. Confirmation with booking reference

### 👑 Admin Panel
- Dashboard with revenue stats & 7-day bar chart
- CRUD for Movies, Theatres, Showtimes
- View and cancel any booking

---

## 🏗️ Architecture

```
project-bolt-sb1-zfsusehq/
├── backend/                    # Spring Boot 3.2 (Java 17)
│   ├── src/main/java/com/cinebook/
│   │   ├── entity/             # JPA Entities (User, Movie, Theatre, Showtime, SeatLock, Booking)
│   │   ├── repository/         # Spring Data JPA Repositories
│   │   ├── dto/                # Request/Response DTOs
│   │   ├── service/            # Business logic
│   │   ├── controller/         # REST Controllers
│   │   ├── security/           # JWT Filter + Utility
│   │   ├── config/             # SecurityConfig + CorsConfig
│   │   └── scheduler/          # SeatLock cleanup every 60s
│   └── src/main/resources/
│       ├── application.properties  # DB + JWT config
│       └── data.sql                # Telugu movie seed data
│
└── project/                    # React 18 + TypeScript + Vite
    └── src/
        ├── context/            # AuthContext (JWT) + ToastContext
        ├── lib/                # api.ts (axios) + types.ts + utils.ts
        ├── pages/              # 9 pages
        └── components/         # Navbar, Footer, MovieCard, HeroCarousel, SeatMap, Skeletons
```

## 🔌 API Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/auth/signup | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | User |
| GET | /api/movies | Public |
| GET | /api/movies/{id} | Public |
| POST | /api/movies | Admin |
| PUT | /api/movies/{id} | Admin |
| DELETE | /api/movies/{id} | Admin |
| GET | /api/showtimes/movie/{movieId} | Public |
| GET | /api/showtimes/{id}/booked-seats | Public |
| GET | /api/showtimes/{id}/locked-seats | User |
| POST | /api/seat-locks/lock | User |
| POST | /api/seat-locks/unlock | User |
| POST | /api/seat-locks/refresh | User |
| GET | /api/bookings/my | User |
| POST | /api/bookings | User |
| PUT | /api/bookings/{id}/cancel | User |
| GET | /api/bookings/all | Admin |
| GET | /api/bookings/stats | Admin |

---

## 🗄️ Database

The database `cinebook` is created automatically on first run. Schema is managed by Hibernate (`ddl-auto=create-drop` for dev, change to `update` for production).

### Changing DB credentials:
Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=root
```
