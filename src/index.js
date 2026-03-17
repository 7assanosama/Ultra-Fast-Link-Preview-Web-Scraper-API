export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 🔹 BULK
        if (request.method === "POST" && url.pathname === "/bulk") {
            return handleBulk(request, ctx);
        }

        // 🔹 SINGLE PREVIEW
        const target = url.searchParams.get("url");

        if (!target) {
            return json({ error: "Missing url parameter" }, 400);
        }

        return handleSingle(target, ctx);
    }
};

// 🔥 SINGLE HANDLER
async function handleSingle(target, ctx) {
    if (!isValidUrl(target)) return json({ error: "Invalid URL" }, 400);

    const start = Date.now();

    try {
        const cacheKey = new Request(`https://cache/${target}`);
        const cache = caches.default;

        let response = await cache.match(cacheKey);
        if (response) {
            const data = await response.json();
            data.cached = true;
            return json(data);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(target, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const html = await res.text();
        if (html.length > 1_000_000) return json({ error: "Page too large" }, 413);

        const data = extractMeta(html, target);

        data.cached = false;
        data.duration = Date.now() - start;
        data.domain = new URL(target).hostname;

        response = json(data);
        ctx.waitUntil(cache.put(cacheKey, response.clone()));

        return response;
    } catch (err) {
        if (err.name === "AbortError") return json({ error: "Request timed out" }, 504);
        return json({ error: "Failed to fetch URL" }, 500);
    }
}

// 💥 BULK HANDLER
async function handleBulk(request, ctx) {
    try {
        const body = await request.json();

        if (!body.urls || !Array.isArray(body.urls)) return json({ error: "urls must be array" }, 400);
        if (body.urls.length > 20) return json({ error: "Max 20 urls allowed" }, 400);

        const urls = [...new Set(body.urls)]; // remove duplicates

        const results = await runLimited(urls, 3, handleSingle, ctx);

        const output = await Promise.all(
            results.map(async ({ url, res }) => {
                try {
                    const data = await res.json();
                    return { url, success: !data.error, data: data.error ? null : data, error: data.error || null };
                } catch {
                    return { url, success: false, data: null, error: "Parse error" };
                }
            })
        );

        return json({ results: output });
    } catch {
        return json({ error: "Invalid request" }, 400);
    }
}

// ⚡ CONCURRENCY CONTROL
async function runLimited(urls, limit, handler, ctx) {
    const results = [];
    const executing = [];

    for (const url of urls) {
        const p = handler(url, ctx).then(res => ({ url, res }));
        results.push(p);

        if (limit <= urls.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);

            if (executing.length >= limit) await Promise.race(executing);
        }
    }

    return Promise.all(results);
}

// 🧠 ADVANCED METADATA EXTRACTION
function extractMeta(html, url) {
    const get = regex => html.match(regex)?.[1] || null;

    const title = get(/og:title" content="(.*?)"/i) || get(/twitter:title" content="(.*?)"/i) || get(/<title>(.*?)<\/title>/i);
    const description = get(/og:description" content="(.*?)"/i) || get(/twitter:description" content="(.*?)"/i) || get(/name="description" content="(.*?)"/i);
    const image = get(/og:image" content="(.*?)"/i) || get(/twitter:image" content="(.*?)"/i) || get(/<img.*?src=["'](.*?)["']/i);
    const favicon = get(/<link rel="icon" href="(.*?)"/i) || new URL("/favicon.ico", url).href;

    const site_name = get(/og:site_name" content="(.*?)"/i) || get(/name="application-name" content="(.*?)"/i);
    const author = get(/name="author" content="(.*?)"/i) || get(/article:author" content="(.*?)"/i) || get(/twitter:creator" content="(.*?)"/i);
    const keywords = get(/name="keywords" content="(.*?)"/i);
    const theme_color = get(/name="theme-color" content="(.*?)"/i);
    const type = get(/og:type" content="(.*?)"/i);
    const locale = get(/og:locale" content="(.*?)"/i);
    const video = get(/og:video:url" content="(.*?)"/i) || get(/og:video" content="(.*?)"/i);
    const audio = get(/og:audio" content="(.*?)"/i);
    const robots = get(/name="robots" content="(.*?)"/i);
    const charset = get(/<meta charset=["'](.*?)["']/i);

    return { title, description, image, favicon, site_name, author, keywords, theme_color, type, locale, video, audio, robots, charset, url };
}

// 🛡️ URL VALIDATION
function isValidUrl(string) {
    try {
        const url = new URL(string);
        const host = url.hostname;

        if (
            host === "localhost" ||
            host === "[::1]" ||
            host.startsWith("127.") ||
            host.startsWith("10.") ||
            host.startsWith("192.168.") ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
        ) return false;

        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// 📦 JSON RESPONSE
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}