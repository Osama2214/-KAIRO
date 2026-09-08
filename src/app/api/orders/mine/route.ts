import { getMyOrders } from "../route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getMyOrders(request);
}
