import {
	Body,
	Controller,
	Get,
	HttpCode,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthDto } from './dto/auth.dto'
import type { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('login')
	async login(
		@Body() dto: AuthDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { refreshToken, ...response } = await this.authService.login(dto)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('register')
	async register(
		@Body() dto: AuthDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { refreshToken, ...response } =
			await this.authService.register(dto)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('login/access-token')
	async getNewTokens(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const refreshTokenFromCookies = req.cookies[
			this.authService.REFRESH_TOKEN_NAME
		] as string | undefined

		if (!refreshTokenFromCookies) {
			this.authService.removeRefreshTokenFromResponse(res)
			throw new UnauthorizedException({
				message: 'Пользователь не авторизован'
			})
		}

		const { refreshToken, ...response } =
			await this.authService.getNewTokens(refreshTokenFromCookies)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@HttpCode(200)
	@Post('logout')
	logout(@Res({ passthrough: true }) res: Response) {
		this.authService.removeRefreshTokenFromResponse(res)
		return true
	}

	@Get('google')
	@UseGuards(AuthGuard('google'))
	async googleAuth() {}

	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async googleCallback(@Req() req: Request, @Res() res: Response) {
		const oauthUser = req.user as {
			email?: string
			name?: string
			picture?: string
		}

		const { refreshToken, accessToken } =
			await this.authService.validateOAuthUser({
				user: oauthUser
			})

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return res.redirect(
			`http://localhost:3000/dashboard?accessToken=${encodeURIComponent(accessToken)}`
		)
	}

	@Get('yandex')
	@UseGuards(AuthGuard('yandex'))
	async yandexAuth() {}

	@Get('yandex/callback')
	@UseGuards(AuthGuard('yandex'))
	async yandexCallback(@Req() req: Request, @Res() res: Response) {
		const oauthUser = req.user as {
			email?: string
			name?: string
			picture?: string
		}

		const { refreshToken, accessToken } =
			await this.authService.validateOAuthUser({
				user: oauthUser
			})

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return res.redirect(
			`http://localhost:3000/dashboard?accessToken=${encodeURIComponent(accessToken)}`
		)
	}
}
