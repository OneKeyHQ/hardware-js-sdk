import { ScriptExpressions } from '../ScriptExpression';
import { patchTags } from './patchTags';
import { RegistryTypes } from './RegistryType';

const registryTags = Object.values(RegistryTypes)
  .filter(r => !!r.getTag())
  .map(r => r.getTag());
const scriptExpressionTags = Object.values(ScriptExpressions).map(se => se.getTag());
patchTags(registryTags.concat(scriptExpressionTags) as number[]);
