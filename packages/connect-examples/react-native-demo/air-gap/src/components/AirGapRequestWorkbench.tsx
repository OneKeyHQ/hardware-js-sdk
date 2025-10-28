import { Buffer } from 'buffer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { airGapUrUtils, getAirGapSdk } from '../../sdk';
import { OneKeyRequestDeviceQR } from '../../sdk/OneKeyRequestDeviceQR';
import { EAirGapDataTypeEvm } from '../../sdk/types';
import { createDemoPsbtHex } from '../utils/btcPsbtBuilder';
import { deriveEvmAddressFromPublicKey } from '../utils/address';

import type { AirGapUR, IAirGapUrJson } from '../../sdk';

export type RequestType = 'getMultiAccounts' | 'verifyAddress' | 'ethSignTransaction' | 'btcPsbt';

export interface IConnectedDeviceAccount {
  id: string;
  chain?: string;
  path?: string;
  note?: string;
  xfp?: string;
  extendedPublicKey?: string;
  publicKey?: string;
  address?: string;
}

export interface IConnectedDeviceContext {
  name: string;
  deviceId?: string;
  xfp?: string;
  accounts: IConnectedDeviceAccount[];
  rawUr: IAirGapUrJson;
}

export interface IRequestWorkbenchResult {
  requestType: RequestType;
  description: string;
  summary: Record<string, string | number | boolean | undefined>;
  ur: AirGapUR;
  urJson: IAirGapUrJson;
}

interface IRequestWorkbenchProps {
  device: IConnectedDeviceContext | null;
  onGenerated: (result: IRequestWorkbenchResult) => void;
}

const requestTabs: Array<{
  id: RequestType;
  title: string;
  description: string;
}> = [
  {
    id: 'getMultiAccounts',
    title: 'Request Account List',
    description:
      'Generate a getMultiAccounts request based on the imported device info so the hardware wallet can return the latest account list.',
  },
  {
    id: 'verifyAddress',
    title: 'Verify Address',
    description:
      'Pick an account path exported by the hardware wallet and ask the device to verify that address on screen.',
  },
  {
    id: 'ethSignTransaction',
    title: 'EVM Transaction Signature',
    description: 'Create an EIP-1559 signing request using the connected Ethereum account.',
  },
  {
    id: 'btcPsbt',
    title: 'BTC PSBT Signature',
    description:
      'Paste a PSBT hex payload and convert it into an animated QR code for offline signing.',
  },
];

const DEFAULT_SIGN_DATA =
  '02ea0101830128ed8301d1ac828a109402ba7fd1b0acdd0e4f8c6da7c4ba8fd7f963ba5085012a05f20080c0';
const KNOWN_ADDRESS_PRESETS: Record<string, string> = {
  "ETH|m/44'/60'/0'/0/0": '0x4cf1495a7786cEbE16b92671e8Ff98bc710B0A83',
  "ETH|m/44'/60'/0'/0/1": '0x9132831eb29B77603bfF4E8B57cfB1f861f50e3E',
  "ETH|m/44'/60'/0'/0/25": '0xd84ad17e72Ef5989Cc854c0a245a63A12044A2A2',
};

const missingXpubLog = new Set<string>();

const normalizeChain = (value?: string) => (value || '').toUpperCase();

const extractChildDerivePath = (fullPath?: string) => {
  if (!fullPath) {
    return 'm/0/0';
  }
  const segments = fullPath.split('/');
  if (segments.length <= 3) {
    return 'm/0/0';
  }
  const childSegments = segments.slice(-2).join('/');
  return `m/${childSegments}`;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginHorizontal: 6,
    marginVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  description: {
    marginTop: 12,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    marginHorizontal: 4,
    marginVertical: 4,
    backgroundColor: '#F8FAFF',
  },
  badgeSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 12,
    color: '#1F2937',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  input: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }),
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2563EB',
  },
  actionButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  spacer: {
    height: 8,
  },
  warning: {
    marginTop: 12,
    fontSize: 12,
    color: '#DC2626',
  },
});

export function AirGapRequestWorkbench({ device, onGenerated }: IRequestWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<RequestType>('getMultiAccounts');
  const [origin, setOrigin] = useState('AirGap ReactNative Demo');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [verifyAccountId, setVerifyAccountId] = useState<string | null>(null);
  const [verifyAddressValue, setVerifyAddressValue] = useState('');
  const [verifyChainId, setVerifyChainId] = useState('1');
  const [ethAccountId, setEthAccountId] = useState<string | null>(null);
  const [ethChainId, setEthChainId] = useState('1');
  const [ethSignData, setEthSignData] = useState(DEFAULT_SIGN_DATA);
  const [btcAccountId, setBtcAccountId] = useState<string | null>(null);
  const [psbtHex, setPsbtHex] = useState('');
  const [psbtAutofillMessage, setPsbtAutofillMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const previousVerifyAccountIdRef = useRef<string | null>(null);

  const ethAccounts = useMemo(
    () => device?.accounts.filter(account => normalizeChain(account.chain) === 'ETH') ?? [],
    [device]
  );

  const btcAccounts = useMemo(
    () => device?.accounts.filter(account => normalizeChain(account.chain) === 'BTC') ?? [],
    [device]
  );

  const accountMap = useMemo(() => {
    if (!device) return new Map<string, IConnectedDeviceAccount>();
    return new Map(device.accounts.map(account => [account.id, account]));
  }, [device]);

  useEffect(() => {
    if (!device) {
      setSelectedAccountIds([]);
      setVerifyAccountId(null);
      setEthAccountId(null);
      setBtcAccountId(null);
      setVerifyAddressValue('');
      setVerifyChainId('1');
      setEthChainId('1');
      setEthSignData(DEFAULT_SIGN_DATA);
      setPsbtHex('');
      setPsbtAutofillMessage(null);
      previousVerifyAccountIdRef.current = null;
      return;
    }
    const allIds = device.accounts.map(account => account.id);
    setSelectedAccountIds(allIds);
    const firstEth = ethAccounts[0];
    const firstBtc = btcAccounts[0];
    setVerifyAccountId(firstEth?.id ?? allIds[0] ?? null);
    setEthAccountId(firstEth?.id ?? null);
    setBtcAccountId(firstBtc?.id ?? null);
    setVerifyAddressValue('');
    setVerifyChainId('1');
    setEthChainId('1');
    previousVerifyAccountIdRef.current = null;
  }, [device, ethAccounts, btcAccounts]);

  const sdk = useMemo(() => getAirGapSdk(), []);

  const deriveDefaultAddress = useCallback(
    (account?: IConnectedDeviceAccount) => {
      if (!account) {
        return '';
      }
      if (account.address) {
        return account.address;
      }
      if (normalizeChain(account.chain) === 'ETH') {
        if (account.extendedPublicKey) {
          try {
            const derivePath = extractChildDerivePath(account.path);
            return sdk.eth.generateAddressFromXpub({
              xpub: account.extendedPublicKey,
              derivePath,
            });
          } catch (error) {
            const logKey = `${account.id}|${account.path || 'unknown'}`;
            if (!missingXpubLog.has(logKey)) {
              missingXpubLog.add(logKey);
            }
          }
        }
        const derivedFromPublicKey = deriveEvmAddressFromPublicKey(account.publicKey);
        if (derivedFromPublicKey) {
          return derivedFromPublicKey;
        }
      }
      const fallbackKey = `${normalizeChain(account.chain)}|${account.path ?? ''}`;
      if (fallbackKey in KNOWN_ADDRESS_PRESETS) {
        return KNOWN_ADDRESS_PRESETS[fallbackKey];
      }
      const logKey = `${account.id}|${account.path || 'unknown'}`;
      if (!missingXpubLog.has(logKey)) {
        missingXpubLog.add(logKey);
      }
      return '';
    },
    [sdk]
  );

  useEffect(() => {
    if (!verifyAccountId) {
      previousVerifyAccountIdRef.current = null;
      return;
    }
    const account = accountMap.get(verifyAccountId);
    const defaultAddress = deriveDefaultAddress(account);
    const accountChanged = previousVerifyAccountIdRef.current !== verifyAccountId;
    if (defaultAddress && (verifyAddressValue.trim().length === 0 || accountChanged)) {
      setVerifyAddressValue(defaultAddress);
    }
    previousVerifyAccountIdRef.current = verifyAccountId;
  }, [verifyAccountId, accountMap, deriveDefaultAddress, verifyAddressValue]);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (!device) {
      return;
    }
    if (!btcAccounts.length) {
      setPsbtHex('');
      setPsbtAutofillMessage(
        'Scan a BTC account export on the hardware wallet to auto-generate the PSBT.'
      );
      return;
    }
    const targetAccount =
      btcAccounts.find(account => account.id === btcAccountId) ?? btcAccounts[0];
    if (!targetAccount?.path) {
      setPsbtHex('');
      setPsbtAutofillMessage('The selected BTC account does not include a derivation path.');
      return;
    }
    if (!targetAccount.extendedPublicKey) {
      setPsbtHex('');
      setPsbtAutofillMessage(
        'The BTC account export does not include an extended public key. Please re-export using a QR that provides xpub information.'
      );
      return;
    }
    if (!device.xfp) {
      setPsbtHex('');
      setPsbtAutofillMessage(
        'Master fingerprint is required to build a PSBT. Re-scan the account export from the hardware wallet.'
      );
      return;
    }
    try {
      const psbt = createDemoPsbtHex({
        accountPath: targetAccount.path,
        accountXpub: targetAccount.extendedPublicKey,
        masterFingerprintHex: device.xfp,
      });
      setPsbtHex(psbt);
      setPsbtAutofillMessage(
        'This PSBT is auto-generated from the selected BTC account for demo purposes. Replace it with a real PSBT before broadcasting on mainnet.'
      );
    } catch (error) {
      setPsbtHex('');
      setPsbtAutofillMessage(
        error instanceof Error ? error.message : 'Failed to auto-generate PSBT.'
      );
    }
  }, [btcAccountId, btcAccounts, device]);

  const resetForms = () => {
    setOrigin('AirGap ReactNative Demo');
    if (device) {
      const allIds = device.accounts.map(account => account.id);
      setSelectedAccountIds(allIds);
      const firstEth = ethAccounts[0];
      setVerifyAccountId(firstEth?.id ?? allIds[0] ?? null);
      setEthAccountId(firstEth?.id ?? null);
      const firstBtc = btcAccounts[0];
      setBtcAccountId(firstBtc?.id ?? null);
    } else {
      setSelectedAccountIds([]);
      setVerifyAccountId(null);
      setEthAccountId(null);
      setBtcAccountId(null);
    }
    setVerifyAddressValue('');
    setVerifyChainId('1');
    setEthChainId('1');
    setEthSignData(DEFAULT_SIGN_DATA);
    setPsbtHex('');
    setPsbtAutofillMessage(null);
    setLastError(null);
    previousVerifyAccountIdRef.current = null;
  };

  const handleGenerate = () => {
    try {
      if (!device && activeTab !== 'btcPsbt') {
        throw new Error('Please connect the hardware wallet in the previous step first.');
      }
      setLastError(null);
      const trimmedOrigin = origin.trim() || 'AirGap ReactNative Demo';

      if (activeTab === 'getMultiAccounts') {
        if (!device) {
          throw new Error('Please connect the hardware wallet first.');
        }
        const selectedAccounts = selectedAccountIds
          .map(id => accountMap.get(id))
          .filter((account): account is IConnectedDeviceAccount => !!account && !!account.path);
        if (!selectedAccounts.length) {
          throw new Error('Select at least one account path.');
        }
        const grouped = new Map<string, Set<string>>();
        selectedAccounts.forEach(account => {
          const chain = normalizeChain(account.chain) || 'UNKNOWN';
          if (!grouped.has(chain)) {
            grouped.set(chain, new Set());
          }
          if (account.path) {
            grouped.get(chain)?.add(account.path);
          }
        });
        const params = Array.from(grouped.entries()).map(([chain, paths]) => ({
          chain,
          paths: Array.from(paths),
        }));
        const request = new OneKeyRequestDeviceQR({
          requestId: uuidv4(),
          xfp: device.xfp || selectedAccounts[0].xfp || '',
          deviceId: device.deviceId || '',
          origin: trimmedOrigin,
          method: 'getMultiAccounts',
          params,
        });
        const ur = request.toUR();
        onGenerated({
          requestType: activeTab,
          description: 'Request hardware wallet to export the latest accounts',
          summary: {
            device: device.name,
            accountCount: selectedAccounts.length,
            chainCount: params.length,
          },
          ur,
          urJson: airGapUrUtils.urToJson({ ur }),
        });
        return;
      }

      if (activeTab === 'verifyAddress') {
        if (!device) {
          throw new Error('Please connect the hardware wallet first.');
        }
        if (!verifyAccountId) {
          throw new Error('Select an account to verify.');
        }
        const account = accountMap.get(verifyAccountId);
        if (!account?.path) {
          throw new Error('The selected account is missing a derivation path.');
        }
        let addressToVerify = verifyAddressValue.trim();
        if (!addressToVerify) {
          const fallbackAddress = deriveDefaultAddress(account);
          if (fallbackAddress) {
            addressToVerify = fallbackAddress;
            setVerifyAddressValue(fallbackAddress);
          }
        }
        const chain = (account.chain || 'ETH').toUpperCase();
        const request = new OneKeyRequestDeviceQR({
          requestId: uuidv4(),
          xfp: device.xfp || account.xfp || '',
          origin: trimmedOrigin,
          method: 'verifyAddress',
          params: [
            {
              chain,
              path: account.path,
              address: addressToVerify,
              chainId: verifyChainId.trim() || '1',
            },
          ],
        });
        const ur = request.toUR();
        onGenerated({
          requestType: activeTab,
          description: 'Ask the hardware wallet to verify the specified address',
          summary: {
            device: device.name,
            chain,
            path: account.path,
            address: addressToVerify || 'Hardware derived',
          },
          ur,
          urJson: airGapUrUtils.urToJson({ ur }),
        });
        return;
      }

      if (activeTab === 'ethSignTransaction') {
        if (!device) {
          throw new Error('Please connect the hardware wallet first.');
        }
        if (!ethAccountId) {
          throw new Error('Select an Ethereum account for signing.');
        }
        const account = accountMap.get(ethAccountId);
        if (!account?.path) {
          throw new Error('The selected account is missing a derivation path.');
        }
        const signHex = ethSignData.trim().replace(/^0x/i, '');
        if (!signHex) {
          throw new Error('Provide the transaction payload in hex.');
        }
        const chainIdNumber = Number(ethChainId || '1');
        if (Number.isNaN(chainIdNumber)) {
          throw new Error('ChainId must be a valid number.');
        }
        const ur = sdk.eth.generateSignRequest({
          requestId: uuidv4(),
          signData: signHex,
          dataType: EAirGapDataTypeEvm.typedTransaction,
          path: account.path,
          xfp: device.xfp || account.xfp || '',
          chainId: chainIdNumber,
          origin: trimmedOrigin,
        });
        onGenerated({
          requestType: activeTab,
          description: 'Request an EIP-1559 transaction signature',
          summary: {
            device: device.name,
            path: account.path,
            chainId: chainIdNumber,
          },
          ur,
          urJson: airGapUrUtils.urToJson({ ur }),
        });
        return;
      }

      // btcPsbt
      const cleanedPsbtHex = psbtHex.trim().replace(/\s+/g, '');
      if (!cleanedPsbtHex) {
        throw new Error('Provide the PSBT hex payload to sign.');
      }
      const buffer = Buffer.from(cleanedPsbtHex, 'hex');
      const ur = sdk.btc.generatePSBT(buffer);
      onGenerated({
        requestType: activeTab,
        description: 'Export a BTC PSBT signing request',
        summary: {
          byteLength: buffer.length,
        },
        ur,
        urJson: airGapUrUtils.urToJson({ ur }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to build QR code.';
      setLastError(message);
      Alert.alert('Generation Failed', message);
    }
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>No hardware wallet connected yet</Text>
        <Text style={styles.helperText}>
          Scan the account export QR code from the hardware wallet first and we will reuse that
          information automatically.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {requestTabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                setLastError(null);
              }}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.description}>
        {requestTabs.find(item => item.id === activeTab)?.description}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Origin</Text>
        <TextInput
          value={origin}
          onChangeText={setOrigin}
          style={styles.input}
          placeholder="Label shown on the hardware wallet"
        />
      </View>

      {activeTab === 'getMultiAccounts' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select the account paths to include (tap to toggle)
          </Text>
          <Text style={styles.helperText}>
            {device.accounts.length} account records imported from the hardware wallet. Choose the
            chains and paths you wish to sync.
          </Text>
          <View style={styles.badgeContainer}>
            {device.accounts.map((account, index) => {
              const selected = selectedAccountIds.includes(account.id);
              return (
                <Pressable
                  key={account.id}
                  onPress={() => toggleAccount(account.id)}
                  style={[styles.badge, selected && styles.badgeSelected]}
                >
                  <Text style={styles.badgeText}>
                    {(account.chain || 'UNKNOWN').toUpperCase()} -{' '}
                    {account.path || 'Path unavailable'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {activeTab === 'verifyAddress' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select an account path to verify (currently EVM only)
          </Text>
          {ethAccounts.length ? (
            <View style={styles.badgeContainer}>
              {ethAccounts.map(account => {
                const selected = verifyAccountId === account.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setVerifyAccountId(account.id)}
                    style={[styles.badge, selected && styles.badgeSelected]}
                  >
                    <Text style={styles.badgeText}>
                      {(account.chain || 'UNKNOWN').toUpperCase()} -{' '}
                      {account.path || 'Path unavailable'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperText}>
              No EVM accounts found. Export an ETH path from the hardware wallet and reconnect.
            </Text>
          )}
          <Text style={[styles.helperText, { marginTop: 4 }]}>
            Tip: The hardware wallet will show the address after scanning. Auto-fill works when the
            export includes an extended public key (xpub); otherwise you can leave this field empty
            or paste the address you expect to see.
          </Text>
          <View>
            <Text style={styles.label}>Address to verify</Text>
            <TextInput
              value={verifyAddressValue}
              onChangeText={setVerifyAddressValue}
              style={styles.input}
              autoCapitalize="none"
              placeholder="Auto-filled or paste the address you want to confirm"
            />
          </View>
          <View>
            <Text style={styles.label}>ChainId</Text>
            <TextInput
              value={verifyChainId}
              onChangeText={setVerifyChainId}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
        </View>
      ) : null}

      {activeTab === 'ethSignTransaction' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select the Ethereum account used for signing</Text>
          {ethAccounts.length ? (
            <View style={styles.badgeContainer}>
              {ethAccounts.map(account => {
                const selected = ethAccountId === account.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setEthAccountId(account.id)}
                    style={[styles.badge, selected && styles.badgeSelected]}
                  >
                    <Text style={styles.badgeText}>{account.path || 'Path unavailable'}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperText}>
              No Ethereum accounts detected. Export one from the hardware wallet and reconnect.
            </Text>
          )}
          <View>
            <Text style={styles.label}>ChainId</Text>
            <TextInput
              value={ethChainId}
              onChangeText={setEthChainId}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
          <View>
            <Text style={styles.label}>Transaction payload (hex)</Text>
            <TextInput
              value={ethSignData}
              onChangeText={setEthSignData}
              style={[styles.input, styles.textArea]}
              multiline
              autoCapitalize="characters"
            />
          </View>
        </View>
      ) : null}

      {activeTab === 'btcPsbt' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select a BTC account for PSBT signing</Text>
          {btcAccounts.length ? (
            <View style={styles.badgeContainer}>
              {btcAccounts.map(account => {
                const selected = btcAccountId === account.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setBtcAccountId(account.id)}
                    style={[styles.badge, selected && styles.badgeSelected]}
                  >
                    <Text style={styles.badgeText}>
                      {(account.chain || 'BTC').toUpperCase()} -{' '}
                      {account.path || 'Path unavailable'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperText}>
              No BTC accounts detected. Export a BTC QR from the hardware wallet and reconnect.
            </Text>
          )}
          <Text style={styles.sectionTitle}>PSBT Hex</Text>
          <Text style={styles.helperText}>
            Paste the PSBT hex payload and we will convert it into an animated QR code for the
            hardware wallet.
          </Text>
          {psbtAutofillMessage ? (
            <Text style={[styles.helperText, { marginTop: 4 }]}>{psbtAutofillMessage}</Text>
          ) : null}
          <TextInput
            value={psbtHex}
            onChangeText={setPsbtHex}
            style={[styles.input, styles.textArea]}
            multiline
            autoCapitalize="characters"
          />
        </View>
      ) : null}

      {lastError ? <Text style={styles.warning}>{lastError}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={resetForms}
          style={[styles.actionButton, { backgroundColor: '#4B5563' }]}
        >
          <Text style={styles.actionButtonText}>Reset form</Text>
        </Pressable>
        <Pressable onPress={handleGenerate} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Generate QR code</Text>
        </Pressable>
      </View>
    </View>
  );
}
