import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useGetSidebarPermissionQuery, useLazyGetAllRolesQuery, useLazyGetAllSidebarLinksQuery } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";

const PERMISSION_ACTIONS = [
    { key: "read", label: "read", field: "can_read" },
    { key: "create", label: "write", field: "can_create" },
    { key: "update", label: "update", field: "can_update" },
    { key: "delete", label: "delete", field: "can_delete" },
] as const;


export default function RoleManagement() {
    const [roles, setRoles] = useState<[]>();
    const [newRoleName, setNewRoleName] = useState("");
    const [permissions, setPermissions] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);


    const [getALlRoles, { data: allRolesData, isLoading: allRolesLoading, isUninitialized: allRolesUninitialized, isError: allRolesError }] = useLazyGetAllRolesQuery()
    const [getAllSidebarLinks, { data: allSidebarLinksData, isLoading: allSidebarLinksLoading, isUninitialized: allSidebarLinksUninitialized, isError: allSidebarLinksError }] = useLazyGetAllSidebarLinksQuery()

    const {
        data: sidebarPermissionData,
        isFetching: sidebarPermissionLoading,
        isError: sidebarPermissionError,
    } = useGetSidebarPermissionQuery(
        selectedRoleId,
        { skip: !selectedRoleId }
    );


    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    useEffect(() => {
        if (!isLoggedIn) return
        getALlRoles("allRoles")
        getAllSidebarLinks("allSidebarLinks")
    }, [isLoggedIn])

    useEffect(() => {
        console.log("🚀 ~ RoleManagement ~ data:", allRolesData)
        console.log("🚀 ~ RoleManagement ~ allSidebarLinksData:", allSidebarLinksData)
        if (!allSidebarLinksData && !allSidebarLinksError && !allSidebarLinksUninitialized) {
            setPermissions(allSidebarLinksData?.roles)
        }
    }, [allRolesData, allSidebarLinksData])


    const addRole = () => {
        if (!newRoleName.trim()) return;
        // setRoles((prev) => [
        //     ...prev,
        //     {
        //         id: Date.now().toString(),
        //         name: newRoleName,
        //         permissions: [],
        //     },
        // ]);
        setNewRoleName("");
    };

    function manageRole(id: string) {
        setSelectedRoleId(id);
    }

    function isPermission(module, action) {
        if (!sidebarPermissionData?.permission) {
            console.log(sidebarPermissionData?.permission, "--------------");

            return false
        }
        console.log(module);
        console.log(action);

        console.log(sidebarPermissionData?.permission);
        const index = sidebarPermissionData?.permission?.findIndex(x => x.sidebar_link_id === module.id)

        const permObjKey = PERMISSION_ACTIONS.find(permission => permission.key === action)?.field

        if (index >= 0) {
            return sidebarPermissionData?.permission?.[index]?.[permObjKey] ? true : false
        }
        return false

    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />

            {/* Page Content */}
            <main className="lg:ml-64 h-screen overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] h-full">
                    <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Roles</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage roles available in your organization.
                                </p>
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="hero">
                                        <Plus className="h-4 w-4 mr-2" /> Add Role
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Role</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Role Name</Label>
                                            <Input
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                                placeholder="e.g. Front Desk"
                                            />
                                        </div>
                                        <Button onClick={addRole} className="w-full" variant="hero">
                                            Create Role
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role</TableHead>
                                        {/* <TableHead>Permissions</TableHead> */}
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!allRolesLoading && !allRolesUninitialized && !allRolesError && allRolesData.roles.map((role) => {
                                        return <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name}</TableCell>
                                            {/* <TableCell className="text-sm text-muted-foreground">
                                                {role.permissions.length === 0
                                                    ? "No permissions"
                                                    : `${role.permissions.length} modules`}
                                            </TableCell> */}
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    onClick={() => manageRole(role.id)}
                                                >
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </section>

                    <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8 bg-muted/20">
                        {
                            // selectedRole ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card rounded-2xl border border-border shadow-sm p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Permissions –
                                    </h2>
                                    {/* <Button size="sm" variant="ghost" onClick={() => setSelectedRole(null)}>
                                        Close
                                    </Button> */}
                                </div>

                                <div className="space-y-4">
                                    {!allSidebarLinksLoading && !allSidebarLinksError && !allRolesUninitialized && allSidebarLinksData.roles.map((module) => (
                                        <div
                                            key={module.id}
                                            className="flex items-center justify-between border border-border rounded-xl p-4"
                                        >
                                            <span className="font-medium text-foreground">
                                                {module.link_name}
                                            </span>
                                            <div className="flex items-center gap-6">
                                                {["read", "write", "delete"].map((action) => (
                                                    <div key={action} className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={isPermission(module, action)}
                                                        // onCheckedChange={() =>
                                                        //     togglePermission(
                                                        //         selectedRole.id,
                                                        //         module.key,
                                                        //         action as PermissionAction
                                                        //     )
                                                        // }
                                                        />
                                                        <Label className="text-sm capitalize">{action}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                            // ) : (
                            //     <div className="h-full flex items-center justify-center text-muted-foreground">
                            //         Select a role to manage permissions
                            //     </div>
                            // )
                        }
                    </section>
                </div>
            </main>
        </div>
    );
}
