import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { getShopPrices, removeShopPrice, setShopPrice } from "@/lib/services/shops";

type Params = { params: Promise<{ id: string }> };

const priceSchema = z
  .object({
    serviceId: z.string().min(1).max(64),
    minPrice: z.coerce.number().min(0).max(1_000_000),
    maxPrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
    note: z.string().max(200).nullable().optional(),
  })
  .strict();

// Published prices are public: they are what the shop is advertising.
export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const { id } = await params;
    return ok(await getShopPrices(id));
  });
}

export async function PUT(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJson(req, priceSchema);
    return ok(await setShopPrice(id, user.id, input));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    const serviceId = z.string().min(1).max(64).parse(new URL(req.url).searchParams.get("serviceId"));
    await removeShopPrice(id, user.id, serviceId);
    return ok({ deleted: true });
  });
}
