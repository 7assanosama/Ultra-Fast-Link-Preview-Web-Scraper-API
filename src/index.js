export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");

        if (!target) {
            return json({ error: "Missing url parameter" }, 400);
        }

        try {
            // ✅ cache key
            const cacheKey = new Request(`https://cache/${target}`);
            const cache = caches.default;

            // 🔥 check cache
            let response = await cache.match(cacheKey);
            if (response) return response;

            // 🚀 fetch target
            const res = await fetch(target, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; PreviewBot/1.0)"
                },
                cf: {
                    cacheTtl: 3600,
                    cacheEverything: true
                }
            });

            const html = await res.text();

            // 🧠 extract data
            const data = extractMeta(html, target);

            response = json(data, 200);

            // 💾 save cache
            ctx.waitUntil(cache.put(cacheKey, response.clone()));

            return response;

        } catch (err) {
            return json({ error: "Failed to fetch URL" }, 500);
        }
    }
};

// 🧠 meta extraction
function extractMeta(html, url) {
    const get = (regex) => html.match(regex)?.[1] || null;

    const title =
        get(/<meta property="og:title" content="(.*?)"/i) ||
        get(/<title>(.*?)<\/title>/i);

    const description =
        get(/<meta property="og:description" content="(.*?)"/i) ||
        get(/<meta name="description" content="(.*?)"/i);

    const image =
        get(/<meta property="og:image" content="(.*?)"/i);

    const favicon = new URL("/favicon.ico", url).href;

    return {
        title,
        description,
        image,
        favicon,
        url
    };
}

// 📦 helper
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600"
        }
    });
}