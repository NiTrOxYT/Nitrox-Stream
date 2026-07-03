<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Play IQSmartGames movie videos in a custom HLS.js player by extracting the SVID and resolving it to an accessible HLS URL.

## Architecture (Actual Working)

### Site: `multimovies.watch` (main WordPress site)
1. Search movies via `/wp-json/dooplay/search/?keyword=<q>&nonce=<nonce>`
2. Movie page at `/movies/<slug>/` contains player options (post ID, player API URL)
3. POST `/wp-admin/admin-ajax.php` with `action=doo_player_ajax&post=<postId>&nume=1&type=movie` → returns `{"embed_url":"https://gdmirrorbot.nl/embed/<fileId>","type":"iframe"}`

### Resolution: `pro.iqsmartgames.com`
4. POST `/embedhelper.php` with `sid=<fileId>&UserFavSite=&currentDomain=https://multimovies.watch` → returns:
   - `siteUrls`: provider base URLs (e.g., `rpmshre: https://plyr.technocosmos.surf/hlsplayer?url=...`)
   - `mresult`: base64-encoded JSON with provider hashes (e.g., `{"rpmshre":"8zxk", "smwh":"oxlchhmpt3br"}`)
   - `encryptedApiKeys`: encrypted per-provider API keys
   - `sources`: encrypted source data

5. Combine `siteUrl + mresultHash` → provider video URL
6. For `rpmshre` (RPM share): `https://multimovies.rpmhub.site/api/v1/video?id=<hash>` → AES-128-CBC encrypted hex
7. Decrypt with `key=kiemtienmua911ca`, IV=`1234567890oiuytr` or `0123456789abcdef`
8. JSON response contains `source` field with HLS master M3U8 URL

### Playback via `plyr.technocosmos.surf`
9. HLS URL returns 403 (nginx hotlink protection on `185.237.X.X` IP range)
10. `https://plyr.technocosmos.surf/hlsplayer?url=<encoded_url>` returns HTML with Video.js player (works, no CORS/iframe restrictions)
11. Player page loads `/app.js` which calls `/watch?url=<encoded_url>` with `<SIGNATURE>` from same-origin

### Watch endpoint (from obfuscated app.js)
```
ts = Date.now().toString()
stringToSign = ts + ":" + INPUT_URL + ":WATCH_SECRET"  // literal string
signature = SHA-256(stringToSign)
GET /watch?url=<encoded_URL> with headers { x-ts, x-signature }
Response: { sources: [{file, type, label}], posters: [{file}] }
```
- Deobfuscation offset: `0x161`, array rotation: `R=202`
- `:WATCH_SECRET` is a **placeholders** (replaced at edge via Cloudflare Worker)
- Signature with `:WATCH_SECRET` → `"Forbidden"` (valid sig but IP/context blocked)
- Wrong secret → `"Invalid signature"`

## Key Findings
- **multimovies.watch** is the primary movie site (search, movie pages, admin-ajax)
- **pro.iqsmartgames.com** hosts `embedhelper.php` (embeds/video resolution)
- **plyr.technocosmos.surf** hosts `app.js`, `/watch?url=` (signed proxy), `/hlsplayer?url=` (player page)
- **gdmirrorbot.nl** serves embed redirects to `pro.iqsmartgames.com`
- **multimovies.rpmhub.site** provides video API with AES-encrypted responses
- RPM hub decrypt key: `kiemtienmua911ca`, IVs: `1234567890oiuytr` / `0123456789abcdef`
- HLS URLs hotlink-protected (nginx 403) — must be proxied via `plyr.technocosmos.surf`
- `hlsplayer` endpoint NOT IP-restricted, no X-Frame-Options, works as iframe embed
- JWT token for admin-ajax expired Oct 2025

## Complete Working Resolution Chain
1. `multimovies.watch/wp-json/dooplay/search/?keyword=<q>` → movie list
2. `GET /movies/<slug>/` → extract post ID from shortlink
3. `POST admin-ajax.php` (action=doo_player_ajax) → `embed_url` → extract file ID
4. `POST pro.iqsmartgames.com/embedhelper.php` (sid) → siteUrls + mresult + encryptedApiKeys
5. `GET multimovies.rpmhub.site/api/v1/video?id=<hash>` → AES ciphertext
6. Decrypt → HLS master URL
7. Embed `https://plyr.technocosmos.surf/hlsplayer?url=<encoded_HLS_URL>` in iframe
   OR proxy HLS through our server with proper headers

## Options
### Option A: IFrame embed (simplest, works)
Embed `hlsplayer?url=<encoded_hls_url>` in an `<iframe>`. Native player from the proxy handles auth, no CORS/iframe restrictions.

### Option B: Proxy through our server
Proxy the HLS M3U8 and segments through our Next.js backend. Requires testing if the HLS server allows our server IP (likely blocked).

### Option C: Browser-side signature
Compute the `:WATCH_SECRET` signature in the browser and call `/watch?url=` from client-side. Requires resolving whether the literal `:WATCH_SECRET` is the real secret or a Cloudflare Worker-replaced placeholder.

## Relevant Files
- `app/api/movie-source/route.ts`: full resolution chain
- `lib/provider.ts`: SVID extraction + search
- `lib/embedHelper.ts`: HLS URL extraction with decryption
- `app/player/[slug]/page.tsx`: HLS.js player

## Note
The JWT token for pro.iqsmartgames.com admin-ajax (`eyJ0eXAiOiJKV1Qi...`) expired October 2025. Use `multimovies.watch` admin-ajax instead (no auth required).
