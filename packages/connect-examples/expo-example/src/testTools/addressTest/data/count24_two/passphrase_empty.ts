import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-empty',
  passphrase: '',
  passphraseState: 'n2XDwPTRoTrLUxu25L6XDnyDBuDeXhjmoz',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qyqdexlj06tm7s39cfj2ftgdzjhrpc6fuwqx3axutmggxf8chxuaupjddrmzs9vu9racgagvm4qwkmun3mfrp2fzwvxsuxq3ew',
        '1': 'addr1q9wsgq3jswlzf682xtvcpt3lje3ff7kszjehk7ukwhk5gnm64r06rjygqklwhjwzmxc5c0dp5yvsyfnnqjpqsg5u0yxqfx2jjn',
        '30': 'addr1qxxw9v82hzczmfqre934gjp34gv7x6xxe5z6e2yegnv3f7haatku0hg2s4a9sg7hnscp7mcfhqn6ad3frtaqu6q0fz0s0z2qx0',
        '2147483646':
          'addr1q824pllt67ef7c6cahdj7hp2779l9qhplupy3s67wdetera8hyfce7gea6vptc2jcjpqfc7dsxv35xnztuvhdwg6m55spjemqx',
        '2147483647':
          'addr1qxgl5jchgrzqv3yf7yasflewmqy6dehzzt3vt5rmn649949cy7crswrnz36f032u3thvy3pm6n6yhels8jff6hj9wljq9dlxkq',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'ODW6DKCDS5GIJQLE7AZBK46GEACEDNPIY6F4VU6REDTKQCE55IGGF3QOGI',
        '1': '5T5373EZZZUEHYNG27LU46TU7WEHOQH2AHZEO6WYNGFHSKG53UOFGJOCII',
        '30': 'NQQHFZZGGOD5XOWBH4MI2H5SAD6MVKZ5MEV7HX2VACRZ5WL6E27TQD7ATQ',
        '2147483646': 'I35MGF7IDC6DENHAGW6ZJQOXX4H6LV46CFYMAZJF5W6U3M4S5MJCRRE5RI',
        '2147483647': 'U6E2PDX7ANEK22GQ5SALRPZGY3JORSD2Z7WR7PIVECUORGUBUEMYTL2IOE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xb50436fcd38c60d22f39194df3ac257a60e57469e7d34f019ba05021ae6282ec',
        '1': '0xd4a7ae8d54c86481bdf51e71d1936066ffcda533d5ce8355cde017edbab0c775',
        '30': '0xa4e7782a52cc84043944ae242afacc843983dfa83a146591f7bc3c44e8f48d89',
        '2147483646': '0x1e7742c61a6da6c6e1895a91d06013003722fa11fc6263f41f2df069b7c35c81',
        '2147483647': '0x96d1f5b076aa766f1bd808d25f8817b3992debce6324f5b276ac35cc70c9d563',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '13WmVBjPamTJQfuGrjk7ffypXoXodorYke',
        '1': '1ekTqQ4EyKxRP34QRHiUDZpk8vrusvnnq',
        '30': '1Mrf9HG1UA8bc6PHeGsXgyLcb98EuJR7Z',
        '2147483646': '12UxSoVU7bgdVdPnyZqi47WeurryzvJmVe',
        '2147483647': '1DddyJeeJvHbDfPPLNHEggfbdAf7wDX53L',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3GesPAeAZ2yivDVgnDW97mjJj7x2tQ4Pkd',
        '1': '36Z1JqZwjP5XSZf91RnXNiVpmjJBMCjkPP',
        '30': '31n2p1yv4z3RGzsdWVt3Qb3xEyEkjzwJt6',
        '2147483646': '372Lyuu9huGsnoGziyiMmUeHUpUwfjhy19',
        '2147483647': '3KX8quqjfWMWeCGzZ7t5djPV3s8v2gzaw5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qee6lfj0we9z4g3n8jy3uwnf6gwtjlr6tllyqfk',
        '1': 'bc1qawxk6h9qy76jyutsj77yjd7gxt7cgzw622ynu8',
        '30': 'bc1qv8kpdhahfzwrk8zp0q0sknlva6fd3sc038maf2',
        '2147483646': 'bc1qk5hxqme8x7sfrphdrl3tspse2c42c6xxec69ps',
        '2147483647': 'bc1qw4hhfjet49aeafmx682s280gdw3wvqfrqeqr74',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p90ln8k6uvu9eezcnutd8wcudm9vjzt8cq08ga92rhrtmedxwxlwskc89d2',
        '1': 'bc1pvs07gx4npax0ena4kjlzlut8l6r64s2en7apsn9pjcsj83shfghsjxrazm',
        '30': 'bc1pr4yjssu402sxvr2ym96p49a0346zejmhq37qdea9a2klaa386p7q60pwws',
        '2147483646': 'bc1pqa5j2ck45tfsjnq2ywehxh5jph5gwxf08jqspye5kt05v6datkhq3a73wt',
        '2147483647': 'bc1p6ur7p8mlte32ea3gvdhe2n7vpggny3aegpz59j74rl5y8ejsr2nqy757yj',
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
        '0': 'DAg5MSaHmUbpMovSTNCoSoHg7pGpioSNDZ',
        '1': 'DTB63qbHpwMYaWtZc2NWscXPvTcpAS6ZE1',
        '30': 'DBQtJkkQ1zgyBP7b9mNTWoapcy57Ji1Dfi',
        '2147483646': 'DKs5F1jYPWt7yMPqZCcx5ERKSF4bbVktnf',
        '2147483647': 'DHjfhz1eYoeUVu2BZaRrRmKhFcMTyNW7JG',
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
        '0': 'bitcoincash:qrzwvjaghrs2xgs4a8zpwmmaurauqag62vwkxg43m8',
        '1': 'bitcoincash:qrdcvp5ncqkev5qs35yqq8mtnqljtw2a3sg2fzglet',
        '30': 'bitcoincash:qpaxn663k53yw74h5dnkjx3sk6hf94uklv2gxdwddx',
        '2147483646': 'bitcoincash:qq9lph7mp8g9xe4el2hlahe5fph9grc59q852ud40k',
        '2147483647': 'bitcoincash:qqfx22dweujc2s8adj0xyxlmnl58x0zl9qrjhvfutl',
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
        '0': 'LQu3GRLKryz73PoRAoUP2wvspNtDEg88Bx',
        '1': 'LWT2WKVVPjoNmuy1XaFaWw7DhVjVgZYETK',
        '30': 'LPvBuQZqk2n8FQy81AWz9gkGKJgkUwzeXF',
        '2147483646': 'LXY5gQZ9SNE6mRsFXgjNFcXzW5bQP5b6vt',
        '2147483647': 'LXRy4NPevCcEgwnpGavi3BTj3Haf8Tft5x',
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
        '0': 'MSGN2AwbjkB7eN8FkU2Fi8HHwmuNqaut51',
        '1': 'MDTJrL29MTfoT4iVFwofvZizLjBwvZdd3T',
        '30': 'MHAXQZMDwVVSexPFYJpFx9sX1uVQpQBuzK',
        '2147483646': 'MWKmMFLgVj1dJTSo2HChmKTbJJDpRj7CPH',
        '2147483647': 'MBs9UYScf4mGiSR2gQ6KkqcxaP99HbQ7z1',
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
        '0': 'ltc1qle4yhw8z4n9jqgspf4eqdhxafds7lmdheny708',
        '1': 'ltc1qaq8fs3xva8yazv3fdle725xhucenasfprc3lm2',
        '30': 'ltc1q4lcgqgx7t97gnll98k3daj8qtkj775yqcsphwy',
        '2147483646': 'ltc1qwgmtgek3qlehxa9de2gavvjnja0dwna37lym59',
        '2147483647': 'ltc1q9z3pw8nnwknmlpez6u909q72ccg7vt9r9v7eyl',
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
        '0': 'Na9AL2jMveukeZBmgMKtubng5xompVApkR',
        '1': 'NfsPgaAu44Wec8FYvZVteqnFKc6ZzCDeeo',
        '30': 'NX3JkyMFhsvdakPmvsXXpwZrAU6Aszah3Q',
        '2147483646': 'NM7GAbY7tqzCPMkof8Mv2BTyjzcB2GNqs5',
        '2147483647': 'Nb1E4AGa8NhD44oCwTETLK3QJ6zRTEuQch',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqg6m4crddey0krutewhrcra6gudcyj35dspwzkqp',
        '1': 'ckb1qyqyl96j7uelfkhn7nnrp6addhs5hvkjyses8ye8zh',
        '30': 'ckb1qyqvacd38el743semw8cnpn59efhupkc2yhqdfhmtx',
        '2147483646': 'ckb1qyq9jlzrmxssaf3v2wym6wcf6xh8mqmfwhdq2s9sql',
        '2147483647': 'ckb1qyq0wlvc77f49gq4azhrx2a5q3zdmdpnv23s6e729u',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aak23dcr2yefd13e7tj27h0nkcrecjsg0y6tep15v2',
        '1': 'cfx:aarapbgz035spt9b8vu7dg29enpu3evvvewb2yezag',
        '30': 'cfx:aapb741nykm9v9vr4fa2g1gakwb32ug47a9n6g967a',
        '2147483646': 'cfx:aaspybcxp4gk87hxv9c0ucc1r7tcwhs2uyk82pwkjp',
        '2147483647': 'cfx:aakvnebh99k8c8c2c8gh29eddesz47v5mu0fvpsvny',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1en8mty0xk7w48ccjlts2vkjhz4zqudma6ueh4z',
        '1': 'cosmos1mrs58szmxze3repdswrsc2fqk67py7nkp3p0r4',
        '30': 'cosmos1t6t288f0chucep3vztpzfft7396eytm3539n3z',
        '2147483646': 'cosmos1xp620ydvaaxmq8sfhamw8f9daae0y6jpuf9w0n',
        '2147483647': 'cosmos19k3swurqn3cauflgvtrdzg4ff9vk8l4jmsekx8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1en8mty0xk7w48ccjlts2vkjhz4zqudmah85svc',
        '1': 'akash1mrs58szmxze3repdswrsc2fqk67py7nkv2vg60',
        '30': 'akash1t6t288f0chucep3vztpzfft7396eytm3e2g5gc',
        '2147483646': 'akash1xp620ydvaaxmq8sfhamw8f9daae0y6jp3jgfkf',
        '2147483647': 'akash19k3swurqn3cauflgvtrdzg4ff9vk8l4jkt53la',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1en8mty0xk7w48ccjlts2vkjhz4zqudmaz83wfn',
        '1': 'cro1mrs58szmxze3repdswrsc2fqk67py7nke2fkly',
        '30': 'cro1t6t288f0chucep3vztpzfft7396eytm3v2d2dn',
        '2147483646': 'cro1xp620ydvaaxmq8sfhamw8f9daae0y6jpyjdhnz',
        '2147483647': 'cro19k3swurqn3cauflgvtrdzg4ff9vk8l4jrt306k',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1en8mty0xk7w48ccjlts2vkjhz4zqudmafpsnh4',
        '1': 'fetch1mrs58szmxze3repdswrsc2fqk67py7nkjvgtpz',
        '30': 'fetch1t6t288f0chucep3vztpzfft7396eytm38vvhn4',
        '2147483646': 'fetch1xp620ydvaaxmq8sfhamw8f9daae0y6jp05v2dy',
        '2147483647': 'fetch19k3swurqn3cauflgvtrdzg4ff9vk8l4jgdsjys',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1en8mty0xk7w48ccjlts2vkjhz4zqudmaj828rs',
        '1': 'osmo1mrs58szmxze3repdswrsc2fqk67py7nkf2jl48',
        '30': 'osmo1t6t288f0chucep3vztpzfft7396eytm3u2kr8s',
        '2147483646': 'osmo1xp620ydvaaxmq8sfhamw8f9daae0y6jp5jk7ep',
        '2147483647': 'osmo19k3swurqn3cauflgvtrdzg4ff9vk8l4jnt2xs4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1en8mty0xk7w48ccjlts2vkjhz4zqudmavw6vj7',
        '1': 'juno1mrs58szmxze3repdswrsc2fqk67py7nkhrz5yf',
        '30': 'juno1t6t288f0chucep3vztpzfft7396eytm3zrxgk7',
        '2147483646': 'juno1xp620ydvaaxmq8sfhamw8f9daae0y6jp2mx4g0',
        '2147483647': 'juno19k3swurqn3cauflgvtrdzg4ff9vk8l4jdz6dpm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1en8mty0xk7w48ccjlts2vkjhz4zqudmaucrhhz',
        '1': 'terra1mrs58szmxze3repdswrsc2fqk67py7nk84m0p4',
        '30': 'terra1t6t288f0chucep3vztpzfft7396eytm3j4lnnz',
        '2147483646': 'terra1xp620ydvaaxmq8sfhamw8f9daae0y6jp6dlwdn',
        '2147483647': 'terra19k3swurqn3cauflgvtrdzg4ff9vk8l4ja5rky8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1en8mty0xk7w48ccjlts2vkjhz4zqudmaced7g7',
        '1': 'secret1mrs58szmxze3repdswrsc2fqk67py7nkr54x7f',
        '30': 'secret1t6t288f0chucep3vztpzfft7396eytm3k536v7',
        '2147483646': 'secret1xp620ydvaaxmq8sfhamw8f9daae0y6jp7v38j0',
        '2147483647': 'secret19k3swurqn3cauflgvtrdzg4ff9vk8l4je4dlmm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1en8mty0xk7w48ccjlts2vkjhz4zqudmatkg800',
        '1': 'celestia1mrs58szmxze3repdswrsc2fqk67py7nksmslec',
        '30': 'celestia1t6t288f0chucep3vztpzfft7396eytm39m5rt0',
        '2147483646': 'celestia1xp620ydvaaxmq8sfhamw8f9daae0y6jpdr5747',
        '2147483647': 'celestia19k3swurqn3cauflgvtrdzg4ff9vk8l4j26gxu2',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwoHBXkUMiC9ieBtfLSvgDg8KSG8cSUY9BC3mK9cZH98ejs4bFSenzj34RXv4E8ZBoRRzjXw4W9b1fVkdtw62Vv62jfJE2hKK',
        '1': 'XwnM5s1wNHsGjvXNDbqmuXKArrRq4KtyQPDDKUnypLou2cvRQs5c8ck5AFnpSK5Cefe88reVmPCC9K641S3kuXpp36NV53WDL',
        '30': 'XwmmRCPMhBbgXEfK1Ex9ub11cJWKew9mtTisLBRY3nkMNnMP1nq5aZr9CA2qDSuZFiLX5Ww3kKjVFJUBDvw8L6Ad12KY4c1ac',
        '2147483646':
          'XwmrwzX3oQKJbTNozuF5mRMimbKkPDcpFFy5LwqSAnfU58WRdiufD95by3shvhj6AVjEcPBF6oBEUVii8BLTeibf14AU5saaS',
        '2147483647':
          'Xwnr31xbMhYQKvDB1m7GWSgEAX2ryZjzsHd7ZyWkgY7HFm1uaF7Wfk9BkCvmyUv9e5BRvQUwurJKjZntqHo3Wftf1EMj1YjeR',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xAEc8748a977368f52954bbEFDb580323242E7468',
        '1': '0x0F2AE69b2449ff00ED7bA1dD9B0e4ABEcd0a75AA',
        '30': '0x96608c02Afaf4c94186107b3A9a1A35B2DAeb266',
        '2147483646': '0xD9a0EcdA8F325651f522A9D297c931CD72fcCafF',
        '2147483647': '0xe53C7c53b2E52CD4e86765cfd168456f01cc747E',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x20310FD6AC18146d27d6b671cD07d20B822DF559',
        '1': '0x36DbA2cf107178b316576a871cee213dD48b0B37',
        '30': '0xda9C3B425E54C9146017d486fc18F93801672f02',
        '2147483646': '0x5263A157386954e385dF8afa49AE721242b96869',
        '2147483647': '0x61C62B005Ee3FFa49E9187142a549f5b1B5a45B0',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x20310FD6AC18146d27d6b671cD07d20B822DF559',
        '1': '0x25f0715AfdD71201FAe0f5b49181649D076af734',
        '30': '0xEA25091C60e016AD5b4e7E59d4Ead0d862CB53f9',
        '2147483646': '0x06f06aBc3b729e0AA6C5b53613aF4f3e69811967',
        '2147483647': '0x0596DfC0Ab3F6F1e5D984DFF79189c4019c3aE9e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1ylrowkpbcvwqvjuwitv7ygmnj7wbo6o77jpc6dy',
        '1': 'f1zfofxxxyl7qpj3pbyop2f3xlbl2x2j2ptn275vi',
        '30': 'f14qfpatlisyzafqmljzpzm3jlef3e5gtrn7iar3a',
        '2147483646': 'f1mtt4w7uolvqypnzqddxkavwcsdqj6rmgpcagcfq',
        '2147483647': 'f1ncnnhdgcyhtwdcphi5q3tbnzbjte6knnemwf74i',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qphfk7l2twc4qcavhrdlm56vmu5xkl0vzh0yannacjfcdqy2jxp4288h788uq',
        '1': 'kaspa:qzx8kwllsp7ms8magthk40f2mcwadd9psera6dcktwr2f95zn5ylkacpjsgej',
        '30': 'kaspa:qzl73wv5ldn5d436x052uru9mv0ylgfytklx3awdeyc0vpqx4fehkfjqka55w',
        '2147483646': 'kaspa:qq5vlv7xeadvvh7nfkh0ml5ehwyrm9gf8ztyuqr0zjydzf8jrjpy7jv45pyy9',
        '2147483647': 'kaspa:qptcpyectnuggfje7pqsc0udnqsnkcn4qhv5xtphuas6ujr0v0a5xasgnevvq',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '193fd69843be25166e8d5b677ce745a411c7871c0579c96ea705c839555b3f4d',
        '1': '64c2a505459dce3123ad451f16417ed7db104dd8a9ed0bd352dedfcf4d57488c',
        '30': '016b9dc9be345627936511402adcaf6dc7c75aaaf036966f303e7ba707b7a01c',
        '2147483646': '219e810b59c72beda5118f369b3dd4fefbaf399ada73dc69a086ef75511f0266',
        '2147483647': 'b9d179ba961cb5aa9b2007796b2a4372588b12415ef6a16e26908694cdca1e46',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NC37MHFYUIFZ6NZIDOKVYPFXRNZ5U3JRLRCAC3F2',
        '1': 'NBOSP366CMGZ5SCTMAMQ3BCDAEIEZVNFGHSWKRDW',
        '30': 'NBGB6MURPXP4O7YA6L3PIJIDHXZPLMTKL2FE55BN',
        '2147483646': 'NDSB3RRYK3ULWHA5DL7N3CUTILQTLXHUNSFATPCQ',
        '2147483647': 'NAGUOTQTKLVJWQUKSHVFHLKZVJMFT6CNMMYTFPZT',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5kgknelfm7dukurw6ckvxkfvxf4cevxatwd8yvqqz',
        '1': 'nexa:nqtsq5g5q82pq4d4j6dtmmjkf578sqmf4tspsv4qmlrtqqpr',
        '30': 'nexa:nqtsq5g5vxa75m2wj9qcdsnnmw4nwewpu3zqrhv5kc82pkzt',
        '2147483646': 'nexa:nqtsq5g5s094agep684pvsrs6zsp5r2f4hwh22733m536zdg',
        '2147483647': 'nexa:nqtsq5g5mhlwzw8u4gxjnxh8ra6mhrgq4kfmr7zwdk7wlhen',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '14khy9y9UGLEnsFfSb5zjoAgeccTjvxhGv9sDTviCrJBLy9F',
        '1': '15Q3B8o7oEJJzKWsb8PfQJqvXXpwKKmTjDGpTTdMHuX8j9as',
        '30': '13KTue3rvfWsQ9DrZUEf1JzugcikGod6oBf94cmXaNRickfT',
        '2147483646': '14gBGiMKbmBXZaxTswpXxsqm1X4aSsLAtEzHinRu9115gPKw',
        '2147483647': '16Rw3Fevk2KeS9ugb7pWvmA6AJrxVQd9jionm7SNrAXbWLq7',
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
        '0': 'Zh1G7gAPihsaAGyyFV7dJVot3Kw1r7JDcvXHt9DX8GckNJh',
        '1': 'aLLU6W8igfwmcYC7nnnHpB3kxYQbEv4fv3UXsqrcBVa8Z49',
        '30': 'YFmCbksr7tWBSFB68dmtpL2v3SDYimhjtRo92z2teQA2P4U',
        '2147483646': 'ZcUZg4LXDZALsynQcDerPAtEwn3inUmpwkwoCeQTGyX6JjG',
        '2147483647': 'bNELDMwfUhHDSw17nDdpGVDPjaRmKmkgRaSqXetASW2uzSd',
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
        '0': 'GL2V93xEr5h6z4bFer3VbhXwau3rJDjeoG8SqDK8ZV9uSUg',
        '1': 'GyMh7svZp3mJSKoQC9iA7NmpW7XRh2W76P5gpuxDci7Hf4Z',
        '30': 'EtnRd8fhFGKiG2nNXzhm7Xkyb1LPAt9B4mQHz48W5chBGXX',
        '2147483646': 'GFVnhS8NLvyshmPh1aaigNcJVMAZEbDG86Yx9iW4iC4F2S3',
        '2147483647': 'J1FZEjjWc56kGicQBaZgZgwTH9YbmtC7bv3zUiymsia5Bvc',
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
        '0': 'j4V5KPrx3VCZoBwgtkvUgSo3XKNhPYWyivN3pRiyg5qRHovgD',
        '1': 'j4Viebqn1pAXsPPx6uTnM7JimCHus7unVNfAmfigKAteFBzgM',
        '30': 'j4Te5LM2kwbkRoDf5sodLiJskMNog5Pe8SdZ6GspVTMYq5hx7',
        '2147483646': 'j4UznhRLDchR5xfPhCHDDfsibgH9WFTMCXgtEw3Us1z8C9drx',
        '2147483647': 'j4WkYTxdpkxZCqELuuTDCdm2vq4wtHzeBPAhjyNVLj9ehyd5P',
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
        '0': 'dfaJinf1gEopTPs28PHgCGq2vXiFFRnMTNgk54G9U4Ji9EgMM',
        '1': 'dfax3zdqeZmnXbKHLXpyrwLiAQdTj1BADpys2JFr79Mw6cn1v',
        '30': 'dfYsUj96PhD1618zKWAprYLs9ZiMXxf1rtxFLuQzHRpqgWacL',
        '2147483646': 'dfaEC6DPrNJfkAaivpeQjVuhztchN8iivz1aVZaeezTR3aKAH',
        '2147483647': 'dfbywrkhTWZos39g9XpQiTo2L3QVkBG1uqVPzbuf8hcwZQBwW',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLCGMaqBe8KrXWmWqNvR6MvPdf5zS5nssp',
        '1': 'rwVJSYRyQATGcntZAmJpPkCKe26iTLruCR',
        '30': 'rNTx6MdT6LUrfxwMqp44VZYC4L525yrC1Z',
        '2147483646': 'rP4M3zqJnWoLfhLP3ec2Y4CfR3rNUVefy',
        '2147483647': 'rhrws2EvTDEiABEPDv121LaCcwLrejJj1g',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'HNjsqStfSWyj2YsGugLTmq1gSLvNRweXCDfwN5KtAJcT',
        '1': '889i7gNfKByCWmESh5oco7A61N4HGbUynkviwycJUA66',
        '30': 'BUYJkoUdvt9KMbLTqrmc4jymiNA83pxr2rK1E3tg5tTx',
        '2147483646': 'L8sXBDYYFKXJmVYLB1oW6RxkEAieh1VoBXkPLKYoj4c',
        '2147483647': 'EAYjFd7cdchSZxtGGYSxD3fMQvugtGy4AuT1uV72vW2W',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xd58fc3fdfc73a92b6ac52c926a23fba2',
        '1': '0x291e99339eee2a1355b3921a5a06fd1f',
        '30': '0xe70d5c3d70db1d9fc0cabfa63c5111bb',
        '2147483646': '0x1dcdfbb976f66d1fc9e90f322079cb82',
        '2147483647': '0xc19b281e618b7bf9f6d7c1336e90abc0',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAL52PMQC2N72AHW3PYZPRRG7RGLIMSJXVLXB2QWIWW6MFKKWHJZS764',
        '1': 'GC44NC3MEP2DZLABGFOLNPLO6WALFF66K2OROULM24WE7GM2HASK2VVL',
        '30': 'GAMUTTKJIIQZRGJDTHJJKPV5N6GIOYNKMFXNYSM22NXW2LKBHRYAAYQZ',
        '2147483646': 'GCGD3N5DAJYTSLCP2KNLOJ6QEO4O7SOHXPQBMPINFKAMNMNYZ7VHCILY',
        '2147483647': 'GBEXNT74WKXL5OCZFAT4UTMVLWT7GEAFZW2BUX5A5RQTYDXY4FW2DEAR',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xafa48a4884194ce1d06bf8ea6f9d0d71fcb39226e6b459284b9e24aa5dde5484',
        '1': '0x6d52a1b77788549f2842bb432863772048d7204e28dd5250efe4dec2bb95f6aa',
        '30': '0x2bceb33a8707c8dd5661ce8c5835ba26a84a383f4a73ed15aec8d2244053090f',
        '2147483646': '0x7d91ddcc22089ac17aae12da5b0f44807a22f042c39ebfb3be75fc2032bde6e4',
        '2147483647': '0x18525c69ef0922a0bd89c1e4b43d702179cf9e35feaabb294472a64d87557b1f',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TBtj2DPAfH3M6PkcvC7QSYwjFxzXQDsoCG',
        '1': 'TCfPG4Aum282PqyUz6R5pg2e9BSMHS43co',
        '30': 'TUy89aYHJsPom8ZiZQAS3rEnUAuiXrPihn',
        '2147483646': 'TBZSH56wvZHmNh9QUq7M9QQA5dt1hDTYd9',
        '2147483647': 'TMW7V8hWGYHo76k3MkkCwV3PXzmPV46FDE',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC38eea6f527d9c7af1fc6b83401a07eb31d7336751b1644ed708f002140e94d3bb9c6',
        '1': 'BFC30f4eccaa5fa0a12708a2d6bf6879b35ee9b42c5e209c6219f41f6fb089685eb3b26',
        '30': 'BFCc88c66b96afc1cdd42bec62d0765c53cc1ec03628152362313aa9b3471f883a6d730',
        '2147483646': 'BFCbb62823ef854276107b020039f1a8a0ecbd53dd55485e2be435c3d5ad939d21e4eb5',
        '2147483647': 'BFCa9a2c081b09103758dcd3934e5f6d9dd867e047feccdb9baee68253bb59f6ce4aae3',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NWNVkbygETtvvz9BZski9McmuA3ADqtfaU',
        '1': 'NbbsE5gL62faMdqEi4829VkiBs8HSxvCZm',
        '30': 'NQRrQLq3pm8uKmUnnw2zDB1dkNUwTWpEng',
        '2147483646': 'NUDweteLKyHXAxPBvEr9QuzQ96BQZRNcbH',
        '2147483647': 'NYurkeYEsqs5mQXnhMkQLPtbsiop1qBngk',
      },
    },
  ],
} as AddressTestCaseData;
