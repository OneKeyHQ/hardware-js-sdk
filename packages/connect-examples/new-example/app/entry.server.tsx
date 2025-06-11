/**
 * Minimal server entry point that just returns an empty shell.
 * This is necessary for Remix, but we're doing pure client-side rendering.
 */

import type { EntryContext } from "@remix-run/node";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remixContext: EntryContext
) {
  responseHeaders.set("Content-Type", "text/html");

  // Just return a minimal HTML shell - all rendering will happen on the client
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OneKey Developer Site</title>
      </head>
      <body>
        <div id="root"></div>
        <script src="/build/client.js"></script>
      </body>
    </html>`,
    {
      status: responseStatusCode,
      headers: responseHeaders,
    }
  );
}
