import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';

import { JwtGuard } from './jwt.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

// <--- fitur controller auth login --->
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data.nrp, data.kata_sandi);
  }

  @UseGuards(JwtGuard)
  @Get('profil')
  profil(@Request() req) {
    return this.authService.ambilProfil(Number(req.user.id));
  }
}
// <--- end --->