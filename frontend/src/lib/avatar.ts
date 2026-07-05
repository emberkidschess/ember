import { createAvatar } from "@dicebear/core";
import { initials } from "@dicebear/collection";

/**
 * Generates a stylish avatar data URI from a name using Dicebear initials style
 * @param name - The name to generate initials from
 * @returns Data URI of the generated avatar
 */
export function getStylishAvatar(name: string): string {
  const avatar = createAvatar(initials, {
    seed: name,
    fontSize: 40,
    fontWeight: 600,
  });
  return avatar.toDataUri();
}
