import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// <--- fitur guard jwt pengguna login --->
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
// <--- end --->