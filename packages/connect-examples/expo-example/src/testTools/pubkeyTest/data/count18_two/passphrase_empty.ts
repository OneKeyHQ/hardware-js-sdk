import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490398',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '1144cf8d79ea63cb2e6c05ad15bb20de89ad9f188868576b54ab594fc60809a88503ced935072e5d5aecc4a10764c4a8414019962ee79d74857da0035073ebbb',
        },
        '100': {
          xpub: '525250b1ca85696010fa9fead747b025443d6b217aeb1d631dde6a16b9679542e8838e8b12c7c282a0cc9efd47130622c7b8124c172c2758640b7081e60fb3e5',
        },
        '2147483647': {
          xpub: 'd6ff53dd2525cb7c508682fda75ec6bfb285296c457e239653d47b717719f4224d5d951623050343776c2ecb140fabb2305a2161c215c50e0d6fab47caffe6d6',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f6f6a66ede2a181659116c8832986152ab9c6cfe89156b474389087d6a9cb687',
        },
        '100': {
          publicKey: 'e7d0732cb33dfd3cafdbc989991edfe620df53d102b232886f45bdfd9bcc500c',
        },
        '2147483647': {
          publicKey: '6a4bdb3046086058b9b5e822ae2406ee40f00ac04bd64d362ea73c3e06349856',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '026755b5e820e75844f07af16feff12070cfef6e6d3eccc1e9c8a9520b1795c2d2',
          },
          xpub: 'xpub6HFjgAJLL6sqAqwtdyoz4jJoYcsMBSYQEr669rX2CjRhjXXGgKiwmQYcMgzkuRbbdWjb5mxAea5r7CQxtoqqHeYP68C2DsDCpp92o2FJhq3',
        },
        '100': {
          node: {
            public_key: '0205387166dbfc4f20eba6992e40cfd6c2b0e84d68a3c157fbcef7716732972d1e',
          },
          xpub: 'xpub6HFjgAJLL6suahgu2dQm86jqFuBopc5U5KBN1rSG4aWkJipj6g4myDfjK5Q6Bs1KcoAChyRdkZ2VDj7RG4Y8hjLyGNwEDXP97oQPHR9dKs2',
        },
        '2147483647': {
          node: {
            public_key: '03571a4b45bed1881b7cf687fe6e6662b0eea2f9ae39197770a1fc95c650c1b374',
          },
          xpub: 'xpub6HFjgAJUfmQoJwCzqfCoL5mQAw45i9dcp4JwJtGLfrJQ9hmJUYhoYXoUK6dAHtZgket8FSSxRcVkGiSahdwQrh8xxenH1edcjjN1CbhcDP2',
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
            public_key: '02b95d42f04700a7aab6cadda76fbd16a97d55a9e93367cb86283dba49353cf357',
          },
          xpub: 'xpub6DHc9oLtDxsHFh8jvV7igx8T5uk4NUGuVt5cHwDP3i888hKZWsUXbtYr74osp2CYBe9RkPDwHG6v35GSGxsevLAv5rRYCkyMEpqXxtLfXGh',
        },
        '100': {
          node: {
            public_key: '03007939d78703fe941a7e550ed23e9b2f4335f7073252b12fba2980b5869ee520',
          },
          xpub: 'xpub6DHc9oLtDxsMfovuqSaHM6DaiLsQvadCPcp6DubDeT4sc3iR2NWRS5aNTtZc9BqTXmnCPuSKEReqgRKyG7bVR5vgNhEQBaRqSTa1WHw6kKr',
        },
        '2147483647': {
          node: {
            public_key: '0310e502c1fac3f22d4799175cfcfe05554a91e378dbe66c662d3a00b9111b64cc',
          },
          xpub: 'xpub6DHc9oM2ZdQFR2siYXyy7wsrCUusVZXwHCKvdLceuwYvorQeLmt25Vbgw1EicQi4mZFNAkVGUuKA4R4e39P7XfRjgUHyDfnL2irw9gwsajH',
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
            public_key: '03f20e1817c07880d891952505dd87bba1a0eee244ddaf4c7581e34c1413c0ca47',
          },
          xpub: 'tpubDCcPGVzf9WCZhrAMW2qEFBZgjPwBXoWZ19U7jrAmSWhQdTyYHXSvoScemaG7jFw6EUZc1YrCrFGWpJcm2h3AeWihXpTB8RPHkqA3G6CmpK8',
        },
        '100': {
          node: {
            public_key: '023691771316d36540198dc93312cd38dbfec4215371bf88055fcb56cc64041b7d',
          },
          xpub: 'tpubDCcPGVzf9WCe6Y6qieXHV51qm5tCez1KZzyaMWd1VBpBTStAdNikvLXzxBESWoNBGpvku6Rjy3VG58Q6Y2b5w45cEj41ZX9rH1SyyPDYxJE',
        },
        '2147483647': {
          node: {
            public_key: '030986ec206afd2f39ffb8ee7942d1663c5e9d498116ff98e543221555deb649f8',
          },
          xpub: 'tpubDCcPGVzoVAjXqj8b6eDbTRKvK48vaCTNTGHsgYragoLanvqE8q4CUqNj4uF55gaLihQv2mAWnbXu2gg9ZHfGaXm3t3xnfasGduCVdi47HYK',
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
            public_key: '034415996f726a4be3e4ab444adb57db4dac01dca82ac8e19ed254981918fb8307',
          },
          xpub: 'xpub6CC6wqbMa51dcm5VeB2xWXKuLruLPSBhzMQr5NNz6Y9v3Da3XpQwL9oLHi8Zw8R46mNcUrzwiFKmuR7EGzEeHWQhEmiZ8SwhUJbsUEFMPUx',
        },
        '100': {
          node: {
            public_key: '03112b3cb048acdc7237f32be8e0a3ef8ffca6c3ae404dee187c99386ee3ae0e0e',
          },
          xpub: 'xpub6CC6wqbMa51hzV6gtWmzL97LnKBi1ihE1avjmLkrtGLzci5rKcSBEbURVuA5cN6X9Fcdj1rJZmsLEvADgKcNZfLB21D4NDs36vAHPhjMuGT',
        },
        '2147483647': {
          node: {
            public_key: '036d9edb6ab992a076d29782692610bd107afcf1cfd79276f00b0ae1611c147870',
          },
          xpub: 'xpub6CC6wqbVujYbiqWj2YnUhs8KE2GKJC36UV4iRT55CNLM9JTHm9mJKVPHgUkBLforrDFyG35kprDqCfjFj9pmBpwpH3KKjWC3sfn9F8AaEmJ',
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
            public_key: '0235d066ceb775f1b40d20d7fe02bfb1da31b73d95b1c6acb433468c4d1b6724ef',
          },
          xpub: 'ypub6WnvYuNXBsdeee46E4ghbTXqMjH1BTkSMzzLuoXRtrU6UVGZoFQoykV2Pr8kk2QjgUQCsbzRpBDKcQtVyZCXx58HDx67g58qKK3bo5hqqyu',
        },
        '100': {
          node: {
            public_key: '03629e82af1bae2aebcc8b07f0674ab260c8678616613218510771df9bcdb6779c',
          },
          xpub: 'ypub6WnvYuNXBsdj29FDoDoV3H3GMun7vfPtyJMGJduxnizzFsZUeJNXHStxuwARX1eu19DJmNEZvoeSy6FjpQ7Y2YW7W9kSS2V5rvNSwcecMWj',
        },
        '2147483647': {
          node: {
            public_key: '02e6683b2968a9f39215eecc755c4f2f82be68fe65a0f2a500314d44e16e459520',
          },
          xpub: 'ypub6WnvYuNfXYAcmF4ooR9j4ktSHgtRTZ9ybewgNieNFS6J9gbrBbfinKDVwmBVLWdYkQvGPtqBEhpA7Mx8ypSxkCRY23dqvUYUmznhqf5PssZ',
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
            public_key: '039223fb9cfc02043774f913448d3449a3601bd7cc34a8a797ead46cedd24db858',
          },
          xpub: 'zpub6rNNq8KKvMQjEn4yjDLxftDU2b4oLCXyeAKYkw9GiRgbdNg873Jvimv2xthRi1bUg4CzdtirdBN9npyciYHybL3KR8SFd1jmg3zW1uzLtoE',
        },
        '100': {
          node: {
            public_key: '03563c0f93d7beb51037a6f2e8b3b10a94f234b336b37a109936c68011c7ba4192',
          },
          xpub: 'zpub6rNNq8KKvMQodY42dxVV5Yas9wVp5uvRizSVMpzkY6GoGaeUjdRWTTbfKpiNktEz4aF4Ts7vc8aXrztwTEKjVTLbxm6iUmQmqMbijxKhsVq',
        },
        '2147483647': {
          node: {
            public_key: '03b84646fe44a0a38b839fafcb58486bbe71136b75f36c843d82ae1a1711446348',
          },
          xpub: 'zpub6rNNq8KUG1whNMgTBrtMX1Jxoc1nBw99KbijDHpDG6tSxRfqsuRxy6XfTpCMviyZhimTrWrphWHXE13dB13roiD5d6n61u5Jq3j5QdEmGgb',
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
            public_key: '02d08a3ee58e87ace86e7e5e36410db1874b13c183c40afdb0d926a2aca724f39e',
          },
          xpub: 'xpub6CcQy8VNbVPRfNcHiERyUEFPtQZvMoF3SyCP8QJ59FdiQvkE2rxTRp9m4ZKrar4sojzoWFcEt4y6BJtuyQiXct78p8jHaLz1g9sczhAVarW',
        },
        '100': {
          node: {
            public_key: '03354c4398d8f5fe4a0e953cb890dac4b649df818cc13052b48dab558ba4ce84c8',
          },
          xpub: 'xpub6CcQy8VNbVPW49Z2faiYkd85TifMnqQMnESTAZcVBhe5WkqDnGrSf1NH48Q21nSD4rj7biYysSWHftm7tBGLJPXfRLt58rSnFp6eDVhav19',
        },
        '2147483647': {
          node: {
            public_key: '03cac66a79237b48a056d46815a67ddaf420d6487f9cbae329d084a66ce98f421d',
          },
          xpub: 'xpub6CcQy8VWw9vPmLEdYAx9jBrcXvpMwX5QY4AxwUHyDqucjn6XuLVbADme919xNBS5DiGUUG79Smm5M3eExTcwniXgRYb9anva3xhDa3RfUDe',
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
            public_key: '029570a079302af53011206ff277b5aee0645a7f9705c8cb798f6a0269bb1a7e9c',
          },
          xpub: 'Ltub2ZEpjzXzfENkNYDU4ooBY8CqwucEXLD7e9GVG1Pj4DSxVZfy8nPu95jMmuQbWJY46yCkJ1RGEAzQcoKFwa1paLgDNhB4dbczaawb4dj9Wjt',
        },
        '100': {
          node: {
            public_key: '03199bcc7d5007dc199185927b17591b3ae4d77f85eebbb78f4511cea5b28df15d',
          },
          xpub: 'Ltub2ZEpjzXzfENpnmUXDiLx7qLWfA2MPp8k13GZyXSVocq5fVCkmaD66BzofM5E7z292FX4NUxMWaEn8UsUvbSAWaZdYLVPxCwNpusMo6Pzgcp',
        },
        '2147483647': {
          node: {
            public_key: '034d1e7d64b543f519f165dfc56f14a4a74c4b96edcd0211f0ffed2f4d8dcb2966',
          },
          xpub: 'Ltub2ZEpjzY8ztuiWs7hs1kzyzhf8vxBjCKaNZYs6BkHiVEanEM8LbwKiP3nAVHkJ3dqb8NtQ6HXKWqQEckvjtKfuv2MCXoGRVQPsEGuQpQspj7',
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
            public_key: '02fe21fcc560049cfda727c4bdc75db00420063bab90f141b53cf1f2fc56164c36',
          },
          xpub: 'Mtub2sS2ASYFjM68Xd66V34WAtqwEHtshsmSzLT72t4QPV7u194hE1FSRSYqAFfXQbjpeBvKq31LmNfS13DBMVaoHsZ7jyhe8gWohyfW5EaSPdC',
        },
        '100': {
          node: {
            public_key: '02cddbfcdcd8c675cbd53139af9560744580bd4ef25907fdbcad0c68bc8587a5e0',
          },
          xpub: 'Mtub2sS2ASYFjM6CvmYfLTfhWkVFwMGfdR8btQoRF6CcY7Qsw76uaGRjkyxaW3JBrXuhNbFE8evbpHkGLziK7ov9cV5JwV13ieTFBVXbF53xkB4',
        },
        '2147483647': {
          node: {
            public_key: '03fc44bf8209a06925890268db63684abc8e7a4b152aacf6151e9bd73611c5d62e',
          },
          xpub: 'Mtub2sS2ASYQ51d6fWdEYsrzJjfBKhrSoauKqgwiVSbY85okcCWiRLJhCnvBhnLF43kSKC7yWmZMpYssRAJhu2FY7sqmZ7mC8ECFECioWy73npm',
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
            public_key: '0283969254846cc2a107566c9b2f25f6b000cd137e2fda3ecbec6e0c7a98eaeff7',
          },
          xpub: 'zpub6qXThJEYnDQF7Y3ARm9v26e6MmRs1cdUViwowVzuqt9QTQFpQXnnSahcVxqg2coE1mfKus3xCjrEtQgz42HtXi1XAyMBGyboMpaXovXoqgs',
        },
        '100': {
          node: {
            public_key: '0321ca4142252273c39ac451275738f037a3ef07ddafb69c770f1aec767490c66e',
          },
          xpub: 'zpub6qXThJEYnDQKVdLmXbc8ZrmPpuxk5RAgQsEy1bBj9fgpchFZUTu6C1RH6mq9z8q7QxHhTcTJfetdzKsC1iDbCuJ8USJmyyBu6YEb7H5FdM6',
        },
        '2147483647': {
          node: {
            public_key: '0289aa8ef65b25644da2d843fd8862a7cd436854ec5d209fe07aea3ccf5b5216b7',
          },
          xpub: 'zpub6qXThJEh7swDF74sW1XHbfsXwyvzdWoAcP6G8zWL2JS8XsTgr8SF2V1ETJQhPA6ffAhSEawLFqti3QT5E2uuGY8JPEg1qJB3zyzHQtx7LZ5',
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
            public_key: '02a6925e7022ce6cc534f5fd1ceab2a257bb39fb3c7b43e54259e8035f3d89344f',
          },
          xpub: 'dgub8rYCgi7sNQjSeVPyYVrVExu9up1aHYfQFrfrcd2ErTkfx67dM8sj4skBUHUC8ct4fy9bd83e2sgVMhMGhhL6or3EZY3KbMSHeQ7DRpvW3Et',
        },
        '100': {
          node: {
            public_key: '037d312d2a2ccad43e4c342993a5aa2b60641353059e11553f29fdfaae33fdf5fb',
          },
          xpub: 'dgub8rYCgi7sNQjX3aLHGnZrP6qiHHiXqrxnnTdD4ZFhabdBzV3DoBuLQa9c8BgBX37uGbqV4cWfwSJE3FAkgSAPH2ne2BfkUpaQe8VZxorBfad',
        },
        '2147483647': {
          node: {
            public_key: '038aa54ff6940f451e619fc4d8125c3c4e6d4a8e50fc21559e92cd59ab8a7a0831',
          },
          xpub: 'dgub8rYCgi81i5GQmKArTd8GtEbwtLua3puXHWu26oWmeGLdzVmvGvCJNp7QUqXfEx5r8uvmwtE8o217v9719fwPMX6nQrZc5oPa1zBuD1N1gEM',
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
            public_key: '023c4a5ccafa99a25db733b10dea1ddc88bbe665cf196ce5d2da3e8a7666f83018',
          },
          xpub: 'dgub8sgv1SeMwLZCxM82x5TA5yoTPeuW1zHADUYh5LBeEbKcu851Qv4Ph5yXKYfd3tCcFoK7hwQPHm8ZrxfT37tawrV3pYzBWoEGi4b6gjDYMZe',
        },
        '100': {
          node: {
            public_key: '03a0a1207acee754df4963ee523efa1e1bf63d0e4ceb3348a85044185cd7a7f4d9',
          },
          xpub: 'dgub8sgv1SeMwLZHLPpEFMR6hs9jmtVQHRRTo6m7XkgR7KkzwjqAkF7XevYSc6vmkHLr9nLhtQFPSz6De518juH43B6yW5X3P6RhRuKR8yW3nrJ',
        },
        '2147483647': {
          node: {
            public_key: '025fe936cbd879239c728fda42037e66c19d0f53c66c48fc9bc265d2625999fb67',
          },
          xpub: 'dgub8sgv1SeWH16B6juzegfUsc8ppRSNB6b6nERoA3zG4zqfKrffRmwtnTTMfC124GXRkyduWnmgrvR7tmuem8on4VfNhL9UJTMVHUNzcn5SJQ9',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0340e585b2249f67bde8f5a5b41482fb6702c2f8e21f002e334172ded1a8680762',
        },
        '100': {
          publicKey: '026c8b08cd8b6f065d438f43cf0a89159a5e98c0920a7f54dea0b35de63051b2d2',
        },
        '2147483647': {
          publicKey: '036ba0113c24c2e8b2ff095a20a829acfc8d68882221bf81209c036fcbb34d1aea',
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
          xpub: 'xpub6CJ2ELqT6iScy7dJV9Hd9HL1y1tkCteTm7Rz8Sa3i929xUNeChusoYwQ6C22Dy1KrN6MH5LYWdWu4V3YcDE2JrfAUxm84S7xDbzjymhbyFv',
          publicKey: '03078a16e26fce81738600356650776519c4c135b04285fd2819a0b6cfd5dc6dfc',
        },
        '100': {
          xpub: 'xpub6CJ2ELqT6iShP2bxnSe5JsUsutzwn2JYTbZxBwQkWkwjuAYG94iuJdEwqPZW5CymtibJb4RkKvHRh4zb8VtcPzWeSdmTV8g5753HacGDhx2',
          publicKey: '03ecda2bff2013fb3b4d75953ca01ca6f48120a6e4f65d6ab31b3c2970fb67c9fe',
        },
        '2147483647': {
          xpub: 'xpub6CJ2ELqbSNyb94y7stNaaZTvSYyt5jpgU94KNwRa3xVr3doyk5mH4Lo9mcPNwYykEcQXZAxZwbGw4ADMs2pMK1TwCfSH1cCpjCTyt3zXM1K',
          publicKey: '02e2ec0f80a62906e9b1f48099aba8cd0ed4fbcf6b4e01a40449a624182d5e3de2',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GyVbgG81zUcn72aoWwFjP52EP3LGvzJMj6aTHjNmeDcCkQvL3m5nt4stNcvpJ15kAynTeePgRtLch7Q48qcGYSBGRbJTKM96aJ8WJDPUPb',
          publicKey: '03c3bada69e322d461795435e5688259c5385aa5d8be544de49773b708ea979286',
        },
        '100': {
          xpub: 'xpub6GyVbgG81zUh94AoUkWEnY3eMATKT1L2PxXVFvQxtQjKNMgkmBUnMaYkH7oAB5TSzUGhm5cxKygEpwQqcqrpZasFSXQQKL8CzVYp4gNbQKo',
          publicKey: '02ca00e5cc85338873fc5f03062d16351ce1af49e7a059db1e63c53c5c43161833',
        },
        '2147483647': {
          xpub: 'xpub6GyVbgGGMf1au1yfnN8P4NJMMUUGGmKpCgqGHAAaDkCLyA7x7eh8HD59NTsYuLEFPXCCgwVG34obDez8AdBtnoBvuLSyKnQbCosNe98hQVB',
          publicKey: '03176b25c8cec5690182dd68c07e0a1aec3c1e5de7247b25d62d91f68d46d3eb8c',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub19qmld6gm5gzaugudcghdx80ryycnafgnwlc8ccjve9p45hzf985qf60nd3',
          publickey: '2837f6e91ba205de238dc22ed31de321313ea51377f07c624cc9435a5c4929e8',
        },
        '100': {
          npub: 'npub1elp0whququfj4utqjadxtyzhzngkgeu2x06wk6tq3pcwgn6z3v4sgnexen',
          publickey: 'cfc2f75c1c07132af160975a65905714d164678a33f4eb69608870e44f428b2b',
        },
        '2147483647': {
          npub: 'npub1dlygtdzh4quhl4vhheldgsefgl0xrgnyk4c6e036gdgkwxz77pvq7cezqu',
          publickey: '6fc885b457a8397fd597be7ed4432947de61a264b571acbe3a435167185ef058',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x0c5aa1f92751887da248be2f60d6b229de11b25f0cb2d4a1074ee7daf47f7682',
        },
        '100': {
          publicKey: '0xf02f210408b58aebcfdfaeb1ddee257a8ac87af410a1a9d7e86089d5b96bd730',
        },
        '2147483647': {
          publicKey: '0x28499086e48f4d98bc3ba53f0daf6b1ec4b447c0f64c9031e7c9d588a86acd13',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '028f249eb7f5602a688f4806f847d1d10fac63427534b6a279c7e2e453ce33de4b',
        },
        '100': {
          publicKey: '02d5d6e43845742541485143645994622605ec24e8104837c5212c7476b5a1e552',
        },
        '2147483647': {
          publicKey: '033e80924ea6e34bf174d123fdb3c2e7072044e77ce65d708ba205cb7133935c78',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'c03f93b29356fba9383ff2c513ebf0199b850e24707cd94b8dd1a193d9af92a5',
        },
        '100': {
          publicKey: '02123b40f9e8fdda9a9aeb8c10e87fda1c34891c683b628d3d13473359c1d92b',
        },
        '2147483647': {
          publicKey: '663ab2b496e0df725e25eb233eba7d5d29c27cc1d1ea6e2525672648645ae965',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
