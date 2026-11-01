/** Why an access operation was refused; the app maps `kind` to its own responses (e.g. HTTP). */
export type AccessErrorKind = "invalid" | "not-found" | "conflict" | "unavailable";

export class AccessError extends Error {
  readonly kind: AccessErrorKind;

  constructor(kind: AccessErrorKind, message: string = kind) {
    super(message);
    this.name = "AccessError";
    this.kind = kind;
  }
}
