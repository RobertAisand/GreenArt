import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './filters/all-exceptions.filter'
import cookieParser from 'cookie-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true, // <-- Это позволит автоматически преобразовывать типы из DTO
    forbidNonWhitelisted: true 
  	}))
	app.useGlobalFilters(new AllExceptionsFilter())
	
	app.use(cookieParser())
	app.enableCors({
		origin: [process.env.CLIENT_URL],
		credentials: true,
		exposedHeaders: 'set-cookie'
	})

		const config = new DocumentBuilder()
			.setTitle('GreenArt API')
			.setDescription('API documentation')
			.setVersion('1.0')
			.build()

		const document = SwaggerModule.createDocument(app, config)

		SwaggerModule.setup('api/docs', app, document)
	
	await app.listen(5001)
}

void bootstrap()
