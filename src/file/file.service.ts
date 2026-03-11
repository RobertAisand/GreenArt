import { Injectable, BadRequestException } from '@nestjs/common'
import { path } from 'app-root-path'
import { ensureDir } from 'fs-extra'
import { FileResponse } from './file.interface'
import { writeFile } from 'fs/promises'
import * as pathModule from 'path'
import * as crypto from 'crypto'

@Injectable()
export class FileService {
    // Список разрешенных расширений
    private ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

    async saveFile(files: Express.Multer.File[], folder: string = 'products'): Promise<FileResponse[]> {
        const uploadedFolder = `${path}/uploads/${folder}`
        await ensureDir(uploadedFolder)

        return await Promise.all(
        	files.map(async (file) => {
                // Доверие только MIME-типу, а не расширению из имени файла
                const ext = this.getExtFromMime(file.mimetype);
				if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
    				throw new BadRequestException('Недопустимый формат файла');
				}
                
                // Генерируем уникальное имя через UUID
                const fileName = `${crypto.randomUUID()}${ext}`;

                await writeFile(
                    `${uploadedFolder}/${fileName}`,
                    file.buffer
                );

                return {
                    url: `/uploads/${folder}/${fileName}`,
                    name: fileName
                };
            })
        );
    }
        private getExtFromMime(mimetype: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp'
        };
        return map[mimetype] || '.jpg';
    }
}