import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { PrismaSourcesStore } from "@portfolio/security-brief";
import {
  type AddSecurityNewsFeedInput,
  addSecurityNewsFeedSchema,
  type SecurityNewsFeed,
  type SecurityNewsFeedsResponse,
} from "@portfolio/security-brief/api";
import { RequireAdmin } from "../access/decorators";

/**
 * The news feeds the security brief reads, edited in the admin's Vulnerability Report tab.
 * Its own path: under /security-briefs, "feeds" would be read as a day.
 */
@Controller("security-news")
@RequireAdmin()
export class SecurityNewsSourcesController {
  constructor(private readonly sources: PrismaSourcesStore) {}

  @Get("feeds")
  feeds(): Promise<SecurityNewsFeedsResponse> {
    return this.sources.feeds();
  }

  @Post("feeds")
  async addFeed(
    @Body({ schema: addSecurityNewsFeedSchema }) input: AddSecurityNewsFeedInput,
  ): Promise<SecurityNewsFeed> {
    const feed = await this.sources.addFeed(input.url);
    if (feed === "exists") throw new ConflictException("That feed is already listed");
    return feed;
  }

  @Delete("feeds/:id")
  @HttpCode(204)
  async removeFeed(@Param("id") id: string): Promise<void> {
    if (!(await this.sources.removeFeed(id))) throw new NotFoundException();
  }
}
