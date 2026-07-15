import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "node:path";

const DISCORD_PROTO_PATH = join(import.meta.dir, "../proto/discord_webhook.proto");
const DEFAULT_DISCORD_ADDRESS =
  process.env.DISCORD_WEBHOOK_GRPC_ADDRESS ?? "localhost:50051";

export interface AllowedMentions {
  parse?: string[];
  users?: string[];
  roles?: string[];
  replied_user?: boolean;
}

export interface EmbedFooter {
  text: string;
  icon_url?: string;
}

export interface EmbedImage {
  url: string;
}

export interface EmbedThumbnail {
  url: string;
}

export interface EmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: EmbedFooter;
  image?: EmbedImage;
  thumbnail?: EmbedThumbnail;
  author?: EmbedAuthor;
  fields?: EmbedField[];
}

export interface SendTextRequest {
  channel_name: string;
  content: string;
  username?: string;
  avatar_url?: string;
  allowed_mentions?: AllowedMentions;
  embeds?: Embed[];
}

export interface SendImageRequest {
  channel_name: string;
  data: Buffer | Uint8Array;
  filename: string;
  content?: string;
  username?: string;
  avatar_url?: string;
  allowed_mentions?: AllowedMentions;
  embeds?: Embed[];
}

export interface SendVideoRequest {
  channel_name: string;
  data: Buffer | Uint8Array;
  filename: string;
  content?: string;
  username?: string;
  avatar_url?: string;
  allowed_mentions?: AllowedMentions;
  embeds?: Embed[];
}

export interface SendResponse {
  success: boolean;
  error?: string;
}

export interface CreateDiscordWebhookClientOptions {
  address?: string;
  credentials?: grpc.ChannelCredentials;
  channelOptions?: Partial<grpc.ChannelOptions>;
}

type DiscordWebhookClient = grpc.Client & {
  sendText?: (
    request: SendTextRequest,
    callback: grpc.requestCallback<SendResponse>,
  ) => grpc.ClientUnaryCall;
  SendText?: (
    request: SendTextRequest,
    callback: grpc.requestCallback<SendResponse>,
  ) => grpc.ClientUnaryCall;
  sendImage?: (
    request: SendImageRequest,
    callback: grpc.requestCallback<SendResponse>,
  ) => grpc.ClientUnaryCall;
  SendImage?: (
    request: SendImageRequest,
    callback: grpc.requestCallback<SendResponse>,
  ) => grpc.ClientUnaryCall;
  sendVideo?: (
    request: SendVideoRequest,
    callback: grpc.requestCallback<SendResponse>,
  ) => grpc.ClientUnaryCall;
  SendVideo?: (
    request: SendVideoRequest,
    callback: grpc.requestCallback<SendResponse>,
  ) => grpc.ClientUnaryCall;
};

let defaultDiscordWebhookClient: DiscordWebhookClient | undefined;

function loadDiscordWebhookCtor(): new (
  address: string,
  credentials: grpc.ChannelCredentials,
  options?: Partial<grpc.ChannelOptions>,
) => DiscordWebhookClient {
  const packageDefinition = protoLoader.loadSync(DISCORD_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const loaded = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    discord_webhook: {
      DiscordWebhook: new (
        address: string,
        credentials: grpc.ChannelCredentials,
        options?: Partial<grpc.ChannelOptions>,
      ) => DiscordWebhookClient;
    };
  };

  return loaded.discord_webhook.DiscordWebhook;
}

export function createDiscordWebhookClient(
  options: CreateDiscordWebhookClientOptions = {},
): DiscordWebhookClient {
  const DiscordWebhook = loadDiscordWebhookCtor();

  return new DiscordWebhook(
    options.address ?? DEFAULT_DISCORD_ADDRESS,
    options.credentials ?? grpc.credentials.createInsecure(),
    options.channelOptions,
  );
}

export function getDiscordWebhookClient(): DiscordWebhookClient {
  if (!defaultDiscordWebhookClient) {
    defaultDiscordWebhookClient = createDiscordWebhookClient();
  }

  return defaultDiscordWebhookClient;
}

export function closeDiscordWebhookClient(): void {
  if (!defaultDiscordWebhookClient) {
    return;
  }

  defaultDiscordWebhookClient.close();
  defaultDiscordWebhookClient = undefined;
}

async function invokeUnary<TReq, TRes>(
  client: DiscordWebhookClient,
  methodNames: [
    camelCase: keyof DiscordWebhookClient,
    pascalCase: keyof DiscordWebhookClient,
  ],
  request: TReq,
): Promise<TRes> {
  const method = client[methodNames[0]] ?? client[methodNames[1]];

  if (!method) {
    throw new Error(`gRPC method not found: ${String(methodNames[0])}`);
  }

  return await new Promise<TRes>((resolve, reject) => {
    (method as unknown as (
      req: TReq,
      options: grpc.CallOptions,
      cb: grpc.requestCallback<TRes>,
    ) => grpc.ClientUnaryCall).call(client, request, { deadline: Date.now() + 15_000 }, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response as TRes);
    });
  });
}

export async function sendDiscordTextRpc(
  request: SendTextRequest,
  client: DiscordWebhookClient = getDiscordWebhookClient(),
): Promise<SendResponse> {
  return await invokeUnary<SendTextRequest, SendResponse>(
    client,
    ["sendText", "SendText"],
    request,
  );
}

export async function sendDiscordImageRpc(
  request: SendImageRequest,
  client: DiscordWebhookClient = getDiscordWebhookClient(),
): Promise<SendResponse> {
  return await invokeUnary<SendImageRequest, SendResponse>(
    client,
    ["sendImage", "SendImage"],
    request,
  );
}

export async function sendDiscordVideoRpc(
  request: SendVideoRequest,
  client: DiscordWebhookClient = getDiscordWebhookClient(),
): Promise<SendResponse> {
  return await invokeUnary<SendVideoRequest, SendResponse>(
    client,
    ["sendVideo", "SendVideo"],
    request,
  );
}
