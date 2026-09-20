# Daffodil International University (DIU) Thesis Report
## Smart Library Management System: Integrated Seat Reservation, Physical Book Indexing, and Digital Circulation Platform

This directory contains the complete, publication-ready LaTeX source for the DIU Undergraduate Thesis / Final Year Design Project (FYDP).

**Integrated Seat Reservation, Physical Book Indexing, and Digital Circulation Platform**

---

## 🚀 Key Features

* **Secure Authentication:** Token-based authentication using JWT stored in **HttpOnly Cookies** to prevent XSS attacks.
* **Role-Based Access Control (RBAC):** Distinct permissions for `admin`, `librarian`, and `student` roles.
* **Zone & Seat Management:** Admins and librarians can dynamically create study zones (e.g., "Quiet Study Zone"), assign colors, and manage individual seat availability.
* **Smart Seat Booking:** Students can reserve specific seats for designated schedules. The system automatically generates a unique QR token for each confirmed booking.
* **Automated Check-In/Check-Out:** Librarians or automated scanners can verify entry and exit by hitting the check-in endpoint with the booking's QR token, updating seat availability in real-time.

---

## 🛠 Tech Stack & Architecture

* **Architecture:** RESTful API with standard JSON response formatting.
* **Authentication:** JSON Web Tokens (JWT) via HttpOnly Cookies (`accessToken`, `refreshToken`).
* **Data Standard:** Uniform response envelope across all endpoints (`success`, `message`, `data`, `meta`).

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/smart-library-management.git
cd smart-library-management

```


2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment Variables:**
Create a `.env` file in the root directory and add your configuration (Database URI, JWT Secrets, Port).
```env
PORT=5000
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
# Add your database connection string here

```


4. **Start the server:**
```bash
npm start

```


*The API will be available at `http://localhost:5000/api/v1*`

---

## 📡 API Reference Documentation

**Base URL:** `http://localhost:5000/api/v1`
**Content-Type:** `application/json`

### Standard Response Format

All API endpoints return data in the following standardized envelope:

```json
{
  "success": true,
  "message": "Operation response message",
  "data": { }, 
  "meta": null
}

```

### 1. Authentication Module (`/auth`)

| Endpoint | Method | Access | Description |
| --- | --- | --- | --- |
| `/auth/register` | `POST` | Public | Registers a new user (`name`, `email`, `password`, `studentId`). |
| `/auth/login` | `POST` | Public | Authenticates user and sets `accessToken` & `refreshToken` cookies. |
| `/auth/refresh` | `POST` | Refresh Token | Generates a new access token using a valid refresh token. |
| `/auth/logout` | `POST` | Public | Clears authentication cookies. |

### 2. Zone Management (`/zone`)

| Endpoint | Method | Access | Description |
| --- | --- | --- | --- |
| `/zone` | `POST` | Admin | Creates a new study zone. |
| `/zone` | `GET` | Authenticated | Retrieves a list of all library zones. |
| `/zone/:id` | `GET` | Authenticated | Retrieves details of a specific zone. |
| `/zone/:id` | `PATCH` | Admin | Updates zone details (name, description, color, active status). |
| `/zone/:id` | `DELETE` | Admin | Deletes a study zone. |
| `/zone/:id/seats` | `POST` | Admin, Librarian | Creates and assigns a new seat to a specific zone. |
| `/zone/:id/seats` | `GET` | Authenticated | Retrieves all seats under a specific zone. |

### 3. Seat Management (`/seat`)

| Endpoint | Method | Access | Description |
| --- | --- | --- | --- |
| `/seat/:id` | `PATCH` | Admin, Librarian | Updates seat status (`isActive`, `isOccupied`) or number. |
| `/seat/:id` | `DELETE` | Admin, Librarian | Hard deletes a seat from the system. |

### 4. Booking Module (`/booking`)

| Endpoint | Method | Access | Description |
| --- | --- | --- | --- |
| `/booking` | `POST` | Student | Reserves a seat for a schedule and generates a QR code. |
| `/booking/my` | `GET` | Student | Retrieves all bookings made by the logged-in student. |
| `/booking` | `GET` | Admin, Librarian | Retrieves all system bookings (filterable by status, date, zone). |
| `/booking/:id` | `DELETE` | All Roles | Cancels a specific booking. |

### 5. Check-In / Check-Out Module (`/checkin`)

| Endpoint | Method | Access | Description |
| --- | --- | --- | --- |
| `/checkin` | `POST` | Admin, Librarian | Scans `qrToken`. Marks booking as `checked_in` on entry, and `completed` on exit. Frees up the seat automatically. |

---

## 👥 Roles and Permissions

* **Admin:** Full access to system configuration, zone creation, seat mapping, and overarching booking management.
* **Librarian:** Operational access to manage seats within zones, view all daily bookings, and facilitate manual check-ins if the scanner fails.
* **Student:** Can view active zones/seats, create reservations, view personal booking history, and cancel own bookings.

---

## 🎓 Academic Context

This repository is submitted in partial fulfillment of the requirements for the degree at **Daffodil International University (DIU)**.

**Note:** This iteration focuses on the *Seat Reservation System API*. The physical book indexing and digital circulation platform components are detailed in corresponding thesis modules.
