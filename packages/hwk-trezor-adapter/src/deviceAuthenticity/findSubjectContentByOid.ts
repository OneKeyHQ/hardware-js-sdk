import type { Oid, ParsedCertificate } from './x509certificate';

export const findSubjectContentByOid = (
  deviceCert: ParsedCertificate,
  oid: Oid
): Uint8Array | null => {
  const subjectItems = deviceCert.tbsCertificate.subject;
  const matchedItem = subjectItems.find(({ algorithmOid }) => algorithmOid === oid);
  if (!matchedItem || !matchedItem.parameters) return null;

  return matchedItem.parameters.asn1.contents;
};
