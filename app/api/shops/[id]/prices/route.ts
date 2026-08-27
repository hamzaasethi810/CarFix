import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { currentUser } from "@/lib/auth/guards";
import { getShopPrices, removeShopPrice, setShopPrice } from "@/lib/services/shops";
import { shopPriceSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

// Published prices are public: they are what the shop is advertising.
export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const viewer = await currentUser();
    await enforceRateLimit("read", clientIdentifier(req, viewer?.id));
    const { id } = await params;
    return ok(await getShopPrices(id));
  });
}

export async function PUT(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    const input = await parseJson(req, shopPriceSchema);
    return ok(await setShopPrice(id, user.id, input));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    const serviceId = z.string().min(1).max(64).parse(new URL(req.url).searchParams.get("serviceId"));
    await removeShopPrice(id, user.id, serviceId);
    return ok({ deleted: true });
  });
}
