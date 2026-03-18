# Ultra Fast Link Preview Web Scraper API

High-performance, fully optimized, and highly reliable Link Preview & Web Scraping API. Built specifically for fetching metadata, OpenGraph tags, Twitter Cards, and general website information at lightning speed.

Ideal for chat applications, social media apps, content aggregators, and any application that requires robust URL previews.

## ✨ Features

- **🚀 Ultra Fast**: Built on Edge computing (Cloudflare Workers) for global low-latency responses.
- **🛡️ Secure & Reliable**: Built-in SSRF protection (blocking internal network requests to `localhost`, `10.x`, `172.x`, `192.168.x`).
- **📦 Bulk Processing**: Fetch metadata for up to 20 URLs simultaneously under a single API call with optimized concurrency.
- **💾 Built-in Caching**: Avoids redundant network requests utilizing global edge caching.
- **🧠 Advanced Metadata Extraction**: 
  - OpenGraph tags (`og:title`, `og:description`, `og:image`, `og:site_name`, `og:type`, `og:locale`, `og:video`, `og:audio`)
  - Twitter Card tags (`twitter:title`, `twitter:description`, `twitter:image`, `twitter:creator`)
  - Standard HTML Meta tags (`author`, `keywords`, `theme-color`, `robots`, `charset`)
  - Auto-fallback to standard HTML elements (`<title>`, `<meta name="description">`, `<img>`, `<video>`, `<audio>`)
- **📊 Detailed Analytics**: Returns the response `status` code, the fetch `duration` (in ms), and the overall HTML `size` (in bytes).

## 🚀 Endpoints

### 1. Single URL Preview

Fetch metadata and OpenGraph information for a single URL.

**HTTP Request**
`GET /?url={target_url}`

**Parameters**
- `url` (Required, Query): The fully qualified URL (e.g., `https://example.com`) to extract previews for.

**Example Response**

```json
{
  "title": "Example Domain",
  "description": null,
  "image": null,
  "favicon": "https://example.com/favicon.ico",
  "site_name": null,
  "author": null,
  "keywords": null,
  "theme_color": null,
  "type": null,
  "locale": "en",
  "video": null,
  "audio": null,
  "robots": "index, follow",
  "charset": "utf-8",
  "url": "https://example.com",
  "cached": false,
  "duration": 150,
  "domain": "example.com",
  "status": 200,
  "size": 1256
}
```

### 2. Bulk URL Preview

Fetch metadata for multiple URLs efficiently. Deduplicates URLs and processes them concurrently (max 3 concurrent requests to prevent abuse/blocking).

**HTTP Request**
`POST /bulk`

**Headers**
- `Content-Type: application/json`

**Body**

```json
{
  "urls": [
    "https://example.com",
    "https://github.com"
  ]
}
```

**Parameters**
- `urls` (Required, Array): Array of fully qualified URLs. Max 20 URLs allowed per request.

**Example Response**

```json
{
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "data": {
        "title": "Example Domain",
        // ... (metadata fields) ...
        "status": 200,
        "size": 1256
      },
      "error": null
    },
    {
      "url": "https://github.com",
      "success": true,
      "data": {
        "title": "GitHub: Let's build from here",
        // ... (metadata fields) ...
        "status": 200,
        "size": 250431
      },
      "error": null
    }
  ]
}
```

## ⚠️ Error Handling

The API returns standard HTTP status codes indicating the success or failure of a request:

- `200 OK`: Successful extraction.
- `400 Bad Request`: Missing or invalid URL format, local/internal IPs (SSRF blocked), or exceeding the bulk URL limit.
- `413 Payload Too Large`: The target webpage is too large to parse (exceeds 5MB).
- `500 Internal Server Error`: An unexpected error occurred while fetching the URL.
- `504 Gateway Timeout`: The target webpage took too long to respond (exceeds 5s timeout limit).

## 🛠️ Usage Restrictions

- Supported Protocols: `http` and `https` only.
- Page Size Limit: 5 MB per webpage.
- Bulk Limit: Maximum 20 unique URLs per `POST /bulk` request.
- Timeout limit: 5000ms.
