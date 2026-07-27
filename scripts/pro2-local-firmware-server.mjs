import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const firmwareRoot = resolve(
  process.env.PRO2_FIRMWARE_DIR ?? join(repoRoot, '..', 'firmware-pro2')
);
const host = process.env.PRO2_FIRMWARE_HOST ?? '127.0.0.1';
const port = Number(process.env.PRO2_FIRMWARE_PORT ?? 8787);
const baseUrl = `http://${host}:${port}`;
// 本地升级默认使用 Release 优化构建。dev_release 仍使用开发签名，适合
// 开发设备验证；prod_release 需要离线生产签名，不能由本脚本临时生成。
const firmwareVariant = process.env.PRO2_FIRMWARE_VARIANT ?? 'dev_release';
const firmwareArtifactsRoot = join(firmwareRoot, `.build/${firmwareVariant}/build_artifacts`);
// TODO(Pro2 romloader): bootloader 更新需要接入独立 loader 流程后再默认开放。
// 当前 bootloader 不能安全地执行自更新，因此本地恢复默认只下发应用固件。
const includeBootloader = process.env.PRO2_INCLUDE_BOOTLOADER === '1';

const files = {
  '/firmware/bootloader.okpkg': join(firmwareArtifactsRoot, 'bootloader.okpkg'),
  '/firmware/application-p1.okpkg': join(firmwareArtifactsRoot, 'core_p1.okpkg'),
  '/firmware/application-p2.okpkg': join(firmwareArtifactsRoot, 'core_p2.okpkg'),
  '/resource/animation.okpkg': join(
    firmwareRoot,
    'utils/resource/output/bundles/images/animation.okpkg'
  ),
  '/resource/images.okpkg': join(firmwareRoot, 'utils/resource/output/bundles/images/images.okpkg'),
  '/resource/wallpaper.okpkg': join(
    firmwareRoot,
    'utils/resource/output/bundles/images/wallpaper.okpkg'
  ),
  '/resource/noto.okpkg': join(firmwareRoot, 'utils/resource/output/bundles/font/noto.okpkg'),
  '/resource/roobert.okpkg': join(firmwareRoot, 'utils/resource/output/bundles/font/roobert.okpkg'),
  '/resource/translations.okpkg': join(
    firmwareRoot,
    'utils/resource/output/bundles/translations/translations.okpkg'
  ),
};

const sha256 = filePath => createHash('sha256').update(readFileSync(filePath)).digest('hex');

const readOkppHeader = filePath => {
  const header = readFileSync(filePath).subarray(0, 0x52a0);
  if (header.length < 0x52a0 || header.toString('ascii', 0, 4) !== 'OKPP') {
    throw new Error(`无效的 OKPP 文件: ${filePath}`);
  }
  const packedVersion = header.readUInt32LE(0x10);
  return {
    version: [
      Math.floor(packedVersion / 0x10000) % 0x100,
      Math.floor(packedVersion / 0x100) % 0x100,
      packedVersion % 0x100,
    ],
    payloadHash: header.subarray(0x200, 0x240).toString('hex'),
    headerHash: header.subarray(0x240, 0x280).toString('hex'),
  };
};

Object.values(files).forEach(filePath => statSync(filePath));

const resourceFiles = [
  ['animation', '/resource/animation.okpkg', 'vol0:/bundles/images/animation.okpkg'],
  ['images', '/resource/images.okpkg', 'vol0:/bundles/images/images.okpkg'],
  ['wallpaper', '/resource/wallpaper.okpkg', 'vol0:/bundles/images/wallpaper.okpkg'],
  ['noto', '/resource/noto.okpkg', 'vol0:/bundles/font/noto.okpkg'],
  ['roobert', '/resource/roobert.okpkg', 'vol0:/bundles/font/roobert.okpkg'],
  ['translations', '/resource/translations.okpkg', 'vol0:/bundles/translations/translations.okpkg'],
];

const createConfig = () => {
  const firmwareComponents = {
    applicationP1: {
      target: 'APPLICATION_P1',
      url: `${baseUrl}/firmware/application-p1.okpkg`,
      fingerprint: sha256(files['/firmware/application-p1.okpkg']),
    },
    applicationP2: {
      target: 'APPLICATION_P2',
      url: `${baseUrl}/firmware/application-p2.okpkg`,
      fingerprint: sha256(files['/firmware/application-p2.okpkg']),
    },
  };
  if (includeBootloader) {
    firmwareComponents.bootloader = {
      target: 'BOOTLOADER',
      url: `${baseUrl}/firmware/bootloader.okpkg`,
      fingerprint: sha256(files['/firmware/bootloader.okpkg']),
    };
  }
  Object.values(firmwareComponents).forEach(component => {
    const { pathname } = new URL(component.url);
    component.version = readOkppHeader(files[pathname]).version;
  });
  const resourceBundles = resourceFiles.map(([name, pathname, devicePath]) => ({
    name,
    url: `${baseUrl}${pathname}`,
    devicePath,
    ...readOkppHeader(files[pathname]),
  }));

  return {
    pro2: {
      firmware: [],
      'firmware-v1': [
        {
          required: false,
          version: firmwareComponents.applicationP1.version,
          url: firmwareComponents.applicationP1.url,
          fingerprint: firmwareComponents.applicationP1.fingerprint,
          upgradeType: 'payload-package-set',
          installOrder: includeBootloader
            ? ['bootloader', 'applicationP1', 'applicationP2']
            : ['applicationP1', 'applicationP2'],
          components: firmwareComponents,
          resourceBundles,
          changelog: {
            'zh-CN': `### Pro2 本地 Release 固件\n- 使用本地 ${firmwareVariant} 应用 P1/P2 和资源包。\n- bootloader 仅供后续独立 loader 流程使用。`,
            'en-US': `### Pro2 local release firmware\n- Uses local ${firmwareVariant} application P1/P2 and resource bundles.\n- Bootloader is reserved for a dedicated loader flow.`,
          },
        },
      ],
      ble: [],
    },
  };
};

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', baseUrl);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store');

  if (pathname === '/config.json') {
    const body = `${JSON.stringify(createConfig(), null, 2)}\n`;
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    response.end(request.method === 'HEAD' ? undefined : body);
    return;
  }

  const filePath = files[pathname];
  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
    return;
  }

  const { size } = statSync(filePath);
  response.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': size,
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Pro2 本地固件服务: ${baseUrl}/config.json`);
  console.log(`固件目录: ${firmwareRoot}`);
  console.log(`固件构建变体: ${firmwareVariant}`);
  console.log(`包含 bootloader: ${includeBootloader ? '是' : '否'}`);
});
