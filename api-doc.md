# DawahBox API Documentation for Frontend Developers

## Base URL

```
https://backend.dawahbox.com
```

## Authentication

Most endpoints require the `x-project` header with value: `206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

## Table of Contents

1. [Search API](#search-api)
2. [Lectures API](#lectures-api)
3. [Albums API](#albums-api)
4. [Lecturers (RP) API](#lecturers-rp-api)
5. [Playlists API](#playlists-api)
6. [Authentication API](#authentication-api)
7. [Charts API](#charts-api)
8. [Comments API](#comments-api)
9. [Social Features API](#social-features-api)
10. [Content Management API](#content-management-api)
11. [Ramadan API](#ramadan-api)

---

## Search API

### Search Content

**Endpoint:** `GET /api/searchApi.php`

Search for lectures, lecturers, albums, or playlists with advanced filtering.

**Parameters:**

- `type` (required): `lectures`, `lecturers`, `albums`, `playlists`
- `value` (required): Search term (minimum 2 characters)
- `field` (optional): Specific field to search in
- `quick` (optional): Boolean for typeahead results (max 10 items)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (max 50, default: 20)

**Example:**

```javascript
// Quick search for typeahead
fetch("/api/searchApi.php?type=lectures&value=tafseer&quick=true");

// Full search with pagination
fetch("/api/searchApi.php?type=lectures&value=quran&page=1&limit=20");
```

**Response:**

```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "total_pages": 8,
  "data": [...]
}
```

---

## Lectures API

### Get Lecture Listings

**Endpoint:** `GET /api/leclistingapi.php`

**Parameters:**

- `page` (optional): Page number
- `limit` (optional): Results per page
- `lim` + `langid` (optional): Limit by language
- `lecid` (optional): Get specific lecture by ID

**Examples:**

```javascript
// Get paginated lectures
fetch("/api/leclistingapi.php?page=1&limit=20");

// Get lectures by language
fetch("/api/leclistingapi.php?lim=50&langid=8");

// Get specific lecture
fetch("/api/leclistingapi.php?lecid=123");
```

### Get Recent Lectures

**Endpoint:** `GET /api/leclisting_recent.php`

**Parameters:**

- `action` (required): Set to `get_recent`
- `limit` (optional): Number of lectures (default: 30)
- `page` (optional): Page number

**Example:**

```javascript
fetch("/api/leclisting_recent.php?action=get_recent&limit=10");
```

### Get Popular Lectures

**Endpoint:** `GET /api/popular_lec_api.php`

**Parameters:**

- `lim` (optional): Number of lectures (default: 20)
- `langid` (optional): Filter by language ID

**Example:**

```javascript
fetch("/api/popular_lec_api.php?lim=100&langid=8");
```

### Get Lecture Charts

**Endpoint:** `GET /api/leclisting_charts_api.php`

**Parameters:**

- `action` (required): `daily`, `weekly`, `monthly`

**Example:**

```javascript
fetch("/api/leclisting_charts_api.php?action=daily");
```

### Lecture Favorites

**Endpoint:** `POST /api/leclisting_favorites.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "user_id": 123,
  "lecture_id": 456,
  "action": "add" // or "remove"
}
```

---

## Albums API

### Get Album Details

**Endpoint:** `GET /api/albumapi3.php`

**Parameters:**

- `aid` (required): Album ID
- `page` (optional): Page number for album tracks

**Example:**

```javascript
fetch("/api/albumapi3.php?aid=123&page=1");
```

### Get Album Charts

**Endpoint:** `GET /api/albumlisting_charts_api.php`

**Parameters:**

- `action` (required): `daily`, `weekly`, `monthly`

**Example:**

```javascript
fetch("/api/albumlisting_charts_api.php?action=weekly");
```

---

## Lecturers (RP) API

### Get All Lecturers

**Endpoint:** `GET /api/all_reciter_api.php`

**Parameters:**

- `lim` (optional): Limit results (default: 20)
- `page` (optional): Page number
- `reciterid` (optional): Get specific lecturer

**Example:**

```javascript
fetch("/api/all_reciter_api.php?lim=50&page=1");
```

### Get Lecturer Charts

**Endpoint:** `GET /api/rplisting_charts_api.php`

**Parameters:**

- `action` (required): `daily`, `weekly`, `monthly`

**Example:**

```javascript
fetch("/api/rplisting_charts_api.php?action=monthly");
```

---

## Playlists API

### Get User Playlists

**Endpoint:** `GET /api/playlistApi.php`

**Parameters:**

- `user_id` (required): User ID

**Example:**

```javascript
fetch("/api/playlistApi.php?user_id=123");
```

### Create/Update Playlist

**Endpoint:** `POST /api/playlistApi.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "action": "create", // or "update", "add_audio", "remove_audio"
  "user_id": 123,
  "playlist_name": "My Playlist",
  "is_private": false,
  "audio_ids": [1, 2, 3] // for add_audio action
}
```

### Get Playlist Charts

**Endpoint:** `GET /api/playlist_charts_api.php`

**Parameters:**

- `action` (required): `daily`, `weekly`, `monthly`

---

## Authentication API

### User Authentication

**Endpoint:** `POST /api/user_auth.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "action": "login", // or "register", "social_login"
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name" // for registration
}
```

### Forgot Password

**Endpoint:** `POST /api/forgot_passwordApi.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "action": "request", // or "reset"
  "email": "user@example.com",
  "code": "123456", // for reset action
  "new_password": "newpass123" // for reset action
}
```

---

## Charts API

All chart endpoints return top 20 items sorted by the specified time period.

### Available Chart Endpoints

- `GET /api/leclisting_charts_api.php?action={daily|weekly|monthly}`
- `GET /api/albumlisting_charts_api.php?action={daily|weekly|monthly}`
- `GET /api/playlist_charts_api.php?action={daily|weekly|monthly}`
- `GET /api/rplisting_charts_api.php?action={daily|weekly|monthly}`

---

## Comments API

### Get Comments

**Endpoint:** `GET /api/commentApi.php`

**Parameters:**

- `content_id` (required): ID of the content

**Example:**

```javascript
fetch("/api/commentApi.php?content_id=123");
```

### Add Comment

**Endpoint:** `POST /api/commentApi.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "user_id": 123,
  "content_id": 456,
  "type": "audio", // or "album", "playlist"
  "comment": "Great lecture!"
}
```

---

## Social Features API

### Share Content

**Endpoint:** `POST /api/shareApi.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "user_id": 123,
  "item_id": 456,
  "type": "audio" // or "album", "rp"
}
```

### Record Download

**Endpoint:** `POST /api/download_api.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "lec_id": 123
}
```

---

## Content Management API

### Get Languages

**Endpoint:** `GET /api/all_lang_api.php`

**Parameters:**

- `lang_id` (optional): Get specific language

**Example:**

```javascript
fetch("/api/all_lang_api.php");
```

### Get Keywords

**Endpoint:** `GET /api/all_keyword_api.php`

**Parameters:**

- `key_id` (optional): Get specific keyword

### Get Genres

**Endpoint:** `GET /api/genre_api.php`

**Parameters:**

- `document_type` (optional): `rp` or `album`
- `document_ids` (optional): Array of IDs

### Special Features

**Endpoint:** `POST /api/specialFeatureApi.php`

**Headers:**

- `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`

**Body:**

```json
{
  "action": "create_row",
  "name": "Feature Name",
  "description": "Feature Description",
  "keywordId": 123
}
```

---

## Ramadan API

### Get Ramadan Years

**Endpoint:** `GET /api/ramadanlisting_api.php`

**Parameters:**

- `action` (required): `getAllRamadanYear`

**Example:**

```javascript
fetch("/api/ramadanlisting_api.php?action=getAllRamadanYear");
```

### Get Ramadan Content by Year

**Endpoint:** `GET /api/ramadanlisting_api.php`

**Parameters:**

- `action` (required): `getDocumentsGroupedByKeyLang`
- `key_id` (required): Ramadan year key ID

**Example:**

```javascript
fetch(
  "/api/ramadanlisting_api.php?action=getDocumentsGroupedByKeyLang&key_id=123"
);
```

---

## Error Handling

All APIs return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "status": "error"
}
```

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": [...],
  "message": "Operation successful"
}
```

### Paginated Response

```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "total_pages": 8,
  "data": [...]
}
```

## Usage Tips

1. **Always include the `x-project` header** for POST requests
2. **Handle pagination** properly for large datasets
3. **Use quick search** for typeahead/autocomplete features
4. **Cache static data** like languages, keywords, and genres
5. **Implement proper error handling** for all API calls
6. **Use appropriate HTTP methods** (GET for reading, POST for writing)
7. **Validate parameters** before making API calls

## JavaScript Examples

### Basic Fetch with Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(
      `https://dev-backend.dawahbox.com${endpoint}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-project": "206cf92c-8a46-45ef-bf3f-a6ef92fc6f25",
          ...options.headers,
        },
        ...options,
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "API call failed");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Usage examples:
const lectures = await apiCall("/api/leclistingapi.php?page=1&limit=20");
const searchResults = await apiCall(
  "/api/searchApi.php?type=lectures&value=quran"
);
```

### React Hook Example

```javascript
import { useState, useEffect } from "react";

function useDawahBoxAPI(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiCall(endpoint);
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
}

// Usage:
const {
  data: lectures,
  loading,
  error,
} = useDawahBoxAPI("/api/leclistingapi.php?page=1");
```
