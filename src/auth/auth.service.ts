import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { User, UserDocument } from './schemas/user.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username.trim().toLowerCase();
    const existing = await this.userModel.findOne({ username }).lean();
    if (existing) {
      throw new ConflictException('Username already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.userModel.create({ username, passwordHash });
    return {
      id: user._id.toString(),
      username: user.username,
    };
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim().toLowerCase();
    const user = await this.userModel.findOne({ username }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const expiresIn = dto.remember ? '30d' : '1d';
    const payload: JwtPayload = { sub: user._id.toString(), username: user.username };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });
    return {
      accessToken,
      expiresIn,
      user: { id: user._id.toString(), username: user.username },
    };
  }

  async updateUsername(userId: string, dto: UpdateUsernameDto) {
    const username = dto.username.trim().toLowerCase();

    const existing = await this.userModel
      .findOne({ username, _id: { $ne: userId } })
      .lean();
    if (existing) {
      throw new ConflictException('Username already in use');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    user.username = username;
    await user.save();

    return { id: user._id.toString(), username: user.username };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedException();
    }

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is invalid');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await user.save();

    return { ok: true };
  }
}
