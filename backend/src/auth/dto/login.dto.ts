import { IsNotEmpty, IsString } from 'class-validator';

// <--- fitur dto login pengguna --->
export class LoginDto {
  @IsNotEmpty()
  @IsString()
  nrp!: string;

  @IsNotEmpty()
  @IsString()
  kata_sandi!: string;
}
// <--- end --->
