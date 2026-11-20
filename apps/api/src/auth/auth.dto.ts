import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

const PHONE = /^\+?[0-9]{10,13}$/;
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export class RegisterDto {
  @IsString() @Length(2, 100) name: string;
  @IsEmail() @MaxLength(254) email: string;
  @Matches(PHONE, { message: 'Enter a valid mobile number' }) phone: string;
  @Matches(PASSWORD, { message: 'Password needs 8 to 72 characters with at least one letter and one number' }) password: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(1) @MaxLength(72) password: string;
}

export class VerifyOtpDto {
  @Matches(/^\d{6}$/, { message: 'Enter the 6 digit code' }) code: string;
}

export class GoogleDto {
  @IsString() @MinLength(20) idToken: string;
}
