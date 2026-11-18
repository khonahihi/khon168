# Troubleshooting

- **Cannot reach from iPhone:** `127.0.0.1` is local to the iPhone itself. Deploy behind HTTPS with `PUBLIC_BASE_URL` set to the public origin. Add authentication before internet exposure.
- **EADDRINUSE:** port 4000 is already taken. Change `PORT` in `.env`.
- **Unknown frame:** check `GET /api/photobooth/frames`; only listed IDs and aliases are accepted.
- **Image not accepted:** send JPEG, PNG, WebP, AVIF or HEIF. Max image size defaults to 8 MiB. Valid image decoders vary by Sharp build.
- **Image host not allowed:** URL input is disabled unless explicitly allowlisted in `ALLOWED_IMAGE_HOSTS` (one exact host per comma-separated entry). Avoid SSRF by never allowing arbitrary URLs.
- **Unknown image field:** live request format differs from the provisional adapter; inspect redacted key names and update the parser.
- **Photobooth doesn't capture 4 times in Locket:** the provided backend does not control native iOS camera behavior. Inspect the live filter request/response flow; only the backend compositing is independently testable.
- **DNS configuration:** do not delete working DNS profile; test with the current profile before trying another. DNS itself does not alter the camera UI.
- **API key error:** if `API_ACCESS_KEY` is set, writes require `X-KHON168-API-Key`. Never publish a shared secret inside public JS; design real user authentication for production.
- **Privacy:** session URLs are not signed and the backend lacks authenticated reads. Do not test with private photos on a public server.
