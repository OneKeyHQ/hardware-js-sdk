import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-密语1',
  passphrase: 'temp10086',
  passphraseState: 'mgGpxhbSthC4jMPvS88CYL28dXH5sb46nc',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429359364',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '6f8fdbfeb11e101be3f90c064c9e52dc1558c960009447628147820dc4bc15d71fea45f3c27b065fb3725388055321226ea61652d0469af9dd1826c4f3c1dd83',
        },
        '100': {
          xpub: '1e17c2c599bdecd82d7147fe7b4d8de2c35064ee9fcbf95f11e8b18cb14a0dbcdb3e8e7c321d65844915399993d91672c366022474066f886c2735980fb89eef',
        },
        '2147483647': {
          xpub: 'bb94d8108d70de48ea61e4bfc76031bf6ffde3a19e3750922ffb98dce18f600572d745686acabc9985ebbd998aabb7fbd8bb5be8deb55bf8b27111087f847ef2',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '3dc2ec50a10678333dc6537f3a46bc6373239f4d3d2ef243cca9c4bdcd85dd6b',
        },
        '100': {
          publicKey: '1267d83dc6a8873ab337068128b88c2c9ccee3ba4e67aa6037e8be3ad3dd7f5f',
        },
        '2147483647': {
          publicKey: '73e43b4e59efb7b5d37491382c2735834e04533fedddf5c83c29f51b49e16c61',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03bdf79450ba047fcfc563380c2b2f5401778a50464d3ecf12531e0f5e1ba48901',
          },
          xpub: 'xpub6H7TV2ztNgFEuXdTTA7ATQCGVFS4uZX2jgjXcX1Z1cbqPWrewAdJQfmdrwD7F69JHzeq2aUBNHtaxky6m6E2gy943FCrgCjvdBGQZvmRNwP',
        },
        '100': {
          node: {
            public_key: '0321fb9041bbcc2b27c3bd2811d3bf0dc396eb1af98b0c1b78e1077096b341aa50',
          },
          xpub: 'xpub6H7TV2ztNgFKJmKLPMct8W7HKG4VWr5boU4XffCUADpLGtQaCnP3r8aPsLNs7c1eDMrLTFCn3vo5t68rjzM4ZYHqGFeWoxekHYvDss2ud9o',
        },
        '2147483647': {
          node: {
            public_key: '03f8a1bf14d398b260eb0f07a4681d78f9879dd3a132eea85d4e955f3bf5d649fe',
          },
          xpub: 'xpub6H7TV312iLnD35aagWCkzQQeWSKYa7ry4pWFdGTPLX3k4W9S4iKdBnBQ5o4V5yM8iEEYkv9K9BXdzn7p96uR9u1vozbghSVyHjzJHdf9s2V',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: "m/44'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '02bd836397343bf60a51f20cc20ff4173307f9cc9d9caf00aeed6ade321db179b1',
          },
          xpub: 'xpub6Cq658ZfsbxRQNQbaYXs5MJhYi7XPuxhtz4D7HRgeeXDhLvDMTfou8bepaAZRucRCUZBce91yQ6b19bAypLTftCHYvPP8cxGGbJdDboP6dR',
        },
        '100': {
          node: {
            public_key: '027df7f599277e8c596c1dcac32f044a437106c3bfa81e13d9566cfa38d4d5c89e',
          },
          xpub: 'xpub6Cq658ZfsbxVohGi4Pxi5NMZ2fQQsVXiccQYBFCcWko6iZLMxZpYvfw2agJZsxMKnxLbM1dFkVzKKfHUDfMvtW7yWrSGJUf6U61N7MSwv4R',
        },
        '2147483647': {
          node: {
            public_key: '0278c35d68093fba8c2dc519e64bd1b6bba47c725542534f0105928e454d7b12c8',
          },
          xpub: 'xpub6Cq658ZpDGVPZaCb98qLpDgEZKivjwBjAYv6n4u8YyxE6WeNMjBvL8BennEfP9aLuFRPAHNn4Yb9NoNBs4FZKHM9NQHbozyuvGoJ6gSn7pk',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '0318ba755bd8b981f8921404588070e637ee34eca6ec2f89064e7a5c750cae160b',
          },
          xpub: 'tpubDCjj9bi6nYHXjx79r1fWa3yAWKc1rdDqary5ytZfygviAnUMoQKJ2HhEaS7cXmmwEBayauqEWdVHuxVv5MwTJaBgvKKfKapsBk5d2RYi6xq',
        },
        '100': {
          node: {
            public_key: '022e451f01ed19e78244da6d09495c35ed2abf6493bc79b1205b5b83989b0e45d2',
          },
          xpub: 'tpubDCjj9bi6nYHcAMrFeBw4c5fhEfwYeE81mMimTEhiX5BptvFk2dADXEt4vvPSbVf7AWhUUz5oNnJxyRq92a5Waq9w4p2vFUJ4x7skqTm9qcd',
        },
        '2147483647': {
          node: {
            public_key: '0391134ea1dfc0902319694bd1aea94bd2b8c0e2dadfa7241e96cadea72576ec63',
          },
          xpub: 'tpubDCjj9biF8CpVuUu5TdUz7mPwHRBw8MokRDL2x1xhShMmBfPVDBGUqWnv1UkXiYaxfYmKRg9sENv7uZ8VwxRnj55aaq9dhvQnZTKKBYu5YrB',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48',
      params: {
        path: "m/48'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '02bdc6a1b55d563a6de4ed7dc39bbccedd8b0a0e72d9c6b6fc16415400a95d5155',
          },
          xpub: 'xpub6CLidNBN4988ReRvPriGHbdA12npKzorDzHq6Y8Aa94kmhJU2GVk6BE7iE7BEtGTXLUSxZgfSuFBerLvRM7nRpZLvTzZXxLucALp7DZRjA7',
        },
        '100': {
          node: {
            public_key: '02e0560efc68e2864dc771954c729bc1017af48dfb64a1444583980d1154427740',
          },
          xpub: 'xpub6CLidNBN498CpaxjCGVdPHWdT4fCFsK1Snpf83ueuKSWC4NQ6r83AtGh1QCbg9wWMcw9jCHjYeAWu28RZUtoPW9tRk3AC7Y136TkZ1YdqND',
        },
        '2147483647': {
          node: {
            public_key: '0284f8222180333d469671003f1a924cb7158cde1635eef066b496b1aa354b06db',
          },
          xpub: 'xpub6CLidNBWPof6ZghGQv9QNmQa957PfWCePhzoASB88KfuxCEAfBBszgoPAaiCQHjhWAAFG1sjmhgAjXuz8MMykZZ1ESSDFrwcVpueHnBQqGG',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49',
      params: {
        path: "m/49'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03bb20d8d8376d3d199a46923f6fe97f2f00057f0ac065d57e40684480e5575116',
          },
          xpub: 'ypub6Y3iNW4P21c7cWgimkFBRm2cD36Uy6rHCLzjCBtKMEfiwPP8m7iyprxZAGh61GYjhYfWhp4CkZP4672qBnXMrk8czxfc7RePM1Zgo55GaU9',
        },
        '100': {
          node: {
            public_key: '02a91b7066ec291ff61cadbde943a2570e00ae76d0575aa34ae90926a4114af89a',
          },
          xpub: 'ypub6Y3iNW4P21cBzuveCRXb7WdWhgbifN293irjMsEvugNS78cjNwQfE3K1nRb38DV8Fy97JRxL9PUnLjj8wj9irBre2ZWYznaq1birFGNBVbe',
        },
        '2147483647': {
          node: {
            public_key: '03f5c6a6d20376feb2488787a0211270b6557f0587606cbac651807ca2029952db',
          },
          xpub: 'ypub6Y3iNW4XMg95jBV8eUvrXA75pm828Ys7E36EgMir8xCygdj7jTuvXCntg3pJ6v4tL1bwqtVyKVRuXaz8UuYEKnLwEn6kPzotik6TrPmaVCe',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84',
      params: {
        path: "m/84'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03fe94a94433f5fa3d28e8b892f654a94dc0872d27b7277e3466ec28c84463e305',
          },
          xpub: 'zpub6r41m8cmCT8NUARYuic4dkjeMQBVorEAs2K7MMXgmWNHRFDwM195vcM5VsmWhCqLWcE7VYLHKCQrUyYmRzSuGVB3RS8UReUtCFL61M8MSPW',
        },
        '100': {
          node: {
            public_key: '0290e1fce91f0daea15443498265214cb6325643cb31a0a06eddda250c34b2eb25',
          },
          xpub: 'zpub6r41m8cmCT8SspDqK19GDFkQPXZqy9X2wvaWoPmtd6gf5R14YykcR7S31sLuQadfaWgbVgq7dsAwv3yREyHUiuEVv8yQvtKLWr14MQQXMyZ',
        },
        '2147483647': {
          node: {
            public_key: '02a746ce21ccf50edbb9031984ded4784d490d1d05c69bc9044b0d888c68f96ae5',
          },
          xpub: 'zpub6r41m8cuY7fLd16hRk2cac7ELWJhQA5Qk9NTMkryyMuMhBw8bV9Ey9kbsqeQPTXkTVaYkhuyWKRFxucgDVZQvXZuixsdYDxJDax34NSkkkt',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-86',
      params: {
        path: "m/86'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '036a8bdcbfbf3a182f2d152f821e31a432aedea1b76d0f3cbf696fd2c1e3394d9d',
          },
          xpub: 'xpub6D8VzT7zzUFkZmR1QPxqCEBEy21MbD189V6a9uaDWWRFSpDkxP9PcKKvj9pZTdNcfwhnG9K5unzytiTNDGuGMY5LkcjeA8fjbuFeQgMw9D8',
        },
        '100': {
          node: {
            public_key: '03b648131f116ef96fdf0cd1cf38a4b372087016b2f949d3b292cc715db0a8e112',
          },
          xpub: 'xpub6D8VzT7zzUFpwHiupMEJkyqT4aRoqEt98Hzi1e9rsiSTYgiB6d9HXVSuiq56avAMtUgFGNQBQkVq3nSDURFntTYsuESFiBq6CMp3NaF32mk',
        },
        '2147483647': {
          node: {
            public_key: '03a2ed6762ecdfcbf8bbf775bad00cd202c0a2cfc14e58ac7c97812ef44c843fcc',
          },
          xpub: 'xpub6D8VzT89L8nihJj9zkdnAkqPPKkhhZ49uFEfUK2NQiDx1uBafPuypdSJhZ1ZZ9vb2P4PyVVSAb87cUGVYbounuNbAq5VJ1Dt6tbpFja3vSt',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-ltc',
      params: {
        path: "m/44'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '02e25392eed34476f358e111484941b1c46c202d58af943367d02f6654429185dc',
          },
          xpub: 'Ltub2YniCYsDmC8teQuUHmuFJFBLnoGnL136gcLGC8yiLyRzJ5e9vFdK3RVjbQWsnaf4abifqhJvQ1WhiBCS9kFxFVaYJzEBiqbNUEE2Eb78MRi',
        },
        '100': {
          node: {
            public_key: '02cccf8b7970bcea0d362c52df08988b4b9c0267de22a7dc1a9c94a0163af2c123',
          },
          xpub: 'Ltub2YniCYsDmC8y44VJW6JxF8rq9gG2eF92XctmFAX7Lbbw3CV9D25GRejQ5f6qMyCjp9XYUx2imGWE8xEuf8Q33DN3qupAdjPV4zHMhc2JJgb',
        },
        '2147483647': {
          node: {
            public_key: '0249b10904293b1649078a0ac07850170714d66e20897d32ae985b6247a17d1e0a',
          },
          xpub: 'Ltub2YniCYsN6rfrmUwDdDetfbp8jUPGLy6JmYKDqMS32bB2nMKH9L6peAgi2x31vA9ZC8thU7yJz7iWWGTkTucNZ9wHXNYo2aHHwvViB8YAVQm',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49-ltc',
      params: {
        path: "m/49'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '02e92552ff6cca95c62c93eb3eb2edbd89dddfc425d1a8fafaf6bf871894442947',
          },
          xpub: 'Mtub2sKL5CBmemDRAFtA3126Sm75jPsMkfZ2rA2DrEbV5g69Tg8rqwwf88ens1DxarvxkRNsdep5Uddy9326fxoQUbdPi6Phj3m3t7BtxyBPPMQ',
        },
        '100': {
          node: {
            public_key: '02a06e212fa78c39d057acdcd00f73bdc943eab6e805f75f87171899153ec711c8',
          },
          xpub: 'Mtub2sKL5CBmemDVYZqSg2pSH41faUg1NZPg6WeE9x7z9qKBRQtEACeq8xkVzt4ZL4ksmUq7Vo6SuWYpyyc46Je1wnFrAWGpDTkguzWrUtY4qvx',
        },
        '2147483647': {
          node: {
            public_key: '0225c39b41dc450258291c2aedb1af262d8d13756d67a2909826dc213cd83ac910',
          },
          xpub: 'Mtub2sKL5CBuzRkPKdVbFaYx4FjLjCXu2ePYrE86eZjsk4RczE6jwMBKKWkpT8LGKrTvRgeqSPaPyLadHePuYmeQLQL6rbFoKPo26B6k1WaNkQF',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84-ltc',
      params: {
        path: "m/84'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '0247ec7d9f5c93a35536d574220a15d69a85284a15608f6abf300b2eb2ea5a7ac3',
          },
          xpub: 'zpub6qZZcMgrQUQLpVRxzC26ZJKzvxRdEGfVFju57t8jzwXbRM5J9SzRxU9uTf1nE3GYGvND38hMMSSbELi7AeNXmPAEjZAJbraAp6PxDKc6A3G',
        },
        '100': {
          node: {
            public_key: '034ef7e5eb6442884576db5251723a1d5b22defe1abb57e639d0d1904233d87a29',
          },
          xpub: 'zpub6qZZcMgrQUQREqDr5rNZcsHpAQYZGJtR7GTxgG3yZ5R6uhsqeZcQXPJeCtWgGsy9qjAUyEW4zHKpJZNjArQiZ3jWXrqpJK1wdcNHXNryZx9',
        },
        '2147483647': {
          node: {
            public_key: '02812a066f5a0f9010c489dbb307a9453f5c1e80de2cbc7c26e841580662756d7c',
          },
          xpub: 'zpub6qZZcMgzk8wJyr1iEsiWKVZCqQ6skKwu2EQRH1CFP1QTEaJsABtSgy6BsjRj1iN3kXaz9YypfWv8T8JxoAkZUDry27N4wj7JpnAykP9cmPV',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '02c6a69d6951af413242e8f6b3e25016290c8d870beb6b6e9dabc4767115101f7d',
          },
          xpub: 'dgub8rUXqGnhdphhx8hSqcoT1wjZb394G8guwECLTREYrTxT9sWwMp7xz9DbQ5RrmaDqZ2pkbpYUsUfszurnS5dATGSf5KFqFFbiL81iumAxL5h',
        },
        '100': {
          node: {
            public_key: '035b5ea4698c6599b6d273672524ea9bb282f72f0ea452ea3da00c847d2ea9e850',
          },
          xpub: 'dgub8rUXqGnhdphnNQ1Ez5Knbutfy7ATCt1aHqr3mQQ7JRR6geDbZTHhy8XHgYYjoV4KPEZReGFFaruS9KBAJy8fJT38Q3RKWFHzVtxKMG9C34X',
        },
        '2147483647': {
          node: {
            public_key: '03dafde35de90532b3f17b476f4e98dfb49eaa913ccbbd908922face99ffaf8fe8',
          },
          xpub: 'dgub8rUXqGnqyVEg7Bz7XFa6U9J97XVda4PAnSzu6B5c3FZszpCQwN9vm6LpTTjiQZcSXpK6yEGGuwB3FmcLbVa9AdpbfGfZ3iytmnEgQA9SU4V',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48-doge',
      params: {
        path: "m/48'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '0394cf165bb4da63cc9d032fcf016e1ddfe691ac133ff3004d3b867b60c284d881',
          },
          xpub: 'dgub8s22VpDTwMJQJMo6eF64WQesf1kE4uqxCbkiwYYgc8pjWaUhaAZVXur1WDv1Uh7Q4B9uPNakqDyzSS6beY7CeHEh5Kwk7LhfZnsoxustjt5',
        },
        '100': {
          node: {
            public_key: '03a752b6b01c14b22951fe6de37fb4af0bfbabbecf993cb36cd1e2889cb53d6eea',
          },
          xpub: 'dgub8s22VpDTwMJUhp3pYifaJMMLag1weyeF2AKYjDrvzQBX8xEV47Br3d2CzJ24CSipLEnpH2eo9hvs64DQsaTFKnUGaGpJkyRFJt9jYp9uw6E',
        },
        '2147483647': {
          node: {
            public_key: '02f372c25c19f9898080495599cad07395e89922c6ab53fab319376f5f5a993d9f',
          },
          xpub: 'dgub8s22VpDcH1qNRvbqhSi5uYtoy9pmpCc8tMVpmCJwtx4TGNpiy33qHYSvgSQC3v7WuhA1vpbPjrTVZACikZKtVkRcZFg6ekDbU5rZfkNwfmE',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0249ae84ae3693c40460f58d4b7990c4b6379abdfb962111e464686683e13b268f',
        },
        '100': {
          publicKey: '02244d48aea987d13159144749e8f45f2edd4c475d4efbe91c68a206e5c871fe7f',
        },
        '2147483647': {
          publicKey: '0287e0713fe347d20211a0e7f5f4fd94cc7d3119cebcbcc284834750ad69c4f678',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: "m/44'/60'/$$INDEX$$'",
      },
      result: {
        '0': {
          xpub: 'xpub6CSBz5oznbymtbhCn356FtmT89eAmJwtaUG2vwkFSMTq8MTqC199SMdJad47gQ98sWrX4QsPKmjUXp31bHzwudWDEjK8E9uMhEckrH16AEv',
          publicKey: '039ca683961832c61c7b89c38eac4b4330635f1023c223a0aababd4eb1d5e3588c',
        },
        '100': {
          xpub: 'xpub6CSBz5oznbyrGrWZ4859AsBRXNY5UDMUtrD9vvApxoACi84cCMa78sDdXCPJ7txVDF1xT57CW9YWoNPRmGYB6rrKbANiswjsoNvFxPb9Yot',
          publicKey: '0283c160f8e420827c9e691b8cd2b0035400860b88bfc2836297734853fe7ffda4',
        },
        '2147483647': {
          xpub: 'xpub6CSBz5p98GWk1vbzyCE629ua7XhrPA4hP2ss6ExWMJwAhf4t5whSRgRB9LNr3CNmcbtuexJckNDHjJYALRSZNMVa3XTXyVEAsMsohJ64jPk',
          publicKey: '032a904352bd27a630a01d9ef32c8402e48f99848f80c502fc278193feb38273d1',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G38qcKwvCx8qcMW78Cij4HKJnjtizWr1u1QXwCCfJau4g9FYDCksxuRTZvonHr2BNADBDxD2xN11gYVkfdT22LVGXmKWc4kfsqkMNwBCFf',
          publicKey: '03f571314885fd2e3929edb1eec5661f7e47c155c495eeb73371236737b972415f',
        },
        '100': {
          xpub: 'xpub6G38qcKwvCxDF2KdArNpUgayioXuUrrVdWu5Dhupo19W65kKNHfz9uk7CPc6dQxMgEJBLo97A1Y9Gyg88UuAjuJBJkVtNSnUK44XgoUHenG',
          publicKey: '0393225f413f5c4078568cef8d9eba49198e12f08f6811857bf1f00a03a9f179ae',
        },
        '2147483647': {
          xpub: 'xpub6G38qcL6FsV6zpzBunat7d5xrJsyjs8HRrvQTWMK33i6aLN9tiLYMrb5zfgaasTV9CzBvzBPgyxxQpiH45sAaN1orm4jzNwWN4euAyZGg7G',
          publicKey: '02879acde0d0972cfcf436a505c00c66e51709253fd3b11d62c442fdf554e6a54f',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub18haeahsyzay4544vtp7qy4mavscv48g24ckh929d5uwf92tlmdmqmh63y0',
          publickey: '3dfb9ede0417495a56ac587c02577d6430ca9d0aae2d72a8ada71c92a97fdb76',
        },
        '100': {
          npub: 'npub1mvzhtjaqgycl8w3a9xn72ylq3fn2hqypt68y93jm5m29tx337fvqwzf86h',
          publickey: 'db0575cba04131f3ba3d29a7e513e08a66ab80815e8e42c65ba6d4559a31f258',
        },
        '2147483647': {
          npub: 'npub1epr7dx78wjsqshjjfj5cccu54xkg29dtk6s9t3ma5zytrjmjrdwqz0sjcv',
          publickey: 'c847e69bc774a0085e524ca98c6394a9ac8515abb6a055c77da088b1cb721b5c',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xcc4fbb1d65fc8e8c17144ab0f456a5aeec86638af3781254e49ff249a735f800',
        },
        '100': {
          publicKey: '0x7f4d274aa6accac63e525dc8d46c278c265abb552f57c7ef0e42764c872676e3',
        },
        '2147483647': {
          publicKey: '0x6622b72613f45af84f60b061480775dca38656da3d77e0a3433f6c32d2d73827',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '030742f70ca9ead04fc8b8b8605773ad1632214cfd6da187763acfa6db24657b6e',
        },
        '100': {
          publicKey: '030784ed0b23201f1b0a1c1e98d3fccaaefde31dfdca430b10870841b90d279838',
        },
        '2147483647': {
          publicKey: '0378a79b6df51f536e348e8d6146100ed960c052c4e53035084bfffda7d9ba9d01',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '98481a751c506a0b61177a113db7194dedec338c3330d33e5222a8745a0c036f',
        },
        '100': {
          publicKey: '52edd6f365b79d11fced986440c5e679f609da27baf2dd8d8719c7b5b0fbf3f6',
        },
        '2147483647': {
          publicKey: 'a523e55f23836ae90516697871bb441e3d70d8e55b44f667f2fc48a9c4bdc897',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
