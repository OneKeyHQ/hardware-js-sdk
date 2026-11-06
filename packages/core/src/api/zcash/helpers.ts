import { toHardened, validateStrictPath } from '../helpers/pathUtils';
import { invalidParameter } from '../helpers/paramsValidator';

// ZIP-32 account path: m/32'/133'/account'
export function validateZcashAccountPath(path: string | number[]): number[] {
  const addressN = validateStrictPath(path, 3);
  if (
    addressN.length !== 3 ||
    addressN[0] !== toHardened(32) ||
    addressN[1] !== toHardened(133) ||
    addressN[2] < toHardened(0)
  ) {
    throw invalidParameter("Zcash requires a ZIP-32 account path m/32'/133'/account'");
  }
  return addressN;
}
