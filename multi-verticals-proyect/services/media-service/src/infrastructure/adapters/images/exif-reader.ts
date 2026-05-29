import { logger } from '@allcoba/kernel';

import type { ExifParserPort } from '#application/ports/exif-parser.port.js';
import type { ParsedExif } from '#domain/canonical/processed-image-result.js';

export class ExifReader implements ExifParserPort {
  private readonly log = logger().child({ component: 'ExifReader' });

  async parse(buffer: Buffer): Promise<ParsedExif | undefined> {
    try {
      if (!buffer || buffer.length < 14) {
        return undefined;
      }

      // Buscar el comienzo de la cabecera TIFF
      let tiffOffset = 0;
      if (buffer.toString('utf8', 0, 4) === 'Exif') {
        tiffOffset = 6; // Omitir cabecera "Exif\0\0"
      }

      if (buffer.length < tiffOffset + 8) {
        return undefined;
      }

      const byteOrderIndicator = buffer.toString('utf8', tiffOffset, tiffOffset + 2);
      const isLittleEndian = byteOrderIndicator === 'II';

      if (byteOrderIndicator !== 'II' && byteOrderIndicator !== 'MM') {
        return undefined; // Cabecera TIFF no válida
      }

      // Validar número mágico TIFF (0x002A)
      const magic = this.readUint16(buffer, tiffOffset + 2, isLittleEndian);
      if (magic !== 0x002a) {
        return undefined;
      }

      // Offset al primer IFD (Image File Directory)
      const firstIfdOffset = this.readUint32(buffer, tiffOffset + 4, isLittleEndian);
      if (tiffOffset + firstIfdOffset >= buffer.length) {
        return undefined;
      }

      const exifData: {
        software?: string;
        date?: string;
        author?: string;
        copyright?: string;
        comments?: string;
        exifSubOffset?: number;
        gpsSubOffset?: number;
      } = {};

      // Parsear IFD0 (Directorio principal de imagen)
      this.parseIfd(
        buffer,
        tiffOffset,
        firstIfdOffset,
        isLittleEndian,
        (tag, type, count, valOrOffset) => {
          switch (tag) {
            case 0x0131: // Software
              exifData.software = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
              break;
            case 0x0132: // DateTime
              exifData.date = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
              break;
            case 0x013b: // Artist / Author
              exifData.author = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
              break;
            case 0x8298: // Copyright
              exifData.copyright = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
              break;
            case 0x9286: // UserComment / Comments
              exifData.comments = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
              break;
            case 0x8769: // EXIF IFD Pointer
              exifData.exifSubOffset = valOrOffset;
              break;
            case 0x8825: // GPS Info IFD Pointer
              exifData.gpsSubOffset = valOrOffset;
              break;
          }
        },
      );

      // Parsear EXIF Sub-IFD si existe para buscar comentarios adicionales u otros datos
      if (exifData.exifSubOffset && tiffOffset + exifData.exifSubOffset < buffer.length) {
        this.parseIfd(
          buffer,
          tiffOffset,
          exifData.exifSubOffset,
          isLittleEndian,
          (tag, type, count, valOrOffset) => {
            if (tag === 0x9286 && !exifData.comments) {
              exifData.comments = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
            }
            if (tag === 0x9003 && !exifData.date) {
              // DateTimeOriginal
              exifData.date = this.readAscii(buffer, tiffOffset, type, count, valOrOffset);
            }
          },
        );
      }

      // Parsear GPS Sub-IFD si existe
      let gpsData: ParsedExif['gps'] | undefined;
      if (exifData.gpsSubOffset && tiffOffset + exifData.gpsSubOffset < buffer.length) {
        let latRef = 'N';
        let latValues: number[] = [];
        let lngRef = 'E';
        let lngValues: number[] = [];
        let altRef = 0; // 0 = Above, 1 = Below
        let altValue = 0;

        this.parseIfd(
          buffer,
          tiffOffset,
          exifData.gpsSubOffset,
          isLittleEndian,
          (tag, type, count, valOrOffset) => {
            switch (tag) {
              case 0x0001: // GPSLatitudeRef
                latRef = this.readAscii(buffer, tiffOffset, type, count, valOrOffset).trim();
                break;
              case 0x0002: // GPSLatitude
                latValues = this.readRationalArray(
                  buffer,
                  tiffOffset,
                  type,
                  count,
                  valOrOffset,
                  isLittleEndian,
                );
                break;
              case 0x0003: // GPSLongitudeRef
                lngRef = this.readAscii(buffer, tiffOffset, type, count, valOrOffset).trim();
                break;
              case 0x0004: // GPSLongitude
                lngValues = this.readRationalArray(
                  buffer,
                  tiffOffset,
                  type,
                  count,
                  valOrOffset,
                  isLittleEndian,
                );
                break;
              case 0x0005: // GPSAltitudeRef
                altRef = valOrOffset & 0xff;
                break;
              case 0x0006: // GPSAltitude
                altValue = this.readRational(buffer, tiffOffset, type, valOrOffset, isLittleEndian);
                break;
            }
          },
        );

        if (latValues.length >= 3 && lngValues.length >= 3) {
          let lat = latValues[0]! + latValues[1]! / 60 + latValues[2]! / 3600;
          if (latRef === 'S') lat = -lat;

          let lng = lngValues[0]! + lngValues[1]! / 60 + lngValues[2]! / 3600;
          if (lngRef === 'W') lng = -lng;

          let alt = altValue;
          if (altRef === 1) alt = -alt;

          gpsData = {
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            alt: parseFloat(alt.toFixed(2)),
          };
        }
      }

      return {
        software: exifData.software,
        date: exifData.date,
        author: exifData.author,
        copyright: exifData.copyright,
        comments: exifData.comments,
        gps: gpsData,
      };
    } catch (err) {
      this.log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Error parseando EXIF',
      );
      return undefined;
    }
  }

  private parseIfd(
    buffer: Buffer,
    tiffOffset: number,
    ifdOffset: number,
    le: boolean,
    onField: (tag: number, type: number, count: number, valOrOffset: number) => void,
  ): void {
    const start = tiffOffset + ifdOffset;
    if (start + 2 > buffer.length) return;

    const fieldCount = this.readUint16(buffer, start, le);
    let offset = start + 2;

    for (let i = 0; i < fieldCount; i++) {
      if (offset + 12 > buffer.length) break;

      const tag = this.readUint16(buffer, offset, le);
      const type = this.readUint16(buffer, offset + 2, le);
      const count = this.readUint32(buffer, offset + 4, le);
      const valOrOffset = this.readUint32(buffer, offset + 8, le);

      onField(tag, type, count, valOrOffset);

      offset += 12;
    }
  }

  private readUint16(buffer: Buffer, offset: number, le: boolean): number {
    if (offset + 2 > buffer.length || offset < 0) return 0;
    return le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  }

  private readUint32(buffer: Buffer, offset: number, le: boolean): number {
    if (offset + 4 > buffer.length || offset < 0) return 0;
    return le ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  }

  private readAscii(
    buffer: Buffer,
    tiffOffset: number,
    type: number,
    count: number,
    valOrOffset: number,
  ): string {
    if (type !== 2 || count <= 0) return '';
    const start = tiffOffset + valOrOffset;

    // Si la cadena tiene 4 bytes o menos, se guarda en el campo del offset directamente
    if (count <= 4) {
      const tempBuf = Buffer.alloc(4);
      tempBuf.writeUInt32LE(valOrOffset); // Recrear representación
      return tempBuf.toString('utf8', 0, count).replace(/\0/g, '').trim();
    }

    if (start < 0 || start + count > buffer.length) return '';
    return buffer
      .toString('utf8', start, start + count)
      .replace(/\0/g, '')
      .trim();
  }

  private readRational(
    buffer: Buffer,
    tiffOffset: number,
    type: number,
    valOrOffset: number,
    le: boolean,
  ): number {
    if (type !== 5 && type !== 10) return 0; // RATIONAL o SRATIONAL
    const start = tiffOffset + valOrOffset;

    if (start < 0 || start + 8 > buffer.length) return 0;
    const num = this.readUint32(buffer, start, le);
    const den = this.readUint32(buffer, start + 4, le);

    return den === 0 ? 0 : num / den;
  }

  private readRationalArray(
    buffer: Buffer,
    tiffOffset: number,
    type: number,
    count: number,
    valOrOffset: number,
    le: boolean,
  ): number[] {
    if ((type !== 5 && type !== 10) || count <= 0) return [];
    const values: number[] = [];
    const start = tiffOffset + valOrOffset;

    for (let i = 0; i < count; i++) {
      const itemStart = start + i * 8;
      if (itemStart < 0 || itemStart + 8 > buffer.length) break;

      const num = this.readUint32(buffer, itemStart, le);
      const den = this.readUint32(buffer, itemStart + 4, le);
      values.push(den === 0 ? 0 : num / den);
    }
    return values;
  }
}
