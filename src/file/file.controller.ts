import {
    Controller,
    HttpCode,
    Post,
    Query,
    UseInterceptors,
    UploadedFiles,
    BadRequestException
} from '@nestjs/common'
import { FileService } from './file.service'
import { FilesInterceptor } from '@nestjs/platform-express' // Важно: FilesInterceptor
import { Auth } from 'src/auth/decorators/auth.decorator'

@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) {}

    @HttpCode(200)
    // Разрешаем загрузку до 10 файлов за раз
    @UseInterceptors(FilesInterceptor('files', 10)) 
    @Auth()
    @Post()
    async saveFile(
        @UploadedFiles() files: Express.Multer.File[],
        @Query('folder') folder?: string
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Файлы не загружены')
        }

		const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    		for (const file of files) {
        		if (!allowedMimeTypes.includes(file.mimetype)) {
            		throw new BadRequestException(`Тип файла ${file.mimetype} не поддерживается`);
        		}
    		}
        // Жесткая проверка: разрешаем только 'products' или 'avatars', чтобы нельзя было задать путь вручную
        const allowedFolders = ['products', 'avatars'];
		const targetFolder = folder && allowedFolders.includes(folder) ? folder : 'products';

        return this.fileService.saveFile(files, targetFolder)
    }
}