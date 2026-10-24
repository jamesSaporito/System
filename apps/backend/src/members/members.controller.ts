import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  type InviteMemberInput,
  type InviteResult,
  inviteMemberSchema,
  type MembersResponse,
  type UpdateMemberInput,
  updateMemberSchema,
} from "@portfolio/contracts";
import { type AuthContext, CurrentAuth, RequireSiteRole } from "../auth/access";
import { MembersService } from "./members.service";

@Controller("sites/:siteId")
@RequireSiteRole("OWNER")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("members")
  list(@Param("siteId") siteId: string): Promise<MembersResponse> {
    return this.members.list(siteId);
  }

  @Post("invites")
  invite(
    @Param("siteId") siteId: string,
    @CurrentAuth() auth: AuthContext,
    @Body({ schema: inviteMemberSchema }) input: InviteMemberInput,
  ): Promise<InviteResult> {
    return this.members.invite(siteId, auth.user.id, input);
  }

  @Delete("invites/:inviteId")
  @HttpCode(204)
  cancelInvite(
    @Param("siteId") siteId: string,
    @Param("inviteId") inviteId: string,
  ): Promise<void> {
    return this.members.cancelInvite(siteId, inviteId);
  }

  @Patch("members/:userId")
  @HttpCode(204)
  updateRole(
    @Param("siteId") siteId: string,
    @Param("userId") userId: string,
    @Body({ schema: updateMemberSchema }) input: UpdateMemberInput,
  ): Promise<void> {
    return this.members.updateRole(siteId, userId, input.role);
  }

  @Delete("members/:userId")
  @HttpCode(204)
  remove(@Param("siteId") siteId: string, @Param("userId") userId: string): Promise<void> {
    return this.members.remove(siteId, userId);
  }
}
