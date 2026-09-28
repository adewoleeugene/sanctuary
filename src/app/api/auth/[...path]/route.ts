import { auth } from "@/lib/auth/server";

// Built on the first request so `next build` doesn't need the auth env variables.
type Handlers = ReturnType<typeof auth.handler>;
type Context = Parameters<Handlers["GET"]>[1];
let handlers: Handlers | undefined;
const h = () => (handlers ??= auth.handler());

export const GET = (req: Request, ctx: Context) => h().GET(req, ctx);
export const POST = (req: Request, ctx: Context) => h().POST(req, ctx);
export const PUT = (req: Request, ctx: Context) => h().PUT(req, ctx);
export const DELETE = (req: Request, ctx: Context) => h().DELETE(req, ctx);
export const PATCH = (req: Request, ctx: Context) => h().PATCH(req, ctx);
