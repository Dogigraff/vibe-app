/**
 * Database types - re-exports from Supabase generated types.
 * Run `npm run supabase:types` to regenerate types/supabase.ts
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
  Constants,
} from "./supabase";

import type { Tables } from "./supabase";

export type Profile = Tables<"profiles">;
export type Party = Tables<"parties">;
export type PartyMember = Tables<"party_members">;
export type PartyRequest = Tables<"party_requests">;
export type Message = Tables<"messages">;
export type Report = Tables<"reports">;
export type UserBlock = Tables<"user_blocks">;
