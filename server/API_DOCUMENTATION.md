# Smart Library Seat Reservation System — API Documentation

**Base URL**: `http://localhost:5000/api/v1` (or your configured server host and port)

---

## 📌 Global Headers & Authentication Summary

- **`Content-Type: application/json`**: Required for all `POST`, `PATCH`, and `PUT` requests containing a JSON payload.
- **Authentication Method**: Token-based authentication using **HttpOnly Cookies**.
  - **Access Token Cookie**: `Cookie: accessToken=<JWT_ACCESS_TOKEN>` *(Required for protected routes)*
  - **Refresh Token Cookie**: `Cookie: refreshToken=<JWT_REFRESH_TOKEN>` *(Required for refreshing tokens)*
- **Standard Response Structure**:
  ```json
  {
    "success": true,
    "message": "Operation response message",
    "data": { ... } | [ ... ] | null,
    "meta": null
  }
  ```

---

## 1. Authentication Module (`/api/v1/auth`)

### 1.1 Register User
- **Endpoint**: `/api/v1/auth/register`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Headers Required**:
  ```http
  Content-Type: application/json
  ```
- **Sample Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@university.edu",
    "password": "securePassword123",
    "studentId": "STU-99201"
  }
  ```
- **Body Schema & Data Types**:
  - `name`: `string` *(Required, min 2 chars)*
  - `email`: `string` *(Required, valid email)*
  - `password`: `string` *(Required, min 6 chars)*
  - `studentId`: `string` *(Optional)*
- **Sample Response** `(HTTP 201 Created)`:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
      "name": "John Doe",
      "email": "john.doe@university.edu",
      "studentId": "STU-99201",
      "role": "student",
      "createdAt": "2026-08-02T10:00:00.000Z"
    },
    "meta": null
  }
  ```

---

### 1.2 Login User
- **Endpoint**: `/api/v1/auth/login`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Headers Required**:
  ```http
  Content-Type: application/json
  ```
- **Sample Request Body**:
  ```json
  {
    "email": "john.doe@university.edu",
    "password": "securePassword123"
  }
  ```
- **Body Schema & Data Types**:
  - `email`: `string` *(Required, valid email)*
  - `password`: `string` *(Required)*
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
        "name": "John Doe",
        "email": "john.doe@university.edu",
        "role": "student"
      }
    },
    "meta": null
  }
  ```
  *(Note: Sets `accessToken` and `refreshToken` HttpOnly Cookies in the response header).*

---

### 1.3 Refresh Access Token
- **Endpoint**: `/api/v1/auth/refresh`
- **Method**: `POST`
- **Authentication**: Refresh Token
- **Headers Required**:
  ```http
  Cookie: refreshToken=<JWT_REFRESH_TOKEN>
  ```
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": null,
    "meta": null
  }
  ```
  *(Note: Sets new `accessToken` HttpOnly Cookie).*

---

### 1.4 Logout User
- **Endpoint**: `/api/v1/auth/logout`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Logged out successfully",
    "data": null,
    "meta": null
  }
  ```
  *(Note: Clears `accessToken` and `refreshToken` Cookies).*

---

## 2. Zone Management (`/api/v1/zone`)

### 2.1 Create Zone
- **Endpoint**: `/api/v1/zone`
- **Method**: `POST`
- **Authentication**: `admin`
- **Headers Required**:
  ```http
  Content-Type: application/json
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Sample Request Body**:
  ```json
  {
    "name": "Quiet Study Zone A",
    "description": "Silent reading space on 2nd floor",
    "color": "#4F46E5",
    "isActive": true
  }
  ```
- **Body Schema & Data Types**:
  - `name`: `string` *(Required, min 2 chars)*
  - `description`: `string` *(Optional)*
  - `color`: `string` *(Optional, 6-character hex code e.g. #4F46E5)*
  - `isActive`: `boolean` *(Optional, default: true)*
- **Sample Response** `(HTTP 201 Created)`:
  ```json
  {
    "success": true,
    "message": "Zone created successfully",
    "data": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Quiet Study Zone A",
      "description": "Silent reading space on 2nd floor",
      "color": "#4F46E5",
      "isActive": true,
      "createdAt": "2026-08-02T10:15:00.000Z",
      "updatedAt": "2026-08-02T10:15:00.000Z"
    },
    "meta": null
  }
  ```

---

### 2.2 Get All Zones
- **Endpoint**: `/api/v1/zone`
- **Method**: `GET`
- **Authentication**: Authenticated (`student`, `librarian`, `admin`)
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Zones retrieved successfully",
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Quiet Study Zone A",
        "description": "Silent reading space on 2nd floor",
        "color": "#4F46E5",
        "isActive": true,
        "createdAt": "2026-08-02T10:15:00.000Z",
        "updatedAt": "2026-08-02T10:15:00.000Z",
        "seatCount": 25
      }
    ],
    "meta": null
  }
  ```

---

### 2.3 Get Zone By ID
- **Endpoint**: `/api/v1/zone/:id`
- **Method**: `GET`
- **Authentication**: Authenticated (`student`, `librarian`, `admin`)
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(UUID format)*
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Zone details retrieved successfully",
    "data": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Quiet Study Zone A",
      "description": "Silent reading space on 2nd floor",
      "color": "#4F46E5",
      "isActive": true,
      "createdAt": "2026-08-02T10:15:00.000Z",
      "updatedAt": "2026-08-02T10:15:00.000Z"
    },
    "meta": null
  }
  ```

---

### 2.4 Update Zone
- **Endpoint**: `/api/v1/zone/:id`
- **Method**: `PATCH`
- **Authentication**: `admin`
- **Headers Required**:
  ```http
  Content-Type: application/json
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(UUID format)*
- **Sample Request Body**:
  ```json
  {
    "name": "Quiet Study Zone A (Updated)",
    "description": "Updated quiet reading space",
    "color": "#3B82F6",
    "isActive": true
  }
  ```
- **Body Schema & Data Types**:
  - `name`: `string` *(Optional, min length: 2)*
  - `description`: `string` *(Optional)*
  - `color`: `string` *(Optional, hex code e.g. #3B82F6)*
  - `isActive`: `boolean` *(Optional)*
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Zone updated successfully",
    "data": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Quiet Study Zone A (Updated)",
      "description": "Updated quiet reading space",
      "color": "#3B82F6",
      "isActive": true,
      "createdAt": "2026-08-02T10:15:00.000Z",
      "updatedAt": "2026-08-02T10:20:00.000Z"
    },
    "meta": null
  }
  ```

---

### 2.5 Delete Zone
- **Endpoint**: `/api/v1/zone/:id`
- **Method**: `DELETE`
- **Authentication**: `admin`
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(UUID format)*
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Zone deleted successfully",
    "data": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Quiet Study Zone A",
      "description": "Silent reading space on 2nd floor",
      "color": "#4F46E5",
      "isActive": false,
      "createdAt": "2026-08-02T10:15:00.000Z",
      "updatedAt": "2026-08-02T10:25:00.000Z"
    },
    "meta": null
  }
  ```

---

### 2.6 Create Seat Under Zone
- **Endpoint**: `/api/v1/zone/:id/seats`
- **Method**: `POST`
- **Authentication**: `admin` or `librarian`
- **Headers Required**:
  ```http
  Content-Type: application/json
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(Zone ID, UUID format)*
- **Sample Request Body**:
  ```json
  {
    "seatNumber": "A-101"
  }
  ```
- **Body Schema & Data Types**:
  - `seatNumber`: `string` *(Required, min length: 1)*
- **Sample Response** `(HTTP 201 Created)`:
  ```json
  {
    "success": true,
    "message": "Seat added to zone successfully",
    "data": {
      "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "seatNumber": "A-101",
      "zoneId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "isActive": true,
      "isOccupied": false,
      "createdAt": "2026-08-02T10:30:00.000Z",
      "updatedAt": "2026-08-02T10:30:00.000Z"
    },
    "meta": null
  }
  ```

---

### 2.7 Get Seats By Zone
- **Endpoint**: `/api/v1/zone/:id/seats`
- **Method**: `GET`
- **Authentication**: Authenticated (`student`, `librarian`, `admin`)
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(Zone ID, UUID format)*
- **Query Parameters**:
  - `showInactive`: `boolean` *(Optional, e.g. `?showInactive=true`, admin/librarian only)*
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Seats retrieved successfully",
    "data": [
      {
        "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "seatNumber": "A-101",
        "zoneId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "isActive": true,
        "isOccupied": false,
        "createdAt": "2026-08-02T10:30:00.000Z",
        "updatedAt": "2026-08-02T10:30:00.000Z"
      }
    ],
    "meta": null
  }
  ```

---

## 3. Seat Management (`/api/v1/seat`)

### 3.1 Update Seat
- **Endpoint**: `/api/v1/seat/:id`
- **Method**: `PATCH`
- **Authentication**: `admin` or `librarian`
- **Headers Required**:
  ```http
  Content-Type: application/json
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(Seat ID, UUID format)*
- **Sample Request Body**:
  ```json
  {
    "seatNumber": "A-101-B",
    "isActive": true,
    "isOccupied": false
  }
  ```
- **Body Schema & Data Types**:
  - `seatNumber`: `string` *(Optional, min length: 1)*
  - `isActive`: `boolean` *(Optional)*
  - `isOccupied`: `boolean` *(Optional)*
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Seat updated successfully",
    "data": {
      "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "seatNumber": "A-101-B",
      "zoneId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "isActive": true,
      "isOccupied": false,
      "createdAt": "2026-08-02T10:30:00.000Z",
      "updatedAt": "2026-08-02T10:35:00.000Z"
    },
    "meta": null
  }
  ```

---

### 3.2 Delete Seat
- **Endpoint**: `/api/v1/seat/:id`
- **Method**: `DELETE`
- **Authentication**: `admin` or `librarian`
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(Seat ID, UUID format)*
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Seat deleted successfully (hard deleted)",
    "data": {
      "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "seatNumber": "A-101-B",
      "zoneId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "isActive": false,
      "isOccupied": false,
      "createdAt": "2026-08-02T10:30:00.000Z",
      "updatedAt": "2026-08-02T10:40:00.000Z"
    },
    "meta": null
  }
  ```

---

## 4. Booking Module (`/api/v1/booking`)

### 4.1 Create Booking
- **Endpoint**: `/api/v1/booking`
- **Method**: `POST`
- **Authentication**: `student`
- **Headers Required**:
  ```http
  Content-Type: application/json
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Sample Request Body**:
  ```json
  {
    "seatId": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    "scheduleId": "3f4e5d6c-7b8a-9012-3456-7890abcdef12"
  }
  ```
- **Body Schema & Data Types**:
  - `seatId`: `string` *(Required, UUID format)*
  - `scheduleId`: `string` *(Required, UUID format)*
- **Sample Response** `(HTTP 201 Created)`:
  ```json
  {
    "success": true,
    "message": "Seat reserved successfully",
    "data": {
      "booking": {
        "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "userId": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
        "seatId": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "scheduleId": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
        "status": "confirmed",
        "qrToken": "550e8400-e29b-41d4-a716-446655440000",
        "bookedAt": "2026-08-02T10:42:00.000Z",
        "checkedInAt": null,
        "checkedOutAt": null,
        "cancelledAt": null,
        "cancelReason": null,
        "seat": {
          "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
          "seatNumber": "A-101",
          "zone": {
            "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "name": "Quiet Study Zone A"
          }
        },
        "schedule": {
          "id": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
          "date": "2026-08-02T00:00:00.000Z",
          "slot": "morning"
        }
      },
      "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    },
    "meta": null
  }
  ```

---

### 4.2 Get My Bookings
- **Endpoint**: `/api/v1/booking/my`
- **Method**: `GET`
- **Authentication**: `student`
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "My bookings retrieved successfully",
    "data": [
      {
        "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "userId": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
        "seatId": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "scheduleId": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
        "status": "confirmed",
        "qrToken": "550e8400-e29b-41d4-a716-446655440000",
        "bookedAt": "2026-08-02T10:42:00.000Z",
        "checkedInAt": null,
        "checkedOutAt": null,
        "cancelledAt": null,
        "cancelReason": null,
        "seat": {
          "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
          "seatNumber": "A-101",
          "zone": {
            "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "name": "Quiet Study Zone A"
          }
        },
        "schedule": {
          "id": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
          "date": "2026-08-02T00:00:00.000Z",
          "slot": "morning"
        },
        "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
      }
    ],
    "meta": null
  }
  ```

---

### 4.3 Get All Bookings
- **Endpoint**: `/api/v1/booking`
- **Method**: `GET`
- **Authentication**: `admin` or `librarian`
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Query Parameters**:
  - `status`: `string` *(Optional, Enum: `pending` | `confirmed` | `checked_in` | `completed` | `cancelled` | `no_show`)*
  - `userId`: `string` *(Optional, UUID)*
  - `date`: `string` *(Optional, YYYY-MM-DD)*
  - `zoneId`: `string` *(Optional, UUID)*
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "All bookings retrieved successfully",
    "data": [
      {
        "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "userId": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
        "seatId": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "scheduleId": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
        "status": "confirmed",
        "qrToken": "550e8400-e29b-41d4-a716-446655440000",
        "bookedAt": "2026-08-02T10:42:00.000Z",
        "checkedInAt": null,
        "checkedOutAt": null,
        "cancelledAt": null,
        "cancelReason": null,
        "user": {
          "id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
          "name": "John Doe",
          "email": "john.doe@university.edu",
          "studentId": "STU-99201"
        },
        "seat": {
          "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
          "seatNumber": "A-101",
          "zone": {
            "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "name": "Quiet Study Zone A"
          }
        },
        "schedule": {
          "id": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
          "date": "2026-08-02T00:00:00.000Z",
          "slot": "morning"
        }
      }
    ],
    "meta": null
  }
  ```

---

### 4.4 Cancel Booking
- **Endpoint**: `/api/v1/booking/:id`
- **Method**: `DELETE`
- **Authentication**: `student`, `librarian`, or `admin`
- **Headers Required**:
  ```http
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **URL Parameters**:
  - `id`: `string` *(Booking ID, UUID format)*
- **Sample Request Body**: None
- **Sample Response** `(HTTP 200 OK)`:
  ```json
  {
    "success": true,
    "message": "Booking cancelled successfully",
    "data": {
      "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "userId": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
      "seatId": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "scheduleId": "3f4e5d6c-7b8a-9012-3456-7890abcdef12",
      "status": "cancelled",
      "qrToken": "550e8400-e29b-41d4-a716-446655440000",
      "bookedAt": "2026-08-02T10:42:00.000Z",
      "checkedInAt": null,
      "checkedOutAt": null,
      "cancelledAt": "2026-08-02T10:44:00.000Z",
      "cancelReason": null
    },
    "meta": null
  }
  ```

---

## 5. Check-In Module (`/api/v1/checkin`)

### 5.1 Scan QR Token (Check-In / Check-Out)
- **Endpoint**: `/api/v1/checkin`
- **Method**: `POST`
- **Authentication**: `admin` or `librarian`
- **Headers Required**:
  ```http
  Content-Type: application/json
  Cookie: accessToken=<JWT_ACCESS_TOKEN>
  ```
- **Sample Request Body**:
  ```json
  {
    "qrToken": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Body Schema & Data Types**:
  - `qrToken`: `string` *(Required, UUID format)*
- **Sample Response** `(HTTP 200 OK — Entry Check-In)`:
  ```json
  {
    "success": true,
    "message": "Check-in successful! Student is assigned to seat A-101 in Quiet Study Zone A.",
    "data": {
      "action": "check_in",
      "booking": {
        "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "status": "checked_in",
        "checkedInAt": "2026-08-02T10:45:00.000Z",
        "seat": {
          "seatNumber": "A-101",
          "zone": {
            "name": "Quiet Study Zone A"
          }
        }
      }
    },
    "meta": null
  }
  ```
- **Sample Response** `(HTTP 200 OK — Exit Check-Out)`:
  ```json
  {
    "success": true,
    "message": "Check-out successful! Seat A-101 in Quiet Study Zone A is now available.",
    "data": {
      "action": "check_out",
      "booking": {
        "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "status": "completed",
        "checkedOutAt": "2026-08-02T12:00:00.000Z",
        "seat": {
          "seatNumber": "A-101",
          "zone": {
            "name": "Quiet Study Zone A"
          }
        }
      }
    },
    "meta": null
  }
  ```
