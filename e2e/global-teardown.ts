import { deleteFixtureProducts, deleteTestUsers } from "./support";

export default async function globalTeardown() {
  await deleteTestUsers();
  await deleteFixtureProducts();
}
