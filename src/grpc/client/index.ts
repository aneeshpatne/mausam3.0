export {
  closeMailerClient,
  createMailerClient,
  getMailerClient,
  sendEmailRpc,
  sendTelegramRpc,
} from "./mailer-client";

export type {
  CreateMailerClientOptions,
  SendEmailRequest,
  SendEmailResponse,
  SendTelegramRequest,
  SendTelegramResponse,
} from "./mailer-client";
