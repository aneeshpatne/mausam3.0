export {
  closeMailerClient,
  createMailerClient,
  getMailerClient,
  sendEmailRpc,
  sendTelegramRpc,
} from "./mailer-client";

export {
  closeDiscordWebhookClient,
  createDiscordWebhookClient,
  getDiscordWebhookClient,
  sendDiscordImageRpc,
  sendDiscordTextRpc,
  sendDiscordVideoRpc,
} from "./discord-webhook-client";

export type {
  CreateMailerClientOptions,
  EmailAttachment,
  SendEmailRequest,
  SendEmailResponse,
  SendTelegramRequest,
  SendTelegramResponse,
} from "./mailer-client";

export type {
  AllowedMentions,
  CreateDiscordWebhookClientOptions,
  Embed,
  EmbedAuthor,
  EmbedField,
  EmbedFooter,
  EmbedImage,
  EmbedThumbnail,
  SendImageRequest,
  SendResponse,
  SendTextRequest,
  SendVideoRequest,
} from "./discord-webhook-client";
