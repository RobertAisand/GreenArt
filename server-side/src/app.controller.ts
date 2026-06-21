import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('Health Check') // Группировка в Swagger
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @ApiOperation({ summary: 'Проверка работоспособности API' })
    @ApiResponse({ status: 200, description: 'API работает' })
    getHello(): string {
        return this.appService.getHello()
    }
}