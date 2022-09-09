import http from 'http';
import express from 'express';
import bodyParse from 'body-parser';
import cors from 'cors';
import WebSocket from 'ws';
import { postMessage, listenRendererMessages } from './messages';

listenRendererMessages();

let pending = false;
function setPending(state: boolean) {
  pending = state;
}

function createProxy() {
  const PORT = 8321;
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  // Http Proxy
  app.use(cors());
  app.get('/', async (_, res) => {
    res.json({ success: true });
  });

  setPending(false);
  // eslint-disable-next-line consistent-return
  app.post('/', bodyParse.json(), async (req, res) => {
    if (!req.body) return res.sendStatus(400);

    if (pending) {
      return res.status(400).json({
        success: false,
        payload: {
          error: 'a method was already pending',
          code: 0,
        },
      });
    }

    setPending(true);

    try {
      const result = await postMessage(req.body);
      return res.json({ ...result });
    } catch (err) {
      return res.status(400).json({ err });
    } finally {
      pending = false;
    }
  });

  // WebSocket Proxy
  let wsIndex = 0;
  let wsBusyIndex = 0;
  wss.on('connection', (ws) => {
    // eslint-disable-next-line no-plusplus
    const index = ++wsIndex;

    try {
      let destroyed = false;
      const onClose = () => {
        if (destroyed) return;
        destroyed = true;
        if (wsBusyIndex) {
          wsBusyIndex = 0;
        }

        console.log('websocket closed');
      };

      ws.on('close', onClose);
      ws.on('message', async (message, isBinary) => {
        if (destroyed) return;
        if (wsBusyIndex) {
          ws.send(
            JSON.stringify({
              success: true,
              error: 'WebSocket is busy (previous session not closed)',
            })
          );
          ws.close();
          destroyed = true;
          return;
        }

        let data: any = isBinary ? message : message.toString();

        if (data === 'ping') {
          ws.send('pong');
          return;
        }

        try {
          data = JSON.parse(data);
        } catch (e) {
          console.log('json parse error: ', e);
        }

        wsBusyIndex = index;

        try {
          const result = await postMessage(data);
          ws.send(JSON.stringify({ ...result, messageId: data.messageId }));
        } catch (err: unknown) {
          ws.send(JSON.stringify({ success: false, error: (err as Error).message }));
        } finally {
          wsBusyIndex = 0;
        }
      });
    } catch (err) {
      console.log('websocket error', err);
      ws.close();
    }
  });

  ['localhost']
    .map((ip) => `ws://${ip}:${PORT}`)
    .forEach((ip) => {
      console.log('proxy: ', ip);
    });

  server.listen(PORT, () => {
    console.log('listening on port', PORT);
  });
}

export default {
  createProxy,
  setPending,
};
