import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { Controller, Get, Header, NotFoundException, Param, StreamableFile } from '@nestjs/common';
import { getUploadsDir } from '../../uploads-path';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEDIA_FILE_RE = /^[0-9a-f]{24}\.(jpg|jpeg|png|webp)$/i;

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

@Controller('media')
export class MediaController {
  @Get('businesses/:businessId/:filename')
  @Header('Cache-Control', 'public, max-age=86400')
  getBusinessMedia(
    @Param('businessId') businessId: string,
    @Param('filename') filename: string,
  ): StreamableFile {
    if (!UUID_RE.test(businessId) || !MEDIA_FILE_RE.test(filename)) {
      throw new NotFoundException();
    }
    const dir = join(getUploadsDir(), 'businesses', businessId);
    const abs = join(dir, filename);
    if (!existsSync(abs)) {
      throw new NotFoundException();
    }
    const stream = createReadStream(abs);
    return new StreamableFile(stream, {
      type: contentTypeForFilename(filename),
      disposition: `inline; filename="${filename}"`,
    });
  }
}
