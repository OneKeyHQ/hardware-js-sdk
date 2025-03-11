import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736557',
  passphrase: '',
  passphraseState: 'mv8SRcYZ8vcfWnx1KjtHeEYpiuXweaHm9y',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qy2ek3t3fwug4pjnz9y5w0p4hcghwwyv56z556kh94ymzckl0qsm8jqyuuuy9cztkrdsqducf45q4cff5lz80mxh84xqe7dnu5',
        '1': 'addr1qxy6z2a77zdnjn83k7akgl5a0czspm0ttllfze292xg7ezqj524nwga7nmstuv2w5lmj0xs9e2jw9g96jmrav3gqr2uq5pwnzr',
        '50': 'addr1q8v2zna5k65x2psgnq0kzqdsdt0yvcelsrvg00hveng84lv283k7cp0tmm0uefqmj4cftvz8w4mmk3pfxax9sakcn0usuxtcwq',
        '2147483646':
          'addr1qycvt5ymlmlmc3z7c8ezvvtzla37w57jj9mx9g9jk9m0ncxmdcqx74dxegyxcfse8fzflnpn0733h0083se5arg70afq3k626p',
        '2147483647':
          'addr1qxdmx2jz5fnkhhxtct6s9vmydpwpyvjng7ee79z9fxdvtgpcmhfgreemqtrvdduxchawzw7wm5prc6wv39tkx7x3d2ssqg3pmc',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'SIMDNNP4RRYYUSX5C6YGDCKJCENFMRYT4AG7B573YWVY2INSXYCOSBTSOY',
        '1': '36D5R4XB3FVD7S5HFSVZK5326D6OWFYKL2KSFGL6XOQX7SKKOJYMLZDHRY',
        '50': 'MBBFR6GVYQCBLPGLB7GCQ5AZEGEEZGDU23J3W6SZZTGGOSSGFZYRBWLGR4',
        '2147483646': 'C56AQU247HH336GPEK5R2EIXUD7UOIFSDYQHK6MRH5ZKGF6IL2GKU232YA',
        '2147483647': 'SNAO7EINTOZ36RIXAPWH6A2L5HIIAWE4GKKOUQB5ZAJEZUYAVBFER6NWRM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xd08a0eb4a2d0b05aa54964ec079550757518bd1830cfbcd36cee23cb46dc9912',
        '1': '0x38f529359f2b00d8500fc587419b84178e71a2e6eadd8b08b6fbc058ee60040f',
        '50': '0x7a16847d00ea048d0132e9c90b40e6a851850a83500cce7518b476c7d62d6273',
        '2147483646': '0xc3e7a9126e0c3ca46cae36c28053ef2463d19e216d420c12fc657226602cd9ad',
        '2147483647': '0x862763488e9358a417b08a530ba02c0b6c1d0531a0bdb68f21d4c49f98377751',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1UDNS8rLn8AoeGk8fGn994DLbeDpoyQbT',
        '1': '1EDPHobcao4VFthL5A3KqibfswGJ8QWrbX',
        '50': '1LNkYasSVCb25iskMBkFpAuzhw7Baz5vqu',
        '2147483646': '1mNFFUbC3SJDZHBZagR2cdZkQuGEFjD1J',
        '2147483647': '1GuKMy9wuqdoxR9LeEC4s1aaDUSk5TQDde',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3BzST7Grp5waBxh6h4XU9dwsXGbN6KEi7Q',
        '1': '36xR32gN1pLNGc62YuAffxTTVMXqv2r5dU',
        '50': '3HafPaVKUZHxWSoKMFH1DecfW8kcZMKeKN',
        '2147483646': '3CpoFVSkqiCQTVVzMjatppvD7zE2mpRCMT',
        '2147483647': '33ZCEpM5hERjcBNbjh5mZubow1jD4CiUHd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qmy2ea9p4ty8n95pfw0u72xm4qvg0xhmzn0hzts',
        '1': 'bc1q90zvjgyskhqx7tev4r0gufk2ne33nhpqsylxp4',
        '50': 'bc1qvdjkcmccm0lahadkajy3y7wfv00yh68nq257cm',
        '2147483646': 'bc1q0gxjdr9xfhwvggj5xxa7wp4u2lvm4twl0aa2jm',
        '2147483647': 'bc1qps5zuykc40x0aqwhzeg5ckw2avrnn09pty8r2e',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pg5qz70zeutk26rvskkvf7837dr4xmcj3m99jlwp8y59qy4ppkxvs9n33zs',
        '1': 'bc1pekmk4nl27krm5nvzwupzkauvulx2x7q2g6lghc29lc3jvnfgn0vqwmdta4',
        '50': 'bc1paeg8fjw4s83hvkwads0q2l5advlfk99pnp9kdhhz4jslm0dgkr5qdxwq02',
        '2147483646': 'bc1pqarpsdpveks7uttfhg4pgwrlwp53v9al9fkewuu98m6a78yakqaq2v9ahh',
        '2147483647': 'bc1ptcw99c79dfcl2ep2xq5an93auw8qnksktnl8g4wx7wg2x25ksjdqpc5z4d',
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
        '0': 'D8G3U5n1asHESj1ZtbZLVcwozZ5EWt6t42',
        '1': 'DGacpu5qtWZuHoHRxddgJP7mK6K8JkM99a',
        '50': 'DTLmyBxBrf8745yJNibbMtTuekZFuAdJMq',
        '2147483646': 'DHbztMwbnaGpk5BgyChBD6fSJwh87rV7NS',
        '2147483647': 'DLPGLmLQSKdmnU2cWXBF2PaEX66Zmf9tbP',
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
        '0': 'bitcoincash:qq8vrk53s7nwxuyue8pl83ceem3t68g3esmq8khy0n',
        '1': 'bitcoincash:qq0leuks28aqq0z84p85zuhg53c5aemz9q9vl83fee',
        '50': 'bitcoincash:qp6u65mkeuljqcnvk2uyphp3dtqkpmqjcy6am4nnfg',
        '2147483646': 'bitcoincash:qr696nlncueky6jvvhwe3x29zljdk4nzxsdr95usmy',
        '2147483647': 'bitcoincash:qzgfqpuz3kaav5qcstj3jy9tk9j4alw4cyjsjdctp9',
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
        '0': 'LccoYVwi7fh1bnme2YkksWRLK7stNmGn9P',
        '1': 'LhSjTU9nGEDgLqqubWSTWE47nf2shPu3hq',
        '50': 'LRh4dWCNvU9RMiANM4EV7nXmref6JjkHSK',
        '2147483646': 'LcMuR9dN87r31ymyVs8Fdx3RRnEwhz5QAf',
        '2147483647': 'LLpUKeZQYDsvZYmTjyWsRD49iW7b7JALcM',
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
        '0': 'MUHBMvscGLyjL3ATtL9vEkH7Ls5Ygcrtak',
        '1': 'M9jUUvzobFFJUo65Fw12N3oqpFoTGszqre',
        '50': 'MGNs1y8SUFXmDP4Q7g2BqVoirPKEFPnomu',
        '2147483646': 'MR6yWq1EJtbSb7pMc3XmmqN9P6zrcuoCSm',
        '2147483647': 'M84LzespviqjVzfJtWDkneZzMQhSNoBRf7',
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
        '0': 'ltc1qr0dws66h4k08fs2atk8mkh40gvj54uzuy0fv22',
        '1': 'ltc1qlpkfsy437su9uj52qhs83elrctzpxxuzjmcmhy',
        '50': 'ltc1qz9xe3s4te4papnw3tm6eq9npflwc4yzngr8zvq',
        '2147483646': 'ltc1q3cdg6msyvzvp3e6x08skl0ehwg3cgczey4uths',
        '2147483647': 'ltc1qrdrmenlj6fhj666zc7x7ugzuzvnmt4cenhra4a',
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
        '0': 'NQF62hGiPCBYaFoNH1AHKQahUiNiPTb6wN',
        '1': 'NaVRMpCZVxZ5TdTHYoA1Wgh3fGpfhSgCc9',
        '50': 'NX4x4SnQvXKLfF7Qu5488Y5GJkGsCVxFND',
        '2147483646': 'NNXzakhm2JtQyFhXpVF9d8AQU62ARoj95a',
        '2147483647': 'Nh6jP7fvfLweyhaoLpe4GRRM6omzbkTWh9',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqqwz4jmvrdfemjc97r6tzayjha6hxewmks2t2rgf',
        '1': 'ckb1qyqpdkrgtej3qaumqnjx6f972v6tr87lj5vsdsufv0',
        '50': 'ckb1qyqrz6xrfmcjx6crmpcdhg7rgesmuuut6slsrwj7dx',
        '2147483646': 'ckb1qyqg59jdaq8ktmq78nyyay2k405skukkts3shgg0wc',
        '2147483647': 'ckb1qyq2j8dhu3w4n63vp6uwgnj8ku09rd2peyeqw953pj',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aaj4k46d3cf588tb4f31bzhb9vkt73jfajwye99w9b',
        '1': 'cfx:aarz8dz7d3dk2vhvgecfnpvx8jfwkd8rb6jmnx2tev',
        '50': 'cfx:aapg8y7h27tzgnrutrpd335735fat3up42tnuuwke7',
        '2147483646': 'cfx:aap0rfawrevwwvm2arvych08rj5jzvn0bemsjy7v3w',
        '2147483647': 'cfx:aak85hxac1nsjfdse4d8k3m1yej074fv2aam99yg6r',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos19yj63dhxzntvvnq0l2qt7utvp4d34f6hlt3mu6',
        '1': 'cosmos1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxn7kh86l',
        '50': 'cosmos1qf4krq0e90g3zf4s8ggwupenlfdj7jumd6d3h3',
        '2147483646': 'cosmos1689ee9hl5uk5x6hsch07n5vmcg2fymuck4xkva',
        '2147483647': 'cosmos146hjsu5n9evtm4jwk4eh5ya50h77jsn9606gum',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash19yj63dhxzntvvnq0l2qt7utvp4d34f6hjsuu9q',
        '1': 'akash1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxnnd6qr9',
        '50': 'akash1qf4krq0e90g3zf4s8ggwupenlfdj7jumqpqkwt',
        '2147483646': 'akash1689ee9hl5uk5x6hsch07n5vmcg2fymucmwt348',
        '2147483647': 'akash146hjsu5n9evtm4jwk4eh5ya50h77jsn9h5h09p',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro19yj63dhxzntvvnq0l2qt7utvp4d34f6h8sezqt',
        '1': 'cro1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxnxdl7xw',
        '50': 'cro1qf4krq0e90g3zf4s8ggwupenlfdj7jum4p9gtq',
        '2147483646': 'cro1689ee9hl5uk5x6hsch07n5vmcg2fymucwww0sv',
        '2147483647': 'cro146hjsu5n9evtm4jwk4eh5ya50h77jsn9z5j3q2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch19yj63dhxzntvvnq0l2qt7utvp4d34f6hvkcl7d',
        '1': 'fetch1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxndt7rcg',
        '50': 'fetch1qf4krq0e90g3zf4s8ggwupenlfdj7jum78y44x',
        '2147483646': 'fetch1689ee9hl5uk5x6hsch07n5vmcg2fymuc9g0jw2',
        '2147483647': 'fetch146hjsu5n9evtm4jwk4eh5ya50h77jsn9fjnv7v',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo19yj63dhxzntvvnq0l2qt7utvp4d34f6hhszt2g',
        '1': 'osmo1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxnkdyhvd',
        '50': 'osmo1qf4krq0e90g3zf4s8ggwupenlfdj7jum9p7ppr',
        '2147483646': 'osmo1689ee9hl5uk5x6hsch07n5vmcg2fymuc7w4x60',
        '2147483647': 'osmo146hjsu5n9evtm4jwk4eh5ya50h77jsn9j5fc2f',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno19yj63dhxzntvvnq0l2qt7utvp4d34f6hfejqmx',
        '1': 'juno1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxngy5uar',
        '50': 'juno1qf4krq0e90g3zf4s8ggwupenlfdj7jummgw2sd',
        '2147483646': 'juno1689ee9hl5uk5x6hsch07n5vmcg2fymucq89dtp',
        '2147483647': 'juno146hjsu5n9evtm4jwk4eh5ya50h77jsn9vaenm8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra19yj63dhxzntvvnq0l2qt7utvp4d34f6he0tm76',
        '1': 'terra1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxncjd8cl',
        '50': 'terra1qf4krq0e90g3zf4s8ggwupenlfdj7jumt7h343',
        '2147483646': 'terra1689ee9hl5uk5x6hsch07n5vmcg2fymucs3ukwa',
        '2147483647': 'terra146hjsu5n9evtm4jwk4eh5ya50h77jsn9utqg7m',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret19yj63dhxzntvvnq0l2qt7utvp4d34f6haw9jpx',
        '1': 'secret1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxnunrw8r',
        '50': 'secret1qf4krq0e90g3zf4s8ggwupenlfdj7jum0lec2d',
        '2147483646': 'secret1689ee9hl5uk5x6hsch07n5vmcg2fymuc5sjl3p',
        '2147483647': 'secret146hjsu5n9evtm4jwk4eh5ya50h77jsn9c2wpp8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia19yj63dhxzntvvnq0l2qt7utvp4d34f6hwpqtxh',
        '1': 'celestia1u9lzjmcfcsxr2w6xhqcje4x2c5nrumxn0uxhqj',
        '50': 'celestia1qf4krq0e90g3zf4s8ggwupenlfdj7jumusupdu',
        '2147483646': 'celestia1689ee9hl5uk5x6hsch07n5vmcg2fymuc8lhxks',
        '2147483647': 'celestia146hjsu5n9evtm4jwk4eh5ya50h77jsn9t9tcxk',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwnPz456xeoFLPY1g9J8DneCptVpdb3xQTKZfXXTCDmDaNhzacCcA6sht4Bz3izeHQEG1UMSta3186UyF2tjHEsC36rTUcFa3',
        '1': 'XwoWnwun8FzSbQNKNkdwZR9WCf5ftLr6XPhEBFbPrVMajog8HoTsx9W7KVotVHGBCpFNSfWRMS6aC4ptcwgT5e4V1kHusLWWp',
        '50': 'Xwo1MggWVQn4n6JVcogv7VfVh85fh98aDKZmtD6ebsbVeeGmftdnovZanqE1VTpjboRYrNsMxbh3TAy5UsqY1Ky12eWgvAuWA',
        '2147483646':
          'XwnQBQFuPBVNms37S96W3d8FhG92LbUtNiiNi6oPimxyNteacySkeECat9SamWJd2pVuctwnfx2UPJYqH8a6FZBU1ByVtEzBm',
        '2147483647':
          'XwnRMQb7ACBH49HUMe2L2jLtQRNFyrZ542UbF5B32dtibCPFEWK1e7h3NmL85FfroNVkXgykD4dorRdk7U6jJH8z1fC8oeQeU',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x545c335A5F07aaeD1D7976bb4377a055C72f451f',
        '1': '0x8386C006AFC645B64816aa5311bADB14F9EE93c7',
        '50': '0xeDEABcFb60354cA6F3da0e905524E3d58A296EF1',
        '2147483646': '0x6498ceb975dd2a56e2A6C31a63257B0b80af7b9f',
        '2147483647': '0xd667d3A2815Cd51a014517393Ff9C2Aa80e5949a',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x7584AbDa4569eA240606aC262e17F521a9675e5f',
        '1': '0xD04c9CaB70369816F801E16e90e9013730Abb446',
        '50': '0xac896cC742c11dEFdC1528c7Dd900a595aBf8a5a',
        '2147483646': '0xd69202EC6CCC8a0932d32969b659E14fd1f739E0',
        '2147483647': '0xDeEa54afAB170418eC071A8364E020A3bd01d710',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x7584AbDa4569eA240606aC262e17F521a9675e5f',
        '1': '0x5Da440a041b6fcC30248857e8FE11D410ec49d57',
        '50': '0x43bb8deC6573bd1793594949C68D3cE37C9310Eb',
        '2147483646': '0x862786573D4Eb4f58f67153190a274082fF51011',
        '2147483647': '0xD636aD70A69560AB7aefdE23ea6Ee1fd57dE7868',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1t2xmuw2do6l4s6jsxeyygrxbb6r4zmb4z5kn4nq',
        '1': 'f1ecwgvyftpwj77jbuaejyfuzko6smk27eiody3za',
        '50': 'f1df266sno7o7db4gwumspynrxcpqjjilynglv3dq',
        '2147483646': 'f1mtpz5vamz57ctau57h5apoie22tbkknqhgfx4za',
        '2147483647': 'f14ybmr7j4ugmctcgw6pikz7zg76grgfvryurxaiq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qzpgdu8pefv2n40c6dryzyf3kcnw5yy0xae5ffgsvhfq0uqunrw4723820al8',
        '1': 'kaspa:qr2xxq03nmf587h4frljlcz39hc7vluezmjgysv5a87kk2a8nvw0wgkc2pt6q',
        '50': 'kaspa:qpr2trggznn0ga2vjyzvcmandcymdvh5q2znevmerlfc8df3epjnch9u0dxme',
        '2147483646': 'kaspa:qzmdwt9p6v9mfd7gcp6mut30fgedw39vkjz7wr7jnssw5ec6p7cav2tfvtmtl',
        '2147483647': 'kaspa:qpm2hk9pxgurh6gv9r8fg3kc3vjzyxy3fxdrmmphn48eux8kf83jgcl8ddtmc',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'ae0bc6eff889db44742575a2bd1878c4e959202283c1aca14042e21398439dec',
        '1': '4487f40ed91d4a0b4d295677a40d180eac68a5678f2af572175b1383018b587f',
        '50': 'f1a4e4c756be1db9f0ba5325a5529d6281f844ce1e23c34c6ea92e624483e685',
        '2147483646': 'e019c7c51b0ded47f2d76fd7952483a90276e145e29b351b3f58ea4b02b4d755',
        '2147483647': 'c685fd37acaeae73ccd652075b754e0a8189b106715e7f1bb60d6efc69c5de85',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NB6DIUS24WDKFY5JQCI5IPUDMGDQWVKL6TNA7OEK',
        '1': 'NAFNIXGEGM6AOSAP4534PPKIC647WXXGOQK4MPVE',
        '50': 'NAEZ764E6FXYT6AOH4CMQ5WKP5Y2YM2LENRIPEFO',
        '2147483646': 'NDMVATWO2H5IH3CGJYYED6T7I3QWPMHUVT2YOW3A',
        '2147483647': 'NDLRTEAJTWDSXYZ5OZ5GQGC7L5UWHKRP5C4YU4LB',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5z6ud08th9uv296kc07t04gezy3k64svvr5hrh8g8',
        '1': 'nexa:nqtsq5g5k7kanexj2m0w6mtyms7pzhnqkpw8pxj2xt0aw5ra',
        '50': 'nexa:nqtsq5g59rknae668xx73y4uzyya647warhrqsjynl486evp',
        '2147483646': 'nexa:nqtsq5g50vraxp9qfw779chqsdfmrgru80wgr44s25muctq9',
        '2147483647': 'nexa:nqtsq5g5wyayyv40e8s69vtq8huzg4vhnw2n5qzlju34vl5y',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '13YeNfSEG39vU2v9t91zu5GoBDNe16sgCvTNoSQVbY117DWb',
        '1': '16T1oV5sPeUJPow7PYDwjsmf7kw5bzR2Ho1n5waHyJPEfsBm',
        '50': '12SH7CUB1gkikfMdYnf1R1Jv8TufnT16YogaGXmXwcLZsziP',
        '2147483646': '13L7oAUQGzWZEfxJZ1EpJGG7Kyv3aBcX5fpX2chj9tFMMace',
        '2147483647': '1vFg9WJjq6EwD9Yd7R831XdxULk8hZYYGQmxPHoU3yP4MrM',
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
        '0': 'YUwfd9FBVXZFKwUQoR7nabvQe67H22H9dE2srczuoySWoZn',
        '1': 'bPK6SntK6qwB6xRvCd4dP6nMBeYsuZdEVnSAMnoHaMg5iQi',
        '50': 'XNaQABBw98MXxNx5T48JWe3Mtd94N9hVWTELwz3FtK1Hb8V',
        '2147483646': 'YGR68BRCStC1xyd5fdwBmbEZQdWr6m82NbB72vEUADnmKcD',
        '2147483647': 'WrYy7DKfHTsiWAs9mpEvWrmBu4DQci9UyBS2oWJnKwpTp7Y',
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
        '0': 'F7xteX32cuNn9j5hCn3esoeUBfE7U8iaoZe2oh6XFByfsUN',
        '1': 'J2LKUAgAEDkhvk3CbyzVgJWQjDfiMg4fg83KJrtu1aDEUR1',
        '50': 'E1bdBYynGWB4nAZMrR4AoqmRSCFtpG8vgnqVu48sKXYSgpN',
        '2147483646': 'EuSK9ZD3aG1YnmEN4zs44nxcxCdgYsZTYvnFyzL5bSKvHdx',
        '2147483647': 'DVaC8b7WQqhFKxUSBBAnp4VFSdLF4pav9X3BkaQPmAMd31R',
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
        '0': 'j4TsFoNR8GyPUs7MPCUQgc59dqyTZogthrNML1hTTUX87a1sP',
        '1': 'j4WmdEC4mQahrntNLhscdSseVnX21QaS3wEujJCdFrHWM98LC',
        '50': 'j4SktXuT52czH9jnrs83h81BkoDzbb328CFaXUnpVpbTgM8T2',
        '2147483646': 'j4TejDsTJHvk7dkPXsLdW1G8wzjzyNmdYj7iUEskh2sNTpkuf',
        '2147483647': 'j4SEs6rVCkmKoLHamwSook1QUdERfwHaaBiJjAeLmM36VXLCH',
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
        '0': 'dfZ6fCAUm2ae952gcpqcCS7934K1RgxGSJh3aeEdFSzQxzng6',
        '1': 'dfc12cz8QABxWzohaLEp9GudtzrZsHqonPZbyvjo3pkoCZcZL',
        '50': 'dfXzHvhWhnEEwMf86VVFCx3BA1ZYTUJPreaGn7KzHo4kXmm4b',
        '2147483646': 'dfYt8cfWw3XzmqfimVhq1qJ8MD5YqG31HBSQisQvV1LfKFGNS',
        '2147483647': 'dfXUGVeYqWNaTYCv1Zp1Ka3PsqZyXpYxJe2zyoBWZKWPLx8Th',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r34cePgFyg8CBfHj5inkZT163qrU2diTk8',
        '1': 'rhFacddYbuJUGEmQx2jfUTUU64i99VuZXk',
        '50': 'rMpnWgUF6uk3B4gFER7zk5StULCp4CJ3YF',
        '2147483646': 'rPFH8h7ptdsFMiBQZnuYKUXXxBAsmRpxSk',
        '2147483647': 'rM9NEQCT1CsitAEMPcNa4e3d6T2QZhGXa1',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '6iztJV2dCKzoUcHn5UrxLD6CUER3JmXZj439kNENK7q4',
        '1': '7KGxu4UHwsbpxDbgjFHiCmBBhxY9MkQ4QFfJ6JHdVQkv',
        '50': '5QDq8Gaw45coB8ZN7cvFm4UhZceH9FfEwwxD9HBtgvCv',
        '2147483646': 'F4wj3En2FmC5yvyCyiNwGPkuYRy4g92gn7WSHagAq7Tp',
        '2147483647': '7r1NwW5LVuqgkE9MA7J5UEQTcxBRWSjpUJ32hYqf5ckH',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x3c6b782eafaaa580b2f2ec381ef3ba0d',
        '1': '0x5eb0da25e534155941f7a0b57866666e',
        '50': '0x38239e6a7f07ba23b6671cdc321722d7',
        '2147483646': '0x4f2a8150c831f2a812ff9ae077cbfded',
        '2147483647': '0xc68cdb027de38238559d51cfe2fffef7',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAURMELFM3ESO7QULKDQB6NNJ4I7Q6SNMHJHTF2BUPHX7WHR243JVQS7',
        '1': 'GBV537CHDE656JN6MUU62HQOSZR2WUOZSUUIEUHHR4X4AOK3L6P3S2B6',
        '50': 'GDFVQL7FVEEZRU7ZQD6LW2N7SU2HHSM7VYEQEPKCR76ZYBQ7HWXCUORS',
        '2147483646': 'GARWXQDHU2UTGXUOOMSX6IQGCK7FQOOLAW4L6XVGBKYEWWEMVSLUFMZC',
        '2147483647': 'GALAHP6IU4GMARUYCDU3ARVXZUHYEXSYHCSCIKJVAPBB57VHMPROPV7M',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x0e098183d6741b1b97234fd0b560c508b124dcc6edc02e11eec7dec72b30a453',
        '1': '0x26b084ccf6a335ba31e7fe2f4c88a3ebc13680016dde9f9a7ab2b5ab49316108',
        '50': '0xc4ee23bc264d4ec246346ff61784fcd3c9534056ee0634980e1398e3c8135834',
        '2147483646': '0x695055d0f02ca87ef311de858006ea372ec1bc523516715f2adf5e6f71c8b7a5',
        '2147483647': '0x18a51d0fa595c745a82658eeb8e50028ae979b4a89877c73848e3d6595539f20',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TC3jzPssaieN1kD7AffyWK4aQQFkSKaEYC',
        '1': 'TUdwAAMocbq12bWavq55uZxwpgmEcLCA1L',
        '50': 'TMHukjFw3qXJycytzXjiiXmogSnV7izU8T',
        '2147483646': 'TQG2a7Pa7bKjXF5TvGzvG8cq6pPD5WbEn4',
        '2147483647': 'TFdzHfhH8iFpVn3AoLT9RS87wvCbjCqz5W',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC77acda4bbe8920d0f9e5e9b4c4a4006e57f1fd84c023d69fcdb64cafdb585324fbf0',
        '1': 'BFCf6398a5695e85fa2e8192e945773d365932359b97e888e2b76cb1faa329459831806',
        '50': 'BFC26b8587918330db992a94e317e69bd22d73625e30aae947255a9484ab946a1cb9606',
        '2147483646': 'BFC33c99c276e8c835409e82f62f808efd87e367be57029eb4d56f00836e0bf015d9abc',
        '2147483647': 'BFC630e7bc49aef80e4700a8a8dd0fb3e5ee8a23f36c66f6031b5e8df5a847df0e16536',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NNatSJxGFEsCVSrpaS4VQNT4gHpXE6DHJv',
        '1': 'NNG1zWBymsYjZL1ksS8jnD8umkjm3esrJM',
        '50': 'Nefam9JtpAS68y5E5t55f3z6KKKDQJg1xT',
        '2147483646': 'NeGNq5pnkVWnsNtZDygYeoHX6Jjc1Y7w34',
        '2147483647': 'NaFToCWC1rVQDn5h1GHc21LwXWbZnjnYB9',
      },
    },
  ],
} as AddressTestCaseData;
