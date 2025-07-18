import { Exclude, Type } from 'class-transformer';
import { AddressType, Agent, User, UserStatus } from '@prisma/client';
import { RolesEntity } from '../../roles/entity/roles.entity';

export class UserEntity implements Partial<User> {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone: string;
  location: string;
  staffId: string;
  isBlocked: boolean;
  lastLogin: Date;
  addressType: AddressType;
  longitude: string;
  latitude: string;
  emailVerified: boolean;
  agentDetails: Agent;
  @Type(() => RolesEntity)
  role: RolesEntity;

  roleId: string;

  status: UserStatus;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
