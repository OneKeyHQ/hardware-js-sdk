export type Pro2ResourcePackageSlot = {
  key: string;
  label: string;
  fileNamePrefix: string;
};

function matchesPackageFile(file: File, fileNamePrefix: string) {
  const fileName = file.name.toLowerCase();
  const prefix = fileNamePrefix.toLowerCase();
  return fileName === `${prefix}.okpkg` || fileName.startsWith(`${prefix}-resource-`);
}

export function matchPro2ResourcePackageDirectory(
  selectedFiles: readonly File[],
  slots: readonly Pro2ResourcePackageSlot[]
): Record<string, File> {
  const packageFiles = selectedFiles.filter(file => file.name.toLowerCase().endsWith('.okpkg'));
  const matchedFiles: Record<string, File> = {};

  for (const slot of slots) {
    const matches = packageFiles.filter(file => matchesPackageFile(file, slot.fileNamePrefix));
    if (matches.length === 0) {
      throw new Error(`Missing resource package: ${slot.label}`);
    }
    if (matches.length > 1) {
      throw new Error(`Duplicate resource package: ${slot.label}`);
    }
    matchedFiles[slot.key] = matches[0];
  }

  return matchedFiles;
}
