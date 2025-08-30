# DawahNigeria Mobile App API Documentation

## Overview

The DawahNigeria mobile app integrates with the DawahBox backend API to provide Islamic lectures, recitations, and religious content. This document outlines the API endpoints, authentication, and data structures used by the app.

## Base Configuration

- **Base URL**: `https://backend.dawahbox.com`
- **Dev URL**: `https://dev-backend.dawahbox.com`
- **API Key**: `206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`
- **Timeout**: 30 seconds
- **Retry Attempts**: 3 (with exponential backoff)

## Authentication

The API uses a project-based authentication system:

- **Header**: `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`
- **Content-Type**: `application/json`

## API Endpoints

### 1. Lectures API

#### Get Lecture List

```http
GET /api/leclistingapi.php
```

**Query Parameters:**

- `lim` (optional): Number of results per page
- `langid` (optional): Language ID filter
- `sort` (optional): Sort order (`asc` or `desc`)
- `page` (optional): Page number for pagination

**Response:**

```typescript
interface PaginatedResponse<Lecture> {
  success: boolean;
  data: Lecture[];
  total?: number;
  page?: number;
}
```

#### Get Specific Lecture

```http
GET /api/leclistingapi.php?lecid={id}
```

**Query Parameters:**

- `lecid`: Lecture ID (increments view count)

**Response:**

```typescript
interface ApiResponse<Lecture> {
  success: boolean;
  data: Lecture;
  message?: string;
  error?: string;
}
```

#### Get Popular Lectures

```http
GET /api/popular_lec_api.php
```

**Query Parameters:**

- `lim` (optional): Number of results
- `langid` (optional): Language ID filter

#### Get Lecture Charts

```http
GET /api/leclisting_charts_api.php?action={period}
```

**Query Parameters:**

- `action`: Time period (`daily`, `weekly`, `monthly`)

#### Record Download

```http
POST /api/download_api.php
```

**Request Body:**

```json
{
  "lecid": 123
}
```

### 2. Search API

#### Global Search

```http
GET /api/searchApi.php?type=global&value={query}
```

**Query Parameters:**

- `type`: Search type (`global`, `lectures`, `lecturers`, `albums`, `recitations`)
- `value`: Search query string
- `page` (optional): Page number
- `limit` (optional): Results per page
- `quick` (optional): Quick search mode (`true` for limited results)

**Response:**

```typescript
interface SearchResponse<T> {
  success: boolean;
  total: number;
  page: number;
  total_pages: number;
  data: T[];
}
```

#### Quick Search (Typeahead)

```http
GET /api/searchApi.php?type={type}&value={query}&quick=true
```

Returns limited results (max 10) for real-time search suggestions.

### 3. Resource Persons API

#### Get All Resource Persons

```http
GET /api/all_rps_api.php
```

**Query Parameters:**

- `langid` (optional): Language ID filter
- `alpha` (optional): Filter by first letter
- `lim` (optional): Number of results per page
- `page` (optional): Page number

#### Get Specific Resource Person

```http
GET /api/all_rps_api.php?rpid={id}
```

### 4. Albums API

#### Get Albums

```http
GET /api/albums_api.php
```

**Query Parameters:**

- `langid` (optional): Language ID filter
- `lim` (optional): Number of results
- `page` (optional): Page number

### 5. Reciters API

#### Get Reciters

```http
GET /api/reciters_api.php
```

**Query Parameters:**

- `langid` (optional): Language ID filter
- `lim` (optional): Number of results

## Data Models

### Lecture

```typescript
interface Lecture {
  id: number;
  mp3_title: string;
  mp3_description?: string;
  mp3_url: string; // Direct MP3 download/stream URL
  mp3_duration: string; // Format: "HH:MM:SS"
  mp3_img?: string; // Lecture thumbnail image
  key_name?: string; // Topic/keyword
  cat_name?: string; // Category
  lang_name?: string; // Language
  views: number;
  downloads: number;
  favorites: number;
  share: number;
  comment: number;
  lecturer_name?: string;
  rp_id?: number; // Resource Person ID
  album_title?: string;
  album_id?: number;
  reciter_name?: string;
  reciter_id?: number;
}
```

### Resource Person

```typescript
interface ResourcePerson {
  id: number;
  name: string;
  img?: string; // Profile image URL
  biography?: string;
  lang_id?: number;
  lang_name?: string;
  lectureCount?: number;
}
```

### Album

```typescript
interface Album {
  id: number;
  title: string;
  description?: string;
  image?: string; // Album cover image
  lecturer_name?: string;
  rp_id?: number;
  track_count?: number;
  total_duration?: string;
  lang_name?: string;
  category?: string;
}
```

## Media URLs

### Audio Files

- **Base URL**: `https://media.dawahnigeria.com/`
- **Path Structure**: `dnlectures3/{LecturerName}/{SeriesName}/{FileName}.mp3`
- **Example**: `https://media.dawahnigeria.com/dnlectures3/Ustadh%20Abdulfattah%20Sarumi%20(Ilorin)/Adeenu%20Yusrun/Ustadh%20Abdulfattah%20Sarumi%20(Ilorin)_Ad-Deenu%20Yusrun%20-%20Ruqya%2007(08-08-25)%20(Yoruba)_DN.mp3`

### Images

- **Base URL**: `https://media.dawahnigeria.com/`
- **Path Structure**: `dnimages/large/{imageId}.jpeg`
- **Example**: `https://media.dawahnigeria.com/dnimages/large/728.jpeg`

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

### Error Response Format

```typescript
interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### Common Error Codes

- `NETWORK_ERROR`: Network connectivity issues
- `UNKNOWN_ERROR`: Unexpected errors
- `HTTP_${status}`: HTTP status code errors

## Rate Limiting & Caching

- **Retry Logic**: Exponential backoff with 3 attempts
- **Timeout**: 30 seconds per request
- **Caching**: Client-side caching for frequently accessed data
- **Pagination**: Standard pagination with `page` and `lim` parameters

## Usage Examples

### Fetch Recent Lectures

```typescript
const lectures = await lecturesApi.getLectures({
  lim: 20,
  sort: "desc",
  page: 1,
});
```

### Search for Specific Topic

```typescript
const results = await searchApi.searchLectures("Ramadan", {
  limit: 50,
  page: 1,
});
```

### Get Lecturer's Lectures

```typescript
const person = await personsApi.getPerson(123);
const lectures = await lecturesApi.getLectures({
  rp_id: person.id,
  lim: 100,
});
```

## Notes

- All audio files are streamed directly from the media server
- Images are served from the same media domain
- The API supports multiple languages (English, Yoruba, Hausa, Arabic)
- Download tracking is implemented for analytics
- Background audio playback is supported in the mobile app
