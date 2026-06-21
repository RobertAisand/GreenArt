import { Module } from '@nestjs/common'
import { FileService } from './file.service'
import { FileController } from './file.controller'
import { ServeStaticModule } from '@nestjs/serve-static'
import { path } from 'app-root-path'

@Module({
	imports: [
		ServeStaticModule.forRoot({
    		rootPath: `${path}/uploads`,
    		serveRoot: '/uploads',
    		serveStaticOptions: {
        		index: false, // Запрещает отдавать индексные файлы
        		dotfiles: 'deny', // Запрещает отдавать скрытые файлы (типа .env или .git)
    		}
		})
	],
	controllers: [FileController],
	providers: [FileService]
})
export class FileModule {}
