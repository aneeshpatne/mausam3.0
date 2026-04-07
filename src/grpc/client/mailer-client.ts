import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "node:path";

const MAILER_PROTO_PATH = join(import.meta.dir, "../proto/sandesh.proto");
const DEFAULT_MAILER_ADDRESS = process.env.MAILER_GRPC_ADDRESS ?? "localhost:50052";

export interface SendEmailRequest {
  app_id: string;
  to: string[];
  subject: string;
  body: string;
}

export interface SendEmailResponse {
  success: boolean;
}

export interface SendTelegramRequest {
  html: string;
}

export interface SendTelegramResponse {
  success: boolean;
}

export interface CreateMailerClientOptions {
  address?: string;
  credentials?: grpc.ChannelCredentials;
  channelOptions?: Partial<grpc.ChannelOptions>;
}

type MailerServiceClient = grpc.Client & {
  sendEmail?: (
    request: SendEmailRequest,
    callback: grpc.requestCallback<SendEmailResponse>,
  ) => grpc.ClientUnaryCall;
  SendEmail?: (
    request: SendEmailRequest,
    callback: grpc.requestCallback<SendEmailResponse>,
  ) => grpc.ClientUnaryCall;
  sendTelegram?: (
    request: SendTelegramRequest,
    callback: grpc.requestCallback<SendTelegramResponse>,
  ) => grpc.ClientUnaryCall;
  SendTelegram?: (
    request: SendTelegramRequest,
    callback: grpc.requestCallback<SendTelegramResponse>,
  ) => grpc.ClientUnaryCall;
};

let defaultMailerClient: MailerServiceClient | undefined;

function loadMailerCtor(): new (
  address: string,
  credentials: grpc.ChannelCredentials,
  options?: Partial<grpc.ChannelOptions>,
) => MailerServiceClient {
  const packageDefinition = protoLoader.loadSync(MAILER_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const loaded = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    sandesh: {
      MailerService: new (
        address: string,
        credentials: grpc.ChannelCredentials,
        options?: Partial<grpc.ChannelOptions>,
      ) => MailerServiceClient;
    };
  };

  return loaded.sandesh.MailerService;
}

export function createMailerClient(
  options: CreateMailerClientOptions = {},
): MailerServiceClient {
  const MailerService = loadMailerCtor();

  return new MailerService(
    options.address ?? DEFAULT_MAILER_ADDRESS,
    options.credentials ?? grpc.credentials.createInsecure(),
    options.channelOptions,
  );
}

export function getMailerClient(): MailerServiceClient {
  if (!defaultMailerClient) {
    defaultMailerClient = createMailerClient();
  }

  return defaultMailerClient;
}

export function closeMailerClient(): void {
  if (!defaultMailerClient) {
    return;
  }

  defaultMailerClient.close();
  defaultMailerClient = undefined;
}

async function invokeUnary<TReq, TRes>(
  client: MailerServiceClient,
  methodNames: [camelCase: keyof MailerServiceClient, pascalCase: keyof MailerServiceClient],
  request: TReq,
): Promise<TRes> {
  const method = client[methodNames[0]] ?? client[methodNames[1]];

  if (!method) {
    throw new Error(`gRPC method not found: ${String(methodNames[0])}`);
  }

  return await new Promise<TRes>((resolve, reject) => {
    (method as (
      req: TReq,
      cb: grpc.requestCallback<TRes>,
    ) => grpc.ClientUnaryCall).call(client, request, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response as TRes);
    });
  });
}

export async function sendEmailRpc(
  request: SendEmailRequest,
  client: MailerServiceClient = getMailerClient(),
): Promise<SendEmailResponse> {
  return await invokeUnary<SendEmailRequest, SendEmailResponse>(
    client,
    ["sendEmail", "SendEmail"],
    request,
  );
}

export async function sendTelegramRpc(
  request: SendTelegramRequest,
  client: MailerServiceClient = getMailerClient(),
): Promise<SendTelegramResponse> {
  return await invokeUnary<SendTelegramRequest, SendTelegramResponse>(
    client,
    ["sendTelegram", "SendTelegram"],
    request,
  );
}
