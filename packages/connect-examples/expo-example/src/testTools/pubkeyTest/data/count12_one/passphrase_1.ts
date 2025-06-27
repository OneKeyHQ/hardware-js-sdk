import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语1',
  passphrase: '12345',
  passphraseState: 'mwfiTkMnz8ed9txm7yybKCqRr4bndeTohm',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429195423',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '67aae4955cb121a20e394c0a076ad31d64439cc6ce1e6ca2e3c7bfdc799d0a72db5299eb4a059798835bd161077c0c8130b0b89bd2e7be719fb9f7de47f1ff82',
        },
        '25': {
          xpub: 'd8e4f4a526b460fb26b04ee11dcdec74d97b33d9875934bd1a21a48cc83242ac26d1fe2ac9debcb11fce1e6ee72d56e4558e209f6b0dfafaeeb2dcc094c96824',
        },
        '2147483647': {
          xpub: '4559c69f632048589d76f1185a8c7d759fe1a16d6cc0dcfc9e440a324d809cfe049d5d4a9eabdd9c3f42d22c944433b35289d05cf3d8d114c0dea9eddff99de4',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '4ccc65572193f4aeebdd45c5134c90d1f029eb7b9b6f35d9aaa8417e45a6a3ef',
        },
        '25': {
          publicKey: '3bea2e0818d6a8471c486323027a1da8551e834ffbe9a4cc6e979d52b3fc0033',
        },
        '2147483647': {
          publicKey: '7ff147aed7366eb369055a65742f769ba310bd3ddbb979c0f8ace587c5e3efc3',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03197d4a2e03520c037ef9cd8ec07202332875e462949aa583c8abd872609dc008',
          },
          xpub: 'xpub6Fn23hKjU3DzjcXTLY2dgHNV79dWjnwqyV85B8GeSJwJpZccPbzHLgrM8A3p5HofwyH1CKS93fC9AgG5SUe8iekN72LPZ8qtFZWjeFzekHp',
        },
        '25': {
          node: {
            public_key: '02f09b034940d5d149994ed76c383e668552547dd21fd32649e92821e5a38e2bb1',
          },
          xpub: 'xpub6Fn23hKjU3E1qA1TwD2NMVd91x6e27tV2AtaLGy6vvjAcVkNSQSD4qLy8SwqNKhdF9oezUEYNG5kHRxDd6oYGWX8eTiJNhewYqYnV3U16kQ',
        },
        '2147483647': {
          node: {
            public_key: '02707382a9381cb7982167e29a99cb5ee08f8d50bda6c9365026e2b771ce52f4bd',
          },
          xpub: 'xpub6Fn23hKsohkxr6KcrJ8n6myvNqkGui88K9CCXRXECpwBTeSAUnewo7J4LrFjXeeSvHd3yb3ivXrhhXFziEq7n3q2ajui4YF5hdJuPuRhGgR',
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
            public_key: '025f0e6c453b0becb4616355748e7a174fee6f1570e3f8f7e651048e7312320347',
          },
          xpub: 'xpub6C7LxiUzsgBctmrobMi6g6MsUpurnYdvUf7eydWRWtstW4QhAfwykhSbSQpowecy1A7j4Qutgb8rapviQW8hSQNVZWjxmJ1v2uRzpFd6vAs',
        },
        '25': {
          node: {
            public_key: '03c33979f2a4cf34175df487c85cd71d746c8687569eef18d10f222f7597b6d5fa',
          },
          xpub: 'xpub6C7LxiUzsgBe1ZMjGynuvQKviMVDr2cSc6CnufZ8JBbefTf1K4LhHT2Gp3djp76Vmr1vDzkxXmjsrEusdVKzS9DtatJF3jm2n87LcUnjDtt',
        },
        '2147483647': {
          node: {
            public_key: '030029ed89c98a81fd66282daa03fb348fcbc17a2480e5858caa7bf711960b8871',
          },
          xpub: 'xpub6C7LxiV9DLib3JecMwNx5TDm7YmoNRrpRvT4M9xfwhho6XeWHgGmMSqLH5XnvSzt6tCAd2wfJRNps17ynKnPXu3qYiFAc1gqMrBKYo7mhn6',
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
            public_key: '030d0dd6c1b953eaaa43136890891c0cbbe0e5463e0b7ede45c19bbfbdca3d4aaa',
          },
          xpub: 'tpubDCXPwfABcJjjU8ZZBRMVAUi7eLVRsnddTPmYYcVwMQZFpNJ9A61LavEd6DfJutLcYhis623r1SRkXEk25ia5Qaocbfs4PstgAunX2J86M2m',
        },
        '25': {
          node: {
            public_key: '03f9af200063e319a3280f89dd66161c407f2ae0ba5b2b10a1de580a6ac3e4ae5a',
          },
          xpub: 'tpubDCXPwfABcJjkZTsgqL4DEZy3SivcfD4veYoqaf9RcBnVGjTBG5RZ1SRbdhpikM8KLRHk2WCQVR2AKyYw3j3v3tukLttk6HptwTLFyNANk2q',
        },
        '2147483647': {
          node: {
            public_key: '032ed042ea9aeae79c69a7a15e86e350a50d5adcc8b8efe2bff2244866cdc0166f',
          },
          xpub: 'tpubDCXPwfAKwyGhaRrJgnkF9i3wRBFz67Rsw1qKvD7HiQqyFQsn2NAtUbwnkqCG6J6hVMQyiZgY3sfjczRy1H3JxcByHxneXFRtRnbAd9u98K8',
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
            public_key: '027c9df381dfafa939e319a40b30f607ba1a80cb0dc0833d3b1b1c404e116b95ec',
          },
          xpub: 'xpub6CM2Krrf1Ww4263Gqcd6eSsceicyMQuLsZCKbvyjSEwJxkEjpRyh4ZWZqZyKi6M2kL7aTheu1CsUAk8UpoiByA7ZDh78nDf155eviqSDFXL',
        },
        '25': {
          node: {
            public_key: '02bc2bb80468118631ee35ee90e63d2a65eb21999659ab2656d583f0f43433fcc6',
          },
          xpub: 'xpub6CM2Krrf1Ww56jLZqcmeUrMfXBqeA7ZkYcK4x1sFayTotojAZDM68jePNq67BQCtBE2syvjCN2ihiBoHBDdQuqaB7F4Gbr2GoHHhCTPpccb',
        },
        '2147483647': {
          node: {
            public_key: '036eaf4073273684a6f3100d7c1a7a97be77d8f785a5f66d0dfd953190eadaf3f4',
          },
          xpub: 'xpub6CM2KrroMBU29SrYh1nX6zWJZkVVnUGtxuE3XyT7V31dw8v3sz96fSWpLtnvfmF4aifTti1z4f5qLyqQruSUVpZJWSQZR7tqoVf6cWSPmt2',
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
            public_key: '02d78543fe00a5632d884e77d0979c917e0d6098c5f68af6d128485d9d1f46b982',
          },
          xpub: 'ypub6X6TbS5cGeuLu73YLAaDZFKuqSgsBqdTDm2qEJ8oBkM1imyK9JVjkbu2HGZoxsoGDFFUS8jDN7FmgRV6qAEWXTKDj53htouaHQxanS68Yt6',
        },
        '25': {
          node: {
            public_key: '034e45a4a10bda0a28e61e3cebc69641c2b961b1be1b31174509934bffb680258f',
          },
          xpub: 'ypub6X6TbS5cGeuMzErw8hQKnwampuJV9YiMDnjG7QPZ6edWaEE9fw7uQABrBEAbiBeTKz6fjbierXQGnsNBKvscDpYggggBurpbAicw7Ub84Gw',
        },
        '2147483647': {
          node: {
            public_key: '037bd52375de8520fa0e0502c8ae3f693577c38baba3ad0b81ef47d0c1862fc759',
          },
          xpub: 'ypub6X6TbS5kcKSK1oFnM5RVMD3vpa9DpA2Y7GjJRmXEitHu3tG67sUXC5wwUaUGgEMJith3mWB9xCsBpNTgHEyPdbL1Mq7WwVPyS23Gcv3wHPN',
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
            public_key: '0300f4260f1e14cb92191399e43a895fd36b05e2158f01f1e3ed20055ce93077ac',
          },
          xpub: 'zpub6rxeT8DQBfzjXdk1fMUARxVHLTnHj5oL9QaNaeYGJxjYWgySbeCDdbmCHbx4EcNpSuKYvbw1zDPBmmLU9TWZYvAUgXuFkY9yp7ncujRhwtD',
        },
        '25': {
          node: {
            public_key: '02d98109e7597ea1974a07aa9f2e198ab9b1ffc28c6703d4668a7674886ce33224',
          },
          xpub: 'zpub6rxeT8DQBfzkeWZbDu1fAoxVUVk5aG5Bg6cFFNzxzCq8iYgUYwSBNQoMSBwVZu8Df1m8bsFveBHyrayWgSqAPT5NxDriQfSP2iaY6Xv2vg2',
        },
        '2147483647': {
          node: {
            public_key: '030b2ad21d2f92db88dbb4e7ae5f3cd8e1ab261b06814772277a88cb6d6659c695',
          },
          xpub: 'zpub6rxeT8DYXLXhesSMjCtgkN6rgRWc45yGNKzdAZcmmDkoyuJBJ6jvtyxHBVSEpUCWJq5PHLH7JUvkFLcwRHdm1nBZaDmzwHLiLadfGGzoMjX',
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
            public_key: '0224fc2c792b9c10ac083aaf023706b720ca1c9d97d106e8a6a72643cfa67d3ed6',
          },
          xpub: 'xpub6CPCi9ux3poZWUQRHodQUwB1rqPDYmsNnV8byv5F93pQ7pQfvedx4JtHUpBfRUPiBv6NCQzPNSiZtnzpACkmpiHEpE6ceLcu7Qt2MKRT3Cj',
        },
        '25': {
          node: {
            public_key: '02442bf62964b7662332eed2d7dc872518e2afe4bec60f692153353a5c1cba21d4',
          },
          xpub: 'xpub6CPCi9ux3poacX7w8hgXoGjEq9MpZZSrYitmpKTVWLxWPuMA4ANY2PQCqkX5BsTDWGKB5SCXBaPpdZ32xrszADj3fhNa9PK9edeS4CoGkhz',
        },
        '2147483647': {
          node: {
            public_key: '02b12d6be786cf536627bddd02fcb37211ee0b06bc182112311c02b368bc33a670',
          },
          xpub: 'xpub6CPCi9v6PVLXdJPPXjkmyAjYyn4tkg9P8FLtNiRnMUZDhTs42WKTvsoDxDPzH62iXPvpzfFL6fcDh4fChWAZjtH1gppc6gHhepjRpBFxfEq',
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
            public_key: '02bd12d8c975f293f7293b59920118754dafd4665c9c942b98d0d645913d7cf4d9',
          },
          xpub: 'Ltub2Ztm75Ue1nTUnhrjwuqWGscXrCfvkALGm1upcvtW5Br5Ek5BWxK3DkzHRrdbi2kbyNP9z3fUTSZ5hGJzgMCsjGbFuJzanraRuGw4fmTRtep',
        },
        '25': {
          node: {
            public_key: '03f0be8805fc719efd4c6a8de28e909ef8d50826eeddf050f9af3553b786dfaa23',
          },
          xpub: 'Ltub2Ztm75Ue1nTVucf3uiPsxonBhGEnRwYH5yvnwRJZXgWjX1cotY2uWMXkJZVC9mSt5aqJwKtwxKtCSKgCoE2xCfPb5p8csVfUAR5cUx3e3jL',
        },
        '2147483647': {
          node: {
            public_key: '0253abe16ad1305435315e30d2a77127542b8433f7da6bda46606c9d798f62c0a6',
          },
          xpub: 'Ltub2Ztm75UnMSzSwWVB6JkgTECbzzRiuXCdWSe9d4ADwrFYNHe58UWjtfUJjfFULfp1vsknq7PiUZ4X9DanaXeA39893bQmf9UFoyoyQgs5tdw',
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
            public_key: '02b455c5844c91e837dbce716f143cbbaaafea3e9045e96a582b02f7695ae86c38',
          },
          xpub: 'Mtub2sMrNtecnPTm9igE3e54HfRZ3QaWVv1TqWb86ycJRrUPNCifVqDsgZfjsXsGuDzpsPffsg2pvmoHJ7iiqhvxFnW6vwQh4HHYEUuWTomauGc',
        },
        '25': {
          node: {
            public_key: '03c30de2b651e9d82540f0baab83bc12804b3d22f6dbaae7cf95730f62ad105738',
          },
          xpub: 'Mtub2sMrNtecnPTnGAW6zDkjcHRrGoioMwXaaVwRLhQLS95Jv7MUpcN82drJRBghpBEFPXfi9gCdnurKmG8xxnypcYh74a58gAjWmL229PqM9fG',
        },
        '2147483647': {
          node: {
            public_key: '0264b52200bb09612aae1a3ec1ac1be9324edc055b56dd50d4a13577d5b0e396c1',
          },
          xpub: 'Mtub2sMrNtem83zjH9Wb14wVmXbh8fjWnwLbHkPz7WsT8uyBY7FD4jbEqFScoVF9viBzcYaUSPqXVc2fLuK5p8DHJvq3YwaY6MTHuhZFe2RUehG',
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
            public_key: '03ad0fab16c48baaecdfa66f39275619dfe4af9c77076de38fa1d4e88738efb4e4',
          },
          xpub: 'zpub6s3WiYtzyCg9n2ceKsgHbD5atQrGZ7khUFxS7r8WtFA3XdFKS3yGNe8TAEgbVomqq9eAHpeBZkEgYaLHnAeCNkHCphAht8EjXPAZdycCsW9',
        },
        '25': {
          node: {
            public_key: '0213b468515f58b15eb8667165674d2a450f8c7755bdf801615c369f560675b6d1',
          },
          xpub: 'zpub6s3WiYtzyCgAsdy11vREwSjStdxm4Q2MkxBkx9osRR7pRe5o7CMAPrYQya6sFpocmHAWefQ659vMcwCP7Se31XV6jMiJ3kdLPQXydBTP3L2',
        },
        '2147483647': {
          node: {
            public_key: '033b8ccc0eea49fc8234115badd77c5c4c795a101242ffa99df2b0fbaecaf0d639',
          },
          xpub: 'zpub6s3WiYu9JsD7u7a8fPuPhpQA71E51hRrYYjpTxcdZ67yHgYxNVJmd78UrDoJWaqWUBUMJAX4sjneQmWNzUuCEFqe3jXjveD47iEnRsGxvVh',
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
            public_key: '02156f2cd8d2eb51060144e31c48acf83652eaaa7697b6f05676968a41526a8bba',
          },
          xpub: 'dgub8sP3iV2zu9VsHAXX6wchiKKHMKAC5pPj8ZDcXLVSJWGB1jQfaWrGnRYzdXfHMFzDJhk2zMjjrWrXXFjJREYUFTpwvvhuSx1LbRWY5AxKSbg',
        },
        '25': {
          node: {
            public_key: '02905675dac451a87af77a2e2e8aadf57c851d7077d3e2599b1db96df994b70d62',
          },
          xpub: 'dgub8sP3iV2zu9VtLqJF4nrmUztcQUFCQRBUDV5iZxEs6te3JgysVHcDmv5RrsoyTgQ8auoj8RQ8WXjDmXNesfMa3bdmxQdRULwLXgaRC6rjCup',
        },
        '2147483647': {
          node: {
            public_key: '0369201d05b7b09e19cd5ad25b2d054de75d70aa4e224c21eae963f4ff14d9a484',
          },
          xpub: 'dgub8sP3iV39Ep2qQ7HtHome9rhU1HSvFARRhdCczyxb9ZQV5vqQpt7nW4hx1AU4fNJqAeGPHRE8uL3bPd1dWeWKSctVvGg9zESCX6kPxjgRgMo',
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
            public_key: '03f55cfed8cb3c969106cdf0565595b38566d4cbb54587146d81bed1645d0cbf74',
          },
          xpub: 'dgub8sAd8WneWwDhupZAkAmcZP2LyBbDpKd5k1Cox6mM2wEmykD6k1eKArGArHPPaa66UB8sy71ufkHATWHEZmWc1bdgyCzF1UfMSjhK58u7V1p',
        },
        '25': {
          node: {
            public_key: '02af1e4c1a16ac22b0cbc2a9dc09f6e340b6f90d5a8c01171bf53b59a9ca90eb66',
          },
          xpub: 'dgub8sAd8WneWwDj21fqF2vdUbDRXVR85o3ms1sT4p4XDbtrH773xcSQCqYnWfcH8ggaBpaHbKBZ2LoSKdEf3PLgNPjtZKEDBdLE8Fz77wPPDT5',
        },
        '2147483647': {
          node: {
            public_key: '03cadcf69e21cfaa57c3926a1ba38a6f7b7df0414ba465194832c8994bc87b21a7',
          },
          xpub: 'dgub8sAd8Wnnrbkg3sDLvj3rDa8qvNTiSdXJUZQy5j4yF6haHDbvyrEZmNPeqgXJDZT2JwcrvMDZazt3qMLKjF9RsD5gKwuucrYp2EgHprfsbWi',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '027b192fd512029a943c65944da9fea7d326f66a02915d4d5b160abafe73f1e0b7',
        },
        '25': {
          publicKey: '037a6e3abc2710d465974bc2ee8fba8892c9b5da11dfdd66f21dc3eb7676719e93',
        },
        '2147483647': {
          publicKey: '0311769b3a4a3f48cf26c4eb9b0b328bf7c574007ce8c5ca8de324ad6e7cc7ccb5',
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
          xpub: 'xpub6CgfPJsEtANP65H5EePueeTrggA2GxDTmApAan9q4w1jFQ7QEg6dfawLrubdz5ttqHNW3srh2L3QyznoTQ9epGPsDhXSNpFucXXk38TrZmr',
          publicKey: '039279e99ba8f181cb4e09489a9f8c253db339bd70daafaa615576e359a6cc4163',
        },
        '25': {
          xpub: 'xpub6CgfPJsEtANQBxDxELrkgWJWjUQhEJ6iqYpaMusqXtVVGoeBxbuGwGy4GPQ7hGohWobbzSDFpwYmHNvjbV7Cd8qVpUG39fznaUf9po8rpCM',
          publicKey: '02d6de1d37acfd754b703e97fad91e7972f4a90cbe105c8a9ba8b2ec415691c508',
        },
        '2147483647': {
          xpub: 'xpub6CgfPJsPDpuMDFh9EVrQ6HWH73oRcUen7tfuvqFarrzdBzKyHLzovdNDXMcgpoiX3K7cWacr7eDBKXuzapn7WzYMDaLMcyAp2kJkzKSEpPm',
          publicKey: '03039715d75465c8c66f986ec19addc7b909ac232c2bfc96aa5b37a03bd9d82edb',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G6YnjFBFTjwnm2bnDdAUB3TrhLzXzWeXBrLp7AuxGdZb1JHMXKS2rNu92Z9kAu6LfjnUA5uD4wKyHVZFD8fjyqA7rt8Ju5DhMzeneZ19te',
          publicKey: '03eb6660f1ebdcde474bf6669344742ed85185fe51bf80a0d474de50809e065ba0',
        },
        '25': {
          xpub: 'xpub6G6YnjFBFTjxsZqSiWgdbAQhLi9DMX5jxkbS252aJCGLik21E6Pmaz1DZJuTbJ7VUX9FofSrurWnepbwAMGxenp2Gzw8kb8fx76memzCcwT',
          publicKey: '03b0081d57e03a1e2925b22aa8883a0def90db279a9ee4503b5d2c3b410fc2eeac',
        },
        '2147483647': {
          xpub: 'xpub6G6YnjFKb8Guun5pjtLdCFvqwwemoGY8ZCnCj8QFZK22mMrakcpfgknNPUBqEGcNK1nFuwUCw5xHDb5NiJNbT4BzcdqW64neGodvaa9JuCF',
          publicKey: '02625cd90c90cb1a1504b5c51e462e66cb9121edf19643aeb809e048379b94c0c8',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1cjk9nrjuj5mgfdl84hxh8hvty2fwu9l0lh5awrt456wj5pnkf8csrxgftn',
          publickey: 'c4ac598e5c953684b7e7adcd73dd8b2292ee17effde9d70d75a69d2a067649f1',
        },
        '25': {
          npub: 'npub1c44rpc872swddhk9tvvu3pvxqt94u2eyeswead3p382tyv23gr5sdljlkf',
          publickey: 'c56a30e0fe541cd6dec55b19c8858602cb5e2b24cc1d9eb62189d4b2315140e9',
        },
        '2147483647': {
          npub: 'npub1sxwj947w0d0zqt69vsjmvhkhu2y05s0wlh3cgmm2cqkk03c5vessm669h7',
          publickey: '819d22d7ce7b5e202f456425b65ed7e288fa41eefde3846f6ac02d67c7146661',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x4138e0924aab10de727eac4243baa05a55be4abd4666034ced56effe4c03d1e7',
        },
        '25': {
          publicKey: '0xa4f4324852c6f9d5bf485d3ce7bd68f60909b1bd29656d318085012ded58cfce',
        },
        '2147483647': {
          publicKey: '0x34505c51d7502c1d2c946383114ba5b1521d2fd2a656ff0f968342391cc75601',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0242a557cf4d7986967144d514ed894ef38cd20145afd075fb1061962b7ac89899',
        },
        '25': {
          publicKey: '026ae0302d1f71bb970d398a49d43773fc5894ea9928360b0e7e0506881169f2e2',
        },
        '2147483647': {
          publicKey: '03f8050028aaac41f316c022f0d1857dafc1cd667f4660a7dcd21478c01d58e55e',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'ea767b8dba2dfc0f7d912af04f348da28c332f0d33b704e19cab8c8ab8775573',
        },
        '25': {
          publicKey: 'bb5c524bd813e01f657c49c99ac96d003be84b36be42c26e6a9209fe341be8ee',
        },
        '2147483647': {
          publicKey: '7930898b4aeb3e4c7f05f72d95e436eafe3af7e2ed0ab9b08cb969a6ce5627b5',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
