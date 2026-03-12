import { useAtomValue } from 'jotai';

import { automationLogsAtom } from '../../../atoms/automationAtoms';
import AutoWrapperTextArea from '../../../components/ui/AutoWrapperTextArea';

export function LogsSection() {
  const logs = useAtomValue(automationLogsAtom);

  return (
    <AutoWrapperTextArea
      value={logs.join('\n')}
      editable={false}
      minHeight={120}
      maxHeight={320}
    />
  );
}
