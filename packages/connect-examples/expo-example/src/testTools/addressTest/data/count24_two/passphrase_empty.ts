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
        '30': 'addr1qxxw9v82hzczmfqre934gjp34gv7x6xxe5z6e2yegnv3f7haatku0hg2s4a9sg7hnscp7mcfhqn6ad3frtaqu6q0fz0s0z2qx0',
        '2147483647':
          'addr1qxgl5jchgrzqv3yf7yasflewmqy6dehzzt3vt5rmn649949cy7crswrnz36f032u3thvy3pm6n6yhels8jff6hj9wljq9dlxkq',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'ODW6DKCDS5GIJQLE7AZBK46GEACEDNPIY6F4VU6REDTKQCE55IGGF3QOGI',
        '30': 'NQQHFZZGGOD5XOWBH4MI2H5SAD6MVKZ5MEV7HX2VACRZ5WL6E27TQD7ATQ',
        '2147483647': 'U6E2PDX7ANEK22GQ5SALRPZGY3JORSD2Z7WR7PIVECUORGUBUEMYTL2IOE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xb50436fcd38c60d22f39194df3ac257a60e57469e7d34f019ba05021ae6282ec',
        '30': '0xa4e7782a52cc84043944ae242afacc843983dfa83a146591f7bc3c44e8f48d89',
        '2147483647': '0x96d1f5b076aa766f1bd808d25f8817b3992debce6324f5b276ac35cc70c9d563',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
      },
      expectedAddress: {
        '0': '13WmVBjPamTJQfuGrjk7ffypXoXodorYke',
        '30': '1Mrf9HG1UA8bc6PHeGsXgyLcb98EuJR7Z',
        '20/C1/A2': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
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
        '30': '31n2p1yv4z3RGzsdWVt3Qb3xEyEkjzwJt6',
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
        '30': 'bc1qv8kpdhahfzwrk8zp0q0sknlva6fd3sc038maf2',
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
        '30': 'bc1pr4yjssu402sxvr2ym96p49a0346zejmhq37qdea9a2klaa386p7q60pwws',
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
        '30': 'DBQtJkkQ1zgyBP7b9mNTWoapcy57Ji1Dfi',
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
        '30': 'bitcoincash:qpaxn663k53yw74h5dnkjx3sk6hf94uklv2gxdwddx',
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
        '30': 'LPvBuQZqk2n8FQy81AWz9gkGKJgkUwzeXF',
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
        '30': 'MHAXQZMDwVVSexPFYJpFx9sX1uVQpQBuzK',
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
        '30': 'ltc1q4lcgqgx7t97gnll98k3daj8qtkj775yqcsphwy',
        '2147483647': 'ltc1q9z3pw8nnwknmlpez6u909q72ccg7vt9r9v7eyl',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aak23dcr2yefd13e7tj27h0nkcrecjsg0y6tep15v2',
        '30': 'cfx:aapb741nykm9v9vr4fa2g1gakwb32ug47a9n6g967a',
        '2147483647': 'cfx:aakvnebh99k8c8c2c8gh29eddesz47v5mu0fvpsvny',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1en8mty0xk7w48ccjlts2vkjhz4zqudma6ueh4z',
        '30': 'cosmos1t6t288f0chucep3vztpzfft7396eytm3539n3z',
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
        '30': 'akash1t6t288f0chucep3vztpzfft7396eytm3e2g5gc',
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
        '30': 'cro1t6t288f0chucep3vztpzfft7396eytm3v2d2dn',
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
        '30': 'fetch1t6t288f0chucep3vztpzfft7396eytm38vvhn4',
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
        '30': 'osmo1t6t288f0chucep3vztpzfft7396eytm3u2kr8s',
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
        '30': 'juno1t6t288f0chucep3vztpzfft7396eytm3zrxgk7',
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
        '30': 'terra1t6t288f0chucep3vztpzfft7396eytm3j4lnnz',
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
        '30': 'secret1t6t288f0chucep3vztpzfft7396eytm3k536v7',
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
        '30': 'celestia1t6t288f0chucep3vztpzfft7396eytm39m5rt0',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xAEc8748a977368f52954bbEFDb580323242E7468',
        '30': '0x96608c02Afaf4c94186107b3A9a1A35B2DAeb266',
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
        '2147483647': '0x0596DfC0Ab3F6F1e5D984DFF79189c4019c3aE9e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1ylrowkpbcvwqvjuwitv7ygmnj7wbo6o77jpc6dy',
        '30': 'f14qfpatlisyzafqmljzpzm3jlef3e5gtrn7iar3a',
        '2147483647': 'f1ncnnhdgcyhtwdcphi5q3tbnzbjte6knnemwf74i',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qphfk7l2twc4qcavhrdlm56vmu5xkl0vzh0yannacjfcdqy2jxp4288h788uq',
        '30': 'kaspa:qzl73wv5ldn5d436x052uru9mv0ylgfytklx3awdeyc0vpqx4fehkfjqka55w',
        '2147483647': 'kaspa:qptcpyectnuggfje7pqsc0udnqsnkcn4qhv5xtphuas6ujr0v0a5xasgnevvq',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '193fd69843be25166e8d5b677ce745a411c7871c0579c96ea705c839555b3f4d',
        '30': '016b9dc9be345627936511402adcaf6dc7c75aaaf036966f303e7ba707b7a01c',
        '2147483647': 'b9d179ba961cb5aa9b2007796b2a4372588b12415ef6a16e26908694cdca1e46',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NC37MHFYUIFZ6NZIDOKVYPFXRNZ5U3JRLRCAC3F2',
        '30': 'NBGB6MURPXP4O7YA6L3PIJIDHXZPLMTKL2FE55BN',
        '2147483647': 'NAGUOTQTKLVJWQUKSHVFHLKZVJMFT6CNMMYTFPZT',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5kgknelfm7dukurw6ckvxkfvxf4cevxatwd8yvqqz',
        '30': 'nexa:nqtsq5g5vxa75m2wj9qcdsnnmw4nwewpu3zqrhv5kc82pkzt',
        '2147483647': 'nexa:nqtsq5g5mhlwzw8u4gxjnxh8ra6mhrgq4kfmr7zwdk7wlhen',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '14khy9y9UGLEnsFfSb5zjoAgeccTjvxhGv9sDTviCrJBLy9F',
        '30': '13KTue3rvfWsQ9DrZUEf1JzugcikGod6oBf94cmXaNRickfT',
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
        '2147483647': 'j4WkYTxdpkxZCqELuuTDCdm2vq4wtHzeBPAhjyNVLj9ehyd5P',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLCGMaqBe8KrXWmWqNvR6MvPdf5zS5nssp',
        '2147483647': 'rhrws2EvTDEiABEPDv121LaCcwLrejJj1g',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'HNjsqStfSWyj2YsGugLTmq1gSLvNRweXCDfwN5KtAJcT',
        '30': 'BUYJkoUdvt9KMbLTqrmc4jymiNA83pxr2rK1E3tg5tTx',
        '2147483647': 'EAYjFd7cdchSZxtGGYSxD3fMQvugtGy4AuT1uV72vW2W',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xd58fc3fdfc73a92b6ac52c926a23fba2',
        '30': '0xe70d5c3d70db1d9fc0cabfa63c5111bb',
        '2147483647': '0xc19b281e618b7bf9f6d7c1336e90abc0',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAL52PMQC2N72AHW3PYZPRRG7RGLIMSJXVLXB2QWIWW6MFKKWHJZS764',
        '30': 'GAMUTTKJIIQZRGJDTHJJKPV5N6GIOYNKMFXNYSM22NXW2LKBHRYAAYQZ',
        '2147483647': 'GBEXNT74WKXL5OCZFAT4UTMVLWT7GEAFZW2BUX5A5RQTYDXY4FW2DEAR',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xafa48a4884194ce1d06bf8ea6f9d0d71fcb39226e6b459284b9e24aa5dde5484',
        '30': '0x2bceb33a8707c8dd5661ce8c5835ba26a84a383f4a73ed15aec8d2244053090f',
        '2147483647': '0x18525c69ef0922a0bd89c1e4b43d702179cf9e35feaabb294472a64d87557b1f',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TBtj2DPAfH3M6PkcvC7QSYwjFxzXQDsoCG',
        '30': 'TUy89aYHJsPom8ZiZQAS3rEnUAuiXrPihn',
        '2147483647': 'TMW7V8hWGYHo76k3MkkCwV3PXzmPV46FDE',
      },
    },
  ],
} as AddressTestCaseData;
