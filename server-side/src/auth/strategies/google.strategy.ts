import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config/dist/config.service'
import { PassportStrategy } from '@nestjs/passport/dist/passport/passport.strategy'
import { Profile, Strategy } from 'passport-google-oauth20'
import { VerifiedCallback } from 'passport-jwt'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(private configService: ConfigService) {
		super({
			clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
			clientSecret: configService.getOrThrow<string>(
				'GOOGLE_CLIENT_SECRET'
			),
			callbackURL:
				configService.get<string>('SERVER_URL') +
				'/auth/google/callback',
			scope: ['profile', 'email']
		})
	}

	validate(
		_accessToken: string,
		_refreshToken: string,
		profile: Profile,
		done: VerifiedCallback
	) {
		const { displayName, emails, photos } = profile

		const user = {
			email: emails?.[0]?.value,
			name: displayName,
			picture: photos?.[0]?.value
		}

		done(null, user)
	}
}
