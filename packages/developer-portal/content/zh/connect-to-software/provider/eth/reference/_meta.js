export default {
  index: '概述',
  '---Accounts': {
    type: 'separator',
    title: '账户'
  },
  'eth_requestAccounts': 'eth_requestAccounts',
  'eth_accounts': 'eth_accounts',
  'wallet_requestPermissions': 'wallet_requestPermissions',
  'wallet_getPermissions': 'wallet_getPermissions',
  '---Transactions': {
    type: 'separator',
    title: '交易'
  },
  'eth_sendTransaction': 'eth_sendTransaction',
  'eth_call': 'eth_call',
  'eth_estimateGas': 'eth_estimateGas',
  'eth_getTransactionByHash': 'eth_getTransactionByHash',
  'eth_getTransactionReceipt': 'eth_getTransactionReceipt',
  '---Signing': {
    type: 'separator',
    title: '签名'
  },
  'personal_sign': 'personal_sign',
  'eth_signTypedData_v4': 'eth_signTypedData_v4',
  '---Network': {
    type: 'separator',
    title: '网络'
  },
  'eth_chainId': 'eth_chainId',
  'wallet_switchEthereumChain': 'wallet_switchEthereumChain',
  'wallet_addEthereumChain': 'wallet_addEthereumChain',
  'wallet_watchAsset': 'wallet_watchAsset'
}
