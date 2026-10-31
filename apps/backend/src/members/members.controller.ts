import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import {
  type AddMemberInput,
  addMemberSchema,
  type Member,
  type MembersResponse,
} from "@portfolio/contracts";
import { type AuthContext, CurrentAuth, RequireAdmin } from "../auth/access";
import { MembersService } from "./members.service";

@Controller("members")
@RequireAdmin()
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(): Promise<MembersResponse> {
    return this.members.list();
  }

  @Post()
  add(
    @CurrentAuth() auth: AuthContext,
    @Body({ schema: addMemberSchema }) input: AddMemberInput,
  ): Promise<Member> {
    return this.members.add(auth.user.id, input);
  }

  @Delete(":memberId")
  @HttpCode(204)
  remove(@Param("memberId") memberId: string): Promise<void> {
    return this.members.remove(memberId);
  }
}
