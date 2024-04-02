import { DataItem, addSemanticDecode, addSemanticEncode } from '../../thirdparty/cbor-sync';

const alreadyPatchedTag: number[] = [];
export const patchTags = (tags: number[]): void => {
  tags.forEach(tag => {
    if (alreadyPatchedTag.find(i => i === tag)) return;
    addSemanticEncode(tag, (data: any) => {
      if (data instanceof DataItem) {
        if (data.getTag() === tag) {
          return data.getData();
        }
      }
    });
    addSemanticDecode(tag, (data: any) => new DataItem(data, tag));
    alreadyPatchedTag.push(tag);
  });
};
