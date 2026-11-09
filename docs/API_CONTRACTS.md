# API Contracts & REST Standards

## 1. Unified Request / Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "correlationId": "corr-uuid",
    "timestamp": 1731154800000
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable detail",
    "details": [
      {
        "path": ["email"],
        "message": "Invalid email address"
      }
    ]
  },
  "meta": {
    "correlationId": "corr-uuid",
    "timestamp": 1731154800000
  }
}
```

## 2. Core Endpoint Specifications

- `POST /api/v1/auth/register` (body: `{ email, password, fullName }` -> 201 `{ user, accessToken, refreshToken }`)
- `POST /api/v1/auth/login` (body: `{ email, password }` -> 200 `{ user, accessToken }`)
- `GET /api/v1/auth/me` (headers: `Authorization: Bearer <jwt>` -> 200 `{ user }`)
- `POST /api/v1/spaces` (body: `{ name, description, type }` -> 201 `{ space }`)
- `GET /api/v1/spaces` (-> 200 `[ { space } ]`)
- `POST /api/v1/spaces/:id/profiles` (body: `{ name, relationship, type, birthDate }` -> 201 `{ profile }`)
- `POST /api/v1/memories` (body: `{ spaceId, title, content, format, capturedAt, tags, mediaIds }` -> 201 `{ memory }`)
- `GET /api/v1/memories?spaceId=...&favoriteOnly=...` (-> 200 `[ { memory } ]`)
- `POST /api/v1/media/upload-session` (body: `{ spaceId, fileName, mimeType, fileSizeBytes }` -> 201 `{ mediaId, uploadUrl, storageKey }`)
- `POST /api/v1/media/:id/complete` (-> 200 `{ mediaAsset }`)
- `GET /api/v1/media/spaces/:id/quota` (-> 200 `{ usedBytes, maxBytes, usedPercentage }`)
- `POST /api/v1/books` (body: `{ spaceId, title, format, coverColor, foilStamping }` -> 201 `{ book }`)
- `POST /api/v1/books/:id/freeze` (-> 200 `{ frozenBook, frozenEditionHash }`)
