import { Dashboard } from "~/components/Dashboard"
import { getTenants } from "~/lib/api"

export default async function Home() {
  const tenants = await getTenants()

  return <Dashboard tenants={tenants} />
}
