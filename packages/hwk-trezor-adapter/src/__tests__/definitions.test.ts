import {
  buildEthereumDefinitionsForPath,
  buildEthereumDefinitionsForSignTx,
  fetchEthereumDefinitions,
  getSlip44FromPath,
} from '../utils/ethereumDefinitions';
import { fetchSolanaTokenDefinition } from '../utils/solanaTokenDefinition';

function arrayBufferFromHex(hex: string): ArrayBuffer {
  const bytes = Buffer.from(hex, 'hex');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function mockFetch(responses: Record<string, { status: number; hex?: string } | Error>) {
  return jest.fn(async (url: string) => {
    const response = responses[url];
    if (response instanceof Error) {
      throw response;
    }
    if (!response) {
      throw new Error(`Unexpected URL: ${url}`);
    }
    return {
      status: response.status,
      arrayBuffer: async () => arrayBufferFromHex(response.hex ?? ''),
    };
  });
}

describe('ethereumDefinitions helpers', () => {
  it('fetches network and lowercased token definitions by chain id', async () => {
    const fetchImpl = mockFetch({
      'https://data.trezor.io/firmware/eth-definitions/chain-id/1/network.dat': {
        status: 200,
        hex: '0a0101',
      },
      'https://data.trezor.io/firmware/eth-definitions/chain-id/1/token-abcdef.dat': {
        status: 200,
        hex: '0a0202',
      },
    });

    const definitions = await fetchEthereumDefinitions({
      chainId: 1,
      contractAddress: '0xABCDEF',
      fetchImpl,
    });

    expect(definitions.encodedNetwork).toBe('0a0101');
    expect(definitions.encodedToken).toBe('0a0202');
  });

  it('returns partial definitions when token is missing or a request fails', async () => {
    const fetchImpl = mockFetch({
      'https://data.trezor.io/firmware/eth-definitions/chain-id/137/network.dat': {
        status: 200,
        hex: '0a89',
      },
      'https://data.trezor.io/firmware/eth-definitions/chain-id/137/token-missing.dat': {
        status: 404,
      },
    });

    const definitions = await fetchEthereumDefinitions({
      chainId: 137,
      contractAddress: '0xMissing',
      fetchImpl,
    });

    expect(definitions.encodedNetwork).toBe('0a89');
    expect(definitions.encodedToken).toBeUndefined();

    await expect(
      fetchEthereumDefinitions({
        chainId: 10,
        fetchImpl: mockFetch({
          'https://data.trezor.io/firmware/eth-definitions/chain-id/10/network.dat': new Error(
            'offline'
          ),
        }),
      })
    ).resolves.toEqual({});
  });

  it('derives slip44 from BIP44-style paths and fetches path definitions', async () => {
    const fetchImpl = mockFetch({
      'https://data.trezor.io/firmware/eth-definitions/slip44/60/network.dat': {
        status: 200,
        hex: '0a3c',
      },
    });

    expect(getSlip44FromPath("m/44'/60'/0'/0/0")).toBe(60);
    const definitions = await buildEthereumDefinitionsForPath({
      path: "m/44'/60'/0'/0/0",
      fetchImpl,
    });

    expect(definitions.encodedNetwork).toBe('0a3c');
  });

  it('matches Suite signTx fetch rules', async () => {
    const fetchImpl = mockFetch({
      'https://data.trezor.io/firmware/eth-definitions/chain-id/137/network.dat': {
        status: 200,
        hex: '0a89',
      },
      'https://data.trezor.io/firmware/eth-definitions/chain-id/137/token-contract.dat': {
        status: 200,
        hex: '0a0202',
      },
    });

    await expect(
      buildEthereumDefinitionsForSignTx({
        path: "m/44'/60'/0'/0/0",
        chainId: 1,
        fetchImpl,
      })
    ).resolves.toBeUndefined();

    const definitions = await buildEthereumDefinitionsForSignTx({
      path: "m/44'/60'/0'/0/0",
      chainId: 137,
      to: '0xContract',
      data: '0xa9059cbb0000',
      fetchImpl,
    });

    expect(definitions?.encodedNetwork).toBe('0a89');
    expect(definitions?.encodedToken).toBe('0a0202');
  });

  it('routes through a custom baseUrl (own proxy) instead of data.trezor.io', async () => {
    const fetchImpl = mockFetch({
      'https://proxy.onekey.local/eth-defs/chain-id/1/network.dat': {
        status: 200,
        hex: '0a0101',
      },
    });

    const definitions = await fetchEthereumDefinitions({
      chainId: 1,
      baseUrl: 'https://proxy.onekey.local/eth-defs',
      fetchImpl,
    });

    expect(definitions.encodedNetwork).toBe('0a0101');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://proxy.onekey.local/eth-defs/chain-id/1/network.dat'
    );
  });
});

describe('fetchSolanaTokenDefinition', () => {
  it('fetches a token definition by mint (default upstream)', async () => {
    const fetchImpl = mockFetch({
      'https://data.trezor.io/firmware/definitions/solana/token/Mint111.dat': {
        status: 200,
        hex: '0a0303',
      },
    });

    const encodedToken = await fetchSolanaTokenDefinition({ tokenMint: 'Mint111', fetchImpl });
    expect(encodedToken).toBe('0a0303');
  });

  it('returns undefined on non-200 or network error', async () => {
    await expect(
      fetchSolanaTokenDefinition({
        tokenMint: 'Missing',
        fetchImpl: mockFetch({
          'https://data.trezor.io/firmware/definitions/solana/token/Missing.dat': { status: 404 },
        }),
      })
    ).resolves.toBeUndefined();

    await expect(
      fetchSolanaTokenDefinition({
        tokenMint: 'Offline',
        fetchImpl: mockFetch({
          'https://data.trezor.io/firmware/definitions/solana/token/Offline.dat': new Error('x'),
        }),
      })
    ).resolves.toBeUndefined();
  });

  it('routes through a custom baseUrl', async () => {
    const fetchImpl = mockFetch({
      'https://proxy.onekey.local/sol-tokens/MintABC.dat': { status: 200, hex: '0a0404' },
    });

    const encodedToken = await fetchSolanaTokenDefinition({
      tokenMint: 'MintABC',
      baseUrl: 'https://proxy.onekey.local/sol-tokens',
      fetchImpl,
    });

    expect(encodedToken).toBe('0a0404');
    expect(fetchImpl).toHaveBeenCalledWith('https://proxy.onekey.local/sol-tokens/MintABC.dat');
  });
});
