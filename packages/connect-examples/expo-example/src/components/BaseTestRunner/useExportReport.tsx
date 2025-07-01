import { useContext, useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';

import { TestCaseDataWithKey } from './types';
import { downloadFile } from '../../utils/downloadUtils';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import { ItemVerifyState, itemVerifyStateAtom } from './Context/TestRunnerVerifyProvider';
import { getDeviceInfo } from '../../utils/deviceUtils';

export default function useExportReport<T>({
  fileName = 'TestReport',
  reportTitle = 'Test Report',
  customReport,
}: {
  fileName: string;
  reportTitle: string;
  customReport: (
    items: TestCaseDataWithKey<T>[],
    itemVerifyState: { [key: string]: ItemVerifyState }
  ) => Promise<string[]>;
}) {
  const runnerInfo = useContext(TestRunnerContext);
  const itemVerifyState = useAtomValue(itemVerifyStateAtom);

  const [showExportReport, setShowExportReport] = useState(false);

  useEffect(() => {
    setShowExportReport(runnerInfo.runnerState === 'done' || runnerInfo.runnerState === 'stopped');
  }, [runnerInfo.runnerState]);

  const exportReport = async () => {
    const {
      runnerTestCaseTitle,
      timestampBeginTest,
      timestampEndTest,
      itemValues,
      runningDeviceFeatures,
      runningOneKeyDeviceFeatures,
    } = runnerInfo;

    if (!itemVerifyState) return;
    if (!timestampBeginTest) return;
    if (!timestampEndTest) return;
    if (!runningDeviceFeatures) return;

    const beginTime = new Date(timestampBeginTest).toLocaleString();
    const endTime = new Date(timestampEndTest).toLocaleString();

    const allSuccess = itemValues.every(item => {
      const caseItem = item as TestCaseDataWithKey<T>;
      const { $key } = caseItem;
      const state = itemVerifyState?.[$key].verify;
      return state === 'success';
    });

    const markdown = [];
    markdown.push(`# ${reportTitle} (${runnerTestCaseTitle})`);
    markdown.push(`Status: ${allSuccess ? 'Success' : 'Fail'}\n`);
    markdown.push(`Begin Time: ${beginTime}\n`);
    markdown.push(`End Time: ${endTime}\n`);
    markdown.push(``);

    markdown.push(`## Device Info`);
    const deviceInfo = getDeviceInfo(runningDeviceFeatures, runningOneKeyDeviceFeatures);
    markdown.push(`| Key | Value |`);
    markdown.push(`| --- | --- |`);
    Object.keys(deviceInfo).forEach(key => {
      // @ts-expect-error
      const value = deviceInfo[key];
      if (value) {
        markdown.push(`| ${key} | ${value} |`);
      }
    });
    markdown.push(``);

    const custom = await customReport(itemValues, itemVerifyState);
    markdown.push(...custom);

    const testCaseTitle = runnerTestCaseTitle?.replace(/-/g, '_');
    const formatTime = new Date(timestampBeginTest).getTime();
    const downloadFileName = `${fileName}(${testCaseTitle})${formatTime}.md`;

    downloadFile(downloadFileName, markdown.join('\n').toString());
  };

  return {
    showExportReport,
    exportReport,
  };
}
