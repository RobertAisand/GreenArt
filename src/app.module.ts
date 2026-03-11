import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { CategoryModule } from './category/category.module'
import { FileModule } from './file/file.module'
import { OrderModule } from './order/order.module'
import { ProductModule } from './product/product.module'
import { ThrottlerModule } from '@nestjs/throttler'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        }),
        // Настройка защиты от брутфорса
        ThrottlerModule.forRoot([{
            ttl: 60000, // 60 секунд
            limit: 50,  // 50 запросов в минуту на один IP
        }]),
        AuthModule,
        UserModule,
        CategoryModule,
        FileModule,
        OrderModule,
        ProductModule
    ]
})
export class AppModule {}
