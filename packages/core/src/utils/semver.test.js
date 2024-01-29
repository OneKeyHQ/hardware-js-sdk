import semver from 'semver';

const semverTest = [
  {
    description: 'success - normal version',
    version: '2.10.0',
    expected: '2.10.0',
  },
  {
    description: 'success - 0.0.0 version',
    version: '0.0.0',
    expected: '0.0.0',
  },
  {
    description: 'error - 0 version',
    version: '0',
    expected: null,
  },
  {
    description: 'error - unnecessary version',
    version: '2.10.0 QA',
    expected: null,
  },
  {
    description: 'error - normal version',
    version: '2.10',
    expected: null,
  },
  {
    description: 'error - null version',
    version: null,
    expected: null,
  },
  {
    description: 'error - empty version',
    version: '',
    expected: null,
  },
  {
    description: 'error - undefined version',
    version: undefined,
    expected: null,
  },
];

describe('Check Semver', () => {
  semverTest.forEach(data => {
    test(data.description, () => {
      const { version, expected } = data;
      expect(semver.valid(version)).toBe(expected);
    });
  });
});
