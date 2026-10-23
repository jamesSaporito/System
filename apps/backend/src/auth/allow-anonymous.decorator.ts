import { SetMetadata } from "@nestjs/common";

export const ALLOW_ANONYMOUS = "allowAnonymous";

/** Skips the global SessionGuard for a controller or route. */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS, true);
