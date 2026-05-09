import { Injectable } from '@nestjs/common';
import { CreateBusinessMemberDto } from './dto/create-business-member.dto';
import { UpdateBusinessMemberDto } from './dto/update-business-member.dto';

@Injectable()
export class BusinessMemberService {
  async create(dto: CreateBusinessMemberDto): Promise<CreateBusinessMemberDto> {
    return dto;
  }

  async update(id: string, dto: UpdateBusinessMemberDto): Promise<{ id: string; payload: UpdateBusinessMemberDto }> {
    return { id, payload: dto };
  }
}
