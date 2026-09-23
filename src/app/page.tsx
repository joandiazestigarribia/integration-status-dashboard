import { Dashboard } from "~/components/Dashboard"
import { listTenants } from "~/lib/server/data"

export default function Home() {
  const tenants = listTenants()

  return <Dashboard tenants={tenants} />
}
