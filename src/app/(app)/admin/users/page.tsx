import PageHeader from "@/components/page-header";
import UsersTableClient from "@/components/admin/users-table-client";
import { Users as UsersIcon, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data for users - in a real app, this would be fetched from an API
const mockUsers = [
  { id: "usr_1", name: "Satoshi Tajiri", email: "satoshi@poke.jp", role: "Super Admin", status: "Active", lastLogin: new Date(2024, 6, 20, 10, 30).toISOString(), avatar: "https://placehold.co/40x40.png?text=ST" },
  { id: "usr_2", name: "Ken Sugimori", email: "ken@poke.jp", role: "Admin", status: "Active", lastLogin: new Date(2024, 6, 21, 14, 0).toISOString(), avatar: "https://placehold.co/40x40.png?text=KS" },
  { id: "usr_3", name: "Junichi Masuda", email: "junichi@poke.jp", role: "Editor", status: "Inactive", lastLogin: new Date(2024, 5, 15, 9, 0).toISOString(), avatar: "https://placehold.co/40x40.png?text=JM" },
  { id: "usr_4", name: "Shigeru Ohmori", email: "shigeru@poke.jp", role: "Viewer", status: "Active", lastLogin: new Date(2024, 6, 22, 8, 15).toISOString(), avatar: "https://placehold.co/40x40.png?text=SO" },
  { id: "usr_5", name: "Tsunekazu Ishihara", email: "tsunekazu@poke.jp", role: "Admin", status: "Pending", lastLogin: new Date(2024, 6, 1, 12, 0).toISOString(), avatar: "https://placehold.co/40x40.png?text=TI" },
];

export type User = typeof mockUsers[0];

async function getUsers(): Promise<User[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockUsers;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administer user accounts, roles, and permissions."
        icon={UsersIcon}
        actions={
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        }
      />
      <UsersTableClient initialUsers={users} />
    </>
  );
}
