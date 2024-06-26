import dnxGetTrackingKey from '../dnxGetTrackingKey';

describe('Test Mock Device method', () => {
  test('test dnxGetTrackingKey', () => {
    const res = dnxGetTrackingKey('', '', {
      mnemonic: 'all all all all all all all all all all all all',
      path: "m/44'/29538'/0'/0'/0'",
    });

    expect(res.payload.trackingKey).toEqual(
      '4d46ea3181268e93fe68c74dfb786f2e56be253c30a79609978f817653def21a7cf070f0fd14901a53b363de00bd980eb209db9f3c678c9b020ddf06e8b34fa000000000000000000000000000000000000000000000000000000000000000007d4ae59214a4170574eb04e8fe765eabbca4718d2da36dbbb63ff2b74932410f'
    );
  });
});
