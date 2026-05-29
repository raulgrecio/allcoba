import { describe, expect, it } from 'vitest';

import { ExifReader } from '#infrastructure/adapters/images/exif-reader.js';

describe('ExifReader', () => {
  const reader = new ExifReader();

  function createExifBuffer(options: {
    prefix?: string;
    littleEndian?: boolean;
    magic?: number;
    ifdOffset?: number;
    fields?: Array<{ tag: number; type: number; count: number; valOrOffset: number }>;
    extraData?: Buffer;
  }) {
    const le = options.littleEndian ?? true;
    const magic = options.magic ?? 0x002a;
    const ifdOffset = options.ifdOffset ?? 8;
    const fields = options.fields ?? [];

    const prefixBuf = Buffer.from(options.prefix ?? 'Exif\0\0');
    const tiffHeader = Buffer.alloc(8);
    tiffHeader.write(le ? 'II' : 'MM', 0, 2, 'ascii');
    if (le) {
      tiffHeader.writeUInt16LE(magic, 2);
      tiffHeader.writeUInt32LE(ifdOffset, 4);
    } else {
      tiffHeader.writeUInt16BE(magic, 2);
      tiffHeader.writeUInt32BE(ifdOffset, 4);
    }

    const fieldCount = fields.length;
    const ifd = Buffer.alloc(2 + fieldCount * 12 + 4);
    if (le) {
      ifd.writeUInt16LE(fieldCount, 0);
    } else {
      ifd.writeUInt16BE(fieldCount, 0);
    }

    let offset = 2;
    for (const field of fields) {
      if (le) {
        ifd.writeUInt16LE(field.tag, offset);
        ifd.writeUInt16LE(field.type, offset + 2);
        ifd.writeUInt32LE(field.count, offset + 4);
        ifd.writeUInt32LE(field.valOrOffset, offset + 8);
      } else {
        ifd.writeUInt16BE(field.tag, offset);
        ifd.writeUInt16BE(field.type, offset + 2);
        ifd.writeUInt32BE(field.count, offset + 4);
        ifd.writeUInt32BE(field.valOrOffset, offset + 8);
      }
      offset += 12;
    }

    if (le) {
      ifd.writeUInt32LE(0, offset);
    } else {
      ifd.writeUInt32BE(0, offset);
    }

    return Buffer.concat([prefixBuf, tiffHeader, ifd, options.extraData ?? Buffer.alloc(0)]);
  }

  it('debería retornar undefined si el buffer es nulo o demasiado corto', async () => {
    expect(await reader.parse(null as any)).toBeUndefined();
    expect(await reader.parse(Buffer.alloc(5))).toBeUndefined();
  });

  it('debería retornar undefined si el indicador de byte order no es II o MM', async () => {
    const invalidHeader = Buffer.from('Exif\0\0XX\x2a\0\x08\0\0\0\0\0\0\0');
    expect(await reader.parse(invalidHeader)).toBeUndefined();
  });

  it('debería retornar undefined si el magic number no es 0x002a', async () => {
    const buf = createExifBuffer({ magic: 99 });
    expect(await reader.parse(buf)).toBeUndefined();
  });

  it('debería retornar undefined si el primer offset de IFD está fuera de límites', async () => {
    const buf = createExifBuffer({ ifdOffset: 99999 });
    expect(await reader.parse(buf)).toBeUndefined();
  });

  it('debería parsear strings de hasta 4 caracteres (empaquetadas en el offset) y strings largas en extraData', async () => {
    // 0x0131: Software, 0x0132: DateTime
    // 'T1' empaquetada -> valor numerico en Little Endian: 'T1\0\0' -> 0x00003154
    const valueT1 = Buffer.from('T1\0\0').readUInt32LE(0);

    // String larga 'CustomSoft'
    const extraData = Buffer.from('CustomSoft\0');
    // Offset de extraData = 8 (tiffHeader) + 2 (fieldCount) + 2 * 12 (fields) + 4 (nextOffset) = 38
    const longStringOffset = 38;

    const buf = createExifBuffer({
      fields: [
        { tag: 0x0132, type: 2, count: 2, valOrOffset: valueT1 },
        { tag: 0x0131, type: 2, count: 11, valOrOffset: longStringOffset },
      ],
      extraData,
    });

    const res = await reader.parse(buf);
    expect(res).toBeDefined();
    expect(res?.date).toBe('T1');
    expect(res?.software).toBe('CustomSoft');
  });

  it('debería parsear otros tags principales como Artist (0x013b), Copyright (0x8298) y Comments (0x9286)', async () => {
    const authorVal = Buffer.from('Art\0').readUInt32LE(0);
    const copyVal = Buffer.from('Cop\0').readUInt32LE(0);
    const commVal = Buffer.from('Com\0').readUInt32LE(0);

    const buf = createExifBuffer({
      fields: [
        { tag: 0x013b, type: 2, count: 3, valOrOffset: authorVal },
        { tag: 0x8298, type: 2, count: 3, valOrOffset: copyVal },
        { tag: 0x9286, type: 2, count: 3, valOrOffset: commVal },
      ],
    });

    const res = await reader.parse(buf);
    expect(res?.author).toBe('Art');
    expect(res?.copyright).toBe('Cop');
    expect(res?.comments).toBe('Com');
  });

  it('debería soportar la decodificación de un EXIF Sub-IFD', async () => {
    // 0x8769 apunta al Sub-IFD.
    // Crearemos un Sub-IFD en extraData.
    // Offset de extraData = 8 + 2 + 1 * 12 + 4 = 26.
    const subIfdOffset = 26;

    // Construimos el Sub-IFD:
    // 2 bytes para el field count (1)
    // 12 bytes para el field: tag 0x9003 (DateTimeOriginal), type 2, count 5 (so > 4), valOrOffset = subIfdOffset + 2 + 12 + 4 = 44.
    // 4 bytes para next IFD (0)
    // Extra string data: 'Subby\0' at offset 44.
    const subIfdFieldCount = Buffer.alloc(2);
    subIfdFieldCount.writeUInt16LE(1, 0);

    const subIfdField = Buffer.alloc(12);
    subIfdField.writeUInt16LE(0x9003, 0);
    subIfdField.writeUInt16LE(2, 2);
    subIfdField.writeUInt32LE(5, 4); // count = 5 (> 4 to read from offset)
    subIfdField.writeUInt32LE(44, 8); // Offset absoluto en el TIFF

    const subIfdNext = Buffer.alloc(4);

    const subIfdString = Buffer.from('Subby\0');

    const extraData = Buffer.concat([subIfdFieldCount, subIfdField, subIfdNext, subIfdString]);

    const buf = createExifBuffer({
      fields: [{ tag: 0x8769, type: 4, count: 1, valOrOffset: subIfdOffset }],
      extraData,
    });

    const res = await reader.parse(buf);
    expect(res?.date).toBe('Subby');
  });

  it('debería parsear coordenadas GPS correctas en GPS Info Sub-IFD', async () => {
    // 0x8825 apunta al GPS IFD.
    // Offset de extraData = 8 + 2 + 1 * 12 + 4 = 26.
    const gpsIfdOffset = 26;

    // Construimos un GPS IFD con 6 fields:
    // 1. 0x0001 GPSLatitudeRef (Type 2, Count 2, 'S\0\0\0')
    // 2. 0x0002 GPSLatitude (Type 5, Count 3, Pointer to 3 RATIONALs)
    // 3. 0x0003 GPSLongitudeRef (Type 2, Count 2, 'W\0\0\0')
    // 4. 0x0004 GPSLongitude (Type 5, Count 3, Pointer to 3 RATIONALs)
    // 5. 0x0005 GPSAltitudeRef (Type 1, Count 1, value 1 = Below sea level)
    // 6. 0x0006 GPSAltitude (Type 5, Count 1, Pointer to 1 RATIONAL)

    // El GPS IFD tiene 6 fields.
    // Tamaño GPS IFD = 2 (field count) + 6 * 12 (fields) + 4 (next offset) = 78 bytes.
    // Los datos adjuntos (RATIONALs) empezarán en gpsIfdOffset + 78 = 104.
    const latRefVal = Buffer.from('S\0\0\0').readUInt32LE(0);
    const lngRefVal = Buffer.from('W\0\0\0').readUInt32LE(0);

    const latDataOffset = 104; // 26 + 78
    // 3 RATIONALs (3 * 8 = 24 bytes) -> lat: 40/1, 20/1, 30/1 -> 40.341667
    const latData = Buffer.alloc(24);
    latData.writeUInt32LE(40, 0);
    latData.writeUInt32LE(1, 4);
    latData.writeUInt32LE(20, 8);
    latData.writeUInt32LE(1, 12);
    latData.writeUInt32LE(30, 16);
    latData.writeUInt32LE(1, 20);

    const lngDataOffset = 104 + 24; // 128
    // 3 RATIONALs (3 * 8 = 24 bytes) -> lng: 3/1, 4/1, 5/1 -> 3.068056
    const lngData = Buffer.alloc(24);
    lngData.writeUInt32LE(3, 0);
    lngData.writeUInt32LE(1, 4);
    lngData.writeUInt32LE(4, 8);
    lngData.writeUInt32LE(1, 12);
    lngData.writeUInt32LE(5, 16);
    lngData.writeUInt32LE(1, 20);

    const altDataOffset = 104 + 24 + 24; // 152
    // 1 RATIONAL (8 bytes) -> alt: 150/1 -> 150.00
    const altData = Buffer.alloc(8);
    altData.writeUInt32LE(150, 0);
    altData.writeUInt32LE(1, 4);

    const gpsIfdHeader = Buffer.alloc(2);
    gpsIfdHeader.writeUInt16LE(6, 0);

    const f1 = Buffer.alloc(12);
    f1.writeUInt16LE(0x0001, 0);
    f1.writeUInt16LE(2, 2);
    f1.writeUInt32LE(2, 4);
    f1.writeUInt32LE(latRefVal, 8);

    const f2 = Buffer.alloc(12);
    f2.writeUInt16LE(0x0002, 0);
    f2.writeUInt16LE(5, 2);
    f2.writeUInt32LE(3, 4);
    f2.writeUInt32LE(latDataOffset, 8);

    const f3 = Buffer.alloc(12);
    f3.writeUInt16LE(0x0003, 0);
    f3.writeUInt16LE(2, 2);
    f3.writeUInt32LE(2, 4);
    f3.writeUInt32LE(lngRefVal, 8);

    const f4 = Buffer.alloc(12);
    f4.writeUInt16LE(0x0004, 0);
    f4.writeUInt16LE(5, 2);
    f4.writeUInt32LE(3, 4);
    f4.writeUInt32LE(lngDataOffset, 8);

    const f5 = Buffer.alloc(12);
    f5.writeUInt16LE(0x0005, 0);
    f5.writeUInt16LE(1, 2);
    f5.writeUInt32LE(1, 4);
    f5.writeUInt32LE(1, 8); // altRef: 1 (Below sea level)

    const f6 = Buffer.alloc(12);
    f6.writeUInt16LE(0x0006, 0);
    f6.writeUInt16LE(5, 2);
    f6.writeUInt32LE(1, 4);
    f6.writeUInt32LE(altDataOffset, 8);

    const gpsNext = Buffer.alloc(4);

    const extraData = Buffer.concat([
      gpsIfdHeader,
      f1,
      f2,
      f3,
      f4,
      f5,
      f6,
      gpsNext,
      latData,
      lngData,
      altData,
    ]);

    const buf = createExifBuffer({
      fields: [{ tag: 0x8825, type: 4, count: 1, valOrOffset: gpsIfdOffset }],
      extraData,
    });

    const res = await reader.parse(buf);
    expect(res?.gps).toBeDefined();
    // latitude = -(40 + 20/60 + 30/3600) = -40.341667
    expect(res?.gps?.lat).toBe(-40.341667);
    // longitude = -(3 + 4/60 + 5/3600) = -3.068056
    expect(res?.gps?.lng).toBe(-3.068056);
    // altRef is 1 -> -150
    expect(res?.gps?.alt).toBe(-150);
  });

  it('debería capturar errores inesperados y retornar undefined', async () => {
    // Pasar un proxy que cause una excepción al intentar acceder a propiedades del buffer
    const corruptBuf = new Proxy(Buffer.alloc(20), {
      get(target, prop) {
        if (typeof prop === 'string' && (prop.startsWith('read') || prop === 'toString')) {
          throw new Error('Forced exception');
        }
        return Reflect.get(target, prop);
      },
    });
    const res = await reader.parse(corruptBuf as any);
    expect(res).toBeUndefined();
  });
});
