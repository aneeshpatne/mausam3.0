import index from "./index.html";

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  routes: { "/*": index },
  development: Bun.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Mausam web running at ${server.url}`);
