import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语1',
  passphrase: '12345',
  passphraseState: 'mwfiTkMnz8ed9txm7yybKCqRr4bndeTohm',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8md26srhz4kjqlep8kwwnvf4gccjvje74t0s4t7zqjq6q7sa390h3p20hvn9c2jjms0qswze8nq0x83752rpj98099sd30sqn',
        '1': 'addr1qxvxehva5mdta4gej9nkdk9psajzzy5jslkfnus3mpmhwr2verg0m3nhy8ymfcqvurx7ztv7kr83qrqq262khg70qxgsf4zftc',
        '25': 'addr1q82d2yvzjljpvsx07m6056yfhlld638m9yzgwe5rj2fwl0a9r7gznx4j2tr7nav2x7ms6fhf74t6h37eula4klju0z7sfshjt6',
        '2147483646':
          'addr1q8m8ycnjcqn5ds5gaehlxsxny4jvelsxcv4nrjj92z02jkasmdq5kj8u0g33qwh5cjutymu3kp49tqnpur7v4dqdfkds5sg9vp',
        '2147483647':
          'addr1q8shc25qzjc9rmaftrvssgpwerv9yz6p6fmqf8g0dpmpgjclcqg0hagpqexw647t5yxy2levvtmppdrt0rx322htwdxseazz8w',
      },
    },

    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '6T7X4L2JCJQAKROMAOUODI6MH6QAAMPX6ETOL3N5MROCV27N4PUCAGBSLQ',
        '1': 'BJHWEUVESBPPVRNZNV74OJ452QRPFSBHLF6EFJHNOL2PVBJHZMOAEC3YG4',
        '25': 'ZFFZ3TVNTWIEJWF4MHO234VLZMWISPKMSOEESVC5LPED5T7XVENXSE5EOY',
        '2147483646': '5OYAEUS5RXSIEUXJMSA4AFJQBNXSJ5J2QRNHRBRHS3X62443NZSP7ERN3Y',
        '2147483647': '45D64GZXCP4N6L222ZEJXNKMFOOZ3MQGDU3WJ5R6DYIK6DMFRR4U7B7CQQ',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x819a77ce04dbb1924fea37294214391a9d9f7759e35d3a034ac365e7be645e1c',
        '1': '0xd0f037592346c3ceca474edaab6a6b09b3e13dce5fc105d6dd2afdedecbc1eee',
        '25': '0x93f4a274c69821461ca88f22b6c527304c1857398ff7868e4b3af3f9541678bf',
        '2147483646': '0xfc21a6b1d570a4faae71f4106323206daaa9b82c75ad780e64d28160b98f766b',
        '2147483647': '0x571c69e8293ef20efe701bc7b99ac127e6d581dbd17620f8acdebf779f2798d1',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1KvdWRia4GCG6mxBrUrg79Q7zdTBKH8o67',
        '1': '18m9Ke1Xb9fEyKwJJD4c4oLzfdznkbHcCN',
        '25': '1JJXccjfoAasbqSKTjK3abW488eiY7yvxZ',
        '2147483646': '1NAEjXTZyk5u7wh6MRQPtshhdvzYuXwFRo',
        '2147483647': '157rUMRu5LJ2Pox8mFt2uMr8r4JNAZHriL',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '37RpdnzsZY7GEqYoGNTkNSKYJ8eu2oLo8p',
        '1': '3ExvGMkKD6jWu8xw2Cwt9af4DoUW9fDkA5',
        '25': '3Cx2XVQ9MW64xjXNxdTKPSa8Dm5nZMbyyT',
        '2147483646': '391hwUHishADhKso6KrhcbHnxo79Ty8j3S',
        '2147483647': '32eLtwAYPqYNNgnZWuYw8wJP4qgRxFXV4K',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q3gw5x8vh3y7e4zx7kd38kug5te5slw9ssjhkwj',
        '1': 'bc1qvf0jfsz8v96rl5zyqmaqjj3f0pfuf6taywgnjw',
        '25': 'bc1qwqxpwwyf63kuq6zvfpt9vmw92sl3hl4eaf778g',
        '2147483646': 'bc1qml7lfj7m9s2dhz787at6m7pd887rrt79mmm6xq',
        '2147483647': 'bc1qxjjayvegznd5v9dunlnlxqjrhtc62jzpvrdxn7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1psyekgpzq6v9082vv0hznnjlejt2vq0aqkk0c7cdfmsmu5x66wxvsdsxlq9',
        '1': 'bc1p7c5wsxnzh3000egpxac2q85plk5d2jhdquymhx30fts9sfrjknrq8dj955',
        '25': 'bc1pxr4csmgvgvvceueju6h2uuuwph63s3zl4f4jzp0dsns0j7r2gxasv2rx6z',
        '2147483646': 'bc1pjsg4xtn5dn60va6x5k8fwjcyjcr8czfqvsknlv6dal4rqskvthps7yw8kl',
        '2147483647': 'bc1pmwdg8xh9s8acdqgqxa8mz2jv32kr2qhmjf6r5gvw3ag7r004897q5pu643',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        '0': 'D9L8CRsxt6tZfNw82zF2Gm2ecnrH5btSrj',
        '1': 'DTgX4AuXMhsbNL41ekjRrbfhkwfwxVZkr8',
        '25': 'DLwcjVxHr3ZnEL2J49pq2YR57YJy5q3Yxp',
        '2147483646': 'DAWuBL5D2junkq15hzdnPV3SwMmDsxEJCD',
        '2147483647': 'DK5UJFsvhM8UCsuownwKugin2zTZUqVsJM',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        '0': 'bitcoincash:qrqa8344fgnkx3h4z0pxm69fy3y72d4acgukq2sd0q',
        '1': 'bitcoincash:qp0kvh0rd3f8sean5psnmf7j8j6qah4v5vh7e4fpdh',
        '25': 'bitcoincash:qp98cql6rplh23jpc9rt8pycllq626ky9vk9ug3x87',
        '2147483646': 'bitcoincash:qq4j0fnwfp0y9epalwl4vgl9q63lpm0hd52cyy23xj',
        '2147483647': 'bitcoincash:qqnhpt5v378z5nqcgs0x9f0z9yja3qvpmvsr3ac4j0',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'LhqX1J8pv2NA9Tn9Ft7okNhCEen1DFfQve',
        '1': 'LSTKLw5PRRL7jSGHxdpXihhGWy5iQs8BHx',
        '25': 'Ld6daWUZwSfybKp3vEriW8GwyeJ6ovQHXV',
        '2147483646': 'LbhkU3eHE3LfpeBRYEbaRHxnUi9WYm1kij',
        '2147483647': 'Lfx1gUNfrdUYQjRazx2k7tLz5rd1vafxMN',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'MSQ6Ygp2g8woutJz2imEYoCu8BGAReeqzS',
        '1': 'MCn4ouNgmf3npJ84fGxr3fRXedojRFBPJN',
        '25': 'M9g2ZXU9mbvFAKmYgVkWZHZk5VVpCtrP2u',
        '2147483646': 'MDvnjAttZuPJGrDjfaAbvMZCG3xSqzUk6D',
        '2147483647': 'MMouGec1QHU2ebnMB6Rdh29jExTRyh2sg4',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'ltc1qzqgl4kj7pen8azn4q9a3rlxr55ahuhkr2g5tc9',
        '1': 'ltc1qx003vk3qmuucaheu2xv5s0ev4qlknflu3mxfvz',
        '25': 'ltc1qqp2m40jkwmwsg6d3wd8atrnxu2ph5any6y8jpu',
        '2147483646': 'ltc1qj6naeufy0kmel86jrh4vsvmff4neqm5vf7yzw0',
        '2147483647': 'ltc1qly7nc5sr5k30hz2xjdct6fm574s5t6eggs8c22',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        '0': 'NaBPMp4KwqgcowsqRfu3KHWQYPxYZict6b',
        '1': 'NfkKzCMAhjJURakhrfMQQFsbcg6hEc4Hc7',
        '25': 'NYuBZPH9mrbz77M2ckiVG3vx2XGTCDBfHo',
        '2147483646': 'NWr8QRJBGWRDK5QLj5iyKW3PvBcnjoY4Cf',
        '2147483647': 'NW39jdHTRbSv5ZnGqshv4GwRcuTLoo9Ntj',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aajdw67ej3ng7202wpgenbn7m5tkegw8juakz5c5y9',
        '1': 'cfx:aar79yz1ez9s5m63vjf3ns7hxnyafnk78jw7f54ppk',
        '25': 'cfx:aakumm7ydbph0yd2d4e95km9hy73357jgeu2t4ah2v',
        '2147483646': 'cfx:aasv7128a3ux0zye8hjadfe3hsz5x45caj6gc70xew',
        '2147483647': 'cfx:aam1ak63g794fpurf0k968w5eknevthy0jwksht54v',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1jj2mkftu80lrg5ehgnr4qlghptg66c52nsq3a7',
        '1': 'cosmos1ecfr23afz9p2wu34tnnh45ev2y854q6tjzsjmd',
        '25': 'cosmos1dnamp9p8ufqwtfl36dapxt2zl3sr38g95j54jz',
        '2147483646': 'cosmos1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpj52zgn2',
        '2147483647': 'cosmos1x95uy3pqe5pljmcva53r5gfmheadsuyady2ulm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1jj2mkftu80lrg5ehgnr4qlghptg66c527tdkyy',
        '1': 'akash1ecfr23afz9p2wu34tnnh45ev2y854q6tlea4zh',
        '25': 'akash1dnamp9p8ufqwtfl36dapxt2zl3sr38g9efejtc',
        '2147483646': 'akash1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpje3002s',
        '2147483647': 'akash1x95uy3pqe5pljmcva53r5gfmheadsuyaql8mxp',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1jj2mkftu80lrg5ehgnr4qlghptg66c52ttggp0',
        '1': 'cro1ecfr23afz9p2wu34tnnh45ev2y854q6t2ect8u',
        '25': 'cro1dnamp9p8ufqwtfl36dapxt2zl3sr38g9vfuvwn',
        '2147483646': 'cro1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpjv3230m',
        '2147483647': 'cro1x95uy3pqe5pljmcva53r5gfmheadsuya4lz9r2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1jj2mkftu80lrg5ehgnr4qlghptg66c52qdf4lf',
        '1': 'fetch1ecfr23afz9p2wu34tnnh45ev2y854q6tpleke6',
        '25': 'fetch1dnamp9p8ufqwtfl36dapxt2zl3sr38g980a3s4',
        '2147483646': 'fetch1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpj8htv3a',
        '2147483647': 'fetch1x95uy3pqe5pljmcva53r5gfmheadsuya7ercav',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1jj2mkftu80lrg5ehgnr4qlghptg66c52mtnptv',
        '1': 'osmo1ecfr23afz9p2wu34tnnh45ev2y854q6t6erzdl',
        '25': 'osmo1dnamp9p8ufqwtfl36dapxt2zl3sr38g9uf89ys',
        '2147483646': 'osmo1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpju33c9c',
        '2147483647': 'osmo1x95uy3pqe5pljmcva53r5gfmheadsuya9levff',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1jj2mkftu80lrg5ehgnr4qlghptg66c529zr26z',
        '1': 'juno1ecfr23afz9p2wu34tnnh45ev2y854q6tysnfu3',
        '25': 'juno1dnamp9p8ufqwtfl36dapxt2zl3sr38g9zqhw47',
        '2147483646': 'juno1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpjzcpn5k',
        '2147483647': 'juno1x95uy3pqe5pljmcva53r5gfmheadsuyamkf8c8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1jj2mkftu80lrg5ehgnr4qlghptg66c524563l7',
        '1': 'terra1ecfr23afz9p2wu34tnnh45ev2y854q6t5x2jed',
        '25': 'terra1dnamp9p8ufqwtfl36dapxt2zl3sr38g9jkw4sz',
        '2147483646': 'terra1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpjjwcg32',
        '2147483647': 'terra1x95uy3pqe5pljmcva53r5gfmheadsuyatqsuam',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1jj2mkftu80lrg5ehgnr4qlghptg66c52345cqz',
        '1': 'secret1ecfr23afz9p2wu34tnnh45ev2y854q6ts8ymx3',
        '25': 'secret1dnamp9p8ufqwtfl36dapxt2zl3sr38g9khqu07',
        '2147483646': 'secret1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpjk0kpwk',
        '2147483647': 'secret1x95uy3pqe5pljmcva53r5gfmheadsuya0p74z8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1jj2mkftu80lrg5ehgnr4qlghptg66c52z63p8n',
        '1': 'celestia1ecfr23afz9p2wu34tnnh45ev2y854q6trgpzpq',
        '25': 'celestia1dnamp9p8ufqwtfl36dapxt2zl3sr38g99c99g0',
        '2147483646': 'celestia1j2aatdujs6yqkw8cv2xsd6x6c0xl0vpj9qncf8',
        '2147483647': 'celestia1x95uy3pqe5pljmcva53r5gfmheadsuyauwmv9k',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwnqvKixdgW9q93ACb6cu8fCuQWYXtQ7NFkjujZof2yt3nGsScX6eeA9QSAynhshnNgdmsCW2NgwSWMNj2TEjteH2muFi7SeB',
        '1': 'Xwo4cvCfGyWKQ4wdXL9hcd8daCx82SexEh86Z8EsncmhiXwEamyqFd6J8Vh2jAWdDw5v7R51AaoWsbYc9ho9uWAs2YyH2L5Wc',
        '25': 'XwnR5yebkTrjC1WKuk69VchB2CiNVYDmjR2EbHgMN9EtMYNmQT83MekPNtg1vBsksfXwFxMgwAVgCPX7XTayMxxT192CzaQvV',
        '2147483646':
          'Xwmn82KfF8VAk3ENnxnvcs4Y8p2D4sPXbNpE1aawQyMtJPKFd8PZD9hiHRDantLtZsjaw9oUDXkF3BVKJSz3ao9A2sjsWpwo6',
        '2147483647':
          'Xwn594BhJRe1BCZ9MvSjjGVatyFpjD3myaHc6DHMJo6FZmBsPsRRAA2axqjHqEmFDZHmcRScch4PvEiv29JhyPLQ264w3BQ5Q',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x52Bb574655391398b1CA8753514559Ce52b54728',
        '1': '0xD63F9b9AF6f260Ee2Eb18bdd8Cc03839d0E588C2',
        '25': '0x03eF7b6aE9216cB3824f871De81F95B9D918eFE9',
        '2147483646': '0x2131987322E4fbb7B65467B3E99B3e04f8cCD01a',
        '2147483647': '0x6f6daEedf6F02FeFaf465a0b643941e263Db770D',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x1A0d128e259335726bBA36999b9262B6e73AA76d',
        '1': '0xa533197bca753F874aECa898aF687899c2D3A287',
        '25': '0x45495517061eA1DaD8DF4295bbb31F48327dEF97',
        '2147483646': '0x002c9A9eE5c1eb4A8843B922aD025E9c287450Dd',
        '2147483647': '0xd738B85d1a5769A90B98c5c1dB0092164B271E70',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x1A0d128e259335726bBA36999b9262B6e73AA76d',
        '1': '0x16cd94d0EB9fC21e53BbfD3a5965A8FC20DBAa2F',
        '25': '0xd4235Ce2Ae4dC7151AcC9C1259fB0cf94dF48103',
        '2147483646': '0x5Bf091E554aD9889F12415c92d414bf5110cF9D4',
        '2147483647': '0x16F2ec7B238b798c78eF64C876a4d7A02da83c7b',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1gn5qm5rumeom6bcotlvdncandvvpwb4x753wweq',
        '1': 'f1bkyankwglw7cjpq63mpt6h7inge3dkshq5bmfla',
        '25': 'f1se6ex6izxfrtxyesdwnppfvz5l2m7cbvf5qvpjq',
        '2147483646': 'f17aaavvjx5fcboleu4r77b2foozkhde47tbl4ofq',
        '2147483647': 'f1twf3fjruem4jvwrxawmn66cw5npjkuxgekchn6q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qr9c034atcxe44d8uaahr0vpn4uq7evkdklkw2u7ndvp5wl56y08ufhr7fdyq',
        '1': 'kaspa:qzmssess9em97k0reu89rxqsj03wqwcd5gzkzdhw4c5ul7dgw9u9759xxqyvp',
        '25': 'kaspa:qzvtmgyxazan9ukxcpa0ytypylq4qcc2uz6cw6jv94elp0ffuenak0mgtsyy4',
        '2147483646': 'kaspa:qpvh9nsa0354tk96hpt4k5vzqrtne4tshtrrzm3nrg6g6jlp42y0kzh78vju5',
        '2147483647': 'kaspa:qzcf40cnsjl7gjuqppf5sg3x7ndg4nus7p2ctutdgy8z2qntnramjn2hegtqu',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '0510cd6a25885d3b92ca68c3c65ba0867e26ddf645edb135af4f216135ecc394',
        '1': '8eec8fba2194b611e90d40eb7a88378c453042b42c9494cb621c84a66670b03d',
        '25': '6329ebaf44a443db7b86b7aa91d7ed034f09e1a1c8faa8d1745fde97a739170f',
        '2147483646': '2974397d62ab951610b57aa9ce63771677acd05606c67ec2708f44e2669dd872',
        '2147483647': '969c4dfe5c5337c25639e3fe2fd33171a9f250621a01833537863e24c8c58bc5',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyq0hqs9sn7tpazq8c6rtty0us945f7vfazstjnfcq',
        '1': 'ckb1qyqt7wvzcn220f5k8qzv3snm24tmrxhes52qwts6km',
        '25': 'ckb1qyqtcexuc27dy8rhuyky9fe5gr97yxw0e6yqdmemgc',
        '2147483646': 'ckb1qyqqmyz45mr9nvhwqce5nvrc9w4ljekaay8sxvekmv',
        '2147483647': 'ckb1qyqdrfwly4vn3jqfly2xzp42etrh89tx0tfq5cqsax',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDX6EZNIQ36RYPTT3NYPTA7FICZTVUSSGRAW23ME',
        '1': 'NBAP5SJPRC6IAMGZJWT2Y6YR7ETURTR3UT4IY45X',
        '25': 'NBOJ624HSGHJAEIGTNKNQ5FXHFXCI63YYZ7QQ2YJ',
        '2147483646': 'NAAIZN4LII4I6ZS3V7W3QLQBD7BMAIO2G3ATKT5M',
        '2147483647': 'NDO3SCFNC64I27AZCMKGUIYB4U24V4SQZM26MLMW',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5pmldr4u66xyvzt76q5jmlja63eup35dhn5yq234m',
        '1': 'nexa:nqtsq5g55daex66ygzj3t6h7xl9uqvnnmxzuhzvfsrph2jxs',
        '25': 'nexa:nqtsq5g5e0scfvz4uqthmh8u95rsc579d4chklm2cvc75wat',
        '2147483646': 'nexa:nqtsq5g5f0v4a3nzrya7u32k8pztkgmpv67k8fsyqlky37nq',
        '2147483647': 'nexa:nqtsq5g5yjlugdev0wzm2wqggxnz029hv62hz4xdwg6k3fet',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12UX1Vqh88tNkko8PAkLJuoxNmL5Lvs7WeCbecKS7YNR3Lwh',
        '1': '12Uv8sjjFVJznNaGtbboYYiSPtMg2BgMpVRQ1p5a6UatmUVn',
        '25': '14jHPtNBSAS99iPfm2QDkmVjVexvWw5eMGYXH3kgiUyEEdd3',
        '2147483646': '1kont9SdsTwv4s557G2UigxJoVfiqHxS9GsGu3nnkPs6tBY',
        '2147483647': '12BbN16Ko16wimKQbrf5W1XdkKEEmX9mj5FiiihxyUCfg8dP',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        '0': 'XQpJTYi3bG1Y3pSuq9TCR95cC3Ycr1iTLyFj2XwRpLrSzj4',
        '1': 'XRDRqSkAwgdZfbbRFzvS43ZdK59J6pxmCC46EJ5QkZLB6iT',
        '25': 'Zfagr5CMcomw1QzHgoLeGprj5gPnrEFHyKBMTyC2kwfeNgS',
        '2147483646': 'Wh75qrTZKqahMtPbmf9NE25YED8zkSZNr3XMKGJ72NJWT2X',
        '2147483647': 'X7texoLiTUaW4Lj8X4CPWrkyjwi3SJNfn2No8vUHkB75ncz',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        '0': 'E3qXUvVtidq4sc4CEWP4iLofjcfTJ89tXJrsyc33FZPc3dE',
        '1': 'E4EerpY254T6VPChfMrJMFHgreG8YwQCNXfFBNB2BmsKrxB',
        '25': 'GJbusSzCkBbTqCba6AGWa2andFWdJLgj9enWR3HeCACoQ6h',
        '2147483646': 'DL8JsEFQTDQEBfztB25EXDobmnFqCYzp2P8WGLPiTaqfj62',
        '2147483647': 'DkuszB8ZarQ2t8LQvR8Fp4V3HWpstQp6xMyx5zZuBPeEp6g',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        '0': 'j4So8SCpb957w9qEMhW921ugo3XR19Wt9A66YrsNPzXVXWR71',
        '1': 'j4SoXZaidGRYZBT1WCvzVFYbH4eSbpmhPTwKME58XyTi1EGkJ',
        '25': 'j4V3tpbM5T6fhYnpu5MnuTmNaAR3rKX6fziSUVJoebU6Lhq1n',
        '2147483646': 'j4S5RDb8LeohWK9JJPSeiBiZnyZabXRJz5bApVA6kfjWyaBFG',
        '2147483647': 'j4SWCni5DowLW7qkdvC3mD1QUR5KAa7AoNX9fvykvrTKn9FoN',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-manta',
      params: {
        prefix: '77',
        network: 'manta',
      },
      expectedAddress: {
        '0': 'dfY2XpztDtgNbMkZbKsLXqwgCFrxs2nFscQnoVQYBxznNwEkd',
        '1': 'dfY2vxNnG22oDPNLjqJC15aagGyzTi357vG1brcJKwvzrfEK7',
        '25': 'dfaHJDPQiChvMkiA8hizRHoMyNkbiCnUQT38j7qySZwPC8aTv',
        '2147483646': 'dfXJpcPByQQxAX4dY1orE1kZCBu8TQggiXus57hGYeCopzfHk',
        '2147483647': 'dfXjcBW8rZYbAKm5sYZFH33PsdQs2TNYXpqqvZWvipvcda7gK',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rhVoS2BhBpaFpMdZz79hEAgfEr82Cux2t8',
        '1': 'rBRPEaSXfRt19pEhtHTqHJQLwdQSsrVKzt',
        '25': 'rDp5FLML1yaDq1i7eDmckQvx8oxuzX94Ed',
        '2147483646': 'rMH2i3e2fThdTVvEfBxztAfsestuP4ak2',
        '2147483647': 'r9HrzgZbaiSeVHvNfLmww8yYgXzYtv4MLB',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'ESffVecegLvTv5jjSaR1tcNAfFNe25Cu8rCq84tddd6n',
        '1': 'DAZ2mnCgecuDcmm8vJkvJXfeKzq7e2fvSs9ttcWfbvvy',
        '25': '7eB55bzYzGo5hCVqtLsXcj84i92rWFjGkvN4FNHVymt3',
        '2147483646': '2v5Megciim4z1HGMTzMMNsNjoHpfM7XFamaf4u7221JM',
        '2147483647': 'BumPh5i3qM8BZ5mxzajWFrRfy7XHUihsLNchMgmbEKya',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xb711bc37a10a54b9c0de2ff919131515',
        '1': '0x82df51430571ea9aacdd7cc916e2075e',
        '25': '0x66bd6d917a214bd4465d8adcd970b6a0',
        '2147483646': '0xfc03bed4b0ef02f687c616163c0b7eab',
        '2147483647': '0xbe6c43f08a89a831685e108215ba0d1c',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBWLIFWMUQKSRU3TSOEN5IRAZ5X7YZQWVS43FSELW7IPOXNE3HNHOJ5S',
        '1': 'GDDFXAWVFA26774P63AJ7JAYVVFNDUI4JMZZTQCRNKMJPAHELPHZ2QZD',
        '25': 'GBXOSIWEZPBW2TPNKM7R6OC2I2B5B3W3EHRQDR65A46NUBOM36W4DDAE',
        '2147483646': 'GAZYQSRGBARFUDE2TBDH5PKVFOJ5M3V4UMZP4JHVQ6LSWR5KDN2XPE6M',
        '2147483647': 'GAD5CFWDHBZKEBC3F2KGOVC64UQIGQIGV3XIMQPRAK7MJTFWBBYKOKCI',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xb67347342e588aada1208c24910f56af4dc0f7dc24e1233df0f56e89a9bd3ce5',
        '1': '0xda2e05368ca6cae78973349174f1889918fb52bee2f32b95b36ef4b7839cb33d',
        '25': '0xa4ff93cd58b534778554b904bc1260e25fe08cf3e39fd4f1d467512513c45cae',
        '2147483646': '0x9ff953238dd7a1e1ef914ae341c84d8976556ceaa4d95c7369f258535e01d1bf',
        '2147483647': '0x6ef3acc7363a8da2fa0a0dfc635fb3dc784ce14565c94d3354ea234e2fb5c321',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TVv1B9fRd4uo9SMQWpLgxBfYgGchXL9vZb',
        '1': 'TNXk3HhrJpeFvGxYmXQ1r8dbkHVg65eeuS',
        '25': 'TQY2nLxN81qyzrcsDFjFUW2K8HE9rxeJXZ',
        '2147483646': 'TVyd3j76zMKUmyrNT3Ss3vJbPAT2zssnJP',
        '2147483647': 'TBnXbdxn35DuECbDdr2uppdTYDHJLSGA3h',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCdd98e1e3b1d9e019c82374bc82bc6b5d653d0bcbb1eb1bfccd8d25ddd6f83a5db214',
        '1': 'BFC92f4902024981228033ed15b26cdc6930fcf319c14ad0e95edd25bfde0d172d70569',
        '25': 'BFC40c1e4c622c3356845bb9f2eee09aefb5261ebfc1e16fa7590cb1c1057b6582bcb41',
        '2147483646': 'BFCab460b81e58239d806fb671bc7700e7142b61c6500fccae190e8dc8174587dac197f',
        '2147483647': 'BFC5ff2b3a34047f48caad8962a5a1baf237953db19e4b6c6867fe6994c078d8443e735',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NTZSQ18GhKda559YxWmtBKxGicuP4YdX3w',
        '1': 'NajBZuGWYawdqeEQT5aLmrFnjPXsgpXYVX',
        '30': 'NXSgze4MYTn1bSAMw3AWstMFJipRj7qopB',
        '2147483646': 'NRjvPyPVLqCjF4UW9vSiWuVnxXP5n95vs8',
        '2147483647': 'NhDrEuRxsph7FzejcmtjexGZ6PFbU6GYdc',
      },
    },
  ],
} as AddressTestCaseData;
