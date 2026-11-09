import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export * from "./grpc-common.js";
export { grpc, protoLoader };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROTO_ROOT = path.resolve(__dirname, "../proto");

const LOADER_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
};

// ----------------------------------------------------------------------------
// 1. Identity Service Definitions
// ----------------------------------------------------------------------------
export interface ValidateSessionRequest {
  token: string;
}

export interface ValidateSessionResponse {
  is_valid: boolean;
  user_id?: string;
  email?: string;
  full_name?: string;
  is_verified?: boolean;
  error?: string;
}

export interface GetUserRequest {
  user_id?: string;
  email?: string;
}

export interface UserProfileMessage {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetUserResponse {
  found: boolean;
  user?: UserProfileMessage;
}

export interface CheckMembershipRequest {
  user_id: string;
  space_id: string;
  required_role?: string;
}

export interface CheckMembershipResponse {
  is_member: boolean;
  role: string;
  permissions: Record<string, boolean>;
}

// ----------------------------------------------------------------------------
// 2. Memory Service Definitions
// ----------------------------------------------------------------------------
export interface MemoryMessage {
  id: string;
  space_id: string;
  author_id: string;
  title: string;
  content?: string;
  format: string;
  captured_at: string;
  location?: string;
  is_favorite: boolean;
  associated_profile_ids: string[];
  media_ids: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface GetMemoryRequest {
  memory_id: string;
  space_id: string;
}

export interface GetMemoryResponse {
  found: boolean;
  memory?: MemoryMessage;
}

export interface ListMemoriesKeysetRequest {
  space_id: string;
  limit?: number;
  cursor_time?: string;
  cursor_id?: string;
  profile_id?: string;
  is_favorite?: boolean;
}

export interface ListMemoriesKeysetResponse {
  items: MemoryMessage[];
  has_more: boolean;
  next_cursor_time?: string;
  next_cursor_id?: string;
}

export interface CreateMemoryRequest {
  id: string;
  space_id: string;
  author_id: string;
  title: string;
  content?: string;
  format: string;
  captured_at: string;
  location?: string;
  is_favorite?: boolean;
  associated_profile_ids?: string[];
  media_ids?: string[];
  tags?: string[];
}

export interface CreateMemoryResponse {
  success: boolean;
  memory?: MemoryMessage;
  error?: string;
}

export interface SearchMemoriesRequest {
  space_id: string;
  query: string;
  limit?: number;
}

export interface SearchMemoriesResponse {
  items: MemoryMessage[];
  match_count: number;
}

// ----------------------------------------------------------------------------
// 3. Proto Package Loaders & Client Builders
// ----------------------------------------------------------------------------

export function loadProtoDefinition(relativeProtoPath: string): any {
  const fullPath = path.resolve(PROTO_ROOT, relativeProtoPath);
  const packageDefinition = protoLoader.loadSync(fullPath, LOADER_OPTIONS);
  return grpc.loadPackageDefinition(packageDefinition);
}

// Identity Client & Service Definition
export function getIdentityProto(): any {
  const proto = loadProtoDefinition("identity/v1/identity.proto");
  return (proto as any).memorycapsule.identity.v1;
}

export function createIdentityClient(address: string, creds = grpc.credentials.createInsecure()): any {
  const identityProto = getIdentityProto();
  return new identityProto.IdentityService(address, creds);
}

// Memory Client & Service Definition
export function getMemoryProto(): any {
  const proto = loadProtoDefinition("memory/v1/memory.proto");
  return (proto as any).memorycapsule.memory.v1;
}

export function createMemoryClient(address: string, creds = grpc.credentials.createInsecure()): any {
  const memoryProto = getMemoryProto();
  return new memoryProto.MemoryService(address, creds);
}

// Media Client & Service Definition
export function getMediaProto(): any {
  const proto = loadProtoDefinition("media/v1/media.proto");
  return (proto as any).memorycapsule.media.v1;
}

export function createMediaClient(address: string, creds = grpc.credentials.createInsecure()): any {
  const mediaProto = getMediaProto();
  return new mediaProto.MediaService(address, creds);
}

// Book Client & Service Definition
export function getBookProto(): any {
  const proto = loadProtoDefinition("book/v1/book.proto");
  return (proto as any).memorycapsule.book.v1;
}

export function createBookClient(address: string, creds = grpc.credentials.createInsecure()): any {
  const bookProto = getBookProto();
  return new bookProto.BookService(address, creds);
}

