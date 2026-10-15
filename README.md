# CCarré - Backend API

API backend TypeScript/Express pour la plateforme CCarré.

## Stack

- Node.js + TypeScript
- Express
- MongoDB (Mongoose)
- Socket.io
- Cloudinary (upload images)
- SMTP via Nodemailer (compatible SendGrid)

## Prerequis

- Node.js 20+ (recommande)
- npm 10+
- Un cluster MongoDB (local ou MongoDB Atlas)
- Un compte Cloudinary
- Un compte email SMTP (SendGrid recommande en prod)

## Installation rapide

```bash
npm install
```

## Variables d'environnement (.env)

1. Cree un fichier `.env` a la racine du projet.
2. Copie le contenu de `.env.example`.
3. Remplis les valeurs reelles.

### .env.example

```env
# Environnement
NODE_ENV=development
PORT=5000

# MongoDB
# Local: mongodb://127.0.0.1:27017/ccarre
# Atlas: mongodb+srv://<username>:<password>@<cluster-url>/<db>?retryWrites=true&w=majority
MONGODB_URI=

# JWT
JWT_SECRET=change_this_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# SMTP (Nodemailer)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Configuration detaillee

### 1) MongoDB

Option A - Local:

- Installer MongoDB en local.
- Creer la base `ccarre`.
- Utiliser: `MONGODB_URI=mongodb://127.0.0.1:27017/ccarre`

Option B - MongoDB Atlas:

- Creer un cluster Atlas.
- Creer un user base de donnees.
- Autoriser ton IP (ou `0.0.0.0/0` temporairement pour test).
- Recuperer l'URI de connexion et remplacer dans `MONGODB_URI`.

### 2) Cloudinary

- Creer un compte sur Cloudinary.
- Dans le dashboard, recuperer:
	- `cloud_name`
	- `api_key`
	- `api_secret`
- Renseigner:
	- `CLOUDINARY_CLOUD_NAME`
	- `CLOUDINARY_API_KEY`
	- `CLOUDINARY_API_SECRET`

### 3) SendGrid (SMTP)

Le projet envoie les emails via Nodemailer/SMTP. SendGrid est la config recommandee.

- Creer un compte SendGrid.
- Verifier un expéditeur (Single Sender ou Domain Authentication).
- Generer une API Key SendGrid (permissions Mail Send).
- Configurer dans `.env`:
	- `SMTP_HOST=smtp.sendgrid.net`
	- `SMTP_PORT=587`
	- `SMTP_SECURE=false`
	- `SMTP_USER=apikey`
	- `SMTP_PASS=<ta_sendgrid_api_key>`

## Lancer le projet

Mode developpement:

```bash
npm run dev
```

Build + run:

```bash
npm run build
npm start
```

## Verification

Health check:

```http
GET /api/health
```

Exemple local:

```bash
curl http://localhost:5000/api/health
```

## Scripts disponibles

- `npm run dev` - lance le serveur en mode dev (ts-node-dev)
- `npm run build` - compile TypeScript vers `dist`
- `npm start` - demarre le serveur compile
- `npm run lint` - lance ESLint

## Notes importantes

- Ne jamais commiter le fichier `.env`.
- Regenerer immediatement les secrets s'ils ont ete exposes.
- En production, utiliser des valeurs fortes pour `JWT_SECRET` et des credentials services dedies.
