import {
  BadRequestException,
  ConflictException,
  type HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AccessError, type AccessErrorKind } from "@portfolio/access";

const STATUS: Record<AccessErrorKind, new (message?: string) => HttpException> = {
  invalid: BadRequestException,
  "not-found": NotFoundException,
  conflict: ConflictException,
  unavailable: ServiceUnavailableException,
};

/** Runs an access operation, turning its refusals into HTTP errors. */
export async function asHttp<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof AccessError) {
      const Exception = STATUS[error.kind];
      throw error.kind === "not-found" ? new Exception() : new Exception(error.message);
    }
    throw error;
  }
}
