import React, { useMemo } from 'react';
// @ts-expect-error
import QRCodeUtil from 'qrcode';
import Svg, { Rect } from 'react-native-svg';

export type QRCodeProps = {
  size: number;
  ecl?: 'L' | 'M' | 'Q' | 'H';
  value: string;
};

const generateMatrix = (value: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H') => {
  const arr = Array.prototype.slice.call(
    QRCodeUtil.create(value, { errorCorrectionLevel }).modules.data,
    0
  );
  const sqrt = Math.sqrt(arr.length);
  return arr.reduce(
    (rows, key, index) =>
      (index % sqrt === 0 ? rows.push([key]) : rows[rows.length - 1].push(key)) && rows,
    []
  );
};

const QRCode: React.FC<QRCodeProps> = ({ ecl = 'M', size, value }) => {
  const matrix = useMemo(() => generateMatrix(value, ecl), [ecl, value]);
  const cellSize = size / matrix.length;

  const dots = useMemo(
    () =>
      matrix.flatMap((row: [], rowIndex: number) =>
        row.map((cell, columnIndex) =>
          cell ? (
            <Rect
              key={`${rowIndex}-${columnIndex}`}
              x={columnIndex * cellSize}
              y={rowIndex * cellSize}
              width={cellSize}
              height={cellSize}
              fill="black"
            />
          ) : null
        )
      ),
    [matrix, cellSize]
  );

  return (
    <Svg height={size} width={size}>
      <Rect fill="white" height={size} width={size} />
      {dots}
    </Svg>
  );
};

export default QRCode;
