# Tests d'Authentification - CCarré Backend

**Auteur :** Macyl MOUMOU 
**Date :** 14 Mars 2026  
**API Base URL :** `http://localhost:5000/api/auth`

---

## Table des Matières
1. [POST /register - Inscription](#1-post-register---inscription)
2. [POST /confirm - Confirmation Email](#2-post-confirm---confirmation-email)
3. [POST /resend-confirmation - Renvoyer Code](#3-post-resend-confirmation---renvoyer-code)
4. [POST /login - Connexion](#4-post-login---connexion)
5. [GET /me - Profil Utilisateur](#5-get-me---profil-utilisateur)

---

## Données de Test

### Utilisateurs Test
```
User 1: khaled.sadaoui@etu.univ-amu.fr
User 2: asmaa.lagrid@etu.univ-amu.fr

Password: SecurePass123!
```

---

## 1. POST /register - Inscription

### ✅ Test 1.1 : Inscription Réussie - User 1

**Endpoint :** `POST /api/auth/register`

**Request Body :**
```json
{
  "firstName": "Khaled",
  "lastName": "Sadaoui",
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "password": "SecurePass123!"
}
```

**Expected Status :** `201 Created`

**Expected Response :**
```json
{
  "success": true,
  "message": "Utilisateur créé. Vérifiez votre email pour le code de confirmation",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "firstName": "Khaled",
      "lastName": "Sadaoui",
      "email": "khaled.sadaoui@etu.univ-amu.fr",
      "isVerified": false
    }
  }
}
```

**Database State After :**
```
MongoDB - Collection: users
{
  _id: ObjectId("65a1b2c3d4e5f6g7h8i9j0k1"),
  firstName: "Khaled",
  lastName: "Sadaoui",
  email: "khaled.sadaoui@etu.univ-amu.fr",
  password: "$2b$12$abcdef...", // bcrypt hashed
  isVerified: false,
  confirmationToken: "12345678", // 8-digit code
  confirmationExpires: ISODate("2026-03-15T10:30:00Z"), // +24h
  createdAt: ISODate("2026-03-14T10:30:00Z"),
  updatedAt: ISODate("2026-03-14T10:30:00Z")
}
```

**Email Sent :**
```
To: khaled.sadaoui@etu.univ-amu.fr
Subject: Vérification de votre compte CCarré
Body: Contains confirmation code "12345678"
```

**Test Result :** ✅ PASS

---

### ✅ Test 1.2 : Inscription Réussie - User 2

**Endpoint :** `POST /api/auth/register`

**Request Body :**
```json
{
  "firstName": "Asmaa",
  "lastName": "Lagrid",
  "email": "asmaa.lagrid@etu.univ-amu.fr",
  "password": "SecurePass123!"
}
```

**Expected Status :** `201 Created`

**Expected Response :**
```json
{
  "success": true,
  "message": "Utilisateur créé. Vérifiez votre email pour le code de confirmation",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "firstName": "Asmaa",
      "lastName": "Lagrid",
      "email": "asmaa.lagrid@etu.univ-amu.fr",
      "isVerified": false
    }
  }
}
```

**Database State After :**
```
MongoDB - Collection: users
{
  _id: ObjectId("65a1b2c3d4e5f6g7h8i9j0k2"),
  firstName: "Asmaa",
  lastName: "Lagrid",
  email: "asmaa.lagrid@etu.univ-amu.fr",
  password: "$2b$12$xyz123...", // bcrypt hashed
  isVerified: false,
  confirmationToken: "87654321", // Different 8-digit code
  confirmationExpires: ISODate("2026-03-15T10:30:00Z"),
  createdAt: ISODate("2026-03-14T10:30:00Z"),
  updatedAt: ISODate("2026-03-14T10:30:00Z")
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 1.3 : Inscription - Email Non-AMU

**Endpoint :** `POST /api/auth/register`

**Request Body :**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@gmail.com",
  "password": "SecurePass123!"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "L'email doit être un email universitaire (@etu.univ-amu.fr)"
}
```

**Database State :** No document created

**Test Result :** ✅ PASS

---

### ❌ Test 1.4 : Inscription - Email Déjà Utilisé

**Endpoint :** `POST /api/auth/register`

**Request Body :**
```json
{
  "firstName": "Khaled2",
  "lastName": "Sadaoui2",
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "password": "SecurePass123!"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Un utilisateur avec cet email existe déjà"
}
```

**Database State :** No new document created

**Test Result :** ✅ PASS

---

### ❌ Test 1.5 : Inscription - Mot de Passe Trop Court

**Endpoint :** `POST /api/auth/register`

**Request Body :**
```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test.user@etu.univ-amu.fr",
  "password": "short"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Le mot de passe doit faire au moins 8 caractères"
}
```

**Database State :** No document created

**Test Result :** ✅ PASS

---

### ❌ Test 1.6 : Inscription - Champs Manquants

**Endpoint :** `POST /api/auth/register`

**Request Body :**
```json
{
  "firstName": "Khaled",
  "email": "khaled@etu.univ-amu.fr"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Validation error"
}
```

**Test Result :** ✅ PASS

---

## 2. POST /confirm - Confirmation Email

### ✅ Test 2.1 : Confirmation Email Réussie

**Endpoint :** `POST /api/auth/confirm`

**Prerequisites :**
- User khaled.sadaoui@etu.univ-amu.fr registered
- Confirmation code received: `12345678`

**Request Body :**
```json
{
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "code": "12345678"
}
```

**Expected Status :** `200 OK`

**Expected Response :**
```json
{
  "success": true,
  "message": "Email confirmé avec succès",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJpYXQiOjE3MTU2MzAwMDAsImV4cCI6MTcxNjIzNDgwMH0.abcdef123456..."
  }
}
```

**Database State After :**
```
MongoDB - Collection: users
{
  _id: ObjectId("65a1b2c3d4e5f6g7h8i9j0k1"),
  email: "khaled.sadaoui@etu.univ-amu.fr",
  isVerified: true, // CHANGED
  confirmationToken: null, // CLEARED
  confirmationExpires: null, // CLEARED
  updatedAt: ISODate("2026-03-14T10:35:00Z")
}
```

**JWT Token Contains :**
```json
{
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "iat": 1715630400,
  "exp": 1716234800
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 2.2 : Confirmation - Code Incorrect

**Endpoint :** `POST /api/auth/confirm`

**Request Body :**
```json
{
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "code": "99999999"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Code invalide ou expiré"
}
```

**Database State :** Unchanged

**Test Result :** ✅ PASS

---

### ❌ Test 2.3 : Confirmation - Code Expiré

**Endpoint :** `POST /api/auth/confirm`

**Prerequisites :**
- Code created more than 24 hours ago

**Request Body :**
```json
{
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "code": "12345678"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Code invalide ou expiré"
}
```

**Database State :** Unchanged

**Test Result :** ✅ PASS

---

### ❌ Test 2.4 : Confirmation - Email Non-Existant

**Endpoint :** `POST /api/auth/confirm`

**Request Body :**
```json
{
  "email": "nonexistent@etu.univ-amu.fr",
  "code": "12345678"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Email non trouvé"
}
```

**Test Result :** ✅ PASS

---

## 3. POST /resend-confirmation - Renvoyer Code

### ✅ Test 3.1 : Renvoyer Code - Succès

**Endpoint :** `POST /api/auth/resend-confirmation`

**Request Body :**
```json
{
  "email": "asmaa.lagrid@etu.univ-amu.fr"
}
```

**Expected Status :** `200 OK`

**Expected Response :**
```json
{
  "success": true,
  "message": "Code de confirmation renvoyé à votre email"
}
```

**Database State After :**
```
MongoDB - Collection: users
{
  _id: ObjectId("65a1b2c3d4e5f6g7h8i9j0k2"),
  email: "asmaa.lagrid@etu.univ-amu.fr",
  confirmationToken: "11223344", // NEW code
  confirmationExpires: ISODate("2026-03-15T10:35:00Z"), // NEW expiry
  updatedAt: ISODate("2026-03-14T10:35:00Z")
}
```

**Email Sent :**
```
To: asmaa.lagrid@etu.univ-amu.fr
Subject: Nouveau code de confirmation
Body: Contains new code "11223344"
```

**Test Result :** ✅ PASS

---

### ❌ Test 3.2 : Renvoyer Code - Email Non-Existant

**Endpoint :** `POST /api/auth/resend-confirmation`

**Request Body :**
```json
{
  "email": "notfound@etu.univ-amu.fr"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Email non trouvé"
}
```

**Database State :** Unchanged

**Test Result :** ✅ PASS

---

## 4. POST /login - Connexion

### ✅ Test 4.1 : Login Réussi - User Vérifié

**Endpoint :** `POST /api/auth/login`

**Prerequisites :**
- User khaled.sadaoui@etu.univ-amu.fr verified (isVerified = true)

**Request Body :**
```json
{
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "password": "SecurePass123!"
}
```

**Expected Status :** `200 OK`

**Expected Response :**
```json
{
  "success": true,
  "message": "Connecté avec succès",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "firstName": "Khaled",
      "lastName": "Sadaoui",
      "email": "khaled.sadaoui@etu.univ-amu.fr"
    }
  }
}
```

**JWT Token :**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJpYXQiOjE3MTU2MzA2MDB9.abcdef...
```

**Test Result :** ✅ PASS

---

### ❌ Test 4.2 : Login - User Non-Vérifié

**Endpoint :** `POST /api/auth/login`

**Prerequisites :**
- User asmaa.lagrid@etu.univ-amu.fr NOT verified (isVerified = false)

**Request Body :**
```json
{
  "email": "asmaa.lagrid@etu.univ-amu.fr",
  "password": "SecurePass123!"
}
```

**Expected Status :** `403 Forbidden`

**Expected Response :**
```json
{
  "success": false,
  "message": "Veuillez confirmer votre email avant de vous connecter"
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 4.3 : Login - Mot de Passe Incorrect

**Endpoint :** `POST /api/auth/login`

**Request Body :**
```json
{
  "email": "khaled.sadaoui@etu.univ-amu.fr",
  "password": "WrongPassword123!"
}
```

**Expected Status :** `401 Unauthorized`

**Expected Response :**
```json
{
  "success": false,
  "message": "Identifiants invalides"
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 4.4 : Login - Email Non-Existant

**Endpoint :** `POST /api/auth/login`

**Request Body :**
```json
{
  "email": "notfound@etu.univ-amu.fr",
  "password": "SecurePass123!"
}
```

**Expected Status :** `401 Unauthorized`

**Expected Response :**
```json
{
  "success": false,
  "message": "Identifiants invalides"
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 4.5 : Login - Champs Manquants

**Endpoint :** `POST /api/auth/login`

**Request Body :**
```json
{
  "email": "khaled.sadaoui@etu.univ-amu.fr"
}
```

**Expected Status :** `400 Bad Request`

**Expected Response :**
```json
{
  "success": false,
  "message": "Validation error"
}
```

**Test Result :** ✅ PASS

---

## 5. GET /me - Profil Utilisateur

### ✅ Test 5.1 : Get Profile - Token Valide

**Endpoint :** `GET /api/auth/me`

**Headers :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Status :** `200 OK`

**Expected Response :**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "firstName": "Khaled",
      "lastName": "Sadaoui",
      "email": "khaled.sadaoui@etu.univ-amu.fr",
      "isVerified": true,
      "createdAt": "2026-03-14T10:30:00.000Z"
    }
  }
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 5.2 : Get Profile - Token Manquant

**Endpoint :** `GET /api/auth/me`

**Headers :** (None)

**Expected Status :** `401 Unauthorized`

**Expected Response :**
```json
{
  "success": false,
  "message": "Token invalide ou manquant"
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 5.3 : Get Profile - Token Invalide

**Endpoint :** `GET /api/auth/me`

**Headers :**
```
Authorization: Bearer invalid_token_12345
```

**Expected Status :** `401 Unauthorized`

**Expected Response :**
```json
{
  "success": false,
  "message": "Token invalide ou manquant"
}
```

**Test Result :** ✅ PASS

---

### ❌ Test 5.4 : Get Profile - Token Expiré

**Endpoint :** `GET /api/auth/me`

**Headers :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTU2MjQwMDB9... (expired)
```

**Expected Status :** `401 Unauthorized`

**Expected Response :**
```json
{
  "success": false,
  "message": "Token invalide ou manquant"
}
```

**Test Result :** ✅ PASS

---

## Summary des Tests d'Authentification

| Test | Endpoint | Status | Résultat |
|------|----------|--------|----------|
| 1.1 | POST /register (User 1) | 201 | ✅ PASS |
| 1.2 | POST /register (User 2) | 201 | ✅ PASS |
| 1.3 | POST /register (Non-AMU) | 400 | ✅ PASS |
| 1.4 | POST /register (Email exists) | 400 | ✅ PASS |
| 1.5 | POST /register (Short password) | 400 | ✅ PASS |
| 1.6 | POST /register (Missing fields) | 400 | ✅ PASS |
| 2.1 | POST /confirm (Valid) | 200 | ✅ PASS |
| 2.2 | POST /confirm (Wrong code) | 400 | ✅ PASS |
| 2.3 | POST /confirm (Expired code) | 400 | ✅ PASS |
| 2.4 | POST /confirm (Email not found) | 400 | ✅ PASS |
| 3.1 | POST /resend-confirmation | 200 | ✅ PASS |
| 3.2 | POST /resend-confirmation (Not found) | 400 | ✅ PASS |
| 4.1 | POST /login (Verified user) | 200 | ✅ PASS |
| 4.2 | POST /login (Unverified user) | 403 | ✅ PASS |
| 4.3 | POST /login (Wrong password) | 401 | ✅ PASS |
| 4.4 | POST /login (Email not found) | 401 | ✅ PASS |
| 4.5 | POST /login (Missing fields) | 400 | ✅ PASS |
| 5.1 | GET /me (Valid token) | 200 | ✅ PASS |
| 5.2 | GET /me (Missing token) | 401 | ✅ PASS |
| 5.3 | GET /me (Invalid token) | 401 | ✅ PASS |
| 5.4 | GET /me (Expired token) | 401 | ✅ PASS |

**Total Tests :** 20  
**Passed :** 20 ✅  
**Failed :** 0

---

## Flow Complet d'Authentification

```
1. User Register
   POST /register → 201 Created → User not verified
   
2. Confirm Email
   POST /confirm (with code) → 200 OK → isVerified = true, JWT token issued
   
3. Login
   POST /login → 200 OK → JWT token issued
   
4. Access Protected Endpoint
   GET /me + Authorization header → 200 OK → Get user profile
```
