import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { Members } from "@portfolio/access";
import {
  type AddMemberInput,
  addMemberSchema,
  type Member,
  type MembersResponse,
  type UpdateMemberPermissionsInput,
  updateMemberPermissionsSchema,
} from "@portfolio/access/api";
import { type AuthContext, CurrentAuth, RequireAdmin } from "./decorators";
import { asHttp } from "./errors";

@Controller("members")
@RequireAdmin()
export class MembersController {
  constructor(private readonly members: Members) {}

  @Get()
  list(): Promise<MembersResponse> {
    return asHttp(this.members.list());
  }

  @Post()
  add(
    @CurrentAuth() auth: AuthContext,
    @Body({ schema: addMemberSchema }) input: AddMemberInput,
  ): Promise<Member> {
    return asHttp(this.members.add(auth.user.id, input));
  }

  @Patch(":memberId")
  updatePermissions(
    @Param("memberId") memberId: string,
    @Body({ schema: updateMemberPermissionsSchema }) input: UpdateMemberPermissionsInput,
  ): Promise<Member> {
    return asHttp(this.members.updatePermissions(memberId, input));
  }

  @Delete(":memberId")
  @HttpCode(204)
  remove(@Param("memberId") memberId: string): Promise<void> {
    return asHttp(this.members.remove(memberId));
  }
}
